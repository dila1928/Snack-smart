import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { getAuthEmail } from "./authSession";
import { theme as t } from "./theme";

const ORANGE = "linear-gradient(135deg, #ea580c, #f97316)";
const TEAL = "#5eead4";
const BOT_AVATAR = "🤖";

const QUICK_REPLIES = [
    { label: "Order status?", key: "status" },
    { label: "Order details", key: "details" },
    { label: "How to cancel?", key: "cancel" },
    { label: "Contact support", key: "contact" },
    { label: "Help", key: "help" },
];

const CANNED = {
    status:
        "Check **My Orders** or **Profile → Order History**. Tap an order to see its **Live GPS** on the same page when it’s out for delivery.",
    details:
        "Use **My Orders** or **Profile**: tap an order for the GPS map, or **Details** / **Full details** for items, payment, ETA, and rider when assigned.",
    cancel:
        "Before the canteen accepts your order, you can cancel from **Profile → Awaiting canteen**. After that, contact Main Canteen during service hours.",
    contact:
        "Reach the canteen at Main Canteen during service hours, or use your campus support channel. SnackBot can’t place cancellations for you.",
    help:
        "Ask about **Live GPS**, order tracking, rider info, ETAs, checkout, or your profile. Type below anytime!",
    default:
        "Thanks for your message! For orders and live tracking, open **My Orders** or **Profile**. I’m a demo assistant for Snack Smart.",
};

function formatBotText(raw) {
    const parts = raw.split(/\*\*(.+?)\*\*/g);
    return parts.map((chunk, i) =>
        i % 2 === 1 ? (
            <strong key={i} style={{ color: t.text }}>
                {chunk}
            </strong>
        ) : (
            <span key={i}>{chunk}</span>
        )
    );
}

function nowTime() {
    return new Date().toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function SnackBot() {
    const location = useLocation();
    const [open, setOpen] = useState(false);
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState([]);
    const listRef = useRef(null);
    const welcomeAddedRef = useRef(false);

    const userLabel = useMemo(() => {
        const e = getAuthEmail().trim();
        if (!e) return "there";
        const local = e.split("@")[0];
        return local || "there";
    }, [location.pathname, open]);

    useEffect(() => {
        if (!open || welcomeAddedRef.current) return;
        welcomeAddedRef.current = true;
        setMessages([
            {
                id: "welcome",
                role: "bot",
                text: `👋 Hi **${userLabel}**! I'm SnackBot.\nI can help with order tracking, live GPS, ETA, rider info and more!`,
                time: nowTime(),
            },
        ]);
    }, [open, userLabel]);

    useEffect(() => {
        if (open && listRef.current) {
            listRef.current.scrollTop = listRef.current.scrollHeight;
        }
    }, [messages, open]);

    const pushBot = useCallback((text) => {
        setMessages((prev) => [...prev, { id: `b-${Date.now()}`, role: "bot", text, time: nowTime() }]);
    }, []);

    const pushUser = useCallback((text) => {
        setMessages((prev) => [...prev, { id: `u-${Date.now()}`, role: "user", text, time: nowTime() }]);
    }, []);

    const handleQuick = (key) => {
        const q = QUICK_REPLIES.find((x) => x.key === key);
        if (!q) return;
        pushUser(q.label);
        setTimeout(() => pushBot(CANNED[key] || CANNED.default), 350);
    };

    const handleSend = () => {
        const t = input.trim();
        if (!t) return;
        pushUser(t);
        setInput("");
        const lower = t.toLowerCase();
        let reply = CANNED.default;
        if (/status|track|where.*order/i.test(t)) reply = CANNED.status;
        else if (/detail|item|what.*order/i.test(t)) reply = CANNED.details;
        else if (/cancel|reject/i.test(t)) reply = CANNED.cancel;
        else if (/contact|support|email|phone/i.test(t)) reply = CANNED.contact;
        else if (/help|how/i.test(t)) reply = CANNED.help;
        setTimeout(() => pushBot(reply), 400);
    };

    return (
        <>
            {open ? (
                <div
                    style={panelWrap}
                    role="dialog"
                    aria-label="SnackBot chat"
                    aria-modal="true"
                >
                    <div style={panel}>
                        <header style={panelHeader}>
                            <div style={headerLeft}>
                                <div style={avatarWrap}>
                                    <span style={avatarEmoji} aria-hidden>
                                        {BOT_AVATAR}
                                    </span>
                                    <span style={onlineDot} title="Online" />
                                </div>
                                <div>
                                    <p style={botTitle}>SnackBot</p>
                                    <p style={botSub}>Delivery Assistant · Online</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setOpen(false)}
                                style={closeBtn}
                                aria-label="Close chat"
                            >
                                ✕
                            </button>
                        </header>

                        <div ref={listRef} style={msgList}>
                            {messages.map((m) => (
                                <div key={m.id} style={m.role === "user" ? msgRowUser : msgRowBot}>
                                    {m.role === "bot" ? (
                                        <span style={bubbleAvatar} aria-hidden>
                                            {BOT_AVATAR}
                                        </span>
                                    ) : null}
                                    <div>
                                        <div style={m.role === "user" ? bubbleUser : bubbleBot}>
                                            {m.role === "bot" ? (
                                                <p style={bubbleText}>{formatBotText(m.text)}</p>
                                            ) : (
                                                <p style={bubbleText}>{m.text}</p>
                                            )}
                                        </div>
                                        <p style={msgTime}>{m.time}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div style={chipsRow}>
                            {QUICK_REPLIES.map((q) => (
                                <button key={q.key} type="button" style={chip} onClick={() => handleQuick(q.key)}>
                                    {q.label}
                                </button>
                            ))}
                        </div>

                        <footer style={footerRow}>
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                                placeholder="Ask about your order, rider, ETA..."
                                style={inputField}
                                aria-label="Message SnackBot"
                            />
                            <button type="button" style={sendBtn} onClick={handleSend} aria-label="Send">
                                <span style={{ fontSize: "16px" }} aria-hidden>
                                    ➤
                                </span>
                            </button>
                        </footer>
                    </div>
                </div>
            ) : null}

            <button
                type="button"
                style={fab}
                onClick={() => setOpen((v) => !v)}
                aria-label={open ? "Close SnackBot" : "Open SnackBot assistant"}
                aria-expanded={open}
            >
                <span style={{ fontSize: "22px", filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.2))" }} aria-hidden>
                    🔔
                </span>
                {!open ? (
                    <span style={fabBadge} aria-hidden>
                        1
                    </span>
                ) : null}
            </button>
        </>
    );
}

const fab = {
    position: "fixed",
    right: "22px",
    bottom: "22px",
    width: "58px",
    height: "58px",
    borderRadius: "50%",
    border: "none",
    background: ORANGE,
    color: "#fff",
    cursor: "pointer",
    boxShadow: "0 10px 28px rgba(234, 88, 12, 0.5), 0 0 0 1px rgba(255,255,255,0.08) inset",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10000,
    fontFamily: "inherit",
};

const fabBadge = {
    position: "absolute",
    top: "-2px",
    right: "-2px",
    minWidth: "22px",
    height: "22px",
    borderRadius: "999px",
    backgroundColor: "#ef4444",
    color: "#fff",
    fontSize: "12px",
    fontWeight: 800,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "2px solid #0f172a",
    boxSizing: "border-box",
};

const panelWrap = {
    position: "fixed",
    right: "22px",
    bottom: "96px",
    zIndex: 9999,
    width: "min(380px, calc(100vw - 36px))",
    maxHeight: "min(560px, calc(100vh - 120px))",
    display: "flex",
    flexDirection: "column",
    pointerEvents: "auto",
};

const panel = {
    display: "flex",
    flexDirection: "column",
    height: "min(520px, calc(100vh - 130px))",
    maxHeight: "70vh",
    background: "linear-gradient(180deg, #111827 0%, #0f172a 100%)",
    borderRadius: "20px",
    border: `1px solid ${t.borderSubtle}`,
    boxShadow: "0 24px 48px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04) inset",
    overflow: "hidden",
    boxSizing: "border-box",
};

const panelHeader = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    padding: "14px 16px",
    borderBottom: `1px solid ${t.borderSubtle}`,
    backgroundColor: "rgba(0,0,0,0.2)",
    flexShrink: 0,
};

const headerLeft = {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    minWidth: 0,
};

const avatarWrap = {
    position: "relative",
    width: "44px",
    height: "44px",
    borderRadius: "12px",
    background: "linear-gradient(145deg, #4c1d95, #7c3aed)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
};

const avatarEmoji = { fontSize: "24px", lineHeight: 1 };

const onlineDot = {
    position: "absolute",
    bottom: "-1px",
    right: "-1px",
    width: "12px",
    height: "12px",
    borderRadius: "50%",
    backgroundColor: t.success,
    border: "2px solid #111827",
    boxSizing: "border-box",
};

const botTitle = {
    margin: 0,
    fontSize: "17px",
    fontWeight: 800,
    color: t.text,
    letterSpacing: "-0.02em",
};

const botSub = {
    margin: "4px 0 0",
    fontSize: "12px",
    fontWeight: 600,
    color: TEAL,
};

const closeBtn = {
    width: "36px",
    height: "36px",
    borderRadius: "10px",
    border: `1px solid ${t.border}`,
    background: "rgba(0,0,0,0.35)",
    color: t.textMuted,
    fontSize: "16px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    fontFamily: "inherit",
};

const msgList = {
    flex: 1,
    overflowY: "auto",
    padding: "14px 14px 10px",
    display: "flex",
    flexDirection: "column",
    gap: "14px",
    minHeight: 0,
};

const msgRowBot = {
    display: "flex",
    gap: "10px",
    alignItems: "flex-end",
};

const msgRowUser = {
    display: "flex",
    justifyContent: "flex-end",
};

const bubbleAvatar = {
    fontSize: "20px",
    lineHeight: 1,
    flexShrink: 0,
    marginBottom: "22px",
};

const bubbleBot = {
    background: "linear-gradient(135deg, rgba(30,58,138,0.55), rgba(30,41,59,0.9))",
    border: "1px solid rgba(99,102,241,0.25)",
    borderRadius: "16px 16px 16px 6px",
    padding: "12px 14px",
    maxWidth: "280px",
};

const bubbleUser = {
    background: "rgba(249, 200, 81, 0.12)",
    border: `1px solid rgba(249, 200, 81, 0.35)`,
    borderRadius: "16px 16px 6px 16px",
    padding: "10px 14px",
    maxWidth: "280px",
};

const bubbleText = {
    margin: 0,
    fontSize: "14px",
    lineHeight: 1.5,
    color: "#e2e8f0",
    whiteSpace: "pre-wrap",
};

const msgTime = {
    margin: "6px 0 0 4px",
    fontSize: "11px",
    color: t.textDim,
};

const chipsRow = {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
    padding: "0 14px 12px",
    flexShrink: 0,
};

const chip = {
    padding: "6px 12px",
    borderRadius: "999px",
    border: `1px solid ${t.border}`,
    background: "transparent",
    color: t.textMuted,
    fontSize: "12px",
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "inherit",
};

const footerRow = {
    display: "flex",
    gap: "10px",
    padding: "12px 14px 16px",
    borderTop: `1px solid ${t.borderSubtle}`,
    backgroundColor: "rgba(0,0,0,0.25)",
    flexShrink: 0,
};

const inputField = {
    flex: 1,
    minWidth: 0,
    padding: "12px 14px",
    borderRadius: "12px",
    border: `1px solid ${t.border}`,
    backgroundColor: "rgba(0,0,0,0.35)",
    color: t.text,
    fontSize: "14px",
    fontFamily: "inherit",
    outline: "none",
    boxSizing: "border-box",
};

const sendBtn = {
    width: "46px",
    height: "46px",
    borderRadius: "12px",
    border: "none",
    background: "linear-gradient(135deg, #c2410c, #ea580c)",
    color: "#0b0e14",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    fontFamily: "inherit",
    boxShadow: "0 4px 14px rgba(234, 88, 12, 0.35)",
};
