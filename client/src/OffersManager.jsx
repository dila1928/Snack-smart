import React, { useCallback, useEffect, useState } from "react";
import { theme as t } from "./theme";
import { api } from "./api";
import {
    computeOfferPriceFromDiscount,
    formatDiscountLabelFromPercent,
    parsePercentFromDiscountLabel,
} from "./offerPrice";

const emptyOfferForm = () => ({
    title: "",
    discount_percent: "",
    original_price: "",
    available_count: "0",
    sort_order: "0",
    is_active: true,
});

function formatOfferPrices(row) {
    const a = row.original_price != null && row.original_price !== "" ? Number(row.original_price) : null;
    if (a == null) return "—";
    const now = computeOfferPriceFromDiscount(row.original_price, row.discount_label);
    if (now != null) return `Was ${a.toFixed(0)} → Now ${now.toFixed(0)}`;
    return `Was ${a.toFixed(0)}`;
}

export default function OffersManager() {
    const [offers, setOffers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [form, setForm] = useState(emptyOfferForm);
    const [editingId, setEditingId] = useState(null);

    const input = {
        width: "100%",
        padding: "10px 12px",
        borderRadius: t.radiusSm,
        border: `1px solid ${t.border}`,
        backgroundColor: "#ffffff",
        color: "#0f172a",
        fontSize: "15px",
        boxSizing: "border-box",
    };

    const labelStyle = { display: "block", marginBottom: "6px", fontWeight: 600, fontSize: "14px", color: t.text };

    const loadOffers = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const { data } = await api.get("/offers");
            setOffers(Array.isArray(data) ? data : []);
        } catch (e) {
            setError(e.response?.data?.message || e.message || "Could not load offers");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadOffers();
    }, [loadOffers]);

    const sanitizePercentDigits = (raw) => {
        let s = String(raw).replace(/[^\d.]/g, "");
        const firstDot = s.indexOf(".");
        if (firstDot !== -1) {
            s = s.slice(0, firstDot + 1) + s.slice(firstDot + 1).replace(/\./g, "");
        }
        return s;
    };

    const submitOffer = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError("");
        try {
            const pctRaw = form.discount_percent.trim();
            const pctNum = parseFloat(pctRaw.replace(",", "."));
            if (pctRaw === "" || !Number.isFinite(pctNum) || pctNum < 0 || pctNum > 100) {
                setError("Enter a discount between 0 and 100 (numbers only).");
                setSaving(false);
                return;
            }
            const discount_label = formatDiscountLabelFromPercent(pctRaw);
            const payload = {
                title: form.title.trim(),
                discount_label,
                original_price: form.original_price.trim() === "" ? null : form.original_price,
                available_count: parseInt(form.available_count, 10) || 0,
                sort_order: parseInt(form.sort_order, 10) || 0,
                is_active: form.is_active,
            };
            if (editingId) {
                await api.put(`/offers/${editingId}`, payload);
            } else {
                await api.post("/offers", payload);
            }
            setForm(emptyOfferForm());
            setEditingId(null);
            await loadOffers();
        } catch (err) {
            setError(err.response?.data?.message || err.message || "Could not save offer");
        } finally {
            setSaving(false);
        }
    };

    const startEdit = (o) => {
        setEditingId(o.id);
        setForm({
            title: o.title || "",
            discount_percent: parsePercentFromDiscountLabel(o.discount_label) || "",
            original_price: o.original_price != null && o.original_price !== "" ? String(o.original_price) : "",
            available_count: String(o.available_count ?? 0),
            sort_order: String(o.sort_order ?? 0),
            is_active: !!o.is_active,
        });
        window.scrollTo({ top: document.getElementById("offers-admin-form")?.offsetTop ?? 0, behavior: "smooth" });
    };

    const cancelEdit = () => {
        setEditingId(null);
        setForm(emptyOfferForm());
    };

    const deleteOffer = async (id) => {
        if (!window.confirm("Delete this offer?")) return;
        setError("");
        try {
            await api.delete(`/offers/${id}`);
            if (editingId === id) cancelEdit();
            await loadOffers();
        } catch (err) {
            setError(err.response?.data?.message || err.message || "Could not delete");
        }
    };

    return (
        <section style={{ marginTop: "36px" }}>
            <h2 style={{ margin: "0 0 20px", fontSize: "22px", color: t.text }}>Offers</h2>

            {error ? (
                <p style={{ color: t.danger, marginBottom: "12px" }} role="alert">
                    {error}
                </p>
            ) : null}

            <div
                id="offers-admin-form"
                style={{
                    backgroundColor: t.surface,
                    borderRadius: t.radius,
                    border: `1px solid ${t.borderSubtle}`,
                    padding: "18px",
                    marginBottom: "20px",
                }}
            >
                <h3 style={{ margin: "0 0 14px", fontSize: "17px", color: t.text }}>{editingId ? "Edit offer" : "Add offer"}</h3>
                <form className="inventory-form" onSubmit={submitOffer}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px" }}>
                        <div>
                            <label style={labelStyle} htmlFor="offer-title">
                                Title
                            </label>
                            <input
                                id="offer-title"
                                required
                                value={form.title}
                                onChange={(e) => setForm({ ...form, title: e.target.value })}
                                style={input}
                                placeholder="e.g. Combo lunch"
                            />
                        </div>
                        <div>
                            <label style={labelStyle} htmlFor="offer-discount">
                                Discount % (yellow box)
                            </label>
                            <div style={{ display: "flex", alignItems: "stretch", gap: "8px" }}>
                                <input
                                    id="offer-discount"
                                    inputMode="decimal"
                                    autoComplete="off"
                                    required
                                    value={form.discount_percent}
                                    onChange={(e) =>
                                        setForm({ ...form, discount_percent: sanitizePercentDigits(e.target.value) })
                                    }
                                    style={{ ...input, flex: "1 1 auto", minWidth: 0 }}
                                    placeholder="e.g. 15"
                                />
                                <span
                                    style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        padding: "0 14px",
                                        borderRadius: t.radiusSm,
                                        border: `1px solid ${t.border}`,
                                        backgroundColor: "#f1f5f9",
                                        color: "#0f172a",
                                        fontSize: "15px",
                                        fontWeight: 700,
                                        flexShrink: 0,
                                    }}
                                    aria-hidden
                                >
                                    %
                                </span>
                            </div>
                        </div>
                    </div>
                    <p style={{ margin: "14px 0 8px", fontSize: "13px", fontWeight: 700, color: t.gold, letterSpacing: "0.02em" }}>
                        Price (LKR, optional)
                    </p>
                    <div style={{ maxWidth: "320px" }}>
                        <label style={labelStyle} htmlFor="offer-price-was">
                            Original / list price
                        </label>
                        <input
                            id="offer-price-was"
                            type="number"
                            min="0"
                            step="0.01"
                            value={form.original_price}
                            onChange={(e) => setForm({ ...form, original_price: e.target.value })}
                            style={input}
                            placeholder="e.g. 500"
                        />
                        <p style={{ margin: "8px 0 0", fontSize: "12px", color: t.textMuted, lineHeight: 1.45 }}>
                            Enter numbers only (0–100). The homepage shows it as e.g. “15% off” automatically.
                        </p>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "12px", marginTop: "12px" }}>
                        <div>
                            <label style={labelStyle} htmlFor="offer-avail">
                                Available count
                            </label>
                            <input
                                id="offer-avail"
                                type="number"
                                min="0"
                                value={form.available_count}
                                onChange={(e) => setForm({ ...form, available_count: e.target.value })}
                                style={input}
                            />
                        </div>
                        <div>
                            <label style={labelStyle} htmlFor="offer-sort">
                                Sort order
                            </label>
                            <input
                                id="offer-sort"
                                type="number"
                                value={form.sort_order}
                                onChange={(e) => setForm({ ...form, sort_order: e.target.value })}
                                style={input}
                            />
                        </div>
                    </div>
                    <label
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                            marginTop: "14px",
                            marginBottom: "14px",
                            cursor: "pointer",
                            color: t.text,
                            fontSize: "14px",
                        }}
                    >
                        <input
                            type="checkbox"
                            checked={form.is_active}
                            onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                        />
                        Show on homepage
                    </label>
                    <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                        <button
                            type="submit"
                            disabled={saving}
                            style={{
                                padding: "12px 20px",
                                borderRadius: t.radiusSm,
                                border: "none",
                                backgroundColor: t.gold,
                                color: t.onGold,
                                fontWeight: 700,
                                cursor: saving ? "wait" : "pointer",
                            }}
                        >
                            {editingId ? "Save offer" : "Create offer"}
                        </button>
                        {editingId ? (
                            <button
                                type="button"
                                onClick={cancelEdit}
                                style={{
                                    padding: "12px 20px",
                                    borderRadius: t.radiusSm,
                                    border: `1px solid ${t.border}`,
                                    backgroundColor: "transparent",
                                    color: t.text,
                                    fontWeight: 600,
                                    cursor: "pointer",
                                }}
                            >
                                Cancel
                            </button>
                        ) : null}
                    </div>
                </form>
            </div>

            <h3 style={{ margin: "0 0 12px", fontSize: "18px", color: t.text }}>Current offers</h3>
            <div style={{ overflowX: "auto", borderRadius: t.radius, border: `1px solid ${t.borderSubtle}` }}>
                <table style={{ width: "100%", borderCollapse: "collapse", backgroundColor: t.surface, minWidth: "720px" }}>
                    <thead>
                        <tr style={{ borderBottom: `1px solid ${t.border}`, textAlign: "left" }}>
                            <th style={oth}>Title</th>
                            <th style={oth}>Discount</th>
                            <th style={oth}>Prices (LKR)</th>
                            <th style={oth}>Avail.</th>
                            <th style={oth}>Sort</th>
                            <th style={oth}>On home</th>
                            <th style={{ ...oth, width: "150px" }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={7} style={otd}>
                                    Loading…
                                </td>
                            </tr>
                        ) : offers.length === 0 ? (
                            <tr>
                                <td colSpan={7} style={{ ...otd, color: t.textMuted }}>
                                    No offers yet. Create one above.
                                </td>
                            </tr>
                        ) : (
                            offers.map((row) => (
                                <tr key={row.id} style={{ borderBottom: `1px solid ${t.borderSubtle}` }}>
                                    <td style={otd}>{row.title}</td>
                                    <td style={{ ...otd, maxWidth: "200px" }}>{row.discount_label}</td>
                                    <td style={{ ...otd, fontSize: "13px", whiteSpace: "nowrap" }}>{formatOfferPrices(row)}</td>
                                    <td style={otd}>{row.available_count}</td>
                                    <td style={otd}>{row.sort_order}</td>
                                    <td style={otd}>{row.is_active ? "Yes" : "No"}</td>
                                    <td style={otd}>
                                        <button
                                            type="button"
                                            onClick={() => startEdit(row)}
                                            style={{
                                                marginRight: "8px",
                                                padding: "6px 12px",
                                                borderRadius: t.radiusSm,
                                                border: `1px solid ${t.gold}`,
                                                background: "transparent",
                                                color: t.gold,
                                                cursor: "pointer",
                                                fontWeight: 600,
                                                fontSize: "13px",
                                            }}
                                        >
                                            Edit
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => deleteOffer(row.id)}
                                            style={{
                                                padding: "6px 12px",
                                                borderRadius: t.radiusSm,
                                                border: `1px solid ${t.danger}`,
                                                background: "transparent",
                                                color: t.danger,
                                                cursor: "pointer",
                                                fontWeight: 600,
                                                fontSize: "13px",
                                            }}
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </section>
    );
}

const oth = {
    padding: "12px 14px",
    fontSize: "12px",
    color: t.textMuted,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
};

const otd = {
    padding: "12px 14px",
    fontSize: "14px",
    color: t.text,
    verticalAlign: "middle",
};
