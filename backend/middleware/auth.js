/**
 * DevMate AI — middleware/auth.js (FIXED)
 *
 * CHANGE: protect() no longer returns 401 when token is missing.
 * It passes through as guest so AI works with AND without login.
 * Use requireAuth() only for routes that strictly need a logged-in user.
 */

const { verifyAccessToken } = require("../utils/jwt");
const User = require("../models/User");

// ── protect ── optional auth, always passes through ───────────────────────────
async function protect(req, res, next) {
  // No MongoDB configured → demo mode, skip auth
  if (!process.env.MONGODB_URI) {
    req.user = { _id: "demo", name: "Demo User", email: "demo@devmate.ai", isGuest: false };
    return next();
  }

  const header = req.headers.authorization;

  // No token → treat as guest, still allow AI access
  if (!header || !header.startsWith("Bearer ")) {
    req.user = { _id: "guest", name: "Guest", email: "guest@devmate.ai", isGuest: true };
    return next();
  }

  const token = header.split(" ")[1];

  try {
    const decoded = verifyAccessToken(token);
    if (decoded.type !== "access") throw new Error("Invalid token type");

    const user = await User.findById(decoded.id);
    if (!user) {
      // User deleted — treat as guest rather than blocking
      req.user = { _id: "guest", name: "Guest", email: "guest@devmate.ai", isGuest: true };
      return next();
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      // Expired token → return 401 with code so frontend can refresh
      return res.status(401).json({
        error: "Session expired. Please refresh your token.",
        code: "TOKEN_EXPIRED",
      });
    }
    // Any other token error → treat as guest (don't hard-block)
    req.user = { _id: "guest", name: "Guest", email: "guest@devmate.ai", isGuest: true };
    return next();
  }
}

// ── requireAuth ── strict auth, use for profile/history routes only ────────────
async function requireAuth(req, res, next) {
  if (!process.env.MONGODB_URI) return next();

  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Please log in to use this feature.", code: "NO_TOKEN" });
  }

  const token = header.split(" ")[1];
  try {
    const decoded = verifyAccessToken(token);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ error: "User not found.", code: "USER_NOT_FOUND" });
    req.user = user;
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Session expired. Please refresh.", code: "TOKEN_EXPIRED" });
    }
    return res.status(401).json({ error: "Invalid token. Please log in again.", code: "INVALID_TOKEN" });
  }
}

// ── requireVerified ── use after protect() when email must be verified ─────────
function requireVerified(req, res, next) {
  if (!process.env.MONGODB_URI) return next();
  if (!req.user.isVerified) {
    return res.status(403).json({
      error: "Please verify your email address first.",
      code: "EMAIL_NOT_VERIFIED",
    });
  }
  next();
}

module.exports = { protect, requireAuth, requireVerified };