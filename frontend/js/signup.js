/* ==========================================================
   DevMate AI — signup.js v3
   Real JWT registration + email verification OTP.
   All existing IDs and form logic preserved.
   ========================================================== */

const signupForm       = document.getElementById("signupForm");
const password         = document.getElementById("password");
const confirmPassword  = document.getElementById("confirmPassword");
const togglePassword   = document.getElementById("togglePassword");
const strengthBar      = document.getElementById("strengthBar");
const strengthText     = document.getElementById("strengthText");
const terms            = document.getElementById("terms");
const toast            = document.getElementById("toast");

// const API_BASE = "http://localhost:3000/api";
const API_BASE = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
  ? "http://localhost:3000/api"
  : "https://devmate-t7qm.onrender.com/api";

// ── Password Toggle (unchanged) ──────────────────────────────────────────────

togglePassword.addEventListener("click", () => {
  if (password.type === "password") {
    password.type = "text";
    togglePassword.textContent = "🙈";
  } else {
    password.type = "password";
    togglePassword.textContent = "👁️";
  }
});

// Confirm password toggle (if exists)
const toggleConfirm = document.getElementById("toggleConfirmPassword");
if (toggleConfirm) {
  toggleConfirm.addEventListener("click", () => {
    if (confirmPassword.type === "password") {
      confirmPassword.type = "text";
      toggleConfirm.textContent = "🙈";
    } else {
      confirmPassword.type = "password";
      toggleConfirm.textContent = "👁️";
    }
  });
}

// ── Password Strength (unchanged) ────────────────────────────────────────────

password.addEventListener("input", () => {
  const value = password.value;
  let strength = 0;
  if (value.length >= 8)              strength++;
  if (/[A-Z]/.test(value))           strength++;
  if (/[0-9]/.test(value))           strength++;
  if (/[^A-Za-z0-9]/.test(value))    strength++;

  switch (strength) {
    case 0:
    case 1:
      strengthBar.style.width      = "25%";
      strengthBar.style.background = "#ef4444";
      strengthText.innerText       = "Weak Password";
      break;
    case 2:
      strengthBar.style.width      = "50%";
      strengthBar.style.background = "#f59e0b";
      strengthText.innerText       = "Medium Password";
      break;
    case 3:
      strengthBar.style.width      = "75%";
      strengthBar.style.background = "#3b82f6";
      strengthText.innerText       = "Strong Password";
      break;
    case 4:
      strengthBar.style.width      = "100%";
      strengthBar.style.background = "#10b981";
      strengthText.innerText       = "Very Strong Password";
      break;
  }
});

// ── Toast (unchanged) ────────────────────────────────────────────────────────

function showToast(message, color = "#10b981") {
  toast.innerText    = message;
  toast.style.background = color;
  toast.style.display    = "block";
  toast.style.opacity    = "1";
  setTimeout(() => { toast.style.display = "none"; }, 3000);
}

// ── Signup Submit ─────────────────────────────────────────────────────────────

signupForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  // Support both id="name" and id="fullName" (original uses fullName)
  const nameEl = document.getElementById("name") || document.getElementById("fullName");
  const name   = nameEl ? nameEl.value.trim() : "";
  const email  = document.getElementById("email").value.trim();
  const pass   = password.value;
  const confirm = confirmPassword.value;

  // Client-side validation (same as before)
  if (name.length < 3) {
    showToast("Enter valid full name", "#ef4444");
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showToast("Enter valid email", "#ef4444");
    return;
  }
  if (pass.length < 6) {
    showToast("Password must be at least 6 characters", "#ef4444");
    return;
  }
  if (pass !== confirm) {
    showToast("Passwords do not match", "#ef4444");
    return;
  }
  if (terms && !terms.checked) {
    showToast("Accept Terms & Conditions", "#ef4444");
    return;
  }

  // Loading state
  const submitBtn = signupForm.querySelector(".login-btn") || signupForm.querySelector("[type=submit]");
  if (submitBtn) {
    submitBtn.disabled   = true;
    submitBtn.innerHTML  = `Creating account...`;
  }

  try {
    const res  = await fetch(`${API_BASE}/auth/signup`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ name, email, password: pass }),
    });

    const data = await res.json();

    if (!res.ok) {
      showToast(data.error || "Signup failed.", "#ef4444");
      return;
    }

    // Save session
    localStorage.setItem("devmate_access",  data.accessToken);
    localStorage.setItem("devmate_refresh", data.refreshToken);
    localStorage.setItem("devmate-user",    JSON.stringify(data.user));

    showToast("Account Created Successfully! Check your email for OTP.", "#10b981");

    setTimeout(() => {
      // If email verification page exists, go there; else go to app
      window.location.href = "login.html";
    }, 1500);

  } catch {
    showToast("Cannot reach server. Make sure the backend is running.", "#ef4444");
  } finally {
    if (submitBtn) {
      submitBtn.disabled  = false;
      submitBtn.innerHTML = "Create Account";
    }
  }
});
