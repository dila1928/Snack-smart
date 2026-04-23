import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { MainLayout } from "./MainLayout";
import { theme as t } from "./theme";
import { getAuthEmail } from "./authSession";
import { api } from "./api";
import { LiveGpsTrackingPanel } from "./LiveGpsTrackingPanel";

const FILTERS = [
    "All",
    "Awaiting canteen",
    "Accepted",
    "Preparing",
    "Ready",
    "Out for Delivery",
    "Delivered",
    "Cancelled",
];

const LIVE_STATUSES = ["Awaiting canteen", "Accepted", "Preparing", "Ready", "Out for Delivery"];

function statusPillStyle(status) {
    switch (status) {
        case "Out for Delivery":
            return {
                backgroundColor: "rgba(6, 182, 212, 0.2)",
                color: "#67e8f9",
                dot: "#22d3ee",
            };
        case "Ready":
            return {
                backgroundColor: "rgba(251, 191, 36, 0.2)",
                color: "#fde68a",
                dot: "#fbbf24",
            };
        case "Preparing":
        case "Accepted":
            return {
                backgroundColor: "rgba(96, 165, 250, 0.2)",
                color: "#93c5fd",
                dot: "#60a5fa",
            };
        case "Awaiting canteen":
        case "Pending":
            return {
                backgroundColor: "rgba(148, 163, 184, 0.2)",
                color: "#cbd5e1",
                dot: "#94a3b8",
            };
        case "Cancelled":
            return {
                backgroundColor: "rgba(248, 113, 113, 0.18)",
                color: "#fca5a5",
                dot: "#f87171",
            };
        case "Delivered":
        default:
            return {
                backgroundColor: "rgba(34, 197, 94, 0.18)",
                color: "#86efac",
                dot: "#22c55e",
            };
    }
}

function mapApiToRow(o) {
    const rejected = o.adminStatus === "rejected";
    const pending = o.adminStatus === "pending_accept";
    let status = o.orderStatus || "Pending";
    if (rejected) {
        status = "Cancelled";
    }
    if (pending) {
        status = "Awaiting canteen";
    }
    return {
        id: o.id,
        displayId: o.displayId,
        placedAt: o.placedAtLabel || "—",
        location: "Main Canteen",
        paymentMethod: o.paymentLabel || "—",
        total: Number(o.amount) || 0,
        itemCount: Array.isArray(o.items) ? o.items.length : 0,
        status,
        orderStatus: o.orderStatus || "Pending",
        adminStatus: o.adminStatus || "",
        riderName: o.riderName || "",
        rider: o.rider || "",
    };
}

function SearchIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden style={{ flexShrink: 0 }}>
            <circle cx="11" cy="11" r="7" stroke="#60a5fa" strokeWidth="2" />
            <path d="M20 20l-4-4" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" />
        </svg>
    );
}

function PinIcon() {
    return (
        <span style={{ fontSize: "14px", marginRight: "6px" }} aria-hidden>
            📍
        </span>
    );
}

function ClockIcon() {
    return (
        <span style={{ fontSize: "14px", marginRight: "6px", opacity: 0.85 }} aria-hidden>
            🕐
        </span>
    );
}

function CardIcon() {
    return (
        <span style={{ fontSize: "14px", marginRight: "6px", opacity: 0.85 }} aria-hidden>
            💳
        </span>
    );
}

export default function MyOrders() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [search, setSearch] = useState("");
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");

    const accountEmail = getAuthEmail();

    useEffect(() => {
        if (!accountEmail) {
            setRows([]);
            setLoading(false);
            setLoadError("");
            return;
        }
        let cancelled = false;
        (async () => {
            setLoading(true);
            setLoadError("");
            try {
                const { data } = await api.get("/orders/mine", { params: { email: accountEmail } });
                if (!cancelled) {
                    setRows(Array.isArray(data) ? data.map(mapApiToRow) : []);
                }
            } catch (e) {
                if (!cancelled) {
                    setRows([]);
                    setLoadError(
                        e.response?.data?.message ||
                            (e.response ? "Could not load orders." : "Network error — is the API running?")
                    );
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [accountEmail]);

    const activeFilter = useMemo(() => {
        if (searchParams.get("view") === "live") return "live";
        const s = searchParams.get("status");
        if (s && FILTERS.includes(s) && s !== "All") return s;
        return "All";
    }, [searchParams]);

    const setFilter = (f) => {
        if (f === "All") {
            setSearchParams({});
        } else if (f === "live") {
            setSearchParams({ view: "live" });
        } else {
            setSearchParams({ status: f });
        }
    };

    const filtered = useMemo(() => {
        let list = rows;
        const q = search.trim().toLowerCase();
        if (q) {
            const nq = q.replace(/#/g, "").trim();
            list = list.filter(
                (o) =>
                    String(o.displayId).toLowerCase().includes(q) ||
                    String(o.id).includes(nq) ||
                    (nq.length > 0 && String(o.displayId).replace(/#/g, "").toLowerCase().includes(nq))
            );
        }
        if (activeFilter === "live") {
            return list.filter((o) => LIVE_STATUSES.includes(o.status));
        }
        if (activeFilter !== "All") {
            return list.filter((o) => o.status === activeFilter);
        }
        return list;
    }, [activeFilter, search, rows]);

    const autoGpsOrder = useMemo(() => {
        if (!rows.length) return null;
        const out = rows.find((o) => o.adminStatus === "accepted" && o.orderStatus === "Out for Delivery");
        if (out) return out;
        return rows.find((o) => o.adminStatus === "accepted" && o.orderStatus === "Delivered") || null;
    }, [rows]);

    const gpsDisplayOrder = useMemo(() => {
        if (!rows.length) return null;
        if (gpsSelectedOrderId) {
            const pick = rows.find((o) => o.id === gpsSelectedOrderId);
            if (pick) return pick;
        }
        return autoGpsOrder;
    }, [rows, gpsSelectedOrderId, autoGpsOrder]);

    const gpsRiderLabel = useMemo(() => {
        if (!gpsDisplayOrder) return "Rider";
        const rn =
            (gpsDisplayOrder.riderName && String(gpsDisplayOrder.riderName).trim()) ||
            (gpsDisplayOrder.rider && gpsDisplayOrder.rider !== "—" ? String(gpsDisplayOrder.rider).trim() : "");
        return rn || "Rider";
    }, [gpsDisplayOrder]);

    const selectOrderForGps = (orderId) => {
        setGpsSelectedOrderId(orderId);
        document.getElementById("my-orders-gps")?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    return (
        <MainLayout>
            <div style={shell}>
                <div style={inner}>
                    <header style={{ marginBottom: "24px" }}>
                        <h1 style={pageTitle}>My Orders</h1>
                        <p style={pageSub}>
                            Tap an order to show its GPS tracker here — no need to leave this page.
                        </p>
                    </header>

                    {accountEmail && !loading && !loadError && rows.length > 0 ? (
                        <div id="my-orders-gps" style={gpsPanelWrap}>
                            <LiveGpsTrackingPanel
                                compact
                                orderStatus={gpsDisplayOrder?.orderStatus || "Pending"}
                                adminStatus={gpsDisplayOrder?.adminStatus || ""}
                                riderDisplayName={gpsRiderLabel}
                                trackedOrderDisplayId={gpsDisplayOrder?.displayId || null}
                                ordersBackTo="/my-orders"
                            />
                        </div>
                    ) : null}

                    <div style={toolbar}>
                        <div style={searchWrap}>
                            <SearchIcon />
                            <input
                                type="search"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search by order number..."
                                style={searchInput}
                                aria-label="Search by order number"
                            />
                        </div>
                        <div style={filterRow}>
                            {FILTERS.map((f) => {
                                const selected = f === "All" ? activeFilter === "All" : activeFilter === f;
                                return (
                                    <button
                                        key={f}
                                        type="button"
                                        onClick={() => setFilter(f)}
                                        style={{
                                            ...filterPill,
                                            ...(selected ? filterPillActive : {}),
                                        }}
                                    >
                                        {f}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {activeFilter === "live" ? (
                        <p style={{ margin: "0 0 12px", fontSize: "13px", color: t.success, fontWeight: 600 }}>
                            Showing live orders only (in progress)
                        </p>
                    ) : null}

                    {!accountEmail ? (
                        <div style={orderCard}>
                            <p style={{ margin: 0, color: t.textMuted }}>Log in to see your orders.</p>
                            <Link to="/login" style={{ color: t.gold, fontWeight: 600, marginTop: "12px", display: "inline-block" }}>
                                Go to login
                            </Link>
                        </div>
                    ) : loading ? (
                        <div style={orderCard}>
                            <p style={{ margin: 0, color: t.textMuted }}>Loading your orders…</p>
                        </div>
                    ) : loadError ? (
                        <div style={orderCard}>
                            <p style={{ margin: 0, color: "#f87171" }} role="alert">
                                {loadError}
                            </p>
                        </div>
                    ) : null}

                    {accountEmail && !loading && !loadError ? (
                    <p style={sectionLabel}>• YOUR ORDERS</p>
                    ) : null}

                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                        {accountEmail && !loading && !loadError && filtered.length === 0 ? (
                            <div style={orderCard}>
                                <p style={{ margin: 0, color: t.textMuted }}>
                                    No orders match your filters — or you haven&apos;t placed one yet.
                                </p>
                                <Link to="/food" style={{ color: t.gold, fontWeight: 600, marginTop: "12px", display: "inline-block" }}>
                                    Browse food menu
                                </Link>
                            </div>
                        ) : null}
                        {accountEmail && !loading && !loadError && filtered.length > 0 ? (
                            filtered.map((order) => {
                                const pill = statusPillStyle(order.status);
                                const isGpsSelected =
                                    (gpsSelectedOrderId && order.id === gpsSelectedOrderId) ||
                                    (!gpsSelectedOrderId &&
                                        autoGpsOrder &&
                                        order.id === autoGpsOrder.id);
                                return (
                                <div
                                    key={order.id}
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => selectOrderForGps(order.id)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" || e.key === " ") {
                                            e.preventDefault();
                                            selectOrderForGps(order.id);
                                        }
                                    }}
                                    style={{
                                        ...orderCard,
                                        ...(isGpsSelected ? orderCardGpsSelected : {}),
                                        cursor: "pointer",
                                    }}
                                    aria-label={`Show GPS for order ${order.displayId}`}
                                >
                                    <div style={orderRow}>
                                        <div style={{ flex: "1 1 auto", minWidth: 0 }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                                                <span style={orderId}>{order.displayId}</span>
                                                <span
                                                    style={{
                                                        ...statusPill,
                                                        backgroundColor: pill.backgroundColor,
                                                        color: pill.color,
                                                    }}
                                                >
                                                    <span
                                                        style={{
                                                            ...statusDot,
                                                            backgroundColor: pill.dot,
                                                        }}
                                                    />
                                                    {order.status}
                                                </span>
                                            </div>
                                            <p style={metaLine}>
                                                <PinIcon />
                                                {order.location}
                                            </p>
                                            <p style={metaLine}>
                                                <ClockIcon />
                                                {order.placedAt}
                                                <span style={{ marginLeft: "12px" }}>
                                                    <CardIcon />
                                                    {order.paymentMethod}
                                                </span>
                                            </p>
                                        </div>
                                        <div style={orderRight}>
                                            <p style={price}>Rs. {order.total.toFixed(2)}</p>
                                            <p style={itemCount}>
                                                {order.itemCount} item{order.itemCount === 1 ? "" : "s"}
                                            </p>
                                            <button type="button" style={rateRow} onClick={(e) => e.stopPropagation()}>
                                                <span style={{ color: t.textMuted, fontSize: "14px" }}>Rate order</span>
                                                <span style={{ color: accentGold, fontSize: "18px", marginLeft: "6px" }} aria-hidden>
                                                    ★
                                                </span>
                                            </button>
                                            <Link
                                                to={`/orders/${order.id}`}
                                                state={{ ordersBackTo: "/my-orders" }}
                                                style={viewBtnLink}
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                Details
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                                );
                            })
                        ) : null}
                    </div>

                </div>
            </div>
        </MainLayout>
    );
}

const accentGold = "#facc15";

const gpsPanelWrap = {
    marginBottom: "28px",
    scrollMarginTop: "88px",
    width: "100%",
    maxWidth: "100%",
};

const orderCardGpsSelected = {
    borderColor: "rgba(250, 204, 21, 0.55)",
    boxShadow: "0 0 0 1px rgba(250, 204, 21, 0.25)",
};

const shell = {
    flex: "1 1 auto",
    width: "100%",
    minHeight: 0,
    backgroundColor: "#000000",
    boxSizing: "border-box",
};

const inner = {
    maxWidth: "800px",
    margin: "0 auto",
    padding: "28px 20px 48px",
    boxSizing: "border-box",
};

const pageTitle = {
    margin: "0 0 8px",
    fontSize: "clamp(26px, 4vw, 32px)",
    fontWeight: 800,
    color: t.text,
};

const pageSub = {
    margin: 0,
    fontSize: "15px",
    color: t.textMuted,
    lineHeight: 1.5,
};

const toolbar = {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    marginBottom: "24px",
};

const searchWrap = {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "12px 16px",
    borderRadius: "12px",
    border: `1px solid ${t.border}`,
    backgroundColor: "#111827",
    maxWidth: "100%",
};

const searchInput = {
    flex: 1,
    minWidth: 0,
    border: "none",
    background: "transparent",
    color: t.text,
    fontSize: "15px",
    outline: "none",
    fontFamily: "inherit",
};

const filterRow = {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
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

const sectionLabel = {
    margin: "0 0 12px",
    fontSize: "11px",
    fontWeight: 800,
    letterSpacing: "0.12em",
    color: t.textDim,
    textTransform: "uppercase",
};

const orderCard = {
    backgroundColor: "#111827",
    borderRadius: "14px",
    border: `1px solid ${t.borderSubtle}`,
    padding: "20px 20px 18px",
    boxSizing: "border-box",
};

const orderRow = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "20px",
    flexWrap: "wrap",
};

const orderId = {
    fontSize: "22px",
    fontWeight: 800,
    color: accentGold,
    letterSpacing: "-0.02em",
};

const statusPill = {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "4px 10px",
    borderRadius: "999px",
    backgroundColor: "rgba(34, 197, 94, 0.18)",
    color: "#86efac",
    fontWeight: 700,
    fontSize: "12px",
};

const statusDot = {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
    backgroundColor: t.success,
};

const metaLine = {
    margin: "10px 0 0",
    fontSize: "14px",
    color: t.textMuted,
    display: "flex",
    alignItems: "center",
};

const orderRight = {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: "8px",
    flexShrink: 0,
};

const price = {
    margin: 0,
    fontSize: "22px",
    fontWeight: 800,
    color: accentGold,
};

const itemCount = {
    margin: 0,
    fontSize: "13px",
    color: t.textMuted,
};

const rateRow = {
    display: "inline-flex",
    alignItems: "center",
    background: "none",
    border: "none",
    padding: "4px 0",
    cursor: "pointer",
    fontFamily: "inherit",
};

const viewBtn = {
    marginTop: "4px",
    padding: "8px 18px",
    borderRadius: "8px",
    border: `1px solid ${t.border}`,
    backgroundColor: "rgba(0,0,0,0.25)",
    color: t.textMuted,
    fontWeight: 600,
    fontSize: "13px",
    cursor: "pointer",
    fontFamily: "inherit",
};

const viewBtnLink = {
    ...viewBtn,
    textDecoration: "none",
    display: "inline-block",
    boxSizing: "border-box",
    textAlign: "center",
};
