const mongoose = require("mongoose");
const bcrypt   = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [3, "Name must be at least 3 characters"],
      maxlength: [50, "Name cannot exceed 50 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email"],
    },
    password: {
      type: String,
      minlength: [6, "Password must be at least 6 characters"],
      select: false,
    },
    isVerified: { type: Boolean, default: false },
    isGuest:    { type: Boolean, default: false },

    // Email verification OTP (6-digit, expires 10 min)
    emailOtp:       { type: String, select: false },
    emailOtpExpiry: { type: Date,   select: false },

    // Password reset OTP
    resetOtp:       { type: String, select: false },
    resetOtpExpiry: { type: Date,   select: false },

    // Hashed refresh tokens (supports multiple devices)
    refreshTokens: { type: [String], select: false, default: [] },

    avatar:   { type: String, default: "" },
    settings: {
      theme:    { type: String, default: "dark", enum: ["dark","light"] },
      fontSize: { type: Number, default: 14 },
    },
    totalChats:    { type: Number, default: 0 },
    totalMessages: { type: Number, default: 0 },
    lastLogin:     { type: Date },
  },
  { timestamps: true }
);

// Hash password before save
userSchema.pre("save", async function (next) {
  if (!this.isModified("password") || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare plain vs hashed password
userSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

// Remove all sensitive fields from JSON output
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.emailOtp;
  delete obj.emailOtpExpiry;
  delete obj.resetOtp;
  delete obj.resetOtpExpiry;
  delete obj.refreshTokens;
  return obj;
};

module.exports = mongoose.model("User", userSchema);
