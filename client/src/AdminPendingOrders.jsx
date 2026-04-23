import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MainLayout } from "./MainLayout";
import { theme as t } from "./theme";
import { api } from "./api";

export default function AdminPendingOrders() {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [busyId, setBusyId] = useState(null);

    const load = useCallback(async () => {
        setError("");
        setLoading(true);
        try {
            const { data } = await api.get("/orders/pending");
            setRows(Array.isArray(data) ? data : []);
        } catch (e) {
            setRows([]);
            setError(
                e.response?.data?.message ||
                    (e.response ? "Could not load pending orders." : "Network error — is the API running?")
            );
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const accept = async (id) => {
        setBusyId(id);
        setError("");
        try {
            await api.post(`/orders/${id}/accept`);
            setRows((prev) => prev.filter((r) => r.id !== id));
        } catch (e) {
            const msg = e.response?.data?.message;
            setError(typeof msg === "string" ? msg : "Could not accept order.");
        } finally {
            setBusyId(null);
        }
    };

    const reject = async (id) => {
        const ok = window.confirm(
            "Reject this order? It will be marked as cancelled and removed from this list. Stock is not automatically restored."
        );
        if (!ok) return;
        setBusyId(id);
        setError("");
        try {
            await api.post(`/orders/${id}/reject`);
            setRows((prev) => prev.filter((r) => r.id !== id));
        } catch (e) {
            const msg = e.response?.data?.message;
            setError(typeof msg === "string" ? msg : "Could not reject order.");
        } finally {
            setBusyId(null);
        }
    };

    return (
        <MainLayout>
            <div style={shell}>
                <div style={inner}>
                    <header style={{ marginBottom: "24px" }}>
                        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
                            <Link to="/admin" style={backLink}>
                                ← Admin Dashboard
                            </Link>
                        </div>
                        <h1 style={title}>Pending orders</h1>
                        <p style={subtitle}>
                            Paid checkouts (card / online) and cash on delivery — <strong style={{ color: t.text }}>Accept</strong> to
                            send to the kitchen and the dashboard “last 7 days” chart, or <strong style={{ color: t.text }}>Reject</strong>{" "}
                            to cancel the order.
                        </p>
                    </header>

                    {error ? (
                        <div style={errBanner} role="alert">
                            {error}
                        </div>
                    ) : null}

                    <section style={card}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
                            <h2 style={{ ...cardTitle, margin: 0 }}>Awaiting acceptance</h2>
                            <button type="button" onClick={() => load()} disabled={loading} style={refreshBtn}>
                                {loading ? "Refreshing…" : "Refresh"}
                            </button>
                        </div>

                        <div style={{ overflowX: "auto", marginTop: "18px", borderRadius: t.radiusSm, border: `1px solid ${t.border}` }}>
                            <table style={table}>
                                <thead>
                                    <tr>
                                        <th style={th}>ORDER</th>
                                        <th style={th}>STUDENT / EMAIL</th>
                                        <th style={th}>PAYMENT</th>
                                        <th style={th}>ITEMS</th>
                                        <th style={th}>TOTAL</th>
                                        <th style={{ ...th, width: "160px" }}>ACTION</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading && rows.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} style={{ ...td, color: t.textMuted }}>
                                                Loading…
                                            </td>
                                        </tr>
                                    ) : rows.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} style={{ ...td, color: t.textMuted }}>
                                                No pending orders. New checkouts appear here after customers confirm payment on checkout.
                                            </td>
                                        </tr>
                                    ) : (
                                        rows.map((row) => (
                                            <tr key={row.id}>
                                                <td style={td}>
                                                    <div style={{ color: t.gold, fontWeight: 800 }}>{row.displayId}</div>
                                                    <div style={{ fontSize: "12px", color: t.textMuted, marginTop: "4px" }}>{row.placedAtLabel}</div>
                                                    <div style={{ fontSize: "11px", color: t.textDim, marginTop: "4px" }}>Txn {row.transactionId || "—"}</div>
                                                </td>
                                                <td style={td}>
                                                    <div style={{ fontWeight: 600 }}>{row.student}</div>
                                                    <div style={{ fontSize: "12px", color: t.textMuted, marginTop: "4px" }}>{row.email}</div>
                                                </td>
                                                <td style={td}>
                                                    <span style={payPill}>{row.paymentLabel}</span>
                                                </td>
                                                <td style={{ ...td, color: t.textMuted, maxWidth: "280px" }}>{row.itemsSummary}</td>
                                                <td style={{ ...td, color: t.gold, fontWeight: 800 }}>Rs. {Number(row.amount).toFixed(2)}</td>
                                                <td style={td}>
                                                    <div style={{ display: "flex", flexDirection: "column", gap: "8px", alignItems: "flex-start" }}>
                                                        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center" }}>
                                                            <button
                                                                type="button"
                                                                onClick={() => accept(row.id)}
                                                                disabled={busyId === row.id}
                                                                style={acceptBtn}
                                                            >
                                                                {busyId === row.id ? "…" : "Accept"}
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => reject(row.id)}
                                                                disabled={busyId === row.id}
                                                                style={rejectBtn}
                                                            >
                                                                Reject
                                                            </button>
                                                        </div>
                                                        <Link to={`/orders/${row.id}`} state={{ ordersBackTo: "/admin/pending-orders" }} style={viewLink}>
                                                            View
                                                        </Link>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </div>
            </div>
        </MainLayout>
    );
}

const shell = {
    flex: "1 1 auto",
    width: "100%",
    minHeight: 0,
    backgroundColor: "#000000",
    boxSizing: "border-box",
};

const inner = {
    maxWidth: "1200px",
    margin: "0 auto",
    padding: "28px 20px 48px",
    boxSizing: "border-box",
};

const title = {
    margin: "0 0 8px",
    fontSize: "clamp(26px, 4vw, 34px)",
    fontWeight: 800,
    color: t.text,
    letterSpacing: "-0.02em",
};

const subtitle = {
    margin: 0,
    fontSize: "15px",
    color: t.textMuted,
    lineHeight: 1.5,
    maxWidth: "720px",
};

const backLink = {
    color: t.gold,
    fontWeight: 700,
    fontSize: "14px",
    textDecoration: "none",
};

const card = {
    backgroundColor: "#111827",
    borderRadius: "14px",
    border: `1px solid ${t.borderSubtle}`,
    padding: "20px 22px",
    boxSizing: "border-box",
};

const cardTitle = {
    fontSize: "16px",
    fontWeight: 700,
    color: t.text,
};

const errBanner = {
    marginBottom: "16px",
    padding: "12px 14px",
    borderRadius: t.radiusSm,
    border: `1px solid rgba(248, 113, 113, 0.4)`,
    backgroundColor: "rgba(127, 29, 29, 0.25)",
    color: "#fecaca",
    fontSize: "14px",
};

const refreshBtn = {
    padding: "8px 16px",
    borderRadius: "999px",
    border: `1px solid ${t.border}`,
    backgroundColor: "rgba(255,255,255,0.06)",
    color: t.text,
    fontWeight: 600,
    fontSize: "13px",
    cursor: "pointer",
    fontFamily: "inherit",
};

const table = {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: "720px",
    backgroundColor: "#0f172a",
};

const th = {
    padding: "12px 14px",
    textAlign: "left",
    fontSize: "11px",
    fontWeight: 800,
    color: t.textMuted,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    borderBottom: `1px solid ${t.border}`,
};

const td = {
    padding: "14px",
    fontSize: "14px",
    color: t.text,
    verticalAlign: "top",
    borderBottom: `1px solid ${t.borderSubtle}`,
};

const payPill = {
    display: "inline-block",
    padding: "6px 10px",
    borderRadius: "999px",
    backgroundColor: "rgba(59, 130, 246, 0.15)",
    color: "#93c5fd",
    fontWeight: 700,
    fontSize: "12px",
};

const acceptBtn = {
    padding: "8px 16px",
    borderRadius: "999px",
    border: "none",
    backgroundColor: t.gold,
    color: t.onGold,
    fontWeight: 800,
    fontSize: "13px",
    cursor: "pointer",
    fontFamily: "inherit",
};

const rejectBtn = {
    padding: "8px 16px",
    borderRadius: "999px",
    border: "1px solid rgba(248, 113, 113, 0.65)",
    backgroundColor: "rgba(127, 29, 29, 0.35)",
    color: "#fecaca",
    fontWeight: 800,
    fontSize: "13px",
    cursor: "pointer",
    fontFamily: "inherit",
};

const viewLink = {
    fontSize: "12px",
    fontWeight: 600,
    color: t.textMuted,
    textDecoration: "none",
};
