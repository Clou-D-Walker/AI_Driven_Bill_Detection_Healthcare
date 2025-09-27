const { GoogleGenAI } = require("@google/genai");
const dotenv = require("dotenv");
dotenv.config();

const ai = new GoogleGenAI({
  apiKey:
    process.env.GEMINI_API_KEY || "AIzaSyBAllIHSm7HVa5Wgcn6XQkQYFWidG7g1t0",
});

// processWithGemini: wrapper that normalizes many SDK/REST response shapes
const processWithGemini = async (
  prompt,
  imageBuffer = null,
  step = "general"
) => {
  try {
    let contents = prompt;

    if (imageBuffer) {
      const base64Image = imageBuffer.toString("base64");
      contents = [
        { text: prompt },
        {
          inlineData: {
            mimeType: "image/jpeg",
            data: base64Image,
          },
        },
      ];
    }

    // Retry with exponential backoff for transient errors (e.g., 503)
    const maxAttempts = 3;
    let response = null;
    let lastErr = null;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        response = await ai.models.generateContent({
          model: "gemini-2.0-flash",
          contents: contents,
          config: {
            thinkingConfig: {
              thinkingBudget: 0,
            },
          },
        });
        break; // success
      } catch (err) {
        lastErr = err;
        console.warn(
          `Gemini attempt ${attempt} failed:`,
          err && err.message ? err.message : err
        );
        if (attempt < maxAttempts) {
          // exponential backoff: 500ms, 1000ms, ...
          const delay = 500 * Math.pow(2, attempt - 1);
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }
        // no more retries
        throw err;
      }
    }

    const extractTextFromResponse = (resp) => {
      try {
        if (!resp) return "";
        if (typeof resp.text === "function") return resp.text();
        if (typeof resp.output_text === "string") return resp.output_text;

        if (Array.isArray(resp.output)) {
          return resp.output
            .map((o) => {
              if (!o) return "";
              if (Array.isArray(o.content)) {
                return o.content
                  .map((c) => {
                    if (!c) return "";
                    if (Array.isArray(c.parts)) {
                      return c.parts
                        .map((p) => p.text || p.output_text || "")
                        .join("");
                    }
                    if (Array.isArray(c.content)) {
                      return c.content
                        .map((cc) => cc.text || cc.output_text || "")
                        .join("");
                    }
                    return c.text || c.output_text || "";
                  })
                  .join("");
              }
              return o.text || "";
            })
            .join("\n");
        }

        if (Array.isArray(resp.candidates)) {
          return resp.candidates
            .map((c) => {
              if (!c) return "";
              if (Array.isArray(c.content)) {
                return c.content
                  .map((cc) => {
                    if (!cc) return "";
                    if (Array.isArray(cc.parts)) {
                      return cc.parts
                        .map((p) => p.text || p.output_text || "")
                        .join("");
                    }
                    return cc.text || cc.output_text || "";
                  })
                  .join("");
              }
              return c.output_text || c.text || "";
            })
            .join("\n");
        }

        if (typeof resp === "string") return resp;
        return JSON.stringify(resp);
      } catch (e) {
        return "";
      }
    };

    let responseText = extractTextFromResponse(response);
    responseText = responseText
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    const tryParse = (text) => {
      try {
        return JSON.parse(text);
      } catch (e) {
        return null;
      }
    };

    let parsed = tryParse(responseText);
    if (!parsed) {
      const objMatch = responseText.match(/(\{[\s\S]*\})/);
      if (objMatch) parsed = tryParse(objMatch[1]);
    }
    if (!parsed) {
      const arrMatch = responseText.match(/(\[[\s\S]*\])/);
      if (arrMatch) parsed = tryParse(arrMatch[1]);
    }

    if (!parsed && typeof response === "object" && response !== null) {
      if (
        response.raw_tokens ||
        response.amounts ||
        response.normalized_amounts
      ) {
        return response;
      }
      const fallbackText = JSON.stringify(response);
      parsed =
        tryParse(fallbackText) ||
        tryParse((fallbackText.match(/(\{[\s\S]*\})/) || [])[1]) ||
        tryParse((fallbackText.match(/(\[[\s\S]*\])/) || [])[1]);
    }

    if (parsed) return parsed;

    const preview = (responseText || "").slice(0, 1000);
    console.error(
      `JSON Parse Error in ${step}: Unable to parse JSON from model response.`
    );
    console.error("Response preview (first 1000 chars):", preview);
    throw new Error(`Invalid JSON response from AI model in ${step}`);
  } catch (error) {
    console.error(`Gemini API Error in ${step}:`, error);
    throw new Error(`AI processing failed in ${step}: ` + error.message);
  }
};

module.exports = { ai, processWithGemini };
