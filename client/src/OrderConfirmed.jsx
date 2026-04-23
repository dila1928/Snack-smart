import React, { useEffect, useMemo, useRef } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { MainLayout } from "./MainLayout";
import { theme as t } from "./theme";
import { useCart } from "./CartContext";

const LAST_ORDER_KEY = "snackSmartLastOrder";

function readOrderFromStorage() {
    try {
        const raw = sessionStorage.getItem(LAST_ORDER_KEY);
        if (!raw) return null;
        const o = JSON.parse(raw);
        if (o && o.orderId && Array.isArray(o.items)) return o;
    } catch {
        /* ignore */
    }
    return null;
}

/** Page-local palette (matches order-confirmed mockup) */
const pageBg = "#0d1117";
const cardBg = "#161b22";
const labelMuted = "#8b949e";
const successGreen = "#2ea043";
const successBright = "#3fb950";
const accentGold = "#facc15";
const accentOnGold = "#0d1117";
const cardIconBlue = "#58a6ff";

function StarIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden style={{ marginRight: "8px" }}>
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
    );
}

function CardPayIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden style={{ marginRight: "8px", verticalAlign: "middle" }}>
            <rect x="2" y="5" width="20" height="14" rx="2" stroke={cardIconBlue} strokeWidth="1.5" />
            <path d="M2 10h20" stroke={cardIconBlue} strokeWidth="1.5" />
        </svg>
    );
}

export default function OrderConfirmed() {
    const { clearCart } = useCart();
    const location = useLocation();
    const data = useMemo(() => {
        const s = location.state;
        if (s && typeof s.orderId === "string" && s.orderId.length > 0) return s;
        return readOrderFromStorage();
    }, [location.state]);

    useEffect(() => {
        if (!data?.orderId) return;
        try {
            sessionStorage.setItem(LAST_ORDER_KEY, JSON.stringify(data));
        } catch {
            /* ignore */
        }
    }, [data?.orderId]);

    const clearedRef = useRef(false);
    useEffect(() => {
        if (!data?.orderId || clearedRef.current) return;
        clearedRef.current = true;
        clearCart();
    }, [data?.orderId, clearCart]);

    if (!data?.orderId) {
        return <Navigate to="/cart" replace />;
    }

    const placed = data.placedAt ? new Date(data.placedAt) : new Date();
    const dateStr = placed.toLocaleString();
    const payDateStr = new Date(placed.getTime() + 1000).toLocaleString();

    const methodLabel =
        data.paymentMethod === "cash" ? (
            "Cash"
        ) : (
            <span style={{ display: "inline-flex", alignItems: "center", color: t.text }}>
                <CardPayIcon />
                Card
            </span>
        );

    const reviewsState = {
        orderId: data.orderId,
        placedAt: data.placedAt,
        email: data.email,
        items: data.items || [],
        /** Open first reviewable item’s form (matches “My Reviews” mockup). */
        openFirstReview: true,
    };

    return (
        <MainLayout>
            <div style={shell}>
                <div style={inner}>
                    <div style={hero}>
                        <div style={successCircle} aria-hidden>
                            ✓
                        </div>
                        <h1 style={h1}>Order Confirmed!</h1>
                        <p style={sub}>Thank you. Your order has been placed and payment received.</p>
                    </div>

                    <div style={twoCol}>
                        <div style={card}>
                            <h2 style={cardTitle}>Order Details</h2>
                            <dl style={dl}>
                                <div style={dlRow}>
                                    <dt style={dt}>Order ID</dt>
                                    <dd style={ddValue}>{data.orderId}</dd>
                                </div>
                                <div style={dlRow}>
                                    <dt style={dt}>Status</dt>
                                    <dd style={{ ...ddValue, color: successGreen, fontWeight: 700 }}>Paid</dd>
                                </div>
                                <div style={dlRow}>
                                    <dt style={dt}>Email</dt>
                                    <dd style={ddValue}>{data.email}</dd>
                                </div>
                                <div style={dlRow}>
                                    <dt style={dt}>Date</dt>
                                    <dd style={ddValue}>{dateStr}</dd>
                                </div>
                            </dl>

                            <h3 style={sectionH}>Items Ordered</h3>
                            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                                {(data.items || []).map((item, idx) => (
                                    <li
                                        key={`${item.id}-${idx}`}
                                        style={{
                                            ...itemRow,
                                            borderBottom:
                                                idx === (data.items || []).length - 1 ? "none" : `1px solid ${t.borderSubtle}`,
                                        }}
                                    >
                                        <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
                                            <div style={thumb}>
                                                {item.image_url ? (
                                                    <img src={item.image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                                ) : (
                                                    <span style={{ fontSize: "10px", color: t.textDim }}>No img</span>
                                                )}
                                            </div>
                                            <div style={{ minWidth: 0 }}>
                                                <p style={{ margin: 0, fontWeight: 700, color: t.text }}>{item.name}</p>
                                                <p style={{ margin: "4px 0 0", fontSize: "13px", color: labelMuted }}>
                                                    LKR {Number(item.unitPrice).toFixed(2)} × {item.quantity}
                                                </p>
                                            </div>
                                        </div>
                                        <span style={{ fontWeight: 800, color: accentGold, flexShrink: 0 }}>
                                            LKR {Number(item.lineTotal).toFixed(2)}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                            <div style={totalBar}>
                                <span style={{ fontWeight: 700, color: t.text }}>Total Paid</span>
                                <span style={{ fontWeight: 800, fontSize: "22px", color: accentGold }}>LKR {Number(data.amount).toFixed(2)}</span>
                            </div>
                        </div>

                        <div style={card}>
                            <h2 style={cardTitle}>Payment Receipt</h2>
                            <dl style={dl}>
                                <div style={dlRow}>
                                    <dt style={dt}>Transaction ID</dt>
                                    <dd style={ddValue}>{data.transactionId}</dd>
                                </div>
                                <div style={dlRow}>
                                    <dt style={dt}>Method</dt>
                                    <dd style={{ ...ddValue, margin: 0 }}>{methodLabel}</dd>
                                </div>
                                {data.paymentMethod === "card" && data.cardHolder ? (
                                    <div style={dlRow}>
                                        <dt style={dt}>Card Holder</dt>
                                        <dd style={ddValue}>{data.cardHolder}</dd>
                                    </div>
                                ) : null}
                                {data.paymentMethod === "card" && data.cardLast4 ? (
                                    <div style={dlRow}>
                                        <dt style={dt}>Card</dt>
                                        <dd style={ddValue}>.... .... .... {data.cardLast4}</dd>
                                    </div>
                                ) : null}
                                <div style={dlRow}>
                                    <dt style={dt}>Amount</dt>
                                    <dd style={{ ...ddValue, color: accentGold, fontWeight: 800 }}>LKR {Number(data.amount).toFixed(2)}</dd>
                                </div>
                                <div style={dlRow}>
                                    <dt style={dt}>Status</dt>
                                    <dd
                                        style={{
                                            ...ddValue,
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "6px",
                                            color: successGreen,
                                            fontWeight: 700,
                                        }}
                                    >
                                        <span aria-hidden style={{ fontSize: "16px" }}>
                                            ✓
                                        </span>
                                        Success
                                    </dd>
                                </div>
                                <div style={dlRow}>
                                    <dt style={dt}>Date</dt>
                                    <dd style={ddValue}>{payDateStr}</dd>
                                </div>
                            </dl>

                            <div style={confirmBox}>
                                <p style={{ margin: 0, fontWeight: 800, color: successBright, fontSize: "15px", textAlign: "center" }}>
                                    ✓ Payment Confirmed
                                </p>
                                <p style={{ margin: "8px 0 0", fontSize: "12px", color: labelMuted, lineHeight: 1.5, textAlign: "center" }}>
                                    Simulated payment for academic purposes
                                </p>
                            </div>
                        </div>
                    </div>

                    <div style={actions}>
                        <Link to="/food" style={btnPrimary}>
                            Continue Shopping
                        </Link>
                        <Link to="/my-reviews" state={reviewsState} style={btnReview}>
                            <StarIcon />
                            Write a Review
                        </Link>
                        <Link to="/home" style={btnGhost}>
                            Back to Home
                        </Link>
                    </div>
                </div>
            </div>
        </MainLayout>
    );
}

const shell = {
    flex: "1 1 auto",
    width: "100%",
    minHeight: 0,
    backgroundColor: pageBg,
};

const inner = {
    maxWidth: "1100px",
    margin: "0 auto",
    padding: "36px 20px 56px",
    boxSizing: "border-box",
};

const hero = {
    textAlign: "center",
    marginBottom: "36px",
};

const successCircle = {
    width: "64px",
    height: "64px",
    borderRadius: "50%",
    backgroundColor: "#22c55e",
    color: "#ffffff",
    fontSize: "30px",
    fontWeight: 800,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 18px",
    boxSizing: "border-box",
    boxShadow: "0 8px 28px rgba(34, 197, 94, 0.35)",
};

const h1 = {
    margin: "0 0 10px",
    fontSize: "clamp(28px, 4vw, 34px)",
    fontWeight: 800,
    color: t.text,
    letterSpacing: "-0.02em",
};

const sub = {
    margin: 0,
    color: labelMuted,
    fontSize: "15px",
    maxWidth: "480px",
    marginLeft: "auto",
    marginRight: "auto",
    lineHeight: 1.5,
};

const twoCol = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))",
    gap: "24px",
    marginBottom: "36px",
};

const card = {
    backgroundColor: cardBg,
    borderRadius: t.radius,
    border: `1px solid #30363d`,
    padding: "24px 22px",
    boxSizing: "border-box",
};

const cardTitle = {
    margin: "0 0 18px",
    fontSize: "18px",
    fontWeight: 800,
    color: t.text,
};

const dl = { margin: 0 };
const dlRow = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "16px",
    marginBottom: "14px",
};
const dt = {
    margin: 0,
    fontSize: "13px",
    fontWeight: 600,
    color: labelMuted,
    flexShrink: 0,
};
const ddValue = {
    margin: 0,
    fontSize: "14px",
    color: t.text,
    textAlign: "right",
    wordBreak: "break-all",
    lineHeight: 1.4,
};

const sectionH = {
    margin: "22px 0 14px",
    fontSize: "15px",
    fontWeight: 800,
    color: t.text,
};

const itemRow = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    padding: "14px 0",
};

const thumb = {
    width: "52px",
    height: "52px",
    borderRadius: t.radiusSm,
    backgroundColor: t.surfaceHover,
    overflow: "hidden",
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
};

const totalBar = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: "18px",
    paddingTop: "18px",
    borderTop: `1px solid ${t.border}`,
};

const confirmBox = {
    marginTop: "22px",
    padding: "16px 18px",
    borderRadius: t.radiusSm,
    border: `2px solid ${successBright}`,
    backgroundColor: "rgba(46, 160, 67, 0.12)",
};

const actions = {
    display: "flex",
    flexWrap: "wrap",
    gap: "14px",
    justifyContent: "center",
    alignItems: "center",
};

const btnPrimary = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "14px 28px",
    borderRadius: t.radiusPill,
    backgroundColor: accentGold,
    color: accentOnGold,
    fontWeight: 800,
    textDecoration: "none",
    fontSize: "15px",
    border: "none",
};

const btnReview = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "12px 24px",
    borderRadius: t.radiusPill,
    border: `2px solid ${accentGold}`,
    color: accentGold,
    fontWeight: 700,
    textDecoration: "none",
    fontSize: "15px",
    backgroundColor: "transparent",
};

const btnGhost = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "12px 24px",
    borderRadius: t.radiusPill,
    border: `1px solid ${t.border}`,
    color: t.text,
    fontWeight: 600,
    textDecoration: "none",
    fontSize: "15px",
    backgroundColor: "rgba(255,255,255,0.04)",
};
