const express  = require("express");
const crypto   = require("crypto");
const router   = express.Router();
const bcrypt   = require("bcryptjs");

const User     = require("../models/User");
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require("../utils/jwt");
const { sendVerificationEmail, sendPasswordResetEmail }         = require("../utils/email");
const { protect }                                               = require("../middleware/auth");

// ── Helper: generate 6-digit OTP ─────────────────────────────────────────────
function generateOtp() {
  return crypto.randomInt(100000, 999999).toString();
}

// ── Helper: send tokens in response ──────────────────────────────────────────
function sendTokens(res, user) {
  const accessToken  = signAccessToken(user._id);
  const refreshToken = signRefreshToken(user._id);
  return { accessToken, refreshToken, user };
}

// ── Diagnostic: test email sending from Render ──────────────────────────────
router.get("/test-email", async (req, res) => {
  const nodemailer = require("nodemailer");
  const pass = (process.env.EMAIL_PASS || "").replace(/\s+/g, "");
  const user = process.env.EMAIL_USER;

  if (!user || !pass) {
    return res.json({
      status: "error",
      message: "EMAIL_USER or EMAIL_PASS environment variable is missing on server",
      hasUser: Boolean(user),
      hasPass: Boolean(pass),
    });
  }

  const transport = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false, // use STARTTLS
    auth: { user, pass },
    tls: {
      rejectUnauthorized: false
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });

  try {
    const verify = await transport.verify();
    const info = await transport.sendMail({
      from: `"DevMate AI" <${user}>`,
      to: req.query.to || user,
      subject: "DevMate AI Diagnostic Test Email",
      text: "If you receive this, Render email sending is 100% working!",
    });
    return res.json({
      status: "success",
      verify,
      messageId: info.messageId,
      response: info.response,
      sentTo: req.query.to || user,
    });
  } catch (err) {
    return res.status(500).json({
      status: "failed",
      error: err.message,
      code: err.code,
      command: err.command,
      response: err.response,
      responseCode: err.responseCode,
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/signup
// ─────────────────────────────────────────────────────────────────────────────
router.post("/signup", async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    // Validate fields
    if (!name || !email || !password)
      return res.status(400).json({ error: "Name, email, and password are required." });
    if (name.trim().length < 3)
      return res.status(400).json({ error: "Name must be at least 3 characters." });
    if (!/^\S+@\S+\.\S+$/.test(email))
      return res.status(400).json({ error: "Please enter a valid email address." });
    if (password.length < 6)
      return res.status(400).json({ error: "Password must be at least 6 characters." });

    // Check duplicate
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing)
      return res.status(409).json({ error: "An account with this email already exists. Please log in." });

    // Generate email verification OTP
    const otp       = generateOtp();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 min

    // Create user
    const user = await User.create({
      name:           name.trim(),
      email:          email.toLowerCase(),
      password,
      emailOtp:       otp,
      emailOtpExpiry: otpExpiry,
      isVerified:     false,
    });

    // Send verification email
    await sendVerificationEmail(user.email, user.name, otp);

    // Issue tokens
    const { accessToken, refreshToken } = sendTokens(res, user);

    // Store hashed refresh token
    const hashedRefresh = await bcrypt.hash(refreshToken, 8);
    user.refreshTokens.push(hashedRefresh);
    await user.save({ validateBeforeSave: false });

    res.status(201).json({
      message: "Account created! Please check your email for the verification OTP.",
      accessToken,
      refreshToken,
      user,
    });
  } catch (err) { next(err); }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/verify-email
// ─────────────────────────────────────────────────────────────────────────────
router.post("/verify-email", protect, async (req, res, next) => {
  try {
    const { otp } = req.body;
    if (!otp) return res.status(400).json({ error: "OTP is required." });

    const user = await User.findById(req.user._id)
      .select("+emailOtp +emailOtpExpiry");

    if (!user)
      return res.status(404).json({ error: "User not found." });
    if (user.isVerified)
      return res.status(400).json({ error: "Email is already verified." });
    if (!user.emailOtp || user.emailOtp !== otp)
      return res.status(400).json({ error: "Invalid OTP. Please try again." });
    if (user.emailOtpExpiry < new Date())
      return res.status(400).json({ error: "OTP has expired. Please request a new one." });

    user.isVerified     = true;
    user.emailOtp       = undefined;
    user.emailOtpExpiry = undefined;
    await user.save({ validateBeforeSave: false });

    res.json({ message: "Email verified successfully! You can now use all features.", user });
  } catch (err) { next(err); }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/resend-verification
// ─────────────────────────────────────────────────────────────────────────────
router.post("/resend-verification", protect, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user)       return res.status(404).json({ error: "User not found." });
    if (user.isVerified) return res.status(400).json({ error: "Email already verified." });

    const otp           = generateOtp();
    user.emailOtp       = otp;
    user.emailOtpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    await user.save({ validateBeforeSave: false });

    await sendVerificationEmail(user.email, user.name, otp);
    res.json({ message: "Verification OTP resent to your email." });
  } catch (err) { next(err); }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/login
// ─────────────────────────────────────────────────────────────────────────────
router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: "Email and password are required." });

    // Explicitly select password and refreshTokens
    const user = await User.findOne({ email: email.toLowerCase() })
      .select("+password +refreshTokens");

    if (!user || !(await user.comparePassword(password)))
      return res.status(401).json({ error: "Invalid email or password." });

    // Issue tokens
    const accessToken  = signAccessToken(user._id);
    const refreshToken = signRefreshToken(user._id);

    // Store hashed refresh token (max 5 active sessions)
    const hashedRefresh = await bcrypt.hash(refreshToken, 8);
    user.refreshTokens = [...(user.refreshTokens || []), hashedRefresh].slice(-5);
    user.lastLogin     = new Date();
    await user.save({ validateBeforeSave: false });

    res.json({
      message: "Login successful.",
      accessToken,
      refreshToken,
      user,
    });
  } catch (err) { next(err); }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/refresh
// Get new access token using refresh token
// ─────────────────────────────────────────────────────────────────────────────
router.post("/refresh", async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken)
      return res.status(400).json({ error: "Refresh token is required." });

    // Verify refresh token signature
    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch {
      return res.status(401).json({ error: "Invalid or expired refresh token. Please log in again." });
    }

    if (decoded.type !== "refresh")
      return res.status(401).json({ error: "Invalid token type." });

    // Check if refresh token exists in DB (rotation check)
    const user = await User.findById(decoded.id).select("+refreshTokens");
    if (!user)
      return res.status(401).json({ error: "User not found." });

    // Verify against stored hashes
    let tokenValid = false;
    let tokenIndex = -1;
    for (let i = 0; i < user.refreshTokens.length; i++) {
      const match = await bcrypt.compare(refreshToken, user.refreshTokens[i]);
      if (match) { tokenValid = true; tokenIndex = i; break; }
    }

    if (!tokenValid)
      return res.status(401).json({ error: "Refresh token reuse detected. Please log in again." });

    // Rotate refresh token
    const newRefreshToken = signRefreshToken(user._id);
    const newAccessToken  = signAccessToken(user._id);
    const hashedNew       = await bcrypt.hash(newRefreshToken, 8);

    // Replace old token with new one
    user.refreshTokens[tokenIndex] = hashedNew;
    await user.save({ validateBeforeSave: false });

    res.json({
      accessToken:  newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (err) { next(err); }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/logout
// ─────────────────────────────────────────────────────────────────────────────
router.post("/logout", protect, async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    const user = await User.findById(req.user._id).select("+refreshTokens");
    if (!user) return res.status(404).json({ error: "User not found." });

    if (refreshToken) {
      // Remove only this session's token
      const remaining = [];
      for (const storedHash of user.refreshTokens) {
        const match = await bcrypt.compare(refreshToken, storedHash);
        if (!match) remaining.push(storedHash);
      }
      user.refreshTokens = remaining;
    } else {
      // Logout all sessions
      user.refreshTokens = [];
    }

    await user.save({ validateBeforeSave: false });
    res.json({ message: "Logged out successfully." });
  } catch (err) { next(err); }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/forgot-password
// ─────────────────────────────────────────────────────────────────────────────
router.post("/forgot-password", async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required." });

    const user = await User.findOne({ email: email.toLowerCase() });

    // Always return success (prevents email enumeration attacks)
    if (!user) {
      return res.json({ message: "If this email is registered, you'll receive a reset OTP." });
    }

    const otp           = generateOtp();
    user.resetOtp       = otp;
    user.resetOtpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    await user.save({ validateBeforeSave: false });

    await sendPasswordResetEmail(user.email, user.name, otp);

    res.json({ message: "If this email is registered, you'll receive a reset OTP." });
  } catch (err) { next(err); }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/verify-reset-otp
// ─────────────────────────────────────────────────────────────────────────────
router.post("/verify-reset-otp", async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp)
      return res.status(400).json({ error: "Email and OTP are required." });

    const user = await User.findOne({ email: email.toLowerCase() })
      .select("+resetOtp +resetOtpExpiry");

    if (!user || user.resetOtp !== otp || user.resetOtpExpiry < new Date())
      return res.status(400).json({ error: "Invalid or expired OTP." });

    // Issue a short-lived reset token (15 min)
    const resetToken = require("jsonwebtoken").sign(
      { id: user._id, type: "reset" },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    // Invalidate OTP
    user.resetOtp       = undefined;
    user.resetOtpExpiry = undefined;
    await user.save({ validateBeforeSave: false });

    res.json({ resetToken, message: "OTP verified. You may now reset your password." });
  } catch (err) { next(err); }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/reset-password
// ─────────────────────────────────────────────────────────────────────────────
router.post("/reset-password", async (req, res, next) => {
  try {
    const { resetToken, password } = req.body;
    if (!resetToken || !password)
      return res.status(400).json({ error: "Reset token and new password are required." });
    if (password.length < 6)
      return res.status(400).json({ error: "Password must be at least 6 characters." });

    let decoded;
    try {
      decoded = require("jsonwebtoken").verify(resetToken, process.env.JWT_SECRET);
    } catch {
      return res.status(400).json({ error: "Invalid or expired reset token." });
    }

    if (decoded.type !== "reset")
      return res.status(400).json({ error: "Invalid reset token." });

    const user = await User.findById(decoded.id).select("+refreshTokens");
    if (!user) return res.status(404).json({ error: "User not found." });

    // Update password & invalidate ALL sessions for security
    user.password      = password;
    user.refreshTokens = [];
    await user.save();

    res.json({ message: "Password reset successfully. Please log in with your new password." });
  } catch (err) { next(err); }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/auth/me
// Get current user profile
// ─────────────────────────────────────────────────────────────────────────────
router.get("/me", protect, (req, res) => {
  res.json({ user: req.user });
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/auth/profile
// Update name or avatar
// ─────────────────────────────────────────────────────────────────────────────
router.patch("/profile", protect, async (req, res, next) => {
  try {
    const { name, avatar } = req.body;
    const update = {};
    if (name && name.trim().length >= 3) update.name   = name.trim();
    if (avatar !== undefined)            update.avatar = avatar;

    const user = await User.findByIdAndUpdate(req.user._id, update, { new: true });
    res.json({ user, message: "Profile updated." });
  } catch (err) { next(err); }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/guest
// Guest login — no email/password needed
// ─────────────────────────────────────────────────────────────────────────────
router.post("/guest", async (req, res, next) => {
  try {
    // Generate a unique guest user so different devices/sessions have independent chat histories
    const uniqueId = crypto.randomBytes(6).toString("hex");
    const guest = await User.create({
      name:       `Guest`,
      email:      `guest_${uniqueId}@devmate.ai`,
      isGuest:    true,
      isVerified: true,
      password:   crypto.randomBytes(20).toString("hex"),
    });

    const accessToken  = signAccessToken(guest._id);
    const refreshToken = signRefreshToken(guest._id);

    res.json({ accessToken, refreshToken, user: guest, message: "Continuing as guest." });
  } catch (err) { next(err); }
});

module.exports = router;
