/* ==========================================================
   DevMate AI — auth.js v3
   JWT session management, auto token refresh, protected routes.
   All existing IDs and Auth.logout() / Auth.getUser() preserved.
   ========================================================== */

// const API_BASE = "http://localhost:3000/api";
const API_BASE = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
  ? "http://localhost:3000/api"
  : "https://devmate-ai-qddw.onrender.com/api";

// ── Auth Object (same interface as before) ────────────────────────────────────
const Auth = {
  storageKey:       "devmate-user",
  accessTokenKey:   "devmate_access",
  refreshTokenKey:  "devmate_refresh",

  // ── Get current user from localStorage ──────────────────────────────────
  getUser() {
    try {
      return JSON.parse(localStorage.getItem(this.storageKey) || "null");
    } catch {
      return null;
    }
  },

  // ── Get access token ────────────────────────────────────────────────────
  getToken() {
    return localStorage.getItem(this.accessTokenKey) || "";
  },

  // ── Get refresh token ───────────────────────────────────────────────────
  getRefreshToken() {
    return localStorage.getItem(this.refreshTokenKey) || "";
  },

  // ── Save session ─────────────────────────────────────────────────────────
  login(user, accessToken, refreshToken) {
    localStorage.setItem(this.storageKey,      JSON.stringify({ ...user, loginTime: Date.now() }));
    localStorage.setItem(this.accessTokenKey,  accessToken);
    localStorage.setItem(this.refreshTokenKey, refreshToken);
  },

  // ── Guest mode ───────────────────────────────────────────────────────────
  guest() {
    this.login({ name: "Guest", email: "guest@devmate.ai", guest: true }, "", "");
  },

  // ── Logout — clears all tokens ────────────────────────────────────────
  async logout() {
    const refreshToken = this.getRefreshToken();
    const accessToken  = this.getToken();

    // Notify server (fire-and-forget)
    if (accessToken) {
      try {
        await fetch(`${API_BASE}/auth/logout`, {
          method:  "POST",
          headers: {
            "Content-Type":  "application/json",
            "Authorization": `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ refreshToken }),
        });
      } catch { /* ignore network errors on logout */ }
    }

    // Clear storage
    localStorage.removeItem(this.storageKey);
    localStorage.removeItem(this.accessTokenKey);
    localStorage.removeItem(this.refreshTokenKey);

    window.location.href = "login.html";
  },

  // ── Check if logged in ────────────────────────────────────────────────
  isLoggedIn() {
    return this.getUser() !== null;
  },

  // ── Refresh access token using refresh token ──────────────────────────
  async refreshAccessToken() {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) return null;

    try {
      const res  = await fetch(`${API_BASE}/auth/refresh`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ refreshToken }),
      });
      const data = await res.json();

      if (!res.ok) {
        // Refresh token expired or revoked — force logout
        this.logout();
        return null;
      }

      // Save new tokens
      localStorage.setItem(this.accessTokenKey,  data.accessToken);
      localStorage.setItem(this.refreshTokenKey, data.refreshToken);
      return data.accessToken;

    } catch {
      return null; // Network error — don't force logout
    }
  },

  // ── Fetch with automatic token refresh ────────────────────────────────
  // Use this instead of fetch() for all protected API calls
  async apiFetch(url, options = {}) {
    const token = this.getToken();

    const makeRequest = (accessToken) => fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
    });

    let res = await makeRequest(token);

    // If 401 with TOKEN_EXPIRED, try refreshing once
    if (res.status === 401) {
      const data = await res.clone().json().catch(() => ({}));
      if (data.code === "TOKEN_EXPIRED") {
        const newToken = await this.refreshAccessToken();
        if (newToken) {
          res = await makeRequest(newToken);
        }
      }
    }

    return res;
  },
};

// ── Navbar auth UI (same as before) ──────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
  const user        = Auth.getUser();
  const authButtons = document.getElementById("authButtons");
  const profileMenu = document.getElementById("profileMenu");
  const userName    = document.getElementById("userName");
  const profileBtn  = document.getElementById("profileBtn");
  const logoutBtn   = document.getElementById("logoutBtn");

  if (user) {
    if (authButtons) authButtons.style.display = "none";
    if (profileMenu) profileMenu.classList.remove("hidden");
    if (userName)    userName.textContent = user.name || "User";
  } else {
    if (authButtons) authButtons.style.display = "flex";
    if (profileMenu) profileMenu.classList.add("hidden");
  }

  profileBtn?.addEventListener("click", () => {
    console.log("Profile clicked");
  });

  logoutBtn?.addEventListener("click", () => {
    Auth.logout();
  });
});

// ── Protected route guard ─────────────────────────────────────────────────────
// Add this to any page that requires login:
// <script>AuthGuard.requireLogin();</script>

const AuthGuard = {
  requireLogin() {
    const user  = Auth.getUser();
    const token = Auth.getToken();
    if (!user || (!token && !user.guest)) {
      window.location.href = "login.html";
    }
  },
};

// Export for use in other scripts (works in both module and global context)
if (typeof window !== "undefined") {
  window.Auth      = Auth;
  window.AuthGuard = AuthGuard;
}
