const { processWithGemini } = require("../lib/ai");
const { textInputSchema } = require("../validators/schemas");
const {
  extractTokensFromString,
  collectStrings,
} = require("../utils/extractors");

const step1Extract = async (req, res) => {
  const startTime = Date.now();
  try {
    let extractionPrompt;
    let imageBuffer = null;

    if (req.file) {
      imageBuffer = req.file.buffer;
      extractionPrompt = `You are an expert medical document OCR analyst. Extract ALL financial amounts, numbers, and currency indicators from this medical document image.\n\nOUTPUT FORMAT (JSON only):{ "raw_tokens": ["extracted_token1"], "currency_hint": "detected_currency_code", "confidence": 0.85 }\n\nRESPOND WITH ONLY THE JSON OBJECT.`;
    } else {
      const { error, value } = textInputSchema.validate(req.body);
      if (error)
        return res
          .status(400)
          .json({
            status: "error",
            reason: "invalid_input_format",
            details: error.details[0].message,
          });

      extractionPrompt = `You are an expert medical document text analyst. Extract ALL financial amounts and numbers from this medical document text.\n\nMEDICAL DOCUMENT TEXT:\n"${value.text}"\n\nOUTPUT FORMAT (JSON only):{ "raw_tokens": ["extracted_amount1"], "currency_hint": "detected_currency_code", "confidence": 0.85 }\n\nRESPOND WITH ONLY THE JSON OBJECT.`;
    }

    const result = await processWithGemini(
      extractionPrompt,
      imageBuffer,
      "step1"
    );

    let normalized = { ...result };

    if (Array.isArray(result)) {
      normalized.raw_tokens = result;
    } else if (result && Array.isArray(result.raw_tokens)) {
      // already ok
    } else if (result && typeof result.raw_tokens === "string") {
      try {
        normalized.raw_tokens = JSON.parse(result.raw_tokens);
        if (!Array.isArray(normalized.raw_tokens))
          normalized.raw_tokens = extractTokensFromString(result.raw_tokens);
      } catch (e) {
        normalized.raw_tokens = extractTokensFromString(result.raw_tokens);
      }
    } else if (result && Array.isArray(result.candidates)) {
      const candidateText = result.candidates
        .map((c) => {
          if (!c) return "";
          if (Array.isArray(c.content)) {
            return c.content
              .map((cc) => {
                if (!cc) return "";
                if (Array.isArray(cc.parts))
                  return cc.parts
                    .map((p) => p.text || p.output_text || "")
                    .join("");
                return cc.text || cc.output_text || "";
              })
              .join("");
          }
          return c.output_text || c.text || "";
        })
        .join("\n");
      normalized.raw_tokens = extractTokensFromString(candidateText);
    } else if (typeof result === "string") {
      normalized.raw_tokens = extractTokensFromString(result);
    } else if (result && result.output) {
      const outText =
        typeof result.output === "string"
          ? result.output
          : JSON.stringify(result.output);
      normalized.raw_tokens = extractTokensFromString(outText);
    } else {
      normalized.raw_tokens = [];
    }

    if (
      !normalized.raw_tokens ||
      !Array.isArray(normalized.raw_tokens) ||
      normalized.raw_tokens.length === 0
    ) {
      const allStrings = collectStrings(result);
      const fallbackTokens = extractTokensFromString(allStrings);
      if (fallbackTokens && fallbackTokens.length > 0)
        normalized.raw_tokens = fallbackTokens;
    }

    if (
      !normalized.raw_tokens ||
      !Array.isArray(normalized.raw_tokens) ||
      normalized.raw_tokens.length === 0
    ) {
      console.error("Extraction result (raw):", result);
      throw new Error(
        "Invalid extraction result structure: no raw_tokens produced by AI"
      );
    }

    res.json({ ...normalized, processing_time_ms: Date.now() - startTime });
  } catch (error) {
    console.error("Step 1 Error:", error);
    res
      .status(500)
      .json({
        status: "error",
        reason: "ocr_processing_failed",
        message: error.message,
        processing_time_ms: Date.now() - startTime,
      });
  }
};

module.exports = { step1Extract };
