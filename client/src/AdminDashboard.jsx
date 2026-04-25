import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { MainLayout } from "./MainLayout";
import { theme as t } from "./theme";
import { api } from "./api";

const FILTERS = ["All", "Accepted", "Preparing", "Ready", "Out for Delivery", "Delivered", "Cancelled"];

/** Demo orders until a real orders API exists */
const DEMO_ORDERS = [
    {
        id: "1001",
        displayId: "###1001",
        placedAt: "Mar 29 - 11:09 AM",
        student: "—",
        itemsSummary: "—",
        total: 500,
        status: "Delivered",
        rider: "Amal Karunarathna",
    },
];

function mapApiOrderRow(o) {
    return {
        id: o.id,
        displayId: o.displayId,
        placedAt: o.acceptedAtLabel || o.placedAtLabel || "—",
        student: o.student,
        itemsSummary: o.itemsSummary,
        total: o.amount,
        status: o.orderStatus,
        rider: o.rider,
    };
}

function issueTypeLabel(type) {
    if (type === "order") return "Order issue";
    if (type === "payment") return "Payment question";
    if (type === "feedback") return "Feedback";
    return "General inquiry";
}

export default function AdminDashboard() {
    const [filter, setFilter] = useState("All");
    const [chart, setChart] = useState([]);
    const [apiRows, setApiRows] = useState([]);
    const [pendingCount, setPendingCount] = useState(0);
    const [loadErr, setLoadErr] = useState("");
    const [demoFallback, setDemoFallback] = useState(false);
    const [contactMessages, setContactMessages] = useState([]);
    const [contactLoadErr, setContactLoadErr] = useState("");

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const [dashboardRes, contactRes] = await Promise.all([
                    api.get("/orders/dashboard"),
                    api.get("/contact-messages", { params: { limit: 20 } }),
                ]);
                const data = dashboardRes.data;
                if (cancelled) return;
                setChart(Array.isArray(data.chart) ? data.chart : []);
                setApiRows(Array.isArray(data.orders) ? data.orders.map(mapApiOrderRow) : []);
                setPendingCount(Number(data.pendingCount) || 0);
                setLoadErr("");
                setDemoFallback(false);
                setContactMessages(Array.isArray(contactRes.data) ? contactRes.data : []);
                setContactLoadErr("");
            } catch (e) {
                if (cancelled) return;
                setChart([]);
                setApiRows([]);
                setPendingCount(0);
                setLoadErr(
                    e.response?.data?.message ||
                        (e.response ? "Could not load dashboard data." : "Network error — is the API running?")
                );
                setDemoFallback(true);
                setContactMessages([]);
                setContactLoadErr(
                    e.response?.data?.message ||
                        (e.response ? "Could not load contact messages." : "Network error — is the API running?")
                );
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    const tableRows = useMemo(() => (demoFallback ? DEMO_ORDERS : apiRows), [demoFallback, apiRows]);

    const filtered = useMemo(() => {
        if (filter === "All") return tableRows;
        return tableRows.filter((o) => o.status === filter);
    }, [filter, tableRows]);

    const live = 0;
    const pending = demoFallback ? 0 : pendingCount;
    const delivered = tableRows.filter((o) => o.status === "Delivered").length;

    const chartMax = useMemo(() => Math.max(1, ...chart.map((c) => c.count || 0), 1), [chart]);

    const quickLink = {
        ...quickBtn,
        textDecoration: "none",
        boxSizing: "border-box",
        color: t.text,
    };

    return (
        <MainLayout>
            <div style={shell}>
                <div style={inner}>
                    <header style={{ marginBottom: "28px" }}>
                        <h1 style={title}>Admin Dashboard</h1>
                        <p style={subtitle}>Manage and monitor all student food orders • SnackSmart University</p>
                    </header>

                    <div style={topGrid}>
                        <section style={card}>
                            <h2 style={cardTitle}>Orders — Last 7 Days</h2>
                            <p style={{ margin: "0 0 14px", fontSize: "13px", color: t.textMuted, lineHeight: 1.45 }}>
                                Confirmed orders per day (after you accept them in{" "}
                                <Link to="/admin/pending-orders" style={{ color: t.gold, fontWeight: 600 }}>
                                    Pending orders
                                </Link>
                                ).
                            </p>
                            {demoFallback ? (
                                <div style={chartPlaceholder}>
                                    <span style={{ color: t.textDim, fontSize: "14px", textAlign: "center", display: "block" }}>
                                        {loadErr || "Chart requires API connection."}
                                    </span>
                                </div>
                            ) : chart.length === 0 ? (
                                <div style={chartPlaceholder}>
                                    <span style={{ color: t.textDim, fontSize: "14px" }}>
                                        No confirmed orders in the last 7 days yet.
                                    </span>
                                </div>
                            ) : (
                                <div style={chartWrap}>
                                    {chart.map((c) => (
                                        <div key={c.date} style={chartCol}>
                                            <div style={chartBarTrack}>
                                                <div
                                                    style={{
                                                        ...chartBarFill,
                                                        height: `${Math.max(6, (c.count / chartMax) * 100)}%`,
                                                        opacity: c.count === 0 ? 0.25 : 1,
                                                    }}
                                                    title={`${c.date}: ${c.count} confirmed`}
                                                />
                                            </div>
                                            <span style={chartDay}>{c.label}</span>
                                            <span style={chartNum}>{c.count}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>
                        <section style={card}>
                            <h2 style={cardTitle}>Quick Actions</h2>
                            <div style={quickGrid}>
                                <Link to="/admin/pending-orders" style={quickLink}>
                                    <span style={quickIcon} aria-hidden>
                                        🧾
                                    </span>
                                    Pending queue ({pending})
                                </Link>
                                <Link to="/my-orders" style={quickLink}>
                                    <span style={quickIcon} aria-hidden>
                                        📋
                                    </span>
                                    All Orders
                                </Link>
                                <Link to="/my-orders?view=live" style={{ ...quickLink, color: t.success }}>
                                    <span style={quickIcon} aria-hidden>
                                        ⚡
                                    </span>
                                    Live ({live})
                                </Link>
                                <Link to="/my-orders?status=Delivered" style={quickLink}>
                                    <span style={quickIcon} aria-hidden>
                                        ✓
                                    </span>
                                    Delivered ({delivered})
                                </Link>
                            </div>
                        </section>
                    </div>

                    <section style={{ ...card, marginTop: "24px" }}>
                        <div style={ordersHeader}>
                            <h2 style={{ ...cardTitle, margin: 0, display: "flex", alignItems: "center", gap: "10px" }}>
                                <span aria-hidden>📄</span> All Orders
                            </h2>
                            <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
                                <span style={{ color: t.textMuted, fontSize: "14px" }}>{filtered.length} orders</span>
                                <Link to="/my-orders" style={{ color: t.gold, fontSize: "14px", fontWeight: 700 }}>
                                    Full Table →
                                </Link>
                            </div>
                        </div>

                        <div style={filterRow}>
                            {FILTERS.map((f) => (
                                <button
                                    key={f}
                                    type="button"
                                    onClick={() => setFilter(f)}
                                    style={{
                                        ...filterPill,
                                        ...(f === filter ? filterPillActive : {}),
                                    }}
                                >
                                    {f}
                                </button>
                            ))}
                        </div>

                        <div style={{ overflowX: "auto", marginTop: "20px", borderRadius: t.radiusSm, border: `1px solid ${t.border}` }}>
                            <table style={table}>
                                <thead>
                                    <tr>
                                        <th style={th}>ORDER #</th>
                                        <th style={th}>STUDENT</th>
                                        <th style={th}>ITEMS</th>
                                        <th style={th}>TOTAL</th>
                                        <th style={th}>STATUS</th>
                                        <th style={th}>RIDER (FOR DISPATCH)</th>
                                        <th style={{ ...th, width: "100px" }}>ACTIONS</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} style={{ ...td, color: t.textMuted }}>
                                                No orders for this filter.
                                            </td>
                                        </tr>
                                    ) : (
                                        filtered.map((row) => (
                                            <tr key={row.id}>
                                                <td style={td}>
                                                    <div style={{ color: t.gold, fontWeight: 800 }}>{row.displayId}</div>
                                                    <div style={{ fontSize: "12px", color: t.textMuted, marginTop: "4px" }}>{row.placedAt}</div>
                                                </td>
                                                <td style={td}>{row.student}</td>
                                                <td style={{ ...td, color: t.textMuted }}>{row.itemsSummary}</td>
                                                <td style={{ ...td, color: t.gold, fontWeight: 800 }}>Rs. {row.total.toFixed(2)}</td>
                                                <td style={td}>
                                                    <span style={statusPill}>
                                                        <span style={statusDot} />
                                                        {row.status}
                                                    </span>
                                                </td>
                                                <td style={{ ...td, color: "#7dd3fc" }}>{row.rider}</td>
                                                <td style={td}>
                                                    <Link
                                                        to={`/orders/${row.id}`}
                                                        state={{ ordersBackTo: "/admin" }}
                                                        style={viewBtnLink}
                                                    >
                                                        View
                                                    </Link>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <p style={{ margin: "20px 0 0", fontSize: "13px", color: t.textMuted }}>
                            Food &amp; stock:{" "}
                            <Link to="/inventory" style={{ color: t.gold, fontWeight: 600 }}>
                                Open Inventory
                            </Link>
                        </p>
                    </section>
                    <section style={{ ...card, marginTop: "24px" }}>
                        <div style={ordersHeader}>
                            <h2 style={{ ...cardTitle, margin: 0, display: "flex", alignItems: "center", gap: "10px" }}>
                                <span aria-hidden>✉️</span> Contact Messages
                            </h2>
                            <span style={{ color: t.textMuted, fontSize: "14px" }}>
                                {contactMessages.length} recent messages
                            </span>
                        </div>
                        {contactLoadErr ? (
                            <p style={{ margin: "10px 0 0", color: t.danger, fontSize: "14px" }}>{contactLoadErr}</p>
                        ) : contactMessages.length === 0 ? (
                            <p style={{ margin: "10px 0 0", color: t.textMuted, fontSize: "14px" }}>
                                No contact messages yet.
                            </p>
                        ) : (
                            <div style={{ display: "grid", gap: "10px", marginTop: "14px" }}>
                                {contactMessages.map((msg) => (
                                    <article
                                        key={msg.id}
                                        style={{
                                            border: `1px solid ${t.borderSubtle}`,
                                            backgroundColor: "rgba(0,0,0,0.2)",
                                            borderRadius: t.radiusSm,
                                            padding: "12px",
                                        }}
                                    >
                                        <div
                                            style={{
                                                display: "flex",
                                                justifyContent: "space-between",
                                                gap: "10px",
                                                flexWrap: "wrap",
                                                marginBottom: "6px",
                                            }}
                                        >
                                            <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                                                <strong style={{ color: t.text }}>{msg.name}</strong>
                                                <span style={{ color: t.textMuted, fontSize: "13px" }}>({msg.email})</span>
                                            </div>
                                            <span style={{ color: t.textDim, fontSize: "12px" }}>{msg.createdAtLabel || "—"}</span>
                                        </div>
                                        <div style={{ marginBottom: "6px" }}>
                                            <span style={statusPill}>{issueTypeLabel(msg.issueType)}</span>
                                        </div>
                                        <p style={{ margin: 0, color: t.textMuted, lineHeight: 1.55, fontSize: "14px" }}>
                                            {msg.message}
                                        </p>
                                    </article>
                                ))}
                            </div>
                        )}
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
};

const topGrid = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))",
    gap: "20px",
    alignItems: "stretch",
};

const card = {
    backgroundColor: "#111827",
    borderRadius: "14px",
    border: `1px solid ${t.borderSubtle}`,
    padding: "20px 22px",
    boxSizing: "border-box",
};

const cardTitle = {
    margin: "0 0 16px",
    fontSize: "16px",
    fontWeight: 700,
    color: t.text,
};

const chartPlaceholder = {
    minHeight: "220px",
    borderRadius: t.radiusSm,
    border: `1px dashed ${t.border}`,
    backgroundColor: "rgba(0,0,0,0.25)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "16px",
    boxSizing: "border-box",
};

const chartWrap = {
    display: "flex",
    alignItems: "flex-end",
    gap: "10px",
    minHeight: "220px",
    padding: "12px 4px 8px",
    boxSizing: "border-box",
    borderRadius: t.radiusSm,
    border: `1px solid ${t.borderSubtle}`,
    backgroundColor: "rgba(0,0,0,0.2)",
};

const chartCol = {
    flex: "1 1 0",
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "8px",
};

const chartBarTrack = {
    width: "100%",
    height: "140px",
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.25)",
    borderRadius: "8px",
    padding: "0 6px 6px",
    boxSizing: "border-box",
};

const chartBarFill = {
    width: "min(100%, 36px)",
    minHeight: "6px",
    borderRadius: "6px",
    backgroundColor: t.gold,
    transition: "height 0.2s ease",
};

const chartDay = {
    fontSize: "11px",
    fontWeight: 700,
    color: t.textMuted,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
};

const chartNum = {
    fontSize: "14px",
    fontWeight: 800,
    color: t.text,
};

const quickGrid = {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px",
};

const quickBtn = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    padding: "16px 12px",
    borderRadius: t.radiusSm,
    border: `1px solid ${t.border}`,
    backgroundColor: "rgba(0,0,0,0.2)",
    color: t.text,
    fontWeight: 600,
    fontSize: "14px",
    cursor: "pointer",
    fontFamily: "inherit",
};

const quickIcon = { fontSize: "20px", lineHeight: 1 };

const ordersHeader = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "12px",
    marginBottom: "8px",
};

const filterRow = {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
    marginTop: "16px",
};

const filterPill = {
    padding: "8px 14px",
    borderRadius: "999px",
    border: `1px solid ${t.border}`,
    backgroundColor: "transparent",
    color: t.textMuted,
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "inherit",
};

const filterPillActive = {
    backgroundColor: t.gold,
    color: t.onGold,
    borderColor: t.gold,
    fontWeight: 800,
};

const table = {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: "800px",
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
    verticalAlign: "middle",
    borderBottom: `1px solid ${t.borderSubtle}`,
};

const statusPill = {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "6px 12px",
    borderRadius: "999px",
    backgroundColor: "rgba(34, 197, 94, 0.15)",
    color: t.success,
    fontWeight: 700,
    fontSize: "12px",
};

const statusDot = {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
    backgroundColor: t.success,
};

const viewBtn = {
    padding: "6px 14px",
    borderRadius: "999px",
    border: `1px solid ${t.border}`,
    backgroundColor: "rgba(255,255,255,0.06)",
    color: t.textMuted,
    fontWeight: 600,
    fontSize: "12px",
    cursor: "pointer",
    fontFamily: "inherit",
};

const viewBtnLink = {
    ...viewBtn,
    textDecoration: "none",
    display: "inline-block",
    boxSizing: "border-box",
};
