import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { theme as t } from "./theme";
import { clearLegacyGlobalProfileKeys, setProfileField } from "./profileStorage";
import { validatePassword } from "./passwordValidation";
import registerHero from "./assets/register-hero.png";
import "./Signup.css";

function Signup() {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        const trimmedName = name.trim();
        const trimmedEmail = email.trim();
        const trimmedPassword = password.trim();
        if (!trimmedName || !trimmedEmail || !trimmedPassword) {
            setError("Please fill in your name, email, and password.");
            return;
        }
        const pwdCheck = validatePassword(trimmedPassword);
        if (!pwdCheck.valid) {
            setError(pwdCheck.message);
            return;
        }

        setSubmitting(true);
        try {
            await axios.post("http://localhost:3001/register", {
                name: trimmedName,
                email: trimmedEmail,
                password: trimmedPassword,
            });
            clearLegacyGlobalProfileKeys();
            setProfileField(trimmedEmail, "profileFullName", trimmedName);
            setProfileField(trimmedEmail, "profileEmail", trimmedEmail);
            navigate("/login");
        } catch (err) {
            const msg = err.response?.data?.message;
            setError(typeof msg === "string" ? msg : "Registration failed. Check your connection and try again.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="signup-page" style={styles.body}>
            <div className="signup-shell">
                <aside className="signup-left" aria-label="Registration visual">
                    <div className="signup-left-image-wrap">
                        <img src={registerHero} alt="" className="signup-left-image" />
                    </div>
                </aside>

                <div className="signup-right" role="main">
                    <div className="signup-card">
                        <h2 style={styles.title}>Create account</h2>
                        <p style={styles.sub}>
                            Takes under a minute. Use the order details we’ll save to your profile.
                        </p>

                        {error ? (
                            <p style={styles.error} className="signup-error" role="alert" aria-live="polite">
                                {error}
                            </p>
                        ) : null}

                        <form onSubmit={handleSubmit} className="signup-form" style={styles.form} noValidate>
                            <div className="signup-field">
                                <label style={styles.label} htmlFor="signup-name">
                                    Full name
                                </label>
                                <input
                                    id="signup-name"
                                    type="text"
                                    className="signup-input"
                                    placeholder="e.g. John Doe"
                                    style={styles.input}
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                    autoComplete="name"
                                    disabled={submitting}
                                    aria-invalid={error ? true : undefined}
                                />
                            </div>

                            <div className="signup-field">
                                <label style={styles.label} htmlFor="signup-email">
                                    Email
                                </label>
                                <input
                                    id="signup-email"
                                    type="email"
                                    className="signup-input"
                                    inputMode="email"
                                    placeholder="you@example.com"
                                    style={styles.input}
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    autoComplete="email"
                                    disabled={submitting}
                                    aria-invalid={error ? true : undefined}
                                />
                            </div>

                            <div className="signup-field">
                                <label style={styles.label} htmlFor="signup-password">
                                    Password
                                </label>
                                <p id="signup-password-hint" className="signup-hint">
                                    At least 6 characters, with one special character (e.g. ! @ #).
                                </p>
                                <div style={styles.passwordWrap} className="signup-password-wrap">
                                    <input
                                        id="signup-password"
                                        type={showPassword ? "text" : "password"}
                                        className="signup-input"
                                        placeholder="Choose a password"
                                        style={{ ...styles.input, paddingRight: "48px", marginBottom: 0 }}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        minLength={6}
                                        autoComplete="new-password"
                                        disabled={submitting}
                                        aria-describedby="signup-password-hint"
                                        aria-invalid={error ? true : undefined}
                                    />
                                    <button
                                        type="button"
                                        className="signup-eye"
                                        style={styles.eyeBtn}
                                        onClick={() => setShowPassword((p) => !p)}
                                        aria-label={showPassword ? "Hide password" : "Show password"}
                                        disabled={submitting}
                                    >
                                        {showPassword ? (
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={t.gold} strokeWidth="2" aria-hidden>
                                                <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z" />
                                                <circle cx="12" cy="12" r="3" />
                                            </svg>
                                        ) : (
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={t.gold} strokeWidth="2" aria-hidden>
                                                <path d="M3 3l18 18" strokeLinecap="round" />
                                                <path d="M10.6 10.6A3 3 0 0 0 13.4 13.4" />
                                                <path d="M9.9 5.2A10.8 10.8 0 0 1 12 5c6.5 0 10 7 10 7a16.5 16.5 0 0 1-4.2 4.7" />
                                                <path d="M6.2 6.2A16.5 16.5 0 0 0 2 12s3.5 7 10 7a10.8 10.8 0 0 0 2.1-.2" />
                                            </svg>
                                        )}
                                    </button>
                                </div>
                            </div>

                            <button type="submit" className="signup-primary-btn" style={styles.primaryBtn} disabled={submitting}>
                                {submitting ? "Creating your account…" : "Create account"}
                            </button>
                        </form>

                        <p className="signup-login-text">
                            Already have an account?{" "}
                            <Link to="/login" className="signup-login-link">
                                Log in
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

const styles = {
    body: {
        backgroundColor: t.bg,
        minHeight: "100vh",
        width: "100%",
        boxSizing: "border-box",
    },
    title: {
        margin: "0 0 8px 0",
        fontWeight: "900",
        color: t.text,
        fontSize: "clamp(22px, 4vw, 28px)",
        letterSpacing: "-0.02em",
        lineHeight: 1.15,
    },
    sub: {
        margin: "0 0 18px 0",
        fontSize: "14px",
        color: t.textMuted,
        lineHeight: 1.5,
    },
    form: {
        display: "flex",
        flexDirection: "column",
        gap: 0,
    },
    label: {
        display: "block",
        marginBottom: "2px",
        color: t.textDim,
        fontSize: "10px",
        fontWeight: "800",
        letterSpacing: "0.1em",
        textTransform: "uppercase",
    },
    input: {
        width: "100%",
        padding: "12px 14px",
        minHeight: "46px",
        marginBottom: 0,
        border: `1px solid ${t.border}`,
        borderRadius: "10px",
        outline: "none",
        backgroundColor: "rgba(31, 41, 55, 0.45)",
        color: t.text,
        fontSize: "15px",
        boxSizing: "border-box",
    },
    passwordWrap: {
        position: "relative",
        display: "flex",
        alignItems: "center",
    },
    eyeBtn: {
        position: "absolute",
        right: "8px",
        height: "40px",
        width: "40px",
        borderRadius: "8px",
        border: `1px solid ${t.borderSubtle}`,
        backgroundColor: "rgba(0,0,0,0.15)",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 0,
        color: t.textMuted,
    },
    primaryBtn: {
        width: "100%",
        padding: "13px 16px",
        minHeight: "48px",
        marginTop: "8px",
        border: "none",
        cursor: "pointer",
        fontSize: "15px",
        borderRadius: "999px",
        fontWeight: "800",
        background: `linear-gradient(135deg, ${t.gold} 0%, ${t.goldDark} 100%)`,
        color: t.onGold,
    },
    error: {
        margin: "0 0 12px 0",
        padding: "8px 10px",
        borderRadius: t.radiusSm,
        backgroundColor: "rgba(220, 53, 69, 0.12)",
        border: "1px solid rgba(220, 53, 69, 0.35)",
        color: "#f8a4af",
        fontSize: "12px",
    },
};

export default Signup;
