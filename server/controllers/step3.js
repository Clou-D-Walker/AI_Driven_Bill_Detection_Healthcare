const { processWithGemini } = require("../lib/ai");
const { classifySchema } = require("../validators/schemas");
const { collectStrings } = require("../utils/extractors");

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
    if (value !== null && !Number.isNaN(value)) {
      out.push({ type: type || "unknown", value, source: `text: '${line}'` });
    }
  });
  return out;
};

const step3Classify = async (req, res) => {
  const startTime = Date.now();
  try {
    const { error, value } = classifySchema.validate(req.body);
    if (error)
      return res.status(400).json({
        status: "error",
        reason: "invalid_input_format",
        details: error.details[0].message,
      });

    const classifyPrompt = `You are an expert medical billing analyst. Classify these normalized amounts by their medical context.\n\nNORMALIZED_AMOUNTS: ${JSON.stringify(
      value.normalized_amounts
    )}\nORIGINAL_TEXT: ${
      value.original_text || "not provided"
    }\n\nOUTPUT FORMAT (JSON only):{ "amounts": [{"type":"total_bill","value":1200}], "confidence":0.8 }\n\nRESPOND WITH ONLY THE JSON OBJECT.`;

    let result;
    try {
      result = await processWithGemini(classifyPrompt, null, "step3");
    } catch (err) {
      console.warn(
        "AI classify failed, falling back to local heuristic:",
        err && err.message
      );
      // Local heuristic: map normalized_amounts into types by scanning original_text and simple keywords
      const heuristics = (value.normalized_amounts || []).map((num) => {
        // try to find a matching line in original_text
        const ot = String(value.original_text || "");
        const lines = ot
          .split(/\n|;|\||\t/)
          .map((s) => s.trim())
          .filter(Boolean);
        let foundSource = null;
        let foundType = "unknown";
        for (const line of lines) {
          const cleaned = line
            .replace(/[₹,\s]/g, "")
            .replace(/Rs\.?/i, "")
            .replace(/INR/i, "")
            .replace(/[^0-9\.\-]/g, "");
          const parsed = parseFloat(cleaned);
          if (!Number.isNaN(parsed) && Math.abs(parsed - Number(num)) < 0.01) {
            foundSource = `text: '${line}'`;
            const lower = line.toLowerCase();
            if (/total/.test(lower)) foundType = "total_bill";
            else if (/paid|payment|advance|received/.test(lower))
              foundType = "paid";
            else if (/due|balance|outstanding|pending/.test(lower))
              foundType = "due";
            else if (/discount/.test(lower)) foundType = "discount";
            else if (/tax|gst|vat/.test(lower)) foundType = "tax";
            else if (/consultation|doctor|visit|fee/.test(lower))
              foundType = "consultation";
            else if (/medicine|pharmacy|drug|prescription/.test(lower))
              foundType = "medicine";
            break;
          }
        }
        return {
          type: foundType,
          value: Number(num),
          source: foundSource || undefined,
        };
      });
      result = { amounts: heuristics, status: "ok" };
    }

    let normalized = { ...result };

    if (Array.isArray(result.amounts)) {
      normalized.amounts = result.amounts
        .map((a) => ({
          type: a.type || "unknown",
          value: Number(a.value),
          source:
            a.source ||
            (a.original_text ? `text: '${a.original_text}'` : undefined),
        }))
        .filter((a) => !Number.isNaN(a.value));
    } else if (typeof result.amounts === "string") {
      normalized.amounts = extractAmountsFromString(result.amounts);
    } else if (typeof result === "string") {
      normalized.amounts = extractAmountsFromString(result);
    } else {
      const collected = collectStrings(result);
      normalized.amounts = extractAmountsFromString(collected);
    }

    if (
      !normalized.amounts ||
      !Array.isArray(normalized.amounts) ||
      normalized.amounts.length === 0
    ) {
      console.error("Classification result (raw):", result);
      throw new Error("Invalid classification result structure");
    }

    res.json({ ...normalized, processing_time_ms: Date.now() - startTime });
  } catch (error) {
    console.error("Step 3 Error:", error);
    res.status(500).json({
      status: "error",
      reason: "classification_failed",
      message: error.message,
      processing_time_ms: Date.now() - startTime,
    });
  }
};

module.exports = { step3Classify };
