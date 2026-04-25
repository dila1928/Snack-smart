import React, { useMemo, useState } from "react";
import { MainLayout } from "./MainLayout";
import { theme as t } from "./theme";
import homeBg from "./assets/home-bg.png";
import { api } from "./api";

const ISSUE_TYPES = [
    { value: "general", label: "General inquiry" },
    { value: "order", label: "Order issue" },
    { value: "payment", label: "Payment question" },
    { value: "feedback", label: "Feedback" },
];

export default function ContactUs() {
    const [form, setForm] = useState({
        name: "",
        email: "",
        issueType: "general",
        message: "",
    });
    const [submitted, setSubmitted] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState("");

    const canSubmit = useMemo(() => {
        return form.name.trim().length >= 2 && /\S+@\S+\.\S+/.test(form.email) && form.message.trim().length >= 10;
    }, [form.email, form.message, form.name]);

    const onChange = (key) => (e) => {
        setSubmitted(false);
        setSubmitError("");
        setForm((prev) => ({ ...prev, [key]: e.target.value }));
    };

    const onSubmit = async (e) => {
        e.preventDefault();
        if (!canSubmit) return;
        setSubmitting(true);
        setSubmitError("");
        try {
            await api.post("/contact-messages", form);
            setSubmitted(true);
            setForm((prev) => ({ ...prev, message: "" }));
        } catch (err) {
            setSubmitted(false);
            setSubmitError(err.response?.data?.message || err.message || "Could not send your message.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <MainLayout>
            <div style={styles.shell}>
                <div style={styles.overlay} aria-hidden />
                <div style={styles.contentWrap}>
                    <div style={styles.inner}>
                        <section style={styles.hero}>
                            <h2 style={styles.title}>Contact Us</h2>
                            <p style={styles.subtitle}>
                                Need help with orders, payments, or feedback? Reach the Snack Smart team quickly.
                            </p>
                        </section>

                        <section style={styles.grid}>
                            <article style={styles.card}>
                                <h3 style={styles.cardTitle}>Send a message</h3>
                                <form onSubmit={onSubmit} style={styles.form}>
                                    <label style={styles.label}>
                                        Your name
                                        <input
                                            type="text"
                                            value={form.name}
                                            onChange={onChange("name")}
                                            placeholder="Enter your full name"
                                            style={styles.input}
                                        />
                                    </label>
                                    <label style={styles.label}>
                                        Email address
                                        <input
                                            type="email"
                                            value={form.email}
                                            onChange={onChange("email")}
                                            placeholder="name@example.com"
                                            style={styles.input}
                                        />
                                    </label>
                                    <label style={styles.label}>
                                        Issue type
                                        <select value={form.issueType} onChange={onChange("issueType")} style={styles.select}>
                                            {ISSUE_TYPES.map((item) => (
                                                <option key={item.value} value={item.value}>
                                                    {item.label}
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                    <label style={styles.label}>
                                        Message
                                        <textarea
                                            value={form.message}
                                            onChange={onChange("message")}
                                            placeholder="Write your message here..."
                                            style={styles.textarea}
                                            rows={5}
                                        />
                                    </label>
                                    <button
                                        type="submit"
                                        disabled={!canSubmit || submitting}
                                        style={canSubmit && !submitting ? styles.submitBtn : styles.submitBtnDisabled}
                                    >
                                        {submitting ? "Sending..." : "Send message"}
                                    </button>
                                    {submitError ? <p style={styles.errorText}>{submitError}</p> : null}
                                    {submitted ? (
                                        <p style={styles.successText}>
                                            Message sent successfully. The canteen team will contact you soon.
                                        </p>
                                    ) : null}
                                </form>
                            </article>

                            <article style={styles.card}>
                                <h3 style={styles.cardTitle}>Quick contact</h3>
                                <div style={styles.quickList}>
                                    <a href="tel:+94000000000" style={styles.quickItem}>
                                        <span style={styles.quickLabel}>Phone</span>
                                        <span style={styles.quickValue}>+94 00 000 0000</span>
                                    </a>
                                    <a href="mailto:support@snacksmart.lk" style={styles.quickItem}>
                                        <span style={styles.quickLabel}>Email</span>
                                        <span style={styles.quickValue}>support@snacksmart.lk</span>
                                    </a>
                                    <div style={styles.quickItem}>
                                        <span style={styles.quickLabel}>Hours</span>
                                        <span style={styles.quickValue}>Mon - Fri | 7:30 AM - 4:30 PM</span>
                                    </div>
                                    <div style={styles.quickItem}>
                                        <span style={styles.quickLabel}>Location</span>
                                        <span style={styles.quickValue}>Campus Main Canteen, Ground Floor</span>
                                    </div>
                                </div>
                                <p style={styles.note}>
                                    For urgent order-related issues, include your order ID for faster support.
                                </p>
                            </article>
                        </section>
                    </div>
                </div>
            </div>
        </MainLayout>
    );
}

const styles = {
    shell: {
        position: "relative",
        width: "100%",
        backgroundImage: `url(${homeBg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
    },
    overlay: {
        position: "absolute",
        inset: 0,
        background:
            "linear-gradient(180deg, rgba(7, 8, 12, 0.52) 0%, rgba(7, 8, 12, 0.62) 45%, rgba(7, 8, 12, 0.72) 100%)",
        pointerEvents: "none",
        zIndex: 0,
    },
    contentWrap: {
        position: "relative",
        zIndex: 1,
        padding: "22px 16px 40px",
    },
    inner: {
        maxWidth: "980px",
        margin: "0 auto",
    },
    hero: {
        textAlign: "center",
        marginBottom: "18px",
    },
    title: {
        margin: 0,
        color: t.gold,
        fontSize: "30px",
        fontWeight: "800",
    },
    subtitle: {
        margin: "10px auto 0",
        maxWidth: "760px",
        color: t.text,
        fontSize: "15px",
        lineHeight: 1.6,
    },
    grid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))",
        gap: "14px",
    },
    card: {
        backgroundColor: t.surface,
        border: `1px solid rgba(249, 200, 81, 0.34)`,
        borderRadius: t.radius,
        boxShadow: t.shadow,
        padding: "15px",
    },
    cardTitle: {
        margin: "0 0 12px",
        color: t.text,
        fontSize: "18px",
        fontWeight: "700",
    },
    form: {
        display: "grid",
        gap: "10px",
    },
    label: {
        display: "grid",
        gap: "6px",
        color: t.textMuted,
        fontSize: "13px",
        fontWeight: "600",
    },
    input: {
        border: `1px solid ${t.border}`,
        backgroundColor: "#0f1419",
        color: t.text,
        borderRadius: t.radiusSm,
        padding: "10px 12px",
        fontSize: "14px",
        outline: "none",
    },
    select: {
        border: `1px solid ${t.border}`,
        backgroundColor: "#0f1419",
        color: t.text,
        borderRadius: t.radiusSm,
        padding: "10px 12px",
        fontSize: "14px",
        outline: "none",
        cursor: "pointer",
    },
    textarea: {
        border: `1px solid ${t.border}`,
        backgroundColor: "#0f1419",
        color: t.text,
        borderRadius: t.radiusSm,
        padding: "10px 12px",
        fontSize: "14px",
        outline: "none",
        resize: "vertical",
    },
    submitBtn: {
        marginTop: "2px",
        border: `1px solid ${t.gold}`,
        backgroundColor: t.gold,
        color: t.onGold,
        borderRadius: t.radiusSm,
        padding: "10px 14px",
        fontWeight: "700",
        fontSize: "14px",
        cursor: "pointer",
    },
    submitBtnDisabled: {
        marginTop: "2px",
        border: `1px solid ${t.border}`,
        backgroundColor: t.borderSubtle,
        color: t.textDim,
        borderRadius: t.radiusSm,
        padding: "10px 14px",
        fontWeight: "700",
        fontSize: "14px",
        cursor: "not-allowed",
    },
    successText: {
        margin: "2px 0 0",
        color: t.success,
        fontSize: "13px",
        fontWeight: "600",
    },
    errorText: {
        margin: "2px 0 0",
        color: t.danger,
        fontSize: "13px",
        fontWeight: "600",
    },
    quickList: {
        display: "grid",
        gap: "10px",
    },
    quickItem: {
        border: `1px solid ${t.borderSubtle}`,
        backgroundColor: "rgba(15, 20, 25, 0.9)",
        borderRadius: t.radiusSm,
        padding: "10px 12px",
        display: "grid",
        gap: "3px",
        textDecoration: "none",
    },
    quickLabel: {
        color: t.textMuted,
        fontSize: "12px",
        fontWeight: "700",
        letterSpacing: "0.03em",
        textTransform: "uppercase",
    },
    quickValue: {
        color: t.text,
        fontSize: "14px",
        fontWeight: "600",
        lineHeight: 1.4,
    },
    note: {
        margin: "12px 0 0",
        color: t.textDim,
        fontSize: "13px",
        lineHeight: 1.5,
    },
};
