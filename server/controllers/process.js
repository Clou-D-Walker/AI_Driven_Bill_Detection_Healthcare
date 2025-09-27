const { processWithGemini } = require("../lib/ai");
const { textInputSchema } = require("../validators/schemas");
const {
  collectStrings,
  detectCurrencyFromText,
} = require("../utils/extractors");

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

const completeProcess = async (req, res) => {
  const startTime = Date.now();
  try {
    let processingPrompt;
    let imageBuffer = null;

    if (req.file) {
      imageBuffer = req.file.buffer;
      processingPrompt = `Process this medical document image through the complete AI pipeline and return ONLY the JSON object.`;
    } else {
      const { error, value } = textInputSchema.validate(req.body);
      if (error)
        return res.status(400).json({
          status: "error",
          reason: "invalid_input_format",
          details: error.details[0].message,
        });
      // Preprocess original text to remove header-like lines and trailing colons
      const cleaned = preprocessOriginalText(value.text || "");
      const preknowledge = `Pre-knowledge:\n- Ignore any hospital/clinic/pharmacy or other header names (e.g. 'Apollo Hospital'). These lines are NOT amounts and must not be used in calculations.\n- When parsing field names, ignore any trailing ':' or similar punctuation after labels; use only the label text for classification.\n- Use only the numeric parts for amount values (digits, commas, decimals).\n- Prefer INR/Rs when currency hints suggest INR.\n- Output a single JSON object only, no explanatory text.`;
      processingPrompt = `${preknowledge}\n\nProcess this medical document text through the complete AI pipeline. Text: "${cleaned}" Respond with ONLY the JSON object.`;
    }

    const result = await processWithGemini(
      processingPrompt,
      imageBuffer,
      "process"
    );

    let normalized = { ...result };

    if (Array.isArray(result.amounts)) {
      normalized.amounts = result.amounts
        .map((a) => ({
          type: a.type || "unknown",
          value: Number(a.value),
          source: a.source || undefined,
        }))
        .filter((a) => !Number.isNaN(a.value));
    } else if (Array.isArray(result.raw_tokens)) {
      const tokens = result.raw_tokens.map((t) => String(t));
      normalized.amounts = tokens
        .map((t) => {
          const cleaned = t
            .replace(/[₹,\s]/g, "")
            .replace("Rs.", "")
            .replace("INR", "");
          const num = parseFloat(cleaned.replace(/[^0-9\.]/g, ""));
          return { type: "unknown", value: num, source: `token: '${t}'` };
        })
        .filter((a) => !Number.isNaN(a.value));
    } else {
      const collected = collectStrings(result);
      normalized.amounts = extractAmountsFromString(collected);
    }

    if (!normalized.amounts || !Array.isArray(normalized.amounts)) {
      console.error("Processing result (raw):", result);
      throw new Error("Invalid processing result structure");
    }

    // Sanitize, filter metadata, dedupe, and remove 'unknown' for display
    const metadataSourceRegex =
      /^(?:-?\d+(?:\.\d+)?$)|\b(?:promptTokenCount|candidatesTokenCount|totalTokenCount|avgLogprobs|usageMetadata|modelVersion|gemini|promptTokensDetails|candidatesTokensDetails|tokens?)\b|"value":/i;

    const sanitize = (a) => {
      if (a == null) return null;
      if (typeof a === "number") return { type: "unknown", value: Number(a) };
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

    let cleaned = (normalized.amounts || [])
      .map(sanitize)
      .filter(Boolean)
      .filter(
        (it) => !(it.value >= 0 && it.value <= 10 && it.type === "unknown")
      )
      .filter((it) => !metadataSourceRegex.test(String(it.source || "")))
      .filter((it) => typeof it.value === "number" && !Number.isNaN(it.value));

    // Deduplicate
    const seen = new Set();
    const deduped = [];
    cleaned.forEach((it) => {
      const key = `${it.type}::${it.value}::${String(it.source || "")}`;
      if (!seen.has(key)) {
        seen.add(key);
        deduped.push(it);
      }
    });

    // Prefer known types
    deduped.sort((a, b) => {
      if (a.type === "unknown" && b.type !== "unknown") return 1;
      if (b.type === "unknown" && a.type !== "unknown") return -1;
      return 0;
    });

    const knownOnly = deduped.filter((it) => it.type && it.type !== "unknown");
    const finalAmounts = knownOnly.length ? knownOnly : deduped;

    // detect embedded JSON in source and expand
    const tryExtractEmbedded = (src) => {
      if (!src || typeof src !== "string") return null;
      try {
        const cleaned = src.replace(/^text:\s*/i, "").trim();
        const jsonMatch = cleaned.match(/(\{[\s\S]*\})/);
        if (!jsonMatch) return null;
        const parsed = JSON.parse(jsonMatch[1]);
        const inner = parsed.classified_amounts || parsed.amounts || null;
        if (!Array.isArray(inner) || inner.length === 0) return null;
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

    if (finalAmounts.length === 1) {
      const embedded = tryExtractEmbedded(finalAmounts[0].source);
      if (embedded && embedded.length > 0) {
        finalAmounts.splice(0, finalAmounts.length, ...embedded);
      }
    }

    // Map unknown entries to lines in the original text (if available)
    const originalText = result.original_text || "";
    const lineEntries = extractAmountsFromString(originalText);
    if (lineEntries.length > 0) {
      const byValue = new Map();
      const byText = [];
      lineEntries.forEach((le) => {
        const key = String(le.value);
        if (!byValue.has(key)) byValue.set(key, []);
        byValue.get(key).push(le);
        byText.push({ text: String(le.source || ""), entry: le });
      });

      const findMatch = (amt) => {
        if (!amt) return null;
        if (amt.source && typeof amt.source === "string") {
          const s = amt.source.toLowerCase();
          for (const t of byText) {
            if (
              t.text.toLowerCase().includes(s) ||
              s.includes(t.text.toLowerCase())
            ) {
              return t.entry;
            }
            const raw = (t.entry.source || "").replace(/^text:\s*/i, "");
            if (s.includes(raw.toLowerCase()) || raw.toLowerCase().includes(s))
              return t.entry;
          }
        }
        const key = String(amt.value);
        if (byValue.has(key)) return byValue.get(key)[0];
        return null;
      };

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

      const finalSeen = new Set();
      const finalList = [];
      filtered.forEach((it) => {
        const key = `${it.type}::${it.value}::${String(it.source || "")}`;
        if (!finalSeen.has(key)) {
          finalSeen.add(key);
          finalList.push(it);
        }
      });
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
    console.error("Complete Pipeline Error:", error);
    res.status(500).json({
      status: "error",
      reason: "ai_service_unavailable",
      message: error.message,
      processing_time_ms: Date.now() - startTime,
    });
  }
};

module.exports = { completeProcess };
