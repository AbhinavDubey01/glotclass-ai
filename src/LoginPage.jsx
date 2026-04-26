// ============================================================
//  LoginPage.jsx  —  GlotClass AI
//  Paste this component anywhere in the project.
//  Requires:  firebase.js  (in same folder or adjust import path)
//  On success → redirects to /transcribe
// ============================================================

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  loginWithGoogle,
  loginWithEmail,
  signUpWithEmail,
  resetPassword,
} from "./firebase";   // ← adjust path if you move firebase.js

// ── Leaf SVG (reusable) ───────────────────────────────────────
function Leaf({ style }) {
  return (
    <svg
      viewBox="0 0 200 200"
      xmlns="http://www.w3.org/2000/svg"
      style={{ position: "absolute", opacity: 0.18, pointerEvents: "none", ...style }}
    >
      <path
        d="M100,10 Q160,30 180,100 Q160,170 100,190 Q40,170 20,100 Q40,30 100,10Z"
        fill="#3a8a3a"
      />
      <path d="M100,10 Q100,100 100,190" stroke="#2e7d32" strokeWidth="2" fill="none" opacity="0.5" />
      <path d="M100,50 Q130,70 150,100" stroke="#2e7d32" strokeWidth="1.2" fill="none" opacity="0.4" />
      <path d="M100,50 Q70,70 50,100"   stroke="#2e7d32" strokeWidth="1.2" fill="none" opacity="0.4" />
      <path d="M100,90 Q125,105 140,130" stroke="#2e7d32" strokeWidth="1.2" fill="none" opacity="0.4" />
      <path d="M100,90 Q75,105 60,130"  stroke="#2e7d32" strokeWidth="1.2" fill="none" opacity="0.4" />
    </svg>
  );
}

// ── Google icon ───────────────────────────────────────────────
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48">
      <path fill="#4285F4" d="M45.5 24.5c0-1.5-.1-3-.4-4.5H24v8.5h12.1c-.5 2.7-2.1 5-4.5 6.5v5.4h7.3c4.3-3.9 6.6-9.7 6.6-15.9z"/>
      <path fill="#34A853" d="M24 46c6.1 0 11.2-2 14.9-5.5l-7.3-5.4c-2 1.3-4.5 2.1-7.6 2.1-5.8 0-10.8-3.9-12.5-9.2H4v5.6C7.7 41.5 15.4 46 24 46z"/>
      <path fill="#FBBC05" d="M11.5 27.9c-.5-1.3-.7-2.6-.7-3.9s.3-2.7.7-3.9v-5.6H4A22 22 0 0 0 2 24c0 3.5.8 6.9 2 9.6l7.5-5.7z"/>
      <path fill="#EA4335" d="M24 10.8c3.3 0 6.2 1.1 8.5 3.3l6.4-6.4C35.1 4 29.9 2 24 2 15.4 2 7.7 6.5 4 14.4l7.5 5.6C13.2 14.7 18.2 10.8 24 10.8z"/>
    </svg>
  );
}

// ── Main Component ────────────────────────────────────────────
export default function LoginPage() {
  const navigate   = useNavigate();
  const [tab, setTab]           = useState("login");   // "login" | "signup"
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [resetSent, setResetSent] = useState(false);

  // Form fields
  const [name,     setName]     = useState("");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");

  const clearError = () => setError("");

  // ── Auth handlers ──────────────────────────────────────────

  async function handleGoogle() {
    setLoading(true); clearError();
    try {
      await loginWithGoogle();
      navigate("/transcribe");
    } catch (e) {
      setError(friendlyError(e.code));
    } finally { setLoading(false); }
  }

  async function handleEmailSubmit() {
    setLoading(true); clearError();
    try {
      if (tab === "login") {
        await loginWithEmail(email, password);
      } else {
        if (!name.trim()) { setError("Please enter your name."); setLoading(false); return; }
        await signUpWithEmail(name.trim(), email, password);
      }
      navigate("/transcribe");
    } catch (e) {
      setError(friendlyError(e.code));
    } finally { setLoading(false); }
  }

  async function handleForgotPassword() {
    if (!email) { setError("Enter your email above first, then click Forgot password."); return; }
    setLoading(true); clearError();
    try {
      await resetPassword(email);
      setResetSent(true);
    } catch (e) {
      setError(friendlyError(e.code));
    } finally { setLoading(false); }
  }

  // ── Render ─────────────────────────────────────────────────
  return (
    <div style={styles.page}>

      {/* Background leaves */}
      <Leaf style={{ top: -30, left: -20, width: 200, transform: "rotate(-20deg)" }} />
      <Leaf style={{ bottom: -20, right: -15, width: 180, transform: "rotate(40deg)" }} />
      <Leaf style={{ top: 60, right: 30, width: 80, transform: "rotate(15deg)" }} />
      <Leaf style={{ bottom: 80, left: 20, width: 90, transform: "rotate(-50deg)" }} />
      <Leaf style={{ top: 200, left: -30, width: 70, transform: "rotate(60deg)" }} />
      <Leaf style={{ top: 30, left: 80, width: 50, transform: "rotate(-70deg)" }} />
      <Leaf style={{ bottom: 30, right: 80, width: 60, transform: "rotate(120deg)" }} />

      {/* Glass card */}
      <div style={styles.card}>

        {/* Brand */}
        <div style={styles.brand}>
          <div style={styles.brandIcon}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="white">
              <path d="M12 3C7 3 3 7 3 12s4 9 9 9 9-4 9-9-4-9-9-9zm0 2c1.7 0 3.3.5 4.6 1.4L5.4 16.6A7 7 0 0 1 12 5zm0 14a7 7 0 0 1-4.6-1.4L18.6 7.4A7 7 0 0 1 12 19z"/>
            </svg>
          </div>
          <span style={styles.brandName}>
            GlotClass <sup style={styles.sup}>AI</sup>
          </span>
        </div>
        <p style={styles.tagline}>Transcribe, simplify & learn — sign in to continue</p>

        {/* Tabs */}
        <div style={styles.tabRow}>
          {["login", "signup"].map((t) => (
            <button
              key={t}
              style={{ ...styles.tab, ...(tab === t ? styles.tabActive : {}) }}
              onClick={() => { setTab(t); clearError(); setResetSent(false); }}
            >
              {t === "login" ? "Sign in" : "Create account"}
            </button>
          ))}
        </div>

        {/* Error banner */}
        {error && <div style={styles.errorBanner}>{error}</div>}
        {resetSent && <div style={styles.successBanner}>Password reset email sent! Check your inbox.</div>}

        {/* Name field (signup only) */}
        {tab === "signup" && (
          <div style={styles.formGroup}>
            <label style={styles.label}>Full name</label>
            <input
              style={styles.input}
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onFocus={clearError}
            />
          </div>
        )}

        {/* Email */}
        <div style={styles.formGroup}>
          <label style={styles.label}>Email address</label>
          <input
            style={styles.input}
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onFocus={clearError}
          />
        </div>

        {/* Password */}
        <div style={styles.formGroup}>
          <label style={styles.label}>Password</label>
          <div style={{ position: "relative" }}>
            <input
              style={{ ...styles.input, paddingRight: 56 }}
              type={showPw ? "text" : "password"}
              placeholder={tab === "signup" ? "Min. 8 characters" : "••••••••"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={clearError}
            />
            <span
              style={styles.pwToggle}
              onClick={() => setShowPw((v) => !v)}
            >
              {showPw ? "Hide" : "Show"}
            </span>
          </div>
        </div>

        {/* Forgot password (login only) */}
        {tab === "login" && (
          <div style={styles.forgotRow}>
            <button style={styles.forgotBtn} onClick={handleForgotPassword} disabled={loading}>
              Forgot password?
            </button>
          </div>
        )}

        {/* Primary CTA */}
        <button style={styles.btnPrimary} onClick={handleEmailSubmit} disabled={loading}>
          {loading ? "Please wait…" : tab === "login" ? "Sign in" : "Create account"}
        </button>

        {/* Divider */}
        <div style={styles.divider}>
          <div style={styles.dividerLine} />
          <span style={styles.dividerText}>or</span>
          <div style={styles.dividerLine} />
        </div>

        {/* Google button */}
        <button style={styles.btnGoogle} onClick={handleGoogle} disabled={loading}>
          <GoogleIcon />
          {tab === "login" ? "Continue with Google" : "Sign up with Google"}
        </button>

        {/* Switch tab link */}
        <p style={styles.switchText}>
          {tab === "login" ? (
            <>Don't have an account?{" "}
              <span style={styles.switchLink} onClick={() => { setTab("signup"); clearError(); }}>
                Create one
              </span>
            </>
          ) : (
            <>Already have an account?{" "}
              <span style={styles.switchLink} onClick={() => { setTab("login"); clearError(); }}>
                Sign in
              </span>
            </>
          )}
        </p>

        {/* Terms (signup only) */}
        {tab === "signup" && (
          <p style={styles.terms}>
            By creating an account you agree to our{" "}
            <a href="/terms" style={styles.termsLink}>Terms of Service</a> and{" "}
            <a href="/privacy" style={styles.termsLink}>Privacy Policy</a>.
          </p>
        )}
      </div>
    </div>
  );
}

// ── Error code → human message ─────────────────────────────────
function friendlyError(code) {
  const map = {
    "auth/user-not-found":        "No account found with that email.",
    "auth/wrong-password":        "Incorrect password. Try again.",
    "auth/email-already-in-use":  "That email is already registered. Sign in instead.",
    "auth/weak-password":         "Password must be at least 6 characters.",
    "auth/invalid-email":         "Please enter a valid email address.",
    "auth/popup-closed-by-user":  "Google sign-in was cancelled.",
    "auth/too-many-requests":     "Too many attempts. Please wait a moment.",
    "auth/network-request-failed":"Network error. Check your connection.",
  };
  return map[code] || "Something went wrong. Please try again.";
}

// ── Inline styles ──────────────────────────────────────────────
const styles = {
  page: {
    minHeight: "100vh",
    background: "#e8f5e2",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "hidden",
    fontFamily: "'Inter', sans-serif",
    padding: "2rem",
  },
  card: {
    background: "rgba(255,255,255,0.45)",
    backdropFilter: "blur(18px)",
    WebkitBackdropFilter: "blur(18px)",
    border: "1px solid rgba(255,255,255,0.7)",
    borderRadius: 24,
    padding: "2.5rem 2rem",
    width: "100%",
    maxWidth: 400,
    position: "relative",
    zIndex: 10,
    boxShadow: "0 8px 32px rgba(60,120,60,0.10)",
  },
  brand: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    justifyContent: "center",
    marginBottom: "0.5rem",
  },
  brandIcon: {
    width: 36, height: 36, borderRadius: 10,
    background: "linear-gradient(135deg,#5cb85c,#2e7d32)",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  brandName: {
    fontSize: 22, fontWeight: 600, color: "#1b5e20", letterSpacing: "-0.3px",
  },
  sup: { fontSize: 11, fontWeight: 500, color: "#4caf50", verticalAlign: "super", marginLeft: 1 },
  tagline: { textAlign: "center", fontSize: 13, color: "#4a7c59", marginBottom: "1.8rem" },
  tabRow: {
    display: "flex",
    borderRadius: 12,
    overflow: "hidden",
    border: "1px solid rgba(76,175,80,0.25)",
    marginBottom: "1.5rem",
    background: "rgba(232,245,226,0.5)",
  },
  tab: {
    flex: 1, padding: "9px 0", textAlign: "center", fontSize: 13, fontWeight: 500,
    color: "#558b6e", cursor: "pointer", border: "none", background: "transparent",
    fontFamily: "inherit",
  },
  tabActive: {
    background: "rgba(255,255,255,0.75)", color: "#1b5e20",
    borderRadius: 10, margin: 3, boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
  },
  formGroup: { marginBottom: "1rem" },
  label: { display: "block", fontSize: 12, fontWeight: 500, color: "#4a7c59", marginBottom: 5, letterSpacing: "0.3px" },
  input: {
    width: "100%", padding: "10px 13px",
    border: "1px solid rgba(76,175,80,0.3)",
    borderRadius: 10, fontSize: 14,
    background: "rgba(255,255,255,0.6)",
    color: "#1b3a1f", outline: "none",
    fontFamily: "inherit", boxSizing: "border-box",
  },
  pwToggle: {
    position: "absolute", right: 11, top: "50%", transform: "translateY(-50%)",
    cursor: "pointer", color: "#7aab82", fontSize: 13, userSelect: "none",
  },
  forgotRow: { textAlign: "right", marginTop: 4, marginBottom: "1rem" },
  forgotBtn: {
    background: "none", border: "none", fontSize: 12, color: "#4caf50",
    cursor: "pointer", fontFamily: "inherit", padding: 0,
  },
  btnPrimary: {
    width: "100%", padding: 11, border: "none", borderRadius: 12,
    background: "linear-gradient(135deg,#4caf50,#2e7d32)",
    color: "white", fontSize: 14, fontWeight: 600, cursor: "pointer",
    letterSpacing: "0.2px", fontFamily: "inherit",
  },
  divider: { display: "flex", alignItems: "center", gap: 10, margin: "1.2rem 0" },
  dividerLine: { flex: 1, height: 1, background: "rgba(76,175,80,0.2)" },
  dividerText: { fontSize: 12, color: "#7aab82" },
  btnGoogle: {
    width: "100%", padding: 10,
    border: "1px solid rgba(76,175,80,0.3)",
    borderRadius: 12,
    background: "rgba(255,255,255,0.6)",
    display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
    cursor: "pointer", fontSize: 14, fontWeight: 500, color: "#2e4a35",
    fontFamily: "inherit",
  },
  switchText: { textAlign: "center", fontSize: 12, color: "#558b6e", marginTop: "1.2rem" },
  switchLink: { color: "#2e7d32", fontWeight: 500, cursor: "pointer" },
  terms: { fontSize: 11, color: "#7aab82", textAlign: "center", marginTop: "0.8rem", lineHeight: 1.5 },
  termsLink: { color: "#4caf50", textDecoration: "none" },
  errorBanner: {
    background: "rgba(220,53,69,0.08)", border: "1px solid rgba(220,53,69,0.25)",
    borderRadius: 10, padding: "9px 13px", fontSize: 13, color: "#b02a37",
    marginBottom: "1rem",
  },
  successBanner: {
    background: "rgba(76,175,80,0.1)", border: "1px solid rgba(76,175,80,0.3)",
    borderRadius: 10, padding: "9px 13px", fontSize: 13, color: "#2e7d32",
    marginBottom: "1rem",
  },
};
