import { useState } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail
} from "firebase/auth";
import { auth } from "../firebase";
import { Ant, AntTrail, Logo } from "../components/Ant";

const friendlyErrors = {
  "auth/invalid-credential": "Wrong email or password.",
  "auth/invalid-email": "That email address doesn't look right.",
  "auth/email-already-in-use": "This email already has an account. Try logging in.",
  "auth/weak-password": "Password must be at least 6 characters.",
  "auth/missing-password": "Please enter your password.",
  "auth/too-many-requests": "Too many attempts. Please wait a moment and try again.",
  "auth/network-request-failed": "Network problem. Check your internet connection."
};

export default function Login() {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const isRegister = mode === "register";

  const resetPassword = async () => {
    setError("");
    setNotice("");
    if (!email.trim()) {
      setError("Enter your email above first, then click Forgot password.");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setNotice(`If an account exists for ${email.trim()}, a reset link has been sent. Check your inbox (and spam folder).`);
    } catch (err) {
      setError(friendlyErrors[err.code] ?? err.message);
    }
  };

  // On success, App.jsx's onAuthStateChanged switches to the Dashboard.
  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setNotice("");
    setBusy(true);
    try {
      const action = isRegister ? createUserWithEmailAndPassword : signInWithEmailAndPassword;
      await action(auth, email.trim(), password);
    } catch (err) {
      setError(friendlyErrors[err.code] ?? err.message);
      setBusy(false);
    }
  };

  const switchMode = (next) => {
    setMode(next);
    setError("");
    setNotice("");
  };

  return (
    <div className="auth-page">
      <section className="auth-hero">
        <Logo />
        <div className="hero-mark" aria-hidden="true"><Ant size={340} /></div>
        <div className="hero-copy">
          <h1>Small steps.<br />Big colony.</h1>
          <p>
            An ant carries fifty times its own weight, one step at a time.
            Break your work into tasks and carry them home, one by one.
          </p>
          <ul className="hero-points">
            <li>Live task updates</li>
            <li>Only you see your tasks</li>
            <li>Works on any device</li>
          </ul>
        </div>
        <div className="anthill" aria-hidden="true">
          <AntTrail count={6} />
          <svg viewBox="0 0 400 120" preserveAspectRatio="none" className="mound">
            <path d="M0 120 C 90 120, 130 30, 200 28 C 270 30, 310 120, 400 120 Z" />
            <ellipse cx="200" cy="40" rx="16" ry="7" className="hole" />
          </svg>
        </div>
      </section>

      <main className="auth-panel">
        <form className="auth-card" onSubmit={submit}>
          <div className="tabs" role="tablist">
            <button type="button" role="tab" aria-selected={!isRegister}
              className={!isRegister ? "active" : ""} onClick={() => switchMode("login")}>
              Login
            </button>
            <button type="button" role="tab" aria-selected={isRegister}
              className={isRegister ? "active" : ""} onClick={() => switchMode("register")}>
              Register
            </button>
          </div>

          <div>
            <h2>{isRegister ? "Join the colony" : "Welcome back, worker ant"}</h2>
            <p className="muted">
              {isRegister ? "Create an account to start tracking your tasks." : "Login to see your tasks."}
            </p>
          </div>

          <label className="field">
            <span>Email</span>
            <input type="email" autoComplete="email" placeholder="student@example.com"
              value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>

          <label className="field">
            <span className="field-row">
              Password
              {!isRegister && (
                <button type="button" className="link-btn small" onClick={resetPassword}>
                  Forgot password?
                </button>
              )}
            </span>
            <div className="password">
              <input type={showPassword ? "text" : "password"}
                autoComplete={isRegister ? "new-password" : "current-password"}
                placeholder={isRegister ? "At least 6 characters" : "Your password"}
                value={password} onChange={(e) => setPassword(e.target.value)} required />
              <button type="button" className="link-btn" onClick={() => setShowPassword((s) => !s)}>
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </label>

          {error && <p className="alert" role="alert">{error}</p>}
          {notice && <p className="notice" role="status">{notice}</p>}

          <button type="submit" className="btn primary block" disabled={busy}>
            {busy ? <><Ant size={22} walking /> Please wait…</> : isRegister ? "Create account" : "Login"}
          </button>

          <p className="muted small center">
            {isRegister ? "Already have an account? " : "New here? "}
            <button type="button" className="link-btn" onClick={() => switchMode(isRegister ? "login" : "register")}>
              {isRegister ? "Login" : "Create an account"}
            </button>
          </p>
        </form>
      </main>
    </div>
  );
}
