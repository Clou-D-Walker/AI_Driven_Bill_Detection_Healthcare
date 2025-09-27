const express = require("express");
const router = express.Router();
const upload = require("../middleware/upload");
const { step1Extract } = require("../controllers/step1");
const { step2Normalize } = require("../controllers/step2");
const { step3Classify } = require("../controllers/step3");
const { step4Finalize } = require("../controllers/step4");
const { completeProcess } = require("../controllers/process");

// Health
router.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    uptime: process.uptime(),
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
});

// Steps
router.post(
  "/medical-amounts/step1/extract",
  upload.single("image"),
  step1Extract
);
router.post("/medical-amounts/step2/normalize", step2Normalize);
router.post("/medical-amounts/step3/classify", step3Classify);
router.post("/medical-amounts/step4/finalize", step4Finalize);
router.post(
  "/medical-amounts/process",
  upload.single("image"),
  completeProcess
);

router.get("/medical-amounts/supported-currencies", (req, res) => {
  res.json({
    currencies: [
      { code: "INR", symbol: "₹", name: "Indian Rupee" },
      { code: "USD", symbol: "$", name: "US Dollar" },
      { code: "EUR", symbol: "€", name: "Euro" },
      { code: "GBP", symbol: "£", name: "British Pound" },
      { code: "CAD", symbol: "C$", name: "Canadian Dollar" },
      { code: "AUD", symbol: "A$", name: "Australian Dollar" },
    ],
  });
});

router.get("/docs", (req, res) => {
  res.json({
    title: "Medical Document Amount Detection API",
    version: "1.0.0",
    description: "AI-powered medical document processing service",
    endpoints: {
      "POST /api/medical-amounts/step1/extract": "OCR/Text extraction",
      "POST /api/medical-amounts/step2/normalize": "Amount normalization",
      "POST /api/medical-amounts/step3/classify": "Context classification",
      "POST /api/medical-amounts/step4/finalize": "Final structured output",
      "POST /api/medical-amounts/process": "Complete pipeline",
      "GET /api/medical-amounts/supported-currencies": "Supported currencies",
      "GET /api/health": "Health check",
      "GET /api/docs": "This documentation",
    },
    swagger_ui: "/api/swagger",
  });
});

module.exports = router;
