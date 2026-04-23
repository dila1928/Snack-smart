import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Navigate, useLocation, useParams } from "react-router-dom";
import { MainLayout } from "./MainLayout";
import { theme as t } from "./theme";
import { api } from "./api";
import { LiveGpsTrackingPanel } from "./LiveGpsTrackingPanel";

const gold = "#facc15";
const pageBg = "#0e1117";
const cardBg = "#1a1d23";

/** Demo detail — extend when orders API exists */
const DEMO = {
    id: "1001",
    displayId: "##1001",
    status: "Delivered",
    datePlaced: "March 29, 2026",
    timePlacedShort: "Mar 29 · 11:09 AM",
    timeSlot: "12:00 PM",
    deliverTo: "Main Canteen",
    pickupLocation: "—",
    orderType: "Pickup",
    paymentMethod: "Card",
    paymentStatus: "Paid",
    total: 500,
    subtotal: 500,
    serviceFeeLabel: "Free",
    student: "—",
    studentId: "—",
    riderName: "Amal Karunarathna",
    riderPhone: "+94 77 766 8888",
};

const STATUS_STEPS = ["Accepted", "Preparing", "Ready", "Out for Delivery", "Delivered"];

const TIMELINE = [
    { title: "Accepted", body: "Canteen confirmed — getting started on your order." },
    { title: "Preparing", body: "Chefs are cooking your fresh food right now." },
    { title: "Ready", body: "Food packed and ready — rider being assigned." },
    { title: "Out for Delivery", body: "Rider picked up your order. GPS live tracking active!" },
    { title: "Delivered", body: "Delivered successfully. Enjoy your meal! 🍔", highlight: true },
];

function digitsOnlyPhone(raw) {
    return String(raw || "")
        .replace(/\D/g, "")
        .slice(0, 15);
}

/** Letters, spaces, hyphen, apostrophe, period — for rider names. */
function sanitizeRiderNameInput(raw) {
    return String(raw || "")
        .replace(/[^\p{L}\s'\-.]/gu, "")
        .replace(/\s{2,}/g, " ")
        .slice(0, 80);
}

function validateRiderNameForSave(raw) {
    const trimmed = String(raw || "").trim();
    if (trimmed.length < 2) {
        return "Enter a rider name (at least 2 characters).";
    }
    if (!/^[\p{L}\s'\-.]+$/u.test(trimmed)) {
        return "Name can only include letters, spaces, hyphens, and apostrophes.";
    }
    return "";
}

function validateRiderPhoneForSave(digits) {
    const d = digitsOnlyPhone(digits);
    if (d.length < 9) {
        return "Phone must be at least 9 digits (numbers only).";
    }
    if (d.length > 15) {
        return "Phone must be at most 15 digits.";
    }
    return "";
}

function getStatusIndex(status) {
    if (status === "Cancelled") return -1;
    /** DB still uses `Pending` until admin accepts — not shown as a stepper stage. */
    if (status === "Pending") return -1;
    const i = STATUS_STEPS.indexOf(status);
    return i >= 0 ? i : 0;
}

function mapApiOrderToView(api) {
    const placed = api.placedAt ? new Date(api.placedAt) : null;
    const datePlaced = placed
        ? placed.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })
        : "—";
    const subtotal = Array.isArray(api.items)
        ? api.items.reduce((s, l) => s + (Number(l.lineTotal) || 0), 0)
        : Number(api.amount) || 0;
    const payMethod = api.paymentMethod === "card" ? "Card" : "Cash on delivery";
    const payStatus = api.paymentMethod === "card" ? "Paid" : "Pay on delivery";
    const rn =
        (api.riderName && String(api.riderName).trim()) ||
        (api.rider && api.rider !== "—" ? api.rider : "") ||
        "—";
    const rp = api.riderPhone && String(api.riderPhone).trim() ? String(api.riderPhone).trim() : "—";

    return {
        id: api.id,
        _mongoId: api.id,
        _fromApi: true,
        adminStatus: api.adminStatus || "",
        displayId: api.displayId || `###${String(api.orderId || "").slice(-4)}`,
        status: api.orderStatus || "Pending",
        datePlaced,
        timePlacedShort: api.placedAtLabel || "—",
        timeSlot: api.acceptedAtLabel ? `Confirmed ${api.acceptedAtLabel}` : "12:00 PM",
        deliverTo: "Main Canteen",
        pickupLocation: "—",
        orderType: "Pickup",
        paymentMethod: payMethod,
        paymentStatus: payStatus,
        total: Number(api.amount) || 0,
        subtotal: subtotal || Number(api.amount) || 0,
        serviceFeeLabel: "Free",
        student: api.student || "—",
        studentId: "—",
        riderName: rn,
        riderPhone: rp,
        items: Array.isArray(api.items) ? api.items : [],
        orderNote: api.orderNote || "",
    };
}

function isMongoObjectId(s) {
    return typeof s === "string" && /^[a-f\d]{24}$/i.test(s);
}

export default function OrderDetail() {
    const { orderId } = useParams();
    const location = useLocation();
    const backTo = location.state?.ordersBackTo || "/my-orders";
    const [apiOrder, setApiOrder] = useState(null);
    const [apiLoading, setApiLoading] = useState(() => isMongoObjectId(orderId));
    const [apiMissing, setApiMissing] = useState(false);

    useEffect(() => {
        if (!isMongoObjectId(orderId)) {
            setApiOrder(null);
            setApiLoading(false);
            setApiMissing(false);
            return;
        }
        let cancelled = false;
        setApiLoading(true);
        setApiMissing(false);
        api.get(`/orders/${orderId}`)
            .then(({ data }) => {
                if (!cancelled) {
                    setApiOrder(data);
                    setApiLoading(false);
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setApiOrder(null);
                    setApiMissing(true);
                    setApiLoading(false);
                }
            });
        return () => {
            cancelled = true;
        };
    }, [orderId]);

    const canManageOrder =
        typeof location.state?.ordersBackTo === "string" && location.state.ordersBackTo.startsWith("/admin");

    const order = useMemo(() => {
        if (!orderId) return null;
        if (isMongoObjectId(orderId)) {
            if (!apiOrder) return null;
            return mapApiOrderToView(apiOrder);
        }
        return {
            ...DEMO,
            id: orderId,
            displayId: orderId === "1001" ? "##1001" : `##${orderId}`,
            _fromApi: false,
            _mongoId: null,
            adminStatus: "",
            items: [],
            orderNote: "",
        };
    }, [orderId, apiOrder]);

    const [riderNameLocal, setRiderNameLocal] = useState("");
    const [riderPhoneLocal, setRiderPhoneLocal] = useState("");
    const [riderFormErrors, setRiderFormErrors] = useState({ name: "", phone: "" });

    useEffect(() => {
        if (!apiOrder) return;
        const rn =
            (apiOrder.riderName && String(apiOrder.riderName).trim()) ||
            (apiOrder.rider && apiOrder.rider !== "—" ? apiOrder.rider : "");
        setRiderNameLocal(rn);
        setRiderPhoneLocal(apiOrder.riderPhone ? digitsOnlyPhone(apiOrder.riderPhone) : "");
    }, [apiOrder]);

    const statusIdx = useMemo(() => getStatusIndex(order?.status), [order?.status]);

    const patchOrder = useCallback(async (patch) => {
        const mongoId = order?._mongoId;
        if (!mongoId) return;
        try {
            const { data } = await api.patch(`/orders/${mongoId}`, patch);
            setApiOrder(data);
        } catch (e) {
            console.warn("[OrderDetail] Could not update order", e);
        }
    }, [order?._mongoId]);

    const saveRiderFields = useCallback(async () => {
        if (!canManageOrder || !order?._mongoId || order.status !== "Ready") return;
        const nameErr = validateRiderNameForSave(riderNameLocal);
        const phoneDigits = digitsOnlyPhone(riderPhoneLocal);
        const phoneErr = validateRiderPhoneForSave(phoneDigits);
        setRiderFormErrors({ name: nameErr, phone: phoneErr });
        if (nameErr || phoneErr) return;
        try {
            const { data } = await api.patch(`/orders/${order._mongoId}`, {
                riderName: riderNameLocal.trim(),
                riderPhone: phoneDigits,
            });
            setApiOrder(data);
            setRiderFormErrors({ name: "", phone: "" });
        } catch (e) {
            console.warn("[OrderDetail] Could not save rider", e);
        }
    }, [canManageOrder, order?._mongoId, order?.status, riderNameLocal, riderPhoneLocal]);

    if (!orderId) {
        return <Navigate to={backTo} replace />;
    }

    if (isMongoObjectId(orderId) && apiLoading) {
        return (
            <MainLayout>
                <div style={shell}>
                    <div style={inner}>
                        <Link to={backTo} style={backLink}>
                            ← Back to Orders
                        </Link>
                        <p style={{ color: t.textMuted, marginTop: "24px" }}>Loading order…</p>
                    </div>
                </div>
            </MainLayout>
        );
    }

    if (isMongoObjectId(orderId) && apiMissing) {
        return (
            <MainLayout>
                <div style={shell}>
                    <div style={inner}>
                        <Link to={backTo} style={backLink}>
                            ← Back to Orders
                        </Link>
                        <p style={{ color: t.textMuted, marginTop: "24px" }}>Order not found.</p>
                    </div>
                </div>
            </MainLayout>
        );
    }

    if (!order) {
        return (
            <MainLayout>
                <div style={shell}>
                    <div style={inner}>
                        <Link to={backTo} style={backLink}>
                            ← Back to Orders
                        </Link>
                        <p style={{ color: t.textMuted, marginTop: "24px" }}>Loading order…</p>
                    </div>
                </div>
            </MainLayout>
        );
    }

    const isDelivered = order.status === "Delivered";
    const isCancelled = order.status === "Cancelled";
    const progressPct = isCancelled
        ? 0
        : isDelivered
          ? 100
          : Math.round((Math.max(0, statusIdx) / Math.max(1, STATUS_STEPS.length - 1)) * 100);
    const gpsRiderLabel =
        canManageOrder && order._fromApi
            ? riderNameLocal.trim() || "Rider"
            : order.riderName && order.riderName !== "—"
              ? order.riderName
              : "Rider";
    const riderPhoneDisplay =
        canManageOrder && order._fromApi ? riderPhoneLocal || "—" : order.riderPhone || "—";
    const delivery3Active = statusIdx >= 4 ? 2 : statusIdx >= 3 ? 1 : 0;
    const showRiderForm = canManageOrder && order._fromApi && order.status === "Ready";
    const awaitingAdminAccept = order._fromApi && order.adminStatus === "pending_accept";
    const rejectedByAdmin = order._fromApi && order.adminStatus === "rejected";
    const headerStatusLabel = awaitingAdminAccept
        ? "Awaiting acceptance"
        : rejectedByAdmin
          ? "Rejected"
          : order.status;
    const stepperLocked = awaitingAdminAccept || isCancelled;

    return (
        <MainLayout>
            <div style={shell}>
                <div style={inner}>
                    <div style={topBar}>
                        <Link to={backTo} style={backLink}>
                            ← Back to Orders
                        </Link>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                            <span style={orderIdBig}>{order.displayId}</span>
                            <span
                                style={
                                    isCancelled || rejectedByAdmin
                                        ? { ...statusPill, backgroundColor: "rgba(239,68,68,0.15)", color: "#fca5a5" }
                                        : statusPill
                                }
                            >
                                <span style={statusDot} />
                                {headerStatusLabel}
                            </span>
                        </div>
                    </div>

                    {/* Status summary (matches your full tracking layout) */}
                    <section style={card}>
                        <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                            <span style={{ fontSize: "28px" }} aria-hidden>
                                {isDelivered ? "🎉" : isCancelled || rejectedByAdmin ? "⛔" : "📦"}
                            </span>
                            <div>
                                <h2 style={h2}>
                                    {isDelivered
                                        ? "Delivered Successfully"
                                        : rejectedByAdmin
                                          ? "Order rejected"
                                          : isCancelled
                                            ? "Order cancelled"
                                            : awaitingAdminAccept
                                              ? "Awaiting admin acceptance"
                                              : `Order in progress — ${order.status}`}
                                </h2>
                                <p style={muted}>
                                    {isDelivered
                                        ? "Your order has been delivered. Enjoy your meal! Please rate your experience."
                                        : rejectedByAdmin
                                          ? "This order was rejected from the pending queue and will not be fulfilled."
                                          : isCancelled
                                            ? "This order was cancelled and will not be fulfilled."
                                            : awaitingAdminAccept
                                              ? "Accept this order from Admin → Pending orders first. Then you can move it through kitchen stages below."
                                              : `Current stage: ${order.status}. Use “Update Order Status” below to advance the order.`}
                                </p>
                            </div>
                        </div>
                        <div style={summaryGrid}>
                            <div>
                                <p style={sumLabel}>RIDER</p>
                                <p style={sumValGreen}>{gpsRiderLabel}</p>
                            </div>
                            <div>
                                <p style={sumLabel}>DELIVER TO</p>
                                <p style={sumVal}>{order.deliverTo}</p>
                            </div>
                            <div>
                                <p style={sumLabel}>TOTAL</p>
                                <p style={sumValGold}>Rs. {order.total.toFixed(2)}</p>
                            </div>
                            <div>
                                <p style={sumLabel}>PAYMENT</p>
                                <p style={sumVal}>
                                    {order.paymentMethod} ✓
                                </p>
                            </div>
                            <div>
                                <p style={sumLabel}>STUDENT</p>
                                <p style={sumValMuted}>{order.student}</p>
                            </div>
                        </div>
                        {order.orderNote ? (
                            <p style={{ ...muted, marginTop: "16px" }}>
                                <strong style={{ color: t.text }}>Note:</strong> {order.orderNote}
                            </p>
                        ) : null}
                        <div style={progressTrack}>
                            <div style={{ ...progressFill, width: `${progressPct}%` }} />
                            <span style={progressLabel}>
                                {isCancelled ? "Cancelled" : `${progressPct}% complete`}
                            </span>
                        </div>
                        <p style={{ ...muted, margin: "12px 0 0", textAlign: "center", fontSize: "12px" }}>
                            Order Placed ————————————— {isDelivered ? "Delivered" : isCancelled ? "Cancelled" : order.status}
                        </p>
                    </section>

                    {/* Update order status (admin-style stepper) */}
                    <section style={card}>
                        <h2 style={{ ...h2, display: "flex", alignItems: "center", gap: "8px" }}>
                            <span aria-hidden>⚙️</span> Update Order Status
                        </h2>
                        {canManageOrder && order._fromApi ? (
                            <p style={{ ...muted, marginBottom: "12px" }}>
                                {awaitingAdminAccept
                                    ? "Accept this order from Pending orders before changing stages here."
                                    : "Tap a stage to save (admin)."}
                            </p>
                        ) : null}
                        <div style={stepper6}>
                            {STATUS_STEPS.map((label, i) => {
                                let boxStyle = stepBox;
                                let icon = "○";
                                if (isCancelled) {
                                    boxStyle = stepBoxPending;
                                    icon = "—";
                                } else if (i < statusIdx) {
                                    icon = "✓";
                                } else if (i === statusIdx) {
                                    boxStyle = stepBoxActive;
                                    icon = i === STATUS_STEPS.length - 1 ? "🎉" : "📍";
                                } else {
                                    boxStyle = stepBoxPending;
                                }
                                const clickable = canManageOrder && order._mongoId && !stepperLocked;
                                return (
                                    <button
                                        key={label}
                                        type="button"
                                        disabled={!clickable}
                                        onClick={() => clickable && patchOrder({ orderStatus: STATUS_STEPS[i] })}
                                        style={{
                                            ...boxStyle,
                                            cursor: clickable ? "pointer" : "default",
                                            fontFamily: "inherit",
                                            width: "100%",
                                            boxSizing: "border-box",
                                        }}
                                    >
                                        <span style={{ fontSize: "18px" }} aria-hidden>
                                            {icon}
                                        </span>
                                        <span style={{ fontSize: "11px", fontWeight: 700, textAlign: "center" }}>{label}</span>
                                    </button>
                                );
                            })}
                        </div>
                        <div style={{ marginTop: "16px", paddingTop: "16px", borderTop: `1px solid ${t.border}` }}>
                            {showRiderForm ? (
                                <>
                                    <p style={sumLabel}>Rider Name</p>
                                    <input
                                        value={riderNameLocal}
                                        onChange={(e) => {
                                            setRiderNameLocal(sanitizeRiderNameInput(e.target.value));
                                            if (riderFormErrors.name) {
                                                setRiderFormErrors((prev) => ({ ...prev, name: "" }));
                                            }
                                        }}
                                        onBlur={() => saveRiderFields()}
                                        placeholder="e.g. Amal Karunarathna"
                                        style={{
                                            ...riderInput,
                                            borderColor: riderFormErrors.name ? "#f87171" : t.border,
                                        }}
                                        autoComplete="name"
                                    />
                                    {riderFormErrors.name ? (
                                        <p style={riderFieldError} role="alert">
                                            {riderFormErrors.name}
                                        </p>
                                    ) : null}
                                    <p style={{ ...sumLabel, marginTop: "10px" }}>Phone (digits only)</p>
                                    <input
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        value={riderPhoneLocal}
                                        onChange={(e) => {
                                            setRiderPhoneLocal(digitsOnlyPhone(e.target.value));
                                            if (riderFormErrors.phone) {
                                                setRiderFormErrors((prev) => ({ ...prev, phone: "" }));
                                            }
                                        }}
                                        onBlur={() => saveRiderFields()}
                                        placeholder="94743389149"
                                        style={{
                                            ...riderInput,
                                            borderColor: riderFormErrors.phone ? "#f87171" : t.border,
                                        }}
                                        autoComplete="tel"
                                    />
                                    {riderFormErrors.phone ? (
                                        <p style={riderFieldError} role="alert">
                                            {riderFormErrors.phone}
                                        </p>
                                    ) : null}
                                    <button type="button" onClick={() => saveRiderFields()} style={saveRiderBtn}>
                                        Save rider details
                                    </button>
                                </>
                            ) : canManageOrder && order._fromApi ? (
                                <p style={{ ...muted, margin: 0 }}>
                                    Rider name and phone can be entered only when the order is in the{" "}
                                    <strong style={{ color: t.text }}>Ready</strong> stage. Move the order to Ready first.
                                </p>
                            ) : (
                                <>
                                    <p style={sumLabel}>Rider Name</p>
                                    <p style={sumVal}>{order.riderName}</p>
                                    <p style={{ ...sumLabel, marginTop: "10px" }}>Phone</p>
                                    <p style={sumVal}>{order.riderPhone}</p>
                                </>
                            )}
                        </div>
                        <p style={{ ...muted, marginTop: "14px", fontSize: "12px" }}>
                            {isCancelled
                                ? "Order is cancelled."
                                : isDelivered
                                  ? "Order is in final state: Delivered."
                                  : `Order is in state: ${order.status}.`}
                        </p>
                    </section>

                    <LiveGpsTrackingPanel
                        orderStatus={order.status}
                        adminStatus={order._fromApi ? order.adminStatus : ""}
                        riderDisplayName={gpsRiderLabel}
                        trackedOrderDisplayId={order.displayId}
                        ordersBackTo={backTo}
                    />

                    {/* Delivery handling 3-step */}
                    <section style={card}>
                        <h2 style={{ ...h2, display: "flex", alignItems: "center", gap: "8px" }}>
                            <span aria-hidden>🏃</span> Delivery Handling System
                        </h2>
                        <div style={stepper3}>
                            <div style={delivery3Active === 0 ? step3Active : step3}>
                                <span aria-hidden>📦</span>
                                <span style={{ fontWeight: 800, color: delivery3Active === 0 ? gold : t.text }}>Assigned</span>
                                <span style={{ fontSize: "11px", color: t.textDim }}>
                                    {delivery3Active === 0 ? "Current Stage" : ""}
                                </span>
                            </div>
                            <div style={delivery3Active === 1 ? step3Active : step3}>
                                <span aria-hidden>🛵</span>
                                <span style={{ fontWeight: 700 }}>Out for Delivery</span>
                                <span style={{ fontSize: "11px", color: t.textDim }}>
                                    {delivery3Active === 1 ? "Current Stage" : ""}
                                </span>
                            </div>
                            <div style={delivery3Active === 2 ? step3Active : step3}>
                                <span aria-hidden>🎉</span>
                                <span style={{ fontWeight: 700 }}>Delivered</span>
                                <span style={{ fontSize: "11px", color: t.textDim }}>
                                    {delivery3Active === 2 ? "Current Stage" : ""}
                                </span>
                            </div>
                        </div>
                        <p style={{ marginTop: "14px", fontSize: "14px" }}>
                            <span style={{ color: "#7dd3fc" }}>Rider:</span>{" "}
                            <span style={{ color: t.success, fontWeight: 700 }}>{gpsRiderLabel}</span>{" "}
                            <span style={muted}>{riderPhoneDisplay}</span>
                        </p>
                    </section>

                    {/* Timeline + sidebar columns */}
                    <div style={twoCol}>
                        <section style={card}>
                            <h2 style={{ ...h2, display: "flex", alignItems: "center", gap: "8px" }}>
                                <span aria-hidden>📋</span> Order Progress Timeline
                            </h2>
                            <div style={{ marginTop: "20px" }}>
                                {TIMELINE.map((step, idx) => {
                                    const done = !isCancelled && idx < statusIdx;
                                    const current = !isCancelled && idx === statusIdx;
                                    const future = isCancelled || idx > statusIdx;
                                    const dotStyle = current ? timeDotGold : done ? timeDot : timeDotFuture;
                                    const titleColor = current ? gold : done ? t.success : t.textDim;
                                    const prefix = current ? "📦 " : done ? "✓ " : "○ ";
                                    return (
                                        <div key={step.title} style={timeRow}>
                                            <div style={timeLineCol}>
                                                <div style={dotStyle} />
                                                {idx < TIMELINE.length - 1 ? (
                                                    <div style={{ ...timeLine, opacity: future ? 0.35 : 1 }} />
                                                ) : null}
                                            </div>
                                            <div style={{ paddingBottom: "20px" }}>
                                                <p style={{ margin: 0, fontWeight: 800, color: titleColor }}>
                                                    {prefix}
                                                    {step.title}
                                                </p>
                                                <p style={{ ...muted, margin: "6px 0 0", lineHeight: 1.5, opacity: future ? 0.65 : 1 }}>
                                                    {step.body}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>

                        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                            <section style={card}>
                                <h2 style={{ ...h2, display: "flex", alignItems: "center", gap: "8px" }}>
                                    <span aria-hidden>📄</span> Order Items
                                </h2>
                                {order.items && order.items.length > 0 ? (
                                    <ul style={{ listStyle: "none", margin: "0 0 12px", padding: 0 }}>
                                        {order.items.map((line, idx) => (
                                            <li
                                                key={`${line.id}-${idx}`}
                                                style={{
                                                    display: "flex",
                                                    justifyContent: "space-between",
                                                    gap: "10px",
                                                    padding: "8px 0",
                                                    borderBottom: `1px solid ${t.borderSubtle}`,
                                                    fontSize: "14px",
                                                }}
                                            >
                                                <span style={{ color: t.text }}>
                                                    {line.name} × {line.quantity}
                                                </span>
                                                <span style={{ color: gold, fontWeight: 700 }}>Rs. {Number(line.lineTotal).toFixed(2)}</span>
                                            </li>
                                        ))}
                                    </ul>
                                ) : null}
                                <div style={infoRow}>
                                    <span style={muted}>Subtotal</span>
                                    <span>Rs. {order.subtotal.toFixed(2)}</span>
                                </div>
                                <div style={infoRow}>
                                    <span style={muted}>Service Fee</span>
                                    <span style={{ color: t.success, fontWeight: 600 }}>{order.serviceFeeLabel}</span>
                                </div>
                                <div style={{ borderTop: `1px solid ${t.border}`, marginTop: "12px", paddingTop: "12px" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                        <span style={{ fontWeight: 800, fontSize: "18px" }}>Total</span>
                                        <span style={{ fontWeight: 800, fontSize: "18px" }}>Rs. {order.total.toFixed(2)}</span>
                                    </div>
                                </div>
                            </section>

                            <section style={card}>
                                <h2 style={{ ...h2, display: "flex", alignItems: "center", gap: "8px" }}>
                                    <span aria-hidden>📄</span> Order Information
                                </h2>
                                <InfoLine
                                    label="Order Number"
                                    value={order._fromApi ? order.displayId : `#${order.id}`}
                                    valueStyle={{ color: gold, fontWeight: 800 }}
                                />
                                <InfoLine label="Date Placed" value={order.datePlaced} />
                                <InfoLine label="Time Slot" value={order.timeSlot} />
                                <InfoLine label="Pickup Location" value={order.pickupLocation || "—"} />
                                <InfoLine label="Order Type" value={`🏢 ${order.orderType}`} />
                                <InfoLine label="Payment Method" value={`${order.paymentMethod} ✓`} />
                                <InfoLine label="Payment Status" value={order.paymentStatus} valueStyle={{ color: t.success, fontWeight: 700 }} />
                                <InfoLine label="Rider Name" value={gpsRiderLabel} valueStyle={{ color: t.success, fontWeight: 700 }} />
                                <InfoLine label="Rider Phone" value={riderPhoneDisplay} />
                                <InfoLine label="Student" value={order.student} />
                                <InfoLine label="Student ID" value={order.studentId} />
                            </section>
                        </div>
                    </div>
                </div>
            </div>
        </MainLayout>
    );
}

function InfoLine({ label, value, valueStyle }) {
    return (
        <div style={infoRow}>
            <span style={muted}>{label}</span>
            <span style={{ textAlign: "right", ...valueStyle }}>{value}</span>
        </div>
    );
}

const shell = {
    position: "relative",
    flex: "1 1 auto",
    width: "100%",
    minHeight: 0,
    backgroundColor: pageBg,
    paddingBottom: "48px",
    boxSizing: "border-box",
};

const inner = {
    maxWidth: "1100px",
    margin: "0 auto",
    padding: "24px 18px 48px",
    boxSizing: "border-box",
};

const topBar = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "16px",
    marginBottom: "24px",
};

const backLink = {
    color: t.gold,
    fontWeight: 700,
    fontSize: "15px",
    textDecoration: "none",
};

const orderIdBig = {
    fontSize: "24px",
    fontWeight: 800,
    color: gold,
};

const statusPill = {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "6px 12px",
    borderRadius: "999px",
    backgroundColor: "rgba(34, 197, 94, 0.15)",
    color: "#86efac",
    fontWeight: 700,
    fontSize: "13px",
};

const statusDot = {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
    backgroundColor: t.success,
};

const card = {
    backgroundColor: cardBg,
    borderRadius: "14px",
    border: `1px solid ${t.borderSubtle}`,
    padding: "22px",
    marginBottom: "20px",
    boxSizing: "border-box",
};

const h2 = {
    margin: "0 0 8px",
    fontSize: "18px",
    fontWeight: 800,
    color: t.text,
};

const muted = {
    margin: 0,
    color: t.textMuted,
    fontSize: "14px",
};

const summaryGrid = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
    gap: "16px",
    marginTop: "20px",
};

const sumLabel = {
    margin: "0 0 4px",
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "0.06em",
    color: t.textDim,
};

const sumVal = { margin: 0, fontSize: "15px", color: t.text, fontWeight: 600 };
const sumValGreen = { ...sumVal, color: t.success };
const sumValGold = { ...sumVal, color: gold, fontSize: "17px" };
const sumValMuted = { ...sumVal, color: t.textMuted };

const progressTrack = {
    position: "relative",
    marginTop: "20px",
    height: "10px",
    borderRadius: "999px",
    backgroundColor: "rgba(255,255,255,0.08)",
    overflow: "hidden",
};

const progressFill = {
    width: "100%",
    height: "100%",
    borderRadius: "999px",
    background: "linear-gradient(90deg, #ea580c, #f97316)",
};

const progressLabel = {
    position: "absolute",
    left: "50%",
    top: "50%",
    transform: "translate(-50%, -50%)",
    fontSize: "10px",
    fontWeight: 800,
    color: "#fff",
    textShadow: "0 1px 2px rgba(0,0,0,0.5)",
};

const stepper6 = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(72px, 1fr))",
    gap: "8px",
    marginTop: "16px",
};

const stepBox = {
    border: `1px solid ${t.border}`,
    borderRadius: "10px",
    padding: "10px 6px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "4px",
    color: t.success,
    backgroundColor: "rgba(34,197,94,0.08)",
};

const stepBoxActive = {
    border: `2px solid ${gold}`,
    boxShadow: `0 0 0 1px ${gold}33`,
    backgroundColor: "rgba(250, 204, 21, 0.08)",
    color: gold,
};

const stepBoxPending = {
    border: `1px solid ${t.border}`,
    borderRadius: "10px",
    padding: "10px 6px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "4px",
    color: t.textDim,
    backgroundColor: "rgba(0,0,0,0.2)",
    opacity: 0.85,
};

const riderInput = {
    width: "100%",
    maxWidth: "420px",
    marginTop: "6px",
    padding: "10px 12px",
    borderRadius: "10px",
    border: `1px solid ${t.border}`,
    backgroundColor: "rgba(0,0,0,0.25)",
    color: t.text,
    fontSize: "15px",
    fontFamily: "inherit",
    boxSizing: "border-box",
};

const riderFieldError = {
    margin: "6px 0 0",
    fontSize: "13px",
    color: "#f87171",
    fontWeight: 600,
};

const saveRiderBtn = {
    marginTop: "12px",
    padding: "8px 16px",
    borderRadius: "999px",
    border: `1px solid ${t.gold}`,
    backgroundColor: "rgba(250, 204, 21, 0.12)",
    color: t.gold,
    fontWeight: 700,
    fontSize: "13px",
    cursor: "pointer",
    fontFamily: "inherit",
};

const stepper3 = {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "12px",
};

const step3 = {
    border: `1px solid ${t.border}`,
    borderRadius: "12px",
    padding: "16px 10px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "8px",
    textAlign: "center",
    fontSize: "13px",
};

const step3Active = {
    ...step3,
    border: `2px solid ${gold}`,
    backgroundColor: "rgba(250, 204, 21, 0.06)",
};

const twoCol = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))",
    gap: "20px",
    alignItems: "start",
};

const timeRow = {
    display: "grid",
    gridTemplateColumns: "24px 1fr",
    gap: "12px",
};

const timeLineCol = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
};

const timeDot = {
    width: "14px",
    height: "14px",
    borderRadius: "50%",
    backgroundColor: t.success,
    flexShrink: 0,
};

const timeDotFuture = {
    width: "12px",
    height: "12px",
    borderRadius: "50%",
    border: `2px solid ${t.border}`,
    backgroundColor: "transparent",
    flexShrink: 0,
};

const timeDotGold = {
    width: "16px",
    height: "16px",
    borderRadius: "50%",
    border: `3px solid ${gold}`,
    backgroundColor: "rgba(250,204,21,0.2)",
    flexShrink: 0,
};

const timeLine = {
    width: "2px",
    flex: 1,
    minHeight: "24px",
    backgroundColor: t.border,
    marginTop: "4px",
};

const infoRow = {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    padding: "10px 0",
    borderBottom: `1px solid ${t.borderSubtle}`,
    fontSize: "14px",
    color: t.text,
};
