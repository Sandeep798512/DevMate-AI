/* ==========================================================
   DevMate AI — forgot.js v3
   Real forgot password with OTP verification.
   All existing IDs preserved.
   ========================================================== */

const form  = document.getElementById("forgotForm");
const toast = document.getElementById("toast");

// const API_BASE = "http://localhost:3000/api";
const API_BASE = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
  ? "http://localhost:3000/api"
  : "https://devmate-t7qm.onrender.com/api";
// Tracks which step we're on: "email" | "otp" | "reset"
let currentStep  = "email";
let userEmail    = "";
let resetToken   = "";

// ── Toast (unchanged) ────────────────────────────────────────────────────────

function showToast(message, color = "#10b981") {
  toast.style.display    = "block";
  toast.style.background = color;
  toast.innerHTML        = message;
  setTimeout(() => { toast.style.display = "none"; }, 3000);
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ── Inject OTP step UI dynamically ───────────────────────────────────────────

function showOtpStep() {
  form.innerHTML = `
    <div class="input-group">
      <label>Enter OTP sent to ${userEmail}</label>
      <input type="text" id="otp" placeholder="6-digit OTP" maxlength="6"
             style="text-align:center;font-size:22px;letter-spacing:10px" required>
    </div>
    <button class="login-btn" type="submit">Verify OTP</button>
    <p class="signup-text" style="margin-top:14px">
      Didn't receive it?
      <a href="#" id="resendOtp">Resend OTP</a>
    </p>
    <p class="signup-text">
      <a href="login.html">← Back to Login</a>
    </p>
  `;
  document.getElementById("resendOtp").addEventListener("click", async (e) => {
    e.preventDefault();
    await sendOtp(true);
  });
}

function showResetStep() {
  form.innerHTML = `
    <div class="input-group">
      <label>New Password</label>
      <div class="password-box">
        <input type="password" id="newPassword" placeholder="Min. 6 characters" required>
        <button type="button" id="toggleNewPass"><i class="fa-solid fa-eye"></i></button>
      </div>
    </div>
    <div class="input-group">
      <label>Confirm Password</label>
      <input type="password" id="confirmNewPassword" placeholder="Re-enter password" required>
    </div>
    <button class="login-btn" type="submit">Reset Password</button>
  `;
  document.getElementById("toggleNewPass").addEventListener("click", function () {
    const inp  = document.getElementById("newPassword");
    const icon = this.querySelector("i");
    if (inp.type === "password") {
      inp.type = "text";
      icon.classList.replace("fa-eye", "fa-eye-slash");
    } else {
      inp.type = "password";
      icon.classList.replace("fa-eye-slash", "fa-eye");
    }
  });
}

// ── Step 1: Send OTP ─────────────────────────────────────────────────────────

async function sendOtp(isResend = false) {
  const emailInput = document.getElementById("email");
  if (!emailInput) return;
  const emailVal = emailInput.value.trim();

  if (!validateEmail(emailVal)) {
    showToast("Invalid Email", "#ef4444");
    return;
  }

  const btn = form.querySelector(".login-btn");
  btn.disabled   = true;
  btn.innerHTML  = `<i class="fa-solid fa-spinner fa-spin"></i> ${isResend ? "Resending..." : "Sending..."}`;

  try {
    const res  = await fetch(`${API_BASE}/auth/forgot-password`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ email: emailVal }),
    });

    // Always shows success message (prevents email enumeration)
    userEmail   = emailVal;
    currentStep = "otp";

    showToast(isResend
      ? "OTP resent! Check your email."
      : "OTP sent! Check your email.", "#10b981");

    setTimeout(() => { showOtpStep(); }, 1200);

  } catch {
    showToast("Cannot reach server. Make sure the backend is running.", "#ef4444");
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = "Send Reset Link"; }
  }
}

// ── Step 2: Verify OTP ───────────────────────────────────────────────────────

async function verifyOtp() {
  const otpVal = document.getElementById("otp")?.value.trim();
  if (!otpVal || otpVal.length < 6) {
    showToast("Please enter the 6-digit OTP.", "#ef4444");
    return;
  }

  const btn = form.querySelector(".login-btn");
  btn.disabled  = true;
  btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Verifying...`;

  try {
    const res  = await fetch(`${API_BASE}/auth/verify-reset-otp`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ email: userEmail, otp: otpVal }),
    });
    const data = await res.json();

    if (!res.ok) {
      showToast(data.error || "Invalid OTP.", "#ef4444");
      btn.disabled  = false;
      btn.innerHTML = "Verify OTP";
      return;
    }

    resetToken  = data.resetToken;
    currentStep = "reset";
    showToast("OTP verified!", "#10b981");
    setTimeout(() => { showResetStep(); }, 800);

  } catch {
    showToast("Cannot reach server.", "#ef4444");
    btn.disabled  = false;
    btn.innerHTML = "Verify OTP";
  }
}

// ── Step 3: Reset Password ───────────────────────────────────────────────────

async function resetPassword() {
  const newPass     = document.getElementById("newPassword")?.value;
  const confirmPass = document.getElementById("confirmNewPassword")?.value;

  if (!newPass || newPass.length < 6) {
    showToast("Password must be at least 6 characters.", "#ef4444");
    return;
  }
  if (newPass !== confirmPass) {
    showToast("Passwords do not match.", "#ef4444");
    return;
  }

  const btn = form.querySelector(".login-btn");
  btn.disabled  = true;
  btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Resetting...`;

  try {
    const res  = await fetch(`${API_BASE}/auth/reset-password`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ resetToken, password: newPass }),
    });
    const data = await res.json();

    if (!res.ok) {
      showToast(data.error || "Reset failed.", "#ef4444");
      btn.disabled  = false;
      btn.innerHTML = "Reset Password";
      return;
    }

    showToast("Password reset successfully! Redirecting to login...", "#10b981");
    setTimeout(() => { window.location.href = "login.html"; }, 1800);

  } catch {
    showToast("Cannot reach server.", "#ef4444");
    btn.disabled  = false;
    btn.innerHTML = "Reset Password";
  }
}

// ── Form Submit Router ────────────────────────────────────────────────────────

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (currentStep === "email")  await sendOtp();
  else if (currentStep === "otp")   await verifyOtp();
  else if (currentStep === "reset") await resetPassword();
});
