import React, { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { theme as t } from "./theme";
import { validatePassword } from "./passwordValidation";
import resetBg from "./assets/reset-password-bg.png";
import "./ResetPassword.css";

const API = "http://localhost:3001";

function getPasswordStrength(password) {
    const pwd = String(password || "");
    const len = pwd.length;
    const hasSpecial = /[^A-Za-z0-9]/.test(pwd);
    if (!len) return { level: 0, label: "" };
    if (len < 6) return { level: 1, label: "Too weak" };
    if (!hasSpecial) return { level: 2, label: "Medium strength" };
    if (len < 10) return { level: 3, label: "Strong" };
    return { level: 4, label: "Very strong" };
}

function MailIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={t.gold} strokeWidth="2" aria-hidden>
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
            <path d="M22 6l-10 7L2 6" />
        </svg>
    );
}

function LockIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={t.gold} strokeWidth="2" aria-hidden>
            <rect x="5" y="11" width="14" height="10" rx="2" />
            <path d="M8 11V8a4 4 0 0 1 8 0v3" />
        </svg>
    );
}

function CheckCircleIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={t.gold} strokeWidth="2" aria-hidden>
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <path d="M22 4L12 14.01l-3-3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function ResetPassword() {
    const location = useLocation();
    const navigate = useNavigate();

    const routeEmail = typeof location.state?.email === "string" ? location.state.email.trim() : "";
    const emailLocked = routeEmail.length > 0;

    const [email, setEmail] = useState(() => routeEmail);
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const strength = useMemo(() => getPasswordStrength(newPassword), [newPassword]);

    const confirmHint = useMemo(() => {
        const c = confirmPassword;
        const n = newPassword;
        if (!c) return { type: "none", text: "" };
        if (n !== c) return { type: "bad", text: "Passwords do not match" };
        return { type: "good", text: "Passwords match perfectly" };
    }, [newPassword, confirmPassword]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        const em = email.trim();
        const np = newPassword.trim();
        const cp = confirmPassword.trim();

        if (!em || !np || !cp) {
            setError("Please fill in all fields.");
            return;
        }
        if (np !== cp) {
            setError("New password and confirmation do not match.");
            return;
        }
        const pwdCheck = validatePassword(np);
        if (!pwdCheck.valid) {
            setError(pwdCheck.message);
            return;
        }

        try {
            await axios.post(`${API}/reset-password`, {
                email: em,
                newPassword: np,
            });
            setSuccess("Your password has been reset. You can sign in now.");
            setTimeout(() => navigate("/login"), 2000);
        } catch (err) {
            const msg = err.response?.data?.message;
            setError(typeof msg === "string" ? msg : "Could not reset password. Try again.");
        }
    };

    return (
        <div style={styles.page}>
            <div style={styles.bgLayer} aria-hidden />
            <div style={styles.shell} className="reset-password-shell">
                <div style={styles.card}>
                    <h1 style={styles.title}>Reset Password</h1>
                    <p style={styles.subtitle}>Secure your account by choosing a unique, strong password.</p>

                    {error ? (
                        <p style={styles.error} role="alert">
                            {error}
                        </p>
                    ) : null}
                    {success ? (
                        <p style={styles.success} role="status">
                            {success}
                        </p>
                    ) : null}

                    <form onSubmit={handleSubmit} style={styles.form}>
                        <label style={styles.fieldLabel}>Registered email address</label>
                        <div style={styles.inputRow}>
                            <span style={styles.inputLeadIcon}>
                                <MailIcon />
                            </span>
                            <input
                                type="email"
                                placeholder={emailLocked ? "" : "you@example.com"}
                                style={{
                                    ...styles.input,
                                    ...(emailLocked ? styles.inputLocked : {}),
                                }}
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                readOnly={emailLocked}
                                required
                                autoComplete="email"
                                aria-readonly={emailLocked}
                            />
                        </div>

                        <label style={styles.fieldLabel}>Enter new password</label>
                        <div style={styles.inputRow}>
                            <span style={styles.inputLeadIcon}>
                                <LockIcon />
                            </span>
                            <input
                                type={showNewPassword ? "text" : "password"}
                                placeholder="New password"
                                style={{ ...styles.input, ...styles.inputWithEye }}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                                minLength={6}
                                autoComplete="new-password"
                            />
                            <button
                                type="button"
                                className="reset-password-eye"
                                style={styles.eyeBtn}
                                onClick={() => setShowNewPassword((v) => !v)}
                                aria-label={showNewPassword ? "Hide password" : "Show password"}
                            >
                                {showNewPassword ? (
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
                        <div style={styles.strengthWrap}>
                            <div style={styles.strengthBars} aria-hidden>
                                {[0, 1, 2, 3].map((i) => (
                                    <div
                                        key={i}
                                        style={{
                                            ...styles.strengthSeg,
                                            ...(i < strength.level ? styles.strengthSegOn : {}),
                                        }}
                                    />
                                ))}
                            </div>
                            {strength.label ? (
                                <p style={styles.strengthLabel}>{strength.label}</p>
                            ) : (
                                <p style={styles.strengthLabelPlaceholder}> </p>
                            )}
                        </div>

                        <label style={styles.fieldLabel}>Confirm new password</label>
                        <div style={styles.inputRow}>
                            <span style={styles.inputLeadIcon}>
                                <CheckCircleIcon />
                            </span>
                            <input
                                type="password"
                                placeholder="Confirm password"
                                style={styles.input}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                minLength={6}
                                autoComplete="new-password"
                            />
                        </div>
                        {confirmHint.type === "good" ? (
                            <p style={styles.matchGood}>{confirmHint.text}</p>
                        ) : confirmHint.type === "bad" ? (
                            <p style={styles.matchBad}>{confirmHint.text}</p>
                        ) : (
                            <p style={styles.matchPlaceholder}> </p>
                        )}

                        <button type="submit" className="reset-password-submit" style={styles.primaryBtn}>
                            Reset Password
                        </button>
                    </form>

                    <Link to="/login" className="reset-password-back" style={styles.backLink}>
                        ← Back to login
                    </Link>
                </div>
            </div>
        </div>
    );
}

const styles = {
    page: {
        position: "relative",
        minHeight: "100vh",
        width: "100%",
        boxSizing: "border-box",
        backgroundImage: `url(${resetBg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "clamp(16px, 4vw, 32px)",
    },
    bgLayer: {
        position: "absolute",
        inset: 0,
        background:
            "linear-gradient(180deg, rgba(7, 8, 12, 0.38) 0%, rgba(7, 8, 12, 0.44) 45%, rgba(7, 8, 12, 0.52) 100%)",
        pointerEvents: "none",
    },
    shell: {
        position: "relative",
        zIndex: 1,
        width: "100%",
        maxWidth: "440px",
    },
    card: {
        backgroundColor: "rgba(12, 14, 20, 0.94)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        borderRadius: "20px",
        border: "1px solid rgba(249, 200, 81, 0.12)",
        boxShadow: "0 24px 64px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(255,255,255,0.04) inset",
        padding: "clamp(28px, 5vw, 40px)",
        boxSizing: "border-box",
    },
    title: {
        margin: "0 0 10px 0",
        fontSize: "clamp(26px, 5vw, 32px)",
        fontWeight: 800,
        letterSpacing: "-0.03em",
        color: t.gold,
        lineHeight: 1.15,
    },
    subtitle: {
        margin: "0 0 28px 0",
        fontSize: "14px",
        lineHeight: 1.55,
        color: t.textMuted,
    },
    form: {
        display: "flex",
        flexDirection: "column",
        gap: "0",
    },
    fieldLabel: {
        display: "block",
        marginBottom: "8px",
        marginTop: "4px",
        color: t.textDim,
        fontSize: "11px",
        fontWeight: 800,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
    },
    inputRow: {
        position: "relative",
        display: "flex",
        alignItems: "center",
        marginBottom: "6px",
    },
    inputLeadIcon: {
        position: "absolute",
        left: "14px",
        top: "50%",
        transform: "translateY(-50%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none",
        zIndex: 1,
    },
    input: {
        width: "100%",
        padding: "14px 14px 14px 48px",
        minHeight: "52px",
        borderRadius: t.radiusSm,
        border: `1px solid ${t.border}`,
        outline: "none",
        backgroundColor: "rgba(28, 35, 51, 0.85)",
        color: t.text,
        fontSize: "15px",
        boxSizing: "border-box",
    },
    inputLocked: {
        opacity: 0.95,
        cursor: "default",
        color: t.textMuted,
    },
    inputWithEye: {
        paddingRight: "52px",
    },
    eyeBtn: {
        position: "absolute",
        right: "8px",
        top: "50%",
        transform: "translateY(-50%)",
        height: "40px",
        width: "40px",
        borderRadius: t.radiusSm,
        border: `1px solid ${t.borderSubtle}`,
        backgroundColor: "rgba(0,0,0,0.2)",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 0,
    },
    strengthWrap: {
        marginBottom: "14px",
        marginTop: "2px",
    },
    strengthBars: {
        display: "flex",
        gap: "6px",
        marginBottom: "6px",
    },
    strengthSeg: {
        flex: 1,
        height: "4px",
        borderRadius: "999px",
        backgroundColor: "rgba(100, 116, 139, 0.35)",
    },
    strengthSegOn: {
        background: `linear-gradient(90deg, ${t.gold}, ${t.goldDark})`,
        boxShadow: `0 0 10px rgba(249, 200, 81, 0.35)`,
    },
    strengthLabel: {
        margin: 0,
        fontSize: "12px",
        color: t.textMuted,
    },
    strengthLabelPlaceholder: {
        margin: 0,
        fontSize: "12px",
        minHeight: "18px",
    },
    matchGood: {
        margin: "4px 0 6px 0",
        fontSize: "13px",
        color: "#86efac",
        fontWeight: 600,
    },
    matchBad: {
        margin: "4px 0 6px 0",
        fontSize: "13px",
        color: "#fca5a5",
        fontWeight: 600,
    },
    matchPlaceholder: {
        margin: "4px 0 6px 0",
        minHeight: "20px",
        fontSize: "13px",
    },
    primaryBtn: {
        width: "100%",
        marginTop: "16px",
        padding: "16px 20px",
        minHeight: "54px",
        border: "none",
        cursor: "pointer",
        borderRadius: t.radiusPill,
        fontSize: "16px",
        fontWeight: 800,
        letterSpacing: "0.02em",
        background: `linear-gradient(135deg, ${t.gold} 0%, ${t.goldDark} 100%)`,
        color: t.onGold,
        boxShadow: "0 8px 24px rgba(249, 200, 81, 0.25)",
    },
    backLink: {
        display: "block",
        marginTop: "24px",
        textAlign: "center",
        fontSize: "14px",
        fontWeight: 600,
        color: t.textMuted,
        textDecoration: "none",
    },
    error: {
        margin: "0 0 16px 0",
        padding: "10px 12px",
        borderRadius: t.radiusSm,
        backgroundColor: "rgba(220, 53, 69, 0.12)",
        border: "1px solid rgba(220, 53, 69, 0.35)",
        color: "#f8a4af",
        fontSize: "14px",
    },
    success: {
        margin: "0 0 16px 0",
        padding: "10px 12px",
        borderRadius: t.radiusSm,
        backgroundColor: "rgba(34, 197, 94, 0.12)",
        border: "1px solid rgba(34, 197, 94, 0.35)",
        color: "#86efac",
        fontSize: "14px",
    },
};

export default ResetPassword;
