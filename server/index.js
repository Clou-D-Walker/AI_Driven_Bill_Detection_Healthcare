const express = require("express");
const cors = require("cors");
const path = require("path");
const dotenv = require("dotenv");
const apiRouter = require("./routes/api");

dotenv.config();

const fs = require("fs");
const app = express();
const PORT = process.env.PORT || 3001;

if (process.env.NODE_ENV !== "production") {
  console.log("Running in development mode");
  app.use(
    cors({
      origin: ["http://localhost:5173", "http://10.253.171.10:5173/"],
      methods: ["GET", "POST", "PUT", "DELETE"],
      credentials: true, // allow frontend to send cookies
    })
  );
} else {
  // in production, use permissive CORS by default (adjust if needed)
  app.use(cors());
}

app.use(express.json({ limit: "50mb" }));

// Prefer serving a built frontend from frontend/dist, fall back to ../dist
const frontendDistCandidates = [
  path.join(__dirname, "..", "frontend", "dist"),
  path.join(__dirname, "..", "dist"),
];
const frontendDist = frontendDistCandidates.find((p) => fs.existsSync(p));
if (frontendDist) {
  console.log(`Serving frontend from ${frontendDist}`);
  app.use(express.static(frontendDist));
  // SPA fallback for client-side routing, but pass through /api routes
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) return next();
    res.sendFile(path.join(frontendDist, "index.html"));
  });
} else {
  app.use(express.static(path.join(__dirname, "public")));
}

// mount API under /api
app.use("/api", apiRouter);

// Generic error handler
app.use((err, req, res, next) => {
  console.error("Unhandled Error:", err);
  if (err && err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({
      status: "error",
      reason: "file_too_large",
      message: "File size exceeds 10MB limit",
    });
  }
  if (err && err.message && err.message.includes("Invalid file type")) {
    return res.status(400).json({
      status: "error",
      reason: "invalid_file_type",
      message: "Only JPG, PNG, and PDF files are allowed",
    });
  }
  res.status(500).json({
    status: "error",
    reason: "internal_server_error",
    message: err.message || "An unexpected error occurred",
  });
});

// 404
app.use((req, res) =>
  res.status(404).json({
    status: "error",
    reason: "endpoint_not_found",
    message: "The requested endpoint does not exist",
  })
);

app.listen(PORT, () => {
  console.log(
    `🚀 Medical AI Document Processing Server running on port ${PORT}`
  );
  console.log(`📚 API Documentation: http://localhost:${PORT}/api/docs`);
  console.log(`🏥 Health Check: http://localhost:${PORT}/api/health`);
  if (!process.env.GEMINI_API_KEY)
    console.warn("⚠️  Warning: GEMINI_API_KEY environment variable not set");
});
