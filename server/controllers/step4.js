const { processWithGemini } = require("../lib/ai");
const { finalizeSchema } = require("../validators/schemas");
const {
  collectStrings,
  detectCurrencyFromText,
} = require("../utils/extractors");

// Helper: detect header lines that look like hospital/clinic/pharmacy names
// Conservative: don't treat lines that contain digits or amount-related words as headers
// (so "Lab Tests: INR 800" won't be removed as a header).
const isHeaderLine = (line, idx) => {
  if (!line || typeof line !== "string") return false;
  const trimmed = line.trim();
  const words = trimmed.split(/\s+/).filter(Boolean);
  const hasDigits = /\d/.test(trimmed);

  // institution keywords — but only treat as header when line looks like a standalone name
  const inst =
    /(hospital|clinic|pharmacy|centre|center|laboratory|lab|medical|health|diagnostic)/i;
  // amount-related keywords indicating the line is an item/field
  const amountKeywords =
    /\b(total|consultation|fee|charges?|medicine|tests?|paid|payment|advance|due|balance|gst|tax|invoice|amount|rupees|inr|rs|₹)\b/i;

  if (inst.test(trimmed)) {
    // if the line contains digits or amount-related words, it's not a header
    if (hasDigits || amountKeywords.test(trimmed)) return false;
    if (words.length <= 6) return true;
  }

  // first line heuristic: short, no digits, no amount words -> likely a header
  if (
    idx === 0 &&
    words.length <= 6 &&
    !hasDigits &&
    !amountKeywords.test(trimmed)
  )
    return true;

  return false;
};

const preprocessOriginalText = (txt) => {
  if (!txt || typeof txt !== "string") return txt;
  const lines = txt
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const filtered = lines.filter((l, i) => !isHeaderLine(l, i));
  // remove trailing colons after field names to make parsing easier for model and heuristics
  const cleaned = filtered.map((l) => l.replace(/^([^:]{1,200}):\s*/, "$1 "));
  return cleaned.join("\n");
};

const extractAmountsFromString = (s) => {
  if (!s || typeof s !== "string") return [];
  const lines = s
    .split(/\n|;|\||\t/)
    .map((l) => l.trim())
    .filter(Boolean);
  const out = [];
  lines.forEach((line) => {
    const lower = line.toLowerCase();
    let type = null;
    if (/total/.test(lower)) type = "total_bill";
    else if (/paid|payment|advance|received/.test(lower)) type = "paid";
    else if (/due|balance|outstanding|pending/.test(lower)) type = "due";
    else if (/discount/.test(lower)) type = "discount";
    else if (/tax|gst|vat/.test(lower)) type = "tax";
    else if (/consultation|doctor|visit|fee/.test(lower)) type = "consultation";
    else if (/medicine|pharmacy|drug|prescription/.test(lower))
      type = "medicine";
    else if (/procedure|surgery|treatment|lab/.test(lower)) type = "procedure";

    const numMatch = line.match(/\d{1,3}(?:[,\.\s]\d{3})*(?:\.\d+)?%?/);
    const value = numMatch
      ? parseFloat(numMatch[0].replace(/[,%\s]/g, ""))
      : null;
    if (value !== null && !Number.isNaN(value))
      out.push({ type: type || "unknown", value, source: `text: '${line}'` });
  });
  return out;
};

const step4Finalize = async (req, res) => {
  const startTime = Date.now();
  try {
    console.log("Finalize request body received:", req.body);
    let payload = { ...req.body };

    // Accept `text` as an alias for `original_text` (clients like Postman may send `text`)
    if (payload.text && !payload.original_text) {
      payload.original_text = payload.text;
      delete payload.text;
    }

    // Tolerant coercion for many incoming shapes before validation
    try {
      // If amounts is a JSON string, try to parse it
      if (payload.amounts && typeof payload.amounts === "string") {
        try {
          const parsed = JSON.parse(payload.amounts);
          payload.amounts = parsed;
        } catch (e) {
          // try to split on newlines/commas into tokens
          const tokens = payload.amounts
            .split(/\n|;|,|\||\t/)
            .map((s) => s.trim())
            .filter(Boolean);
          payload.amounts = tokens;
        }
      }

      // If amounts is present and is an array, coerce each entry
      if (payload.amounts && Array.isArray(payload.amounts)) {
        payload.amounts = payload.amounts.map((a) => {
          // number -> {type, value}
          if (typeof a === "number") return { type: "unknown", value: a };

          // string -> try parse number or JSON
          if (typeof a === "string") {
            // try JSON object string
            try {
              const parsed = JSON.parse(a);
              a = parsed;
            } catch (e) {
              // not JSON, fall through to numeric parse
              const cleaned = a
                .replace(/[\u20b9,\s]/g, "")
                .replace(/Rs\.?/i, "")
                .replace(/INR/i, "");
              const num = parseFloat(cleaned.replace(/[^0-9\\.\\-]/g, ""));
              if (!Number.isNaN(num))
                return { type: "unknown", value: num, source: `text: '${a}'` };
              return { type: "unknown", value: NaN, source: a };
            }
          }

          // object -> look for common fields
          if (typeof a === "object" && a !== null) {
            const type = a.type ? String(a.type) : a.category || "unknown";
            let value = a.value ?? a.amount ?? a["0"] ?? a[0] ?? null;
            if (typeof value === "string")
              value = value
                .replace(/[\u20b9,\s]/g, "")
                .replace(/Rs\.?/i, "")
                .replace(/INR/i, "");
            value = Number(value);
            const source =
              a.source ||
              (a.original_text ? `text: '${a.original_text}'` : undefined);
            return { type: type || "unknown", value, source };
          }

          // fallback for unexpected types
          return { type: "unknown", value: NaN, source: a };
        });
      }
    } catch (e) {
      console.warn("Pre-validation coercion error:", e);
    }

    // If amounts still missing but original_text exists, try extracting pre-validation
    if (
      (!payload.amounts || payload.amounts.length === 0) &&
      payload.original_text &&
      typeof payload.original_text === "string"
    ) {
      const extracted = extractAmountsFromString(payload.original_text);
      if (extracted.length > 0) payload.amounts = extracted;
    }

    let { error, value } = finalizeSchema.validate(payload);
    if (error) {
      console.warn(
        "Finalize validation failed, attempting fallback extraction"
      );
      try {
        let fallbackAmounts = [];
        if (
          payload.original_text &&
          typeof payload.original_text === "string"
        ) {
          fallbackAmounts = extractAmountsFromString(payload.original_text);
        }

        if (fallbackAmounts.length === 0) {
          const rawCollected = collectStrings(req.body);
          const lines = rawCollected
            .split(/\n|;|\||\t/)
            .map((l) => l.trim())
            .filter(Boolean)
            .filter(
              (l) =>
                !/(confidence|avgLogprobs|candidatesTokenCount|promptTokenCount|totalTokenCount|promptTokensDetails|candidatesTokensDetails|modelVersion|gemini|flash|usageMetadata|candidates|tokens?)/i.test(
                  l
                )
            );
          const filteredText = lines.join("\n");
          fallbackAmounts = extractAmountsFromString(filteredText);
        }

        if (fallbackAmounts.length > 0) {
          payload.amounts = fallbackAmounts;

          // Sanitize: ensure each amount has {type: string, value: number}
          const sanitize = (arr) =>
            (arr || [])
              .map((it) => {
                if (typeof it === "number")
                  return { type: "unknown", value: it };
                if (typeof it === "string") {
                  const cleaned = it
                    .replace(/[\u20b9,\s]/g, "")
                    .replace(/Rs\.?/i, "")
                    .replace(/INR/i, "");
                  const num = parseFloat(cleaned.replace(/[^0-9\\.\\-]/g, ""));
                  if (!Number.isNaN(num))
                    return {
                      type: "unknown",
                      value: num,
                      source: `text: '${it}'`,
                    };
                  return { type: "unknown", value: NaN, source: it };
                }
                if (typeof it === "object" && it !== null) {
                  const type = it.type || it.category || "unknown";
                  let valueCandidate =
                    it.value ?? it.amount ?? it[0] ?? it["0"] ?? null;
                  if (typeof valueCandidate === "string")
                    valueCandidate = valueCandidate
                      .replace(/[\u20b9,\s]/g, "")
                      .replace(/Rs\.?/i, "")
                      .replace(/INR/i, "");
                  const num = Number(valueCandidate);
                  const source =
                    it.source ||
                    (it.original_text
                      ? `text: '${it.original_text}'`
                      : undefined);
                  return { type: type || "unknown", value: num, source };
                }
                return { type: "unknown", value: NaN, source: it };
              })
              .filter((x) => x && !Number.isNaN(x.value));

          payload.amounts = sanitize(payload.amounts);
          ({ error, value } = finalizeSchema.validate(payload));
        }
      } catch (e) {
        console.warn("Fallback extraction error:", e);
      }

      if (error) {
        // Provide helpful diagnostics to the client for debugging
        const diagnostic = {
          original_body_preview: JSON.stringify(req.body).slice(0, 2000),
          coerced_payload_preview: JSON.stringify(payload).slice(0, 2000),
          joi_error:
            error && error.details
              ? error.details.map((d) => d.message)
              : (error && error.message) || "validation_failed",
        };
        console.error(
          "Finalize could not validate payload after fallback:",
          diagnostic
        );
        return res.status(400).json({
          status: "error",
          reason: "invalid_input_format",
          details: diagnostic,
        });
      }
    }

    const cleanedOriginal = preprocessOriginalText(
      value.original_text || payload.original_text || ""
    );

    const preknowledge = `Pre-knowledge:\n- Ignore any hospital/clinic/pharmacy or other header names (e.g. 'Apollo Hospital'). These lines are NOT amounts and must not be used in calculations.\n- When parsing field names, ignore any trailing ':' or similar punctuation after labels; use only the label text for classification.\n- Use only the numeric parts for amount values (digits, commas, decimals).\n- Prefer INR/Rs when currency hints suggest INR.\n- Output a single JSON object only, no explanatory text.`;

    const finalizePrompt = `${preknowledge}\n\nGenerate final structured output with provenance tracking:\n\nClassified amounts: ${JSON.stringify(
      value.amounts
    )}\nCurrency hint: ${value.currency_hint || "unknown"}\nOriginal text: ${
      cleanedOriginal || "not provided"
    }\n\nRespond with ONLY a JSON object.`;

    const result = await processWithGemini(finalizePrompt, null, "step4");

    // Build a clean list of amounts to return to frontend.
    const isMetadataLine = (line) =>
      /promptTokenCount|candidatesTokenCount|totalTokenCount|avgLogprobs|usageMetadata|modelVersion|gemini|processing_time_ms|promptTokensDetails|candidatesTokensDetails|tokens?/i.test(
        line
      );

    const sanitizeEntry = (a) => {
      if (a == null) return null;
      // number
      if (typeof a === "number") return { type: "unknown", value: Number(a) };

      // string that maybe like "Paid: INR 1,000"
      if (typeof a === "string") {
        const cleaned = a
          .replace(/[₹,\s]/g, "")
          .replace(/Rs\.?/i, "")
          .replace(/INR/i, "");
        const num = parseFloat(cleaned.replace(/[^0-9\.\-]/g, ""));
        if (!Number.isNaN(num))
          return { type: "unknown", value: num, source: a };
        return null;
      }

      if (typeof a === "object") {
        const type = a.type || a.category || "unknown";
        let value = a.value ?? a.amount ?? a[0] ?? a["0"] ?? null;
        if (typeof value === "string")
          value = value
            .replace(/[₹,\s]/g, "")
            .replace(/Rs\.?/i, "")
            .replace(/INR/i, "");
        value = Number(value);
        if (Number.isNaN(value)) return null;
        const source =
          a.source || a.original_text || a.source_text || undefined;
        return { type: String(type || "unknown"), value, source };
      }
      return null;
    };

    let candidates = [];

    // Prefer explicit classified_amounts (some prompts use this key)
    if (
      Array.isArray(result.classified_amounts) &&
      result.classified_amounts.length
    )
      candidates = result.classified_amounts;
    else if (
      Array.isArray(result.classifiedAmounts) &&
      result.classifiedAmounts.length
    )
      candidates = result.classifiedAmounts;
    else if (Array.isArray(result.amounts) && result.amounts.length)
      candidates = result.amounts;
    else if (typeof result.amounts === "string")
      candidates = extractAmountsFromString(result.amounts);
    else if (Array.isArray(result.raw_tokens) && result.raw_tokens.length)
      candidates = result.raw_tokens.map((t) => ({
        type: "unknown",
        value: t,
        source: `token: '${t}'`,
      }));
    else {
      // As a last resort, collect text but filter out metadata lines first
      const collected = collectStrings(result) || "";
      const lines = collected
        .split(/\n|;|\||\t/)
        .map((l) => l.trim())
        .filter(Boolean)
        .filter((l) => !isMetadataLine(l));
      candidates = extractAmountsFromString(lines.join("\n"));
    }

    // Sanitize and filter candidates
    let cleaned = (candidates || [])
      .map(sanitizeEntry)
      .filter(Boolean)
      // remove any small/obvious metadata numbers (like token counts)
      .filter(
        (it) => !(it.value >= 0 && it.value <= 10 && it.type === "unknown")
      )
      // keep only positive or zero values
      .filter((it) => typeof it.value === "number" && !Number.isNaN(it.value));

    // Deduplicate by type+value+source
    const seen = new Set();
    const deduped = [];
    cleaned.forEach((it) => {
      const key = `${it.type}::${it.value}::${String(it.source || "")}`;
      if (!seen.has(key)) {
        seen.add(key);
        deduped.push(it);
      }
    });

    // Prefer entries where type !== 'unknown' first
    deduped.sort((a, b) => {
      if (a.type === "unknown" && b.type !== "unknown") return 1;
      if (b.type === "unknown" && a.type !== "unknown") return -1;
      return 0;
    });

    // Remove "unknown" entries for display; if that would leave the result empty,
    // keep the unknowns so we don't return an empty list when nothing is classified.
    const knownOnly = deduped.filter((it) => it.type && it.type !== "unknown");
    const finalAmounts = knownOnly.length ? knownOnly : deduped;

    // Detect if any final amount contains embedded JSON with classified_amounts/amounts
    const tryExtractEmbedded = (src) => {
      if (!src || typeof src !== "string") return null;
      try {
        // strip leading markers like "text: '...'
        const cleaned = src.replace(/^text:\s*/i, "").trim();
        const jsonMatch = cleaned.match(/(\{[\s\S]*\})/);
        if (!jsonMatch) return null;
        const parsed = JSON.parse(jsonMatch[1]);
        const inner = parsed.classified_amounts || parsed.amounts || null;
        if (!Array.isArray(inner) || inner.length === 0) return null;
        // normalize inner entries
        return inner
          .map((a) => {
            if (!a) return null;
            const typeRaw = a.type || a.category || "unknown";
            let type = String(typeRaw);
            if (type === "total") type = "total_bill";
            if (type === "payment") type = "paid";
            return {
              type,
              value: Number(a.value ?? a.amount ?? a["0"] ?? a[0]),
              source: a.source || a.original_text || cleaned,
            };
          })
          .filter((x) => x && !Number.isNaN(x.value));
      } catch (e) {
        return null;
      }
    };

    // If the final list looks like a single entry whose source contains an embedded JSON, expand it
    if (finalAmounts.length === 1) {
      const embedded = tryExtractEmbedded(finalAmounts[0].source);
      if (embedded && embedded.length > 0) {
        // replace finalAmounts with extracted inner list
        finalAmounts.splice(0, finalAmounts.length, ...embedded);
      }
    }

    // Map unknown entries to lines in the original text (if available) to recover proper types/values
    const originalText =
      result.original_text ||
      value.original_text ||
      payload.original_text ||
      "";
    const lineEntries = extractAmountsFromString(originalText);
    if (lineEntries.length > 0) {
      // build quick lookup by numeric value and by normalized line text
      const byValue = new Map();
      const byText = [];
      lineEntries.forEach((le) => {
        const key = String(le.value);
        if (!byValue.has(key)) byValue.set(key, []);
        byValue.get(key).push(le);
        byText.push({ text: String(le.source || ""), entry: le });
      });

      // helper to find matching line for an amount
      const findMatch = (amt) => {
        if (!amt) return null;
        // try matching by source text inclusion
        if (amt.source && typeof amt.source === "string") {
          const s = amt.source.toLowerCase();
          for (const t of byText) {
            if (
              t.text.toLowerCase().includes(s) ||
              s.includes(t.text.toLowerCase())
            ) {
              return t.entry;
            }
            // also check raw line without the leading "text: '"
            const raw = (t.entry.source || "").replace(/^text:\s*/i, "");
            if (s.includes(raw.toLowerCase()) || raw.toLowerCase().includes(s))
              return t.entry;
          }
        }
        // try matching by numeric value
        const key = String(amt.value);
        if (byValue.has(key)) return byValue.get(key)[0];
        return null;
      };

      // remap unknowns using matches and prefer line-extracted values/types
      for (let i = 0; i < finalAmounts.length; i++) {
        const a = finalAmounts[i];
        if (!a) continue;
        if (
          a.type === "unknown" ||
          /\\"value\\"|\\"source\\"/.test(String(a.source))
        ) {
          const match = findMatch(a);
          if (match) {
            finalAmounts[i] = {
              type: match.type || a.type || "unknown",
              value: Number(match.value ?? a.value),
              source: match.source || a.source,
            };
          }
        }
      }

      // remove obvious JSON-fragment entries if a proper mapped line exists for same value
      const hasGoodForValue = new Map();
      finalAmounts.forEach((it) => {
        if (it && it.type && it.type !== "unknown")
          hasGoodForValue.set(String(it.value), true);
      });
      const filtered = finalAmounts.filter((it) => {
        if (!it) return false;
        const src = String(it.source || "");
        if (
          /\\"value\\"|\\"source\\"/.test(src) &&
          hasGoodForValue.has(String(it.value))
        ) {
          return false;
        }
        return true;
      });

      // replace finalAmounts with filtered list and dedupe again
      const finalSeen = new Set();
      const finalList = [];
      filtered.forEach((it) => {
        const key = `${it.type}::${it.value}::${String(it.source || "")}`;
        if (!finalSeen.has(key)) {
          finalSeen.add(key);
          finalList.push(it);
        }
      });
      // mutate finalAmounts
      finalAmounts.splice(0, finalAmounts.length, ...finalList);
    }

    // Determine currency if not present
    let currency = result.currency || result.currency_hint || null;
    if (!currency || currency === "unknown") {
      const preview = collectStrings(result) || JSON.stringify(result);
      currency = detectCurrencyFromText(preview);
    }

    // If the AI returned an empty array originally, indicate no amounts
    if (Array.isArray(result.amounts) && result.amounts.length === 0) {
      return res.json({
        status: "no_amounts_found",
        reason: "document too noisy",
        processing_time_ms: Date.now() - startTime,
      });
    }

    res.json({
      status: result.status || "ok",
      amounts: finalAmounts,
      classified_amounts: finalAmounts,
      currency: currency || "unknown",
      original_text: result.original_text || null,
      processing_time_ms: Date.now() - startTime,
    });
  } catch (error) {
    console.error("Step 4 Error:", error);
    res.status(500).json({
      status: "error",
      reason: "finalization_failed",
      message: error.message,
      processing_time_ms: Date.now() - startTime,
    });
  }
};

module.exports = { step4Finalize };
