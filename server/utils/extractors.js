// Utility helpers for extracting tokens, numbers and collecting strings
const extractTokensFromString = (str) => {
  if (!str || typeof str !== "string") return [];
  const tokenRegex =
    /(?:₹|Rs\.?|INR|\$|USD|€|EUR|£|GBP)?\s*\d{1,3}(?:[,\.\s]\d{3})*(?:\.\d+)?%?|\d+(?:\.\d+)?%?|(?:₹|Rs\.?|INR|\$|USD|€|EUR|£|GBP)/gi;
  const matches = str.match(tokenRegex);
  return matches ? matches.map((s) => s.trim()) : [];
};

const extractNumbersFromString = (s) => {
  if (!s || typeof s !== "string") return [];
  const numRegex = /\d{1,3}(?:[,\.\s]\d{3})*(?:\.\d+)?%?|\d+(?:\.\d+)?/g;
  const matches = s.match(numRegex) || [];
  return matches
    .map((m) => m.replace(/[,%\s]/g, ""))
    .map((m) => {
      if (m.endsWith("%")) return parseFloat(m.replace("%", ""));
      return parseFloat(m);
    })
    .filter((n) => !Number.isNaN(n));
};

const collectStrings = (obj) => {
  let acc = [];
  const helper = (v) => {
    if (v === null || v === undefined) return;
    if (typeof v === "string") return acc.push(v);
    if (typeof v === "number" || typeof v === "boolean")
      return acc.push(String(v));
    if (Array.isArray(v)) return v.forEach(helper);
    if (typeof v === "object") return Object.values(v).forEach(helper);
  };
  helper(obj);
  return acc.join("\n");
};

const detectCurrencyFromText = (text) => {
  if (!text) return "unknown";
  if (text.includes("₹") || /\bINR\b|Rs\.?/i.test(text)) return "INR";
  if (text.includes("$") || /\bUSD\b/i.test(text)) return "USD";
  if (text.includes("€") || /\bEUR\b/i.test(text)) return "EUR";
  if (text.includes("£") || /\bGBP\b/i.test(text)) return "GBP";
  return "unknown";
};

module.exports = {
  extractTokensFromString,
  extractNumbersFromString,
  collectStrings,
  detectCurrencyFromText,
};
