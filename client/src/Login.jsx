import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { theme as t } from "./theme";
import { syncProfileStorageForLogin } from "./profileStorage";
import { setAdminSession, setAuthSession } from "./authSession";
import { api } from "./api";
import loginPageBg from "./assets/login-page-bg.png";
import "./Login.css";

const API = "http://localhost:3001";
const DEV_ADMIN_USERNAME = String(import.meta.env.VITE_ADMIN_USERNAME || "canteen_admin").trim();
const DEV_ADMIN_PASSWORD = String(import.meta.env.VITE_ADMIN_PASSWORD || "admin123").trim();

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

function Login() {
    const [loginId, setLoginId] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const navigate = useNavigate();
    const location = useLocation();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        const id = loginId.trim();
        const pwd = password.trim();
        if (!id || !pwd) {
            setError("Please enter your email or username and password.");
            return;
        }

        setSubmitting(true);
        try {
            try {
                let adminRes = null;
                try {
                    adminRes = await api.post("/admin/login", { username: id, password: pwd });
                } catch (firstAdminErr) {
                    const status = firstAdminErr.response?.status;
                    if (status === 401) throw firstAdminErr;
                    /* Fallback for local setups without /api proxy */
                    adminRes = await axios.post(`${API}/api/admin/login`, { username: id, password: pwd });
                }
                if (adminRes?.data?.ok) {
                    setAdminSession(adminRes.data.username || id);
                    const from = location.state?.from;
                    const target =
                        typeof from === "string" && from.startsWith("/") && !from.startsWith("/login")
                            ? from
                            : "/admin";
                    navigate(target, { replace: true });
                    return;
                }
            } catch (adminErr) {
                const status = adminErr.response?.status;
                const endpointMissing = status === 404 || !adminErr.response;
                if (endpointMissing && id === DEV_ADMIN_USERNAME && pwd === DEV_ADMIN_PASSWORD) {
                    setAdminSession(id);
                    const from = location.state?.from;
                    const target =
                        typeof from === "string" && from.startsWith("/") && !from.startsWith("/login")
                            ? from
                            : "/admin";
                    navigate(target, { replace: true });
                    return;
                }
                /* Keep student fallback for non-admin users. */
            }

            const result = await axios.post(`${API}/login`, {
                email: id,
                password: pwd,
            });
            if (result.data === "success") {
                setAuthSession(id);
                syncProfileStorageForLogin(id);
                navigate("/home");
            } else if (typeof result.data === "string") {
                setError(
                    result.data === "user does not exists"
                        ? "No account found, or invalid staff or student credentials."
                        : result.data
                );
            } else {
                setError("Login failed. Please try again.");
            }
        } catch (err) {
            const msg = err.response?.data?.message;
            setError(typeof msg === "string" ? msg : "Could not sign in. Check your connection and try again.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="login-page" style={{ backgroundImage: `url(${loginPageBg})` }}>
            <div style={styles.bgLayer} aria-hidden />
            <div style={styles.shell} className="login-shell">
                <div style={styles.card}>
                    <h1 style={styles.title}>Welcome Back</h1>
                    <p style={styles.subtitle}>
                        Sign in with your student email or canteen staff username. You will be sent to the right area
                        automatically.
                    </p>

                    {error ? (
                        <p style={styles.error} role="alert" aria-live="polite">
                            {error}
                        </p>
                    ) : null}

                    <form onSubmit={handleSubmit} style={styles.form} noValidate>
                        <label style={styles.fieldLabel} htmlFor="login-identifier">
                            Email or username
                        </label>
                        <div style={styles.inputRow}>
                            <span style={styles.inputLeadIcon}>
                                <MailIcon />
                            </span>
                            <input
                                id="login-identifier"
                                type="text"
                                className="login-field-input"
                                placeholder="you@uni.edu or staff username"
                                style={styles.input}
                                value={loginId}
                                onChange={(e) => setLoginId(e.target.value)}
                                required
                                autoComplete="username"
                                disabled={submitting}
                                aria-invalid={error ? true : undefined}
                            />
                        </div>

                        <label style={styles.fieldLabel} htmlFor="login-password">
                            Password
                        </label>
                        <div style={styles.inputRow}>
                            <span style={styles.inputLeadIcon}>
                                <LockIcon />
                            </span>
                            <input
                                id="login-password"
                                type={showPassword ? "text" : "password"}
                                className="login-field-input"
                                placeholder="Enter password"
                                style={{ ...styles.input, ...styles.inputWithEye }}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                autoComplete="current-password"
                                disabled={submitting}
                                aria-invalid={error ? true : undefined}
                            />
                            <button
                                type="button"
                                className="login-eye"
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

                        <div style={styles.forgotRow}>
                            <Link
                                to="/reset-password"
                                state={{ email: loginId.trim() }}
                                className="login-forgot"
                                style={styles.forgotLink}
                            >
                                Forgot password?
                            </Link>
                        </div>

                        <button type="submit" className="login-primary" style={styles.primaryBtn} disabled={submitting}>
                            {submitting ? "Signing in…" : "Login"}
                            <span style={styles.arrow} aria-hidden>
                                →
                            </span>
                        </button>
                    </form>

                    <p className="login-footer-line">
                        New to Snack Smart? <Link to="/register">Create an account</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}

const styles = {
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
        margin: "0 0 24px 0",
        fontSize: "14px",
        lineHeight: 1.55,
        color: t.textMuted,
    },
    form: {
        display: "flex",
        flexDirection: "column",
        gap: 0,
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
        marginBottom: "14px",
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
    forgotRow: {
        marginTop: "-6px",
        marginBottom: "8px",
        display: "flex",
        justifyContent: "flex-start",
    },
    forgotLink: {
        color: "#e53935",
        textDecoration: "none",
        fontSize: "13px",
        fontWeight: 700,
    },
    primaryBtn: {
        width: "100%",
        marginTop: "8px",
        border: "none",
        cursor: "pointer",
        borderRadius: t.radiusPill,
        padding: "16px 20px",
        minHeight: "54px",
        background: `linear-gradient(135deg, ${t.gold} 0%, ${t.goldDark} 100%)`,
        color: t.onGold,
        fontWeight: 800,
        fontSize: "16px",
        letterSpacing: "0.02em",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "10px",
        boxShadow: "0 8px 24px rgba(249, 200, 81, 0.25)",
    },
    arrow: {
        fontSize: "16px",
        marginTop: "-1px",
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
};

export default Login;
