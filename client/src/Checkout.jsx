import React, { useMemo, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { MainLayout } from "./MainLayout";
import { theme as t } from "./theme";
import { useCart } from "./CartContext";
import { getAuthEmail } from "./authSession";
import { getCartLineTotal, getCartLineUnitPrice, isOfferLine } from "./cartPricing";
import { api } from "./api";

function digitsOnly(s) {
    return String(s || "").replace(/\D/g, "");
}

/** Letters (any language), spaces, hyphen, apostrophe, period — typical cardholder names. */
function sanitizeCardName(raw) {
    return String(raw || "")
        .replace(/[^\p{L}\s'\-.]/gu, "")
        .replace(/\s{2,}/g, " ")
        .slice(0, 80);
}

/** Exactly 16 digits max; non-digits stripped (handles paste). */
function sanitizeCardDigits(raw) {
    return digitsOnly(raw).slice(0, 16);
}

/** Show groups of 4 for readability; underlying state stays digits-only. */
function formatCardDigitsForDisplay(digits) {
    const d = String(digits || "");
    if (!d) return "";
    return d.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
}

/** MM/YY from digits only; slash inserted after month. */
function sanitizeExpiry(raw) {
    const d = digitsOnly(raw).slice(0, 4);
    if (d.length <= 2) return d;
    return `${d.slice(0, 2)}/${d.slice(2)}`;
}

/** Exactly 3 digits max. */
function sanitizeCvv(raw) {
    return digitsOnly(raw).slice(0, 3);
}

/** Card is valid through the last moment of the expiry month. `yy` is two-digit year (00–99 → 2000–2099). */
function isCardExpiryPast(mm, yy) {
    const fullYear = 2000 + yy;
    const expiryEnd = new Date(fullYear, mm, 0, 23, 59, 59, 999);
    return Date.now() > expiryEnd.getTime();
}

/**
 * @param {boolean} whileTyping — when true, don’t flag incomplete card number / expiry until the user has enough digits (smoother live feedback).
 */
function validateCardForm({ cardName, cardNumber, expiry, cvv }, whileTyping = false) {
    const errors = {};
    if (!String(cardName || "").trim()) {
        errors.cardName = "Account holder name is required.";
    }

    const num = digitsOnly(cardNumber);
    if (!num) {
        errors.cardNumber = "Enter the 16-digit payment reference.";
    } else if (num.length < 16 && whileTyping) {
        /* still typing toward 16 digits */
    } else if (num.length !== 16) {
        errors.cardNumber = "Payment reference must be exactly 16 digits.";
    }

    const exp = String(expiry || "").trim();
    if (!exp) {
        errors.expiry = "Valid-through date is required.";
    } else {
        const compact = exp.replace(/\D/g, "");
        if (whileTyping && compact.length > 0 && compact.length < 4) {
            /* still entering MMYY */
        } else if (compact.length < 4) {
            errors.expiry = "Use MM/YY format.";
        } else {
            const mm = parseInt(compact.slice(0, 2), 10);
            const yy = parseInt(compact.slice(2, 4), 10);
            if (Number.isNaN(mm) || mm < 1 || mm > 12) {
                errors.expiry = "Invalid month. Use 01–12 for MM (MM/YY).";
            } else if (Number.isNaN(yy)) {
                errors.expiry = "Use MM/YY format.";
            } else if (isCardExpiryPast(mm, yy)) {
                errors.expiry = "That date is in the past. Use MM/YY on or after this month.";
            }
        }
    }

    const c = digitsOnly(cvv);
    if (!c) {
        errors.cvv = "Security code is required.";
    } else if (c.length < 3 && whileTyping) {
        /* still typing toward 3 digits */
    } else if (c.length !== 3) {
        errors.cvv = "Security code must be exactly 3 digits.";
    }

    return errors;
}

function FieldError({ message }) {
    if (!message) return null;
    return (
        <span style={errText} role="alert">
            <span style={warnIcon} aria-hidden>
                ⚠
            </span>
            {message}
        </span>
    );
}

export default function Checkout() {
    const navigate = useNavigate();
    const { items, totalCount, totalPrice } = useCart();
    const [orderNote, setOrderNote] = useState("");
    const [paymentMethod, setPaymentMethod] = useState("card");
    const [cardName, setCardName] = useState("");
    /** Digits only, exactly 16 (display uses spaced groups). */
    const [cardNumber, setCardNumber] = useState("");
    const [expiry, setExpiry] = useState("");
    const [cvv, setCvv] = useState("");
    /** After any card field changes, show live validation (not only on submit). */
    const [cardLiveValidate, setCardLiveValidate] = useState(false);
    const [checkoutError, setCheckoutError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const cardErrors = useMemo(() => {
        if (paymentMethod !== "card" || !cardLiveValidate) return {};
        return validateCardForm({ cardName, cardNumber, expiry, cvv }, true);
    }, [paymentMethod, cardLiveValidate, cardName, cardNumber, expiry, cvv]);

    const lines = useMemo(
        () =>
            items.map((line) => ({
                ...line,
                unitPrice: getCartLineUnitPrice(line),
                lineTotal: getCartLineTotal(line),
                isOffer: isOfferLine(line),
            })),
        [items]
    );

    if (totalCount === 0) {
        return <Navigate to="/cart" replace />;
    }

    const handleConfirm = async (e) => {
        e.preventDefault();
        setCheckoutError("");

        if (paymentMethod === "card") {
            setCardLiveValidate(true);
            const v = validateCardForm({ cardName, cardNumber, expiry, cvv }, false);
            if (Object.keys(v).length > 0) return;
        }

        const stockLines = items
            .map((l) => {
                const isOff = l.kind === "offer" || String(l.id).startsWith("offer:");
                const id = isOff ? String(l.id).replace(/^offer:/, "") : String(l.id);
                return {
                    kind: isOff ? "offer" : "food",
                    id,
                    quantity: Math.max(0, Math.floor(Number(l.quantity) || 0)),
                };
            })
            .filter((l) => l.quantity > 0 && l.id);

        setIsSubmitting(true);
        try {
            try {
                await api.post("/checkout/apply-stock", { lines: stockLines });
            } catch (stockErr) {
                if (!stockErr.response) {
                    console.warn(
                        "[Checkout] Stock API unreachable — opening order confirmation without updating inventory. Start the API on port 3001 for real stock changes."
                    );
                } else {
                    throw stockErr;
                }
            }

            const num = cardNumber;
            const last4 = num.length >= 4 ? num.slice(-4) : "0000";
            const orderId =
                typeof crypto !== "undefined" && crypto.randomUUID
                    ? crypto.randomUUID().replace(/-/g, "").slice(0, 24)
                    : `ord${Date.now().toString(36)}`;
            const transactionId = `TXN${Date.now()}${Math.floor(10000 + Math.random() * 90000)}`;

            const payload = {
                orderId,
                transactionId,
                email: getAuthEmail().trim() || "guest@snacksmart.com",
                placedAt: new Date().toISOString(),
                paymentMethod,
                cardHolder: paymentMethod === "card" ? String(cardName).trim() : null,
                cardLast4: paymentMethod === "card" ? last4 : null,
                amount: totalPrice,
                orderNote: orderNote.trim(),
                items: lines.map((l) => ({
                    id: l.id,
                    name: l.name,
                    quantity: l.quantity,
                    unitPrice: l.unitPrice,
                    lineTotal: l.lineTotal,
                    image_url: l.image_url || "",
                    isOffer: l.isOffer,
                })),
            };

            try {
                await api.post("/orders/checkout", {
                    orderId: payload.orderId,
                    transactionId: payload.transactionId,
                    email: payload.email,
                    paymentMethod: payload.paymentMethod,
                    cardHolder: payload.cardHolder ?? "",
                    cardLast4: payload.cardLast4 ?? "",
                    amount: payload.amount,
                    orderNote: payload.orderNote,
                    items: payload.items,
                });
            } catch (orderErr) {
                if (!orderErr.response) {
                    console.warn(
                        "[Checkout] Orders API unreachable — order not saved for admin. Start MongoDB and the API on port 3001."
                    );
                } else if (orderErr.response.status === 409) {
                    console.warn("[Checkout] Duplicate order id — continuing to confirmation.");
                } else {
                    const om = orderErr.response.data?.message;
                    setCheckoutError(typeof om === "string" ? om : "Could not save order. Try again.");
                    return;
                }
            }

            try {
                sessionStorage.setItem("snackSmartLastOrder", JSON.stringify(payload));
            } catch {
                /* ignore */
            }
            navigate("/order-confirmed", { state: payload, replace: true });
        } catch (err) {
            const msg = err.response?.data?.message;
            if (typeof msg === "string") {
                setCheckoutError(msg);
            } else if (err.response) {
                setCheckoutError("Could not update stock. Check your cart and try again.");
            } else {
                setCheckoutError("Network error. Check your connection and try again.");
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <MainLayout>
            <div style={shell}>
                <div style={inner}>
                    <Link to="/cart" style={backLink}>
                        ← Back to Cart
                    </Link>
                    <h1 style={title}>Checkout</h1>

                    {/* autocomplete=cc-* on http:// triggers Chrome’s “insecure payment” banner; use off for local HTTP */}
                    <form onSubmit={handleConfirm} style={grid} autoComplete="off">
                        <div style={columnCard}>
                            <h2 style={cardTitle}>Order Summary</h2>
                            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                                {lines.map((l) => (
                                    <li key={l.id} style={summaryRow}>
                                        <div style={{ minWidth: 0 }}>
                                            <p style={{ margin: 0, fontWeight: 700, color: t.text }}>{l.name}</p>
                                            <p style={{ margin: "4px 0 0", fontSize: "13px", color: t.textMuted }}>
                                                LKR {l.unitPrice.toFixed(2)} × {l.quantity}
                                            </p>
                                        </div>
                                        <span style={{ fontWeight: 800, color: t.gold, flexShrink: 0 }}>
                                            LKR {l.lineTotal.toFixed(2)}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                            <div style={divider} />
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                                <span style={{ color: t.textMuted, fontWeight: 600 }}>Total</span>
                                <span style={{ fontWeight: 800, fontSize: "18px", color: t.gold }}>LKR {totalPrice.toFixed(2)}</span>
                            </div>
                            <label style={label}>Order Note (optional)</label>
                            <textarea
                                value={orderNote}
                                onChange={(e) => setOrderNote(e.target.value)}
                                placeholder="Any special instructions..."
                                rows={4}
                                style={textarea}
                            />
                        </div>

                        <div style={columnCard}>
                            <h2 style={cardTitle}>Payment</h2>

                            <p style={label}>Payment Method</p>
                            <div style={methodRow}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setPaymentMethod("card");
                                    }}
                                    style={paymentMethod === "card" ? methodBtnActive : methodBtn}
                                >
                                    Card
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setPaymentMethod("cash");
                                    }}
                                    style={paymentMethod === "cash" ? methodBtnActive : methodBtn}
                                >
                                    <span style={{ fontSize: "18px", marginRight: "8px" }} aria-hidden>
                                        💵
                                    </span>
                                    Cash
                                </button>
                            </div>

                            {paymentMethod === "card" ? (
                                <>
                                    <div style={fieldBlock}>
                                        <label style={label} htmlFor="checkout-sim-holder">
                                            Account holder name *
                                        </label>
                                        <input
                                            id="checkout-sim-holder"
                                            value={cardName}
                                            onChange={(e) => {
                                                setCardName(sanitizeCardName(e.target.value));
                                                setCardLiveValidate(true);
                                            }}
                                            placeholder="Name for this order"
                                            style={{ ...input, ...(cardErrors.cardName ? inputError : {}) }}
                                            autoComplete="off"
                                            name="order-billing-name"
                                            spellCheck={false}
                                            autoCapitalize="words"
                                            data-lpignore="true"
                                            data-1p-ignore="true"
                                        />
                                        <FieldError message={cardErrors.cardName} />
                                    </div>
                                    <div style={fieldBlock}>
                                        <label style={label} htmlFor="checkout-sim-digits">
                                            Payment reference (16 digits) *
                                        </label>
                                        <input
                                            id="checkout-sim-digits"
                                            value={formatCardDigitsForDisplay(cardNumber)}
                                            onChange={(e) => {
                                                setCardNumber(sanitizeCardDigits(e.target.value));
                                                setCardLiveValidate(true);
                                            }}
                                            placeholder="Enter sixteen digits (spaces optional)"
                                            style={{ ...input, ...(cardErrors.cardNumber ? inputError : {}) }}
                                            autoComplete="off"
                                            name="order-ref-digits"
                                            type="text"
                                            inputMode="text"
                                            data-lpignore="true"
                                            data-1p-ignore="true"
                                        />
                                        <FieldError message={cardErrors.cardNumber} />
                                    </div>
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                                        <div style={fieldBlock}>
                                            <label style={label} htmlFor="checkout-sim-expiry">
                                                Valid through (MM/YY) *
                                            </label>
                                            <input
                                                id="checkout-sim-expiry"
                                                value={expiry}
                                                onChange={(e) => {
                                                    setExpiry(sanitizeExpiry(e.target.value));
                                                    setCardLiveValidate(true);
                                                }}
                                                placeholder="01/28"
                                                style={{ ...input, ...(cardErrors.expiry ? inputError : {}) }}
                                                autoComplete="off"
                                                name="order-valid-until"
                                                type="text"
                                                inputMode="text"
                                                data-lpignore="true"
                                                data-1p-ignore="true"
                                            />
                                            <FieldError message={cardErrors.expiry} />
                                        </div>
                                        <div style={fieldBlock}>
                                            <label style={label} htmlFor="checkout-sim-code">
                                                Security code (3 digits) *
                                            </label>
                                            <input
                                                id="checkout-sim-code"
                                                value={cvv}
                                                onChange={(e) => {
                                                    setCvv(sanitizeCvv(e.target.value));
                                                    setCardLiveValidate(true);
                                                }}
                                                placeholder="Three digits"
                                                style={{ ...input, ...(cardErrors.cvv ? inputError : {}) }}
                                                autoComplete="off"
                                                name="order-auth-code"
                                                type="text"
                                                inputMode="text"
                                                data-lpignore="true"
                                                data-1p-ignore="true"
                                            />
                                            <FieldError message={cardErrors.cvv} />
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <p style={{ color: t.textMuted, fontSize: "14px", marginTop: "8px" }}>
                                    You’ll pay in cash when you collect your order.
                                </p>
                            )}

                            {checkoutError ? (
                                <p style={{ ...errText, marginTop: "16px", marginBottom: 0 }} role="alert">
                                    <span style={warnIcon} aria-hidden>
                                        ⚠
                                    </span>
                                    {checkoutError}
                                </p>
                            ) : null}

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                style={{
                                    ...confirmBtn,
                                    ...(isSubmitting ? { opacity: 0.65, cursor: "not-allowed" } : {}),
                                }}
                            >
                                {isSubmitting ? "Placing order…" : `Confirm Order — LKR ${totalPrice.toFixed(2)}`}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </MainLayout>
    );
}

const shell = {
    flex: "1 1 auto",
    width: "100%",
    backgroundColor: t.bg,
    minHeight: 0,
};

const inner = {
    maxWidth: "1120px",
    margin: "0 auto",
    padding: "24px 20px 48px",
    boxSizing: "border-box",
};

const backLink = {
    display: "inline-block",
    marginBottom: "12px",
    color: t.gold,
    fontWeight: 700,
    fontSize: "14px",
    textDecoration: "none",
};

const title = {
    margin: "0 0 24px",
    fontSize: "30px",
    fontWeight: 800,
    color: t.text,
    letterSpacing: "-0.02em",
};

const grid = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 340px), 1fr))",
    gap: "24px",
    alignItems: "start",
};

const columnCard = {
    backgroundColor: t.surface,
    borderRadius: t.radius,
    border: `1px solid ${t.borderSubtle}`,
    padding: "22px 20px",
    boxSizing: "border-box",
};

const cardTitle = {
    margin: "0 0 16px",
    fontSize: "18px",
    fontWeight: 800,
    color: t.text,
};

const summaryRow = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "12px",
    padding: "12px 0",
    borderBottom: `1px solid ${t.borderSubtle}`,
};

const divider = {
    height: 1,
    background: t.border,
    margin: "8px 0 12px",
};

const label = {
    display: "block",
    marginBottom: "6px",
    fontSize: "12px",
    fontWeight: 700,
    color: t.textDim,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
};

const textarea = {
    width: "100%",
    padding: "12px 14px",
    borderRadius: t.radiusSm,
    border: `1px solid ${t.border}`,
    backgroundColor: t.surfaceHover,
    color: t.text,
    fontSize: "14px",
    resize: "vertical",
    minHeight: "96px",
    boxSizing: "border-box",
    outline: "none",
    fontFamily: "inherit",
};

const methodRow = {
    display: "flex",
    gap: "12px",
    marginBottom: "20px",
};

const methodBtn = {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "12px 14px",
    borderRadius: t.radiusSm,
    border: `1px solid ${t.border}`,
    backgroundColor: t.bg,
    color: t.text,
    fontWeight: 700,
    cursor: "pointer",
    fontSize: "14px",
};

const methodBtnActive = {
    ...methodBtn,
    border: `2px solid ${t.gold}`,
    backgroundColor: "rgba(249, 200, 81, 0.08)",
};

const fieldBlock = {
    marginBottom: "14px",
};

const input = {
    width: "100%",
    padding: "12px 14px",
    borderRadius: t.radiusSm,
    border: `1px solid ${t.border}`,
    backgroundColor: t.surfaceHover,
    color: t.text,
    fontSize: "15px",
    boxSizing: "border-box",
    outline: "none",
};

const inputError = {
    borderColor: t.danger,
    boxShadow: "0 0 0 1px rgba(239, 68, 68, 0.25)",
};

const errText = {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    marginTop: "6px",
    fontSize: "12px",
    color: "#f87171",
    fontWeight: 600,
    lineHeight: 1.35,
};

const warnIcon = {
    flexShrink: 0,
    fontSize: "13px",
    lineHeight: 1,
};

const confirmBtn = {
    width: "100%",
    marginTop: "20px",
    padding: "16px 20px",
    border: "none",
    borderRadius: t.radiusSm,
    backgroundColor: "#fcd535",
    color: "#0b0e11",
    fontWeight: 800,
    fontSize: "16px",
    cursor: "pointer",
};
