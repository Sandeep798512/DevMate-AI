/**
 * DevMate AI — Backend Server v3
 * Production-ready with JWT Auth, MongoDB, Rate Limiting, Helmet
 * Chat Management added in this version
 */

const express   = require("express");
const cors      = require("cors");
const helmet    = require("helmet");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const connectDB            = require("./config/db");
const { errorHandler }     = require("./middleware/errorHandler");
const { protect }          = require("./middleware/auth");

// ── Route imports ─────────────────────────────────────────────────────────────
const authRoutes   = require("./routes/auth");
const aiRoutes     = require("./routes/ai");
const githubRoutes = require("./routes/github");
const uploadRoutes = require("./routes/upload");
const chatRoutes   = require("./routes/chats");
const shareRoutes  = require("./routes/share");

const app  = express();
// app.set("trust proxy", 1);
const PORT = process.env.PORT || 3000;

// ── Connect MongoDB ───────────────────────────────────────────────────────────
connectDB();

// ── Helmet ────────────────────────────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: false, contentSecurityPolicy: false }));

// ── CORS ──────────────────────────────────────────────────────────────────────
const allowedOrigins = [
  process.env.FRONTEND_ORIGIN || "http://localhost:5500",
  "http://127.0.0.1:5500",
  "http://localhost:5500",
  "http://127.0.0.1:5501",
  "http://localhost:5501",
  "http://127.0.0.1:5502",
  "http://localhost:5502",
  "http://localhost:5173",
  "http://localhost:3001",
];

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error("Not allowed by CORS"));
  },
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
}));

// ── Body Parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ── Rate Limiting ─────────────────────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: "Too many attempts. Please wait 15 minutes." },
  standardHeaders: true, legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: "Too many requests. Please slow down." },
  standardHeaders: true, legacyHeaders: false,
});

app.use("/api/auth", authLimiter);
app.use("/api",      apiLimiter);

// ── Health Check ──────────────────────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.json({
    status:    "ok",
    version:   "3.1.0",
    timestamp: new Date().toISOString(),
    aiMode:    process.env.GEMINI_API_KEY ? "gemini" : "demo",
    ai:        process.env.GEMINI_API_KEY ? "gemini" : "demo",
    db:        process.env.MONGODB_URI    ? "mongodb" : "none",
    email:     process.env.EMAIL_USER     ? "gmail"   : "none",
  });
});

// ── Routes ────────────────────────────────────────────────────────────────────

// Public auth routes
app.use("/api/auth",   authRoutes);

// Public share route (no authentication required)
app.use("/api/share",  shareRoutes);

// Protected routes — all require JWT via protect middleware
app.use("/api",        protect, aiRoutes);
app.use("/api/github", protect, githubRoutes);
app.use("/api/upload", protect, uploadRoutes);
app.use("/api/chats",  protect, chatRoutes);

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });
});

// ── Error Handler ─────────────────────────────────────────────────────────────
app.use(errorHandler);

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 DevMate AI v3.1 — http://localhost:${PORT}`);
  console.log(`   AI    : ${process.env.GEMINI_API_KEY ? "✅ Gemini"  : "⚠️  Demo mode"}`);
  console.log(`   DB    : ${process.env.MONGODB_URI    ? "✅ MongoDB" : "⚠️  No database"}`);
  console.log(`   Email : ${process.env.EMAIL_USER     ? "✅ Gmail"   : "⚠️  Not configured"}`);
  console.log(`   Auth  : ${process.env.JWT_SECRET     ? "✅ JWT"     : "⚠️  No JWT secret"}`);
  console.log(`   Chats : ✅ Chat management enabled\n`);
});

module.exports = app;
