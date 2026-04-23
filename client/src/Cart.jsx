import React from "react";
import { Link } from "react-router-dom";
import { MainLayout } from "./MainLayout";
import { theme as t } from "./theme";
import { useCart } from "./CartContext";
import { getCartLineTotal, getCartLineUnitPrice, isOfferLine } from "./cartPricing";

const card = {
    backgroundColor: t.surface,
    borderRadius: t.radius,
    border: `1px solid ${t.borderSubtle}`,
    padding: "16px 18px",
    boxSizing: "border-box",
};

export default function Cart() {
    const { items, totalCount, totalPrice, setQuantity, removeLine } = useCart();

    if (totalCount === 0) {
        return (
            <MainLayout>
                <div style={pageShell}>
                    <div style={inner}>
                        <h1 style={h1}>Your cart</h1>
                        <p style={{ color: t.textMuted, marginBottom: "24px", fontSize: "15px" }}>
                            Your cart is empty. Browse the menu to add items.
                        </p>
                        <Link to="/home" style={btnPrimary}>
                            Continue shopping
                        </Link>
                    </div>
                </div>
            </MainLayout>
        );
    }

    return (
        <MainLayout>
            <div style={pageShell}>
                <div style={inner}>
                    <h1 style={h1}>Your cart</h1>

                    <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "14px" }}>
                        {items.map((line) => {
                            const offer = isOfferLine(line);
                            const unit = getCartLineUnitPrice(line);
                            const lineTotal = getCartLineTotal(line);
                            const maxQ = line.maxQty ?? 9999;
                            return (
                                <li key={line.id} style={{ ...card, display: "flex", flexWrap: "wrap", alignItems: "center", gap: "16px" }}>
                                    <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                                        <p style={{ margin: 0, fontWeight: 700, color: t.text, fontSize: "16px" }}>
                                            {line.name}
                                            {offer ? (
                                                <span style={{ marginLeft: "8px", fontSize: "12px", fontWeight: 600, color: t.gold }}>
                                                    Offer
                                                </span>
                                            ) : null}
                                        </p>
                                        <p style={{ margin: "8px 0 0", fontSize: "14px", color: t.textMuted }}>
                                            {offer ? (
                                                <span>{line.discount_label || "—"}</span>
                                            ) : (
                                                <>
                                                    LKR {unit.toFixed(2)} each
                                                    {line.maxQty != null ? (
                                                        <span style={{ marginLeft: "8px" }}>· Max {line.maxQty} in stock</span>
                                                    ) : null}
                                                </>
                                            )}
                                        </p>
                                    </div>

                                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                                        <div style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                                            <button
                                                type="button"
                                                aria-label="Decrease quantity"
                                                onClick={() => setQuantity(line.id, line.quantity - 1)}
                                                style={stepBtn}
                                            >
                                                −
                                            </button>
                                            <span style={{ minWidth: "32px", textAlign: "center", fontWeight: 700, color: t.text }}>
                                                {line.quantity}
                                            </span>
                                            <button
                                                type="button"
                                                aria-label="Increase quantity"
                                                onClick={() => setQuantity(line.id, line.quantity + 1)}
                                                disabled={line.quantity >= maxQ}
                                                style={{
                                                    ...stepBtn,
                                                    opacity: line.quantity >= maxQ ? 0.4 : 1,
                                                    cursor: line.quantity >= maxQ ? "not-allowed" : "pointer",
                                                }}
                                            >
                                                +
                                            </button>
                                        </div>
                                        <span style={{ fontSize: "11px", color: t.textDim }}>min: 1</span>
                                    </div>

                                    <div style={{ fontWeight: 800, color: t.gold, minWidth: "110px", textAlign: "right", fontSize: "16px" }}>
                                        LKR {lineTotal.toFixed(2)}
                                    </div>

                                    <button type="button" onClick={() => removeLine(line.id)} style={removeBtn}>
                                        Remove
                                    </button>
                                </li>
                            );
                        })}
                    </ul>

                    <div style={footerBar}>
                        <p style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: t.text }}>
                            Total ({totalCount} {totalCount === 1 ? "item" : "items"}):{" "}
                            <span style={{ color: t.gold }}>LKR {totalPrice.toFixed(2)}</span>
                        </p>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center" }}>
                            <Link to="/home" style={btnOutline}>
                                Continue shopping
                            </Link>
                            <Link to="/checkout" style={btnPrimary}>
                                Proceed to Checkout →
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </MainLayout>
    );
}

const pageShell = {
    flex: "1 1 auto",
    width: "100%",
    minHeight: 0,
    backgroundColor: t.bg,
    boxSizing: "border-box",
};

const inner = {
    maxWidth: "920px",
    margin: "0 auto",
    padding: "28px 20px 48px",
    boxSizing: "border-box",
};

const h1 = {
    margin: "0 0 22px",
    fontSize: "28px",
    fontWeight: 800,
    color: t.text,
    letterSpacing: "-0.02em",
};

const footerBar = {
    marginTop: "24px",
    paddingTop: "20px",
    borderTop: `1px solid ${t.border}`,
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "16px",
};

const btnPrimary = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "12px 22px",
    borderRadius: t.radiusPill,
    background: `linear-gradient(135deg, ${t.gold} 0%, ${t.goldDark} 100%)`,
    color: t.onGold,
    fontWeight: 800,
    fontSize: "15px",
    textDecoration: "none",
    border: "none",
    cursor: "pointer",
    boxSizing: "border-box",
};

const btnOutline = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "12px 22px",
    borderRadius: t.radiusPill,
    border: `2px solid ${t.gold}`,
    color: t.gold,
    fontWeight: 700,
    fontSize: "15px",
    textDecoration: "none",
    backgroundColor: "transparent",
    boxSizing: "border-box",
};

const stepBtn = {
    width: "36px",
    height: "36px",
    border: `1px solid ${t.border}`,
    borderRadius: t.radiusSm,
    backgroundColor: t.bg,
    color: t.text,
    fontSize: "18px",
    fontWeight: 600,
    cursor: "pointer",
    lineHeight: 1,
    padding: 0,
};

const removeBtn = {
    padding: "8px 14px",
    borderRadius: t.radiusSm,
    border: `1px solid ${t.danger}`,
    background: "transparent",
    color: t.danger,
    fontWeight: 600,
    cursor: "pointer",
    fontSize: "13px",
};
