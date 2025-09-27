const { processWithGemini } = require("../lib/ai");
const { normalizeSchema } = require("../validators/schemas");
const {
  extractNumbersFromString,
  collectStrings,
} = require("../utils/extractors");

const step2Normalize = async (req, res) => {
  const startTime = Date.now();
  try {
    const { error, value } = normalizeSchema.validate(req.body);
    if (error)
      return res
        .status(400)
        .json({
          status: "error",
          reason: "invalid_input_format",
          details: error.details[0].message,
        });

    const normalizePrompt = `You are an expert in medical document OCR error correction and amount normalization.\n\nRAW TOKENS: ${JSON.stringify(
      value.raw_tokens
    )}\nCURRENCY HINT: ${
      value.currency_hint || "unknown"
    }\n\nOUTPUT FORMAT (JSON only):{ "normalized_amounts": [1200,1000], "normalization_confidence": 0.82 }\n\nRESPOND WITH ONLY THE JSON OBJECT.`;

    const result = await processWithGemini(normalizePrompt, null, "step2");

    let normalized = { ...result };

    if (Array.isArray(result.normalized_amounts)) {
      // ok
    } else if (typeof result.normalized_amounts === "string") {
      try {
        const parsed = JSON.parse(result.normalized_amounts);
        if (Array.isArray(parsed))
          normalized.normalized_amounts = parsed
            .map(Number)
            .filter((n) => !Number.isNaN(n));
        else
          normalized.normalized_amounts = extractNumbersFromString(
            result.normalized_amounts
          );
      } catch (e) {
        normalized.normalized_amounts = extractNumbersFromString(
          result.normalized_amounts
        );
      }
    } else if (Array.isArray(result)) {
      normalized.normalized_amounts = result
        .map(Number)
        .filter((n) => !Number.isNaN(n));
    } else if (typeof result === "string") {
      normalized.normalized_amounts = extractNumbersFromString(result);
    } else {
      const collected = collectStrings(result);
      normalized.normalized_amounts = extractNumbersFromString(collected);
    }

    if (
      !normalized.normalized_amounts ||
      !Array.isArray(normalized.normalized_amounts) ||
      normalized.normalized_amounts.length === 0
    ) {
      console.error("Normalization result (raw):", result);
      throw new Error("Invalid normalization result structure");
    }

    res.json({ ...normalized, processing_time_ms: Date.now() - startTime });
  } catch (error) {
    console.error("Step 2 Error:", error);
    res
      .status(500)
      .json({
        status: "error",
        reason: "normalization_failed",
        message: error.message,
        processing_time_ms: Date.now() - startTime,
      });
  }
};

module.exports = { step2Normalize };
