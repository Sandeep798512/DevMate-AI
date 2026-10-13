/* ==========================================================
   DevMate AI — login.js v3
   Real JWT authentication. All existing IDs preserved.
   ========================================================== */

const loginForm      = document.getElementById("loginForm");
const email          = document.getElementById("email");
const password       = document.getElementById("password");
const togglePassword = document.getElementById("togglePassword");
const googleBtn      = document.querySelector(".google-btn");
const loginBtn       = document.querySelector(".login-btn");
const guestBtn       = document.querySelector(".guest-btn");

// const API_BASE = "http://localhost:3000/api";
const API_BASE = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
  ? "http://localhost:3000/api"
  : "https://devmate-t7qm.onrender.com/api";

// ── Token helpers ────────────────────────────────────────────────────────────

function saveSession(accessToken, refreshToken, user) {
  localStorage.setItem("devmate_access",  accessToken);
  localStorage.setItem("devmate_refresh", refreshToken);
  localStorage.setItem("devmate-user",    JSON.stringify(user));
}

// ── Toast (unchanged from original) ─────────────────────────────────────────

function showToast(message, type = "success") {
  const toast = document.getElementById("toast");
  toast.innerText = message;
  toast.style.background = type === "success" ? "#10b981" : "#ef4444";
  toast.style.display = "block";
  toast.style.opacity = "1";
  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => { toast.style.display = "none"; }, 300);
  }, 3000);
}

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

// ── Email Validation (unchanged) ─────────────────────────────────────────────

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

// ── Loading State (unchanged) ────────────────────────────────────────────────

function setLoading(status) {
  loginBtn.disabled = status;
  loginBtn.innerHTML = status ? "Logging in..." : "Login";
}

// ── Remember Me — restore email on load ──────────────────────────────────────

window.addEventListener("DOMContentLoaded", () => {
  const savedEmail = localStorage.getItem("rememberEmail");
  if (savedEmail) {
    email.value = savedEmail;
    const rememberCheckbox = document.querySelector(".options input");
    if (rememberCheckbox) rememberCheckbox.checked = true;
  }

  // If already logged in, go straight to app
  const token = localStorage.getItem("devmate_access");
  const user  = localStorage.getItem("devmate-user");
  if (token && user) {
    window.location.href = "index.html";
  }
});

// ── Login Form Submit ────────────────────────────────────────────────────────

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const emailValue    = email.value.trim();
  const passwordValue = password.value.trim();

  // Client-side validation (same as before)
  if (!emailValue || !passwordValue) {
    showToast("Please fill all fields.", "error");
    return;
  }
  if (!isValidEmail(emailValue)) {
    showToast("Enter a valid email.", "error");
    return;
  }
  if (passwordValue.length < 6) {
    showToast("Password must be at least 6 characters.", "error");
    return;
  }

  setLoading(true);

  try {
    const res  = await fetch(`${API_BASE}/auth/login`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ email: emailValue, password: passwordValue }),
    });

    const data = await res.json();

    if (!res.ok) {
      // Show exact server error message
      showToast(data.error || "Login failed.", "error");
      return;
    }

    // Remember Me
    const rememberCheckbox = document.querySelector(".options input");
    if (rememberCheckbox?.checked) {
      localStorage.setItem("rememberEmail", emailValue);
    } else {
      localStorage.removeItem("rememberEmail");
    }

    // Save JWT tokens + user
    saveSession(data.accessToken, data.refreshToken, data.user);

    showToast("Login Successful");

    setTimeout(() => {
      window.location.href = "index.html";
    }, 1000);

  } catch (err) {
    // Network / server down
    showToast("Cannot reach server. Make sure the backend is running.", "error");
  } finally {
    setLoading(false);
  }
});

// ── Continue as Guest ────────────────────────────────────────────────────────

guestBtn.addEventListener("click", async () => {
  showToast("Continuing as Guest...");

  try {
    const res  = await fetch(`${API_BASE}/auth/guest`, { method: "POST" });
    const data = await res.json();

    if (res.ok) {
      saveSession(data.accessToken, data.refreshToken, data.user);
    } else {
      // Fallback: local guest mode
      localStorage.setItem("devmate-user", JSON.stringify({
        name: "Guest", email: "guest@devmate.ai", guest: true, loginTime: Date.now(),
      }));
    }
  } catch {
    // Offline fallback
    localStorage.setItem("devmate-user", JSON.stringify({
      name: "Guest", email: "guest@devmate.ai", guest: true, loginTime: Date.now(),
    }));
  }

  setTimeout(() => { window.location.href = "index.html"; }, 800);
});

// ── Google Button ────────────────────────────────────────────────────────────

googleBtn.addEventListener("click", () => {
  showToast("Google Login will be available soon.", "error");
});
