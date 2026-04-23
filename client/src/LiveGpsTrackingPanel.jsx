import React from "react";
import { Link } from "react-router-dom";
import { theme as t } from "./theme";

const gold = "#facc15";
const cyan = "#22d3ee";
const cardBg = "#1a1d23";

const muted = {
    margin: 0,
    color: t.textMuted,
    fontSize: "14px",
};

const h2 = {
    margin: "0 0 8px",
    fontSize: "18px",
    fontWeight: 800,
    color: t.text,
};

const gpsV2Card = {
    backgroundColor: cardBg,
    borderRadius: "14px",
    border: `1px solid ${t.borderSubtle}`,
    padding: 0,
    overflow: "hidden",
    marginBottom: 0,
    boxSizing: "border-box",
};

const gpsV2Header = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "16px",
    flexWrap: "wrap",
    padding: "22px 22px 18px",
    borderBottom: `1px solid ${t.borderSubtle}`,
    boxSizing: "border-box",
};

const gpsV2SatIcon = {
    fontSize: "32px",
    lineHeight: 1,
    filter: "grayscale(0.2)",
};

const gpsV2EtaCol = {
    textAlign: "right",
    flexShrink: 0,
};

const gpsV2EtaLabel = {
    margin: 0,
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "0.12em",
    color: t.textDim,
    textTransform: "uppercase",
};

const gpsV2EtaBig = {
    margin: "4px 0 0",
    fontSize: "clamp(26px, 5vw, 34px)",
    fontWeight: 800,
    color: gold,
    lineHeight: 1.1,
};

const gpsV2EtaSmall = {
    margin: "6px 0 0",
    fontSize: "13px",
    color: t.textDim,
};

const gpsCreativeMapBase = {
    position: "relative",
    background:
        "radial-gradient(ellipse 90% 70% at 50% 100%, rgba(30,58,138,0.35) 0%, transparent 55%), radial-gradient(ellipse 60% 50% at 20% 30%, rgba(250,204,21,0.06) 0%, transparent 50%), linear-gradient(168deg, #070b14 0%, #0f172a 38%, #111827 72%, #0c1220 100%)",
    borderBottom: `1px solid ${t.borderSubtle}`,
    overflow: "hidden",
    boxSizing: "border-box",
};

const gpsCreativeStars = {
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
    zIndex: 0,
};

const gpsCreativeRoads = {
    position: "absolute",
    inset: 0,
    opacity: 0.35,
    backgroundImage: `repeating-linear-gradient(90deg, transparent, transparent 38px, rgba(148,163,184,0.06) 38px, rgba(148,163,184,0.06) 39px),
        repeating-linear-gradient(0deg, transparent, transparent 42px, rgba(148,163,184,0.05) 42px, rgba(148,163,184,0.05) 43px)`,
    pointerEvents: "none",
    zIndex: 1,
};

const gpsCreativeLiveBadge = {
    position: "absolute",
    top: "12px",
    left: "50%",
    transform: "translateX(-50%)",
    zIndex: 6,
    display: "flex",
    alignItems: "center",
    padding: "6px 14px",
    borderRadius: "999px",
    fontSize: "11px",
    fontWeight: 800,
    letterSpacing: "0.14em",
    color: "#ecfdf5",
    background: "linear-gradient(135deg, rgba(22,101,52,0.95), rgba(21,128,61,0.88))",
    border: "1px solid rgba(74,222,128,0.45)",
};

const gpsCreativeCompass = {
    position: "absolute",
    top: "12px",
    right: "14px",
    zIndex: 6,
    width: "48px",
    height: "48px",
    borderRadius: "50%",
    border: `2px solid rgba(250,204,21,0.35)`,
    background: "rgba(15,23,42,0.75)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 4px 20px rgba(0,0,0,0.35)",
};

const gpsCreativeCompassN = {
    fontSize: "10px",
    fontWeight: 800,
    color: t.textDim,
    letterSpacing: "0.12em",
    marginTop: "2px",
};

const gpsCreativePoi = {
    position: "absolute",
    zIndex: 3,
    transform: "translate(-50%, -50%)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "4px",
    pointerEvents: "none",
};

const gpsCreativePoiText = {
    fontSize: "9px",
    fontWeight: 700,
    color: "rgba(226,232,240,0.75)",
    textShadow: "0 1px 4px rgba(0,0,0,0.8)",
    whiteSpace: "nowrap",
};

const gpsCreativeRiderWrap = {
    position: "absolute",
    right: "11%",
    top: "16%",
    zIndex: 7,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "10px",
};

const gpsCreativeRiderBubble = {
    fontSize: "11px",
    fontWeight: 700,
    color: "#fff7ed",
    background: "linear-gradient(135deg, rgba(15,23,42,0.92), rgba(30,41,59,0.88))",
    padding: "8px 14px",
    borderRadius: "12px",
    border: "1px solid rgba(251,191,36,0.4)",
    boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
    maxWidth: "200px",
    textAlign: "center",
    lineHeight: 1.35,
};

const gpsCreativeRiderHud = {
    position: "relative",
    width: "64px",
    height: "64px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
};

const gpsCreativeRiderCore = {
    position: "relative",
    zIndex: 2,
    fontSize: "38px",
    lineHeight: 1,
};

const gpsCreativeStandby = {
    position: "absolute",
    bottom: "18px",
    left: "50%",
    transform: "translateX(-50%)",
    zIndex: 5,
    margin: 0,
    fontSize: "12px",
    fontWeight: 600,
    color: "rgba(148, 163, 184, 0.85)",
    textAlign: "center",
    maxWidth: "88%",
    lineHeight: 1.45,
    pointerEvents: "none",
};

const gpsCreativeVignette = {
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
    zIndex: 4,
    background: "radial-gradient(ellipse 75% 65% at 50% 50%, transparent 40%, rgba(0,0,0,0.45) 100%)",
    mixBlendMode: "multiply",
};

const gpsV2CurLocCard = {
    position: "absolute",
    top: "14px",
    left: "14px",
    zIndex: 8,
    padding: "12px 16px",
    borderRadius: "12px",
    backgroundColor: "rgba(15, 23, 42, 0.82)",
    border: `1px solid ${t.borderSubtle}`,
    backdropFilter: "blur(8px)",
    maxWidth: "min(200px, 46%)",
    boxSizing: "border-box",
};

const gpsV2CurLocLabel = {
    margin: 0,
    fontSize: "10px",
    fontWeight: 800,
    letterSpacing: "0.1em",
    color: t.textDim,
};

const gpsV2CurLocValue = {
    margin: "8px 0 0",
    fontSize: "16px",
    fontWeight: 800,
    color: t.text,
};

const gpsV2StatsRow = {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    borderTop: `1px solid ${t.borderSubtle}`,
    backgroundColor: "rgba(0,0,0,0.2)",
};

const gpsV2StatCell = {
    padding: "18px 12px",
    textAlign: "center",
    boxSizing: "border-box",
};

const gpsV2StatLabel = {
    margin: 0,
    fontSize: "10px",
    fontWeight: 800,
    letterSpacing: "0.08em",
    color: t.textDim,
};

const gpsV2StatMainGold = {
    margin: "10px 0 0",
    fontSize: "22px",
    fontWeight: 800,
    color: gold,
    lineHeight: 1.1,
};

const gpsV2StatMainCyan = {
    margin: "10px 0 0",
    fontSize: "22px",
    fontWeight: 800,
    color: cyan,
    lineHeight: 1.1,
};

const gpsV2StatMainGreen = {
    margin: "10px 0 0",
    fontSize: "22px",
    fontWeight: 800,
    color: t.success,
    lineHeight: 1.1,
};

const gpsV2StatSub = {
    margin: "6px 0 0",
    fontSize: "11px",
    color: t.textDim,
};

const gpsV2Breadcrumb = {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: "8px",
    padding: "14px 22px 18px",
    fontSize: "13px",
    borderTop: `1px solid ${t.borderSubtle}`,
    boxSizing: "border-box",
};

const gpsV2CrumbDotGold = { color: gold, fontSize: "10px", lineHeight: 1 };
const gpsV2CrumbText = { color: t.text, fontWeight: 600 };
const gpsV2CrumbSep = { color: cyan, fontWeight: 700, opacity: 0.9 };
const gpsV2CrumbCyan = { color: cyan, fontWeight: 600 };
const gpsV2CrumbGreen = { color: t.success, fontWeight: 700 };

const footerLinkStyle = {
    display: "block",
    marginTop: "12px",
    padding: "0 22px 18px",
    fontSize: "13px",
    fontWeight: 700,
    color: t.gold,
    textDecoration: "none",
};

const trackingOrderRow = {
    margin: "10px 0 0",
    display: "flex",
    flexWrap: "wrap",
    alignItems: "baseline",
    gap: "8px 10px",
};

const trackingOrderKicker = {
    margin: 0,
    fontSize: "10px",
    fontWeight: 800,
    letterSpacing: "0.14em",
    color: t.textDim,
    textTransform: "uppercase",
};

const trackingOrderId = {
    margin: 0,
    fontSize: "15px",
    fontWeight: 800,
    color: gold,
    letterSpacing: "-0.02em",
};

const trackingOrderStandby = {
    margin: "10px 0 0",
    fontSize: "13px",
    color: t.textDim,
    lineHeight: 1.45,
};

/**
 * Same live GPS visual as Order Detail: satellite-style map, route when out for delivery / delivered, stats row, breadcrumb.
 */
export function LiveGpsTrackingPanel({
    orderStatus = "Pending",
    adminStatus = "",
    riderDisplayName = "Rider",
    compact = false,
    orderDetailLink = null,
    ordersBackTo = "/profile",
    /** Shown in the header so users know which order this map refers to (e.g. ###1203). */
    trackedOrderDisplayId = null,
}) {
    const isCancelled = orderStatus === "Cancelled" || adminStatus === "rejected";
    const isDelivered = orderStatus === "Delivered";
    const isOutForDelivery = orderStatus === "Out for Delivery";
    const label = (riderDisplayName || "Rider").trim() || "Rider";
    const riderFirstName = label.split(/\s+/)[0];

    const gpsSubtitle = isDelivered
        ? `${label} — delivered successfully ✓`
        : isOutForDelivery
          ? `${label} — on the way · live tracking`
          : isCancelled
            ? "Tracking unavailable — order cancelled."
            : "GPS activates when the order is out for delivery.";
    const gpsEtaBig = isDelivered ? "Done!" : isOutForDelivery ? "Live" : isCancelled ? "—" : "Prep";
    const gpsEtaSmall = isDelivered ? "✓ Completed" : isOutForDelivery ? "En route" : isCancelled ? "—" : "Kitchen";
    const gpsCurLocStatus = isDelivered ? "Arrived ✓" : isOutForDelivery ? "En route" : isCancelled ? "—" : "Kitchen";
    const gpsRiderStatLine1 = isDelivered || isOutForDelivery ? riderFirstName : "Unassigned";
    const gpsRiderStatLine2 = isDelivered ? "delivered" : isOutForDelivery ? "on the way" : "awaiting";

    const mapMinH = compact ? "min(260px, 52vw)" : "340px";

    return (
        <section style={gpsV2Card}>
            <div style={gpsV2Header}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: "14px", minWidth: 0 }}>
                    <span style={gpsV2SatIcon} aria-hidden>
                        📡
                    </span>
                    <div style={{ minWidth: 0 }}>
                        <h2 style={{ ...h2, marginBottom: "6px" }}>Live GPS Tracking</h2>
                        {trackedOrderDisplayId ? (
                            <div style={trackingOrderRow}>
                                <p style={trackingOrderKicker}>Tracking order</p>
                                <p style={trackingOrderId}>{trackedOrderDisplayId}</p>
                            </div>
                        ) : (
                            <p style={trackingOrderStandby}>
                                No order on the map yet. On your profile, your latest out-for-delivery or delivered order
                                is shown here automatically.
                            </p>
                        )}
                        <p style={{ ...muted, margin: "10px 0 0", lineHeight: 1.5 }}>{gpsSubtitle}</p>
                    </div>
                </div>
                <div style={gpsV2EtaCol}>
                    <p style={gpsV2EtaLabel}>ETA</p>
                    <p style={gpsV2EtaBig}>{gpsEtaBig}</p>
                    <p style={gpsV2EtaSmall}>{gpsEtaSmall}</p>
                </div>
            </div>

            <div style={{ ...gpsCreativeMapBase, minHeight: mapMinH }}>
                <style>
                    {`
                    @keyframes gpsDashMarch {
                        to { stroke-dashoffset: -32; }
                    }
                    @keyframes gpsPing {
                        0% { transform: translate(-50%, -50%) scale(0.65); opacity: 0.55; }
                        100% { transform: translate(-50%, -50%) scale(1.85); opacity: 0; }
                    }
                    @keyframes gpsRiderGlow {
                        0%, 100% { filter: drop-shadow(0 0 6px rgba(250,204,21,0.45)); }
                        50% { filter: drop-shadow(0 0 14px rgba(250,204,21,0.95)); }
                    }
                    @keyframes gpsLivePulse {
                        0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(34,197,94,0.45); }
                        50% { opacity: 0.92; box-shadow: 0 0 0 8px rgba(34,197,94,0); }
                    }
                    @keyframes gpsTwinkle {
                        0%, 100% { opacity: 0.35; }
                        50% { opacity: 0.9; }
                    }
                    .gps-route-line {
                        animation: gpsDashMarch 1.1s linear infinite;
                    }
                    .gps-ping-ring {
                        position: absolute;
                        left: 50%;
                        top: 50%;
                        width: 56px;
                        height: 56px;
                        margin: 0;
                        border-radius: 50%;
                        border: 2px solid rgba(250, 204, 21, 0.45);
                        pointer-events: none;
                        animation: gpsPing 2s ease-out infinite;
                    }
                    .gps-ping-ring:nth-child(2) { animation-delay: 0.7s; }
                    .gps-rider-icon {
                        animation: gpsRiderGlow 2.2s ease-in-out infinite;
                    }
                    .gps-live-badge {
                        animation: gpsLivePulse 2s ease-in-out infinite;
                    }
                    .gps-star { animation: gpsTwinkle 3s ease-in-out infinite; }
                    .gps-star:nth-child(odd) { animation-delay: 0.8s; }
                    @media (prefers-reduced-motion: reduce) {
                        .gps-route-line, .gps-ping-ring, .gps-rider-icon, .gps-live-badge, .gps-star {
                            animation: none !important;
                        }
                    }
                `}
                </style>

                <div style={gpsCreativeStars} aria-hidden>
                    {[...Array(18)].map((_, i) => (
                        <span
                            key={i}
                            className="gps-star"
                            style={{
                                position: "absolute",
                                left: `${4 + (i * 47) % 92}%`,
                                top: `${6 + ((i * 23) % 38)}%`,
                                width: 2,
                                height: 2,
                                borderRadius: "50%",
                                background: i % 3 === 0 ? "#fef9c3" : "#94a3b8",
                            }}
                        />
                    ))}
                </div>
                <div style={gpsCreativeRoads} aria-hidden />

                <div style={gpsV2CurLocCard}>
                    <p style={gpsV2CurLocLabel}>CURRENT LOCATION</p>
                    <p style={gpsV2CurLocValue}>{gpsCurLocStatus}</p>
                </div>

                {isOutForDelivery ? (
                    <div className="gps-live-badge" style={gpsCreativeLiveBadge}>
                        <span style={{ marginRight: 6 }}>●</span>
                        LIVE
                    </div>
                ) : null}

                <div style={gpsCreativeCompass} aria-hidden>
                    <span style={{ fontSize: 16, color: gold, lineHeight: 1 }}>↑</span>
                    <span style={gpsCreativeCompassN}>N</span>
                </div>

                <svg
                    viewBox="0 0 400 280"
                    preserveAspectRatio="xMidYMid slice"
                    style={{
                        position: "absolute",
                        inset: 0,
                        width: "100%",
                        height: "100%",
                        pointerEvents: "none",
                        zIndex: 2,
                    }}
                    aria-hidden
                >
                    <defs>
                        <linearGradient id="gpsRouteGradProfile" x1="0%" y1="100%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#facc15" stopOpacity="0.95" />
                            <stop offset="55%" stopColor="#fb923c" stopOpacity="1" />
                            <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.85" />
                        </linearGradient>
                        <filter id="gpsSoftGlowProfile" x="-20%" y="-20%" width="140%" height="140%">
                            <feGaussianBlur stdDeviation="2" result="b" />
                            <feMerge>
                                <feMergeNode in="b" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                    </defs>
                    {[40, 85, 130, 175, 220].map((y) => (
                        <line key={`h${y}`} x1="0" y1={y} x2="400" y2={y} stroke="rgba(148,163,184,0.07)" strokeWidth="1" />
                    ))}
                    {[50, 120, 190, 260, 330].map((x) => (
                        <line key={`v${x}`} x1={x} y1="0" x2={x} y2="280" stroke="rgba(148,163,184,0.05)" strokeWidth="1" />
                    ))}
                    <ellipse cx="200" cy="200" rx="140" ry="50" fill="rgba(30,58,138,0.12)" />
                    {(isDelivered || isOutForDelivery) && (
                        <>
                            <path
                                d="M 48 218 Q 95 140 168 118 Q 240 96 318 72"
                                fill="none"
                                stroke="rgba(250,204,21,0.15)"
                                strokeWidth="10"
                                strokeLinecap="round"
                                filter="url(#gpsSoftGlowProfile)"
                            />
                            <path
                                className="gps-route-line"
                                d="M 48 218 Q 95 140 168 118 Q 240 96 318 72"
                                fill="none"
                                stroke="url(#gpsRouteGradProfile)"
                                strokeWidth="4"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeDasharray="10 14"
                                style={{ strokeDashoffset: 0 }}
                            />
                            <circle cx="48" cy="218" r="7" fill="#1e293b" stroke="#facc15" strokeWidth="2" />
                            <circle cx="318" cy="72" r="8" fill="#1e293b" stroke="#22c55e" strokeWidth="2" />
                        </>
                    )}
                </svg>

                {[
                    { t: "Canteen", x: "8%", y: "72%", icon: "🍽️" },
                    { t: "Library", x: "22%", y: "18%", icon: "📚" },
                    { t: "Sports", x: "78%", y: "22%", icon: "⚽" },
                    { t: "Dorms", x: "68%", y: "58%", icon: "🏠" },
                    { t: "Labs", x: "42%", y: "38%", icon: "🔬" },
                ].map((poi) => (
                    <div key={poi.t} style={{ ...gpsCreativePoi, left: poi.x, top: poi.y }}>
                        <span style={{ fontSize: 14 }} aria-hidden>
                            {poi.icon}
                        </span>
                        <span style={gpsCreativePoiText}>{poi.t}</span>
                    </div>
                ))}

                {!isDelivered && !isOutForDelivery && !isCancelled ? (
                    <p style={gpsCreativeStandby}>Satellite standby · Route draws when order is out for delivery</p>
                ) : null}

                {(isDelivered || isOutForDelivery) && (
                    <div style={gpsCreativeRiderWrap}>
                        <div style={gpsCreativeRiderBubble}>
                            {isDelivered ? `${riderFirstName} · Delivered ✓` : `${riderFirstName} · En route`}
                        </div>
                        <div style={gpsCreativeRiderHud}>
                            <span className="gps-ping-ring" />
                            <span className="gps-ping-ring" />
                            <div className="gps-rider-icon" style={gpsCreativeRiderCore} title="Rider">
                                🚴
                            </div>
                        </div>
                    </div>
                )}

                <div style={gpsCreativeVignette} aria-hidden />
            </div>

            <div style={gpsV2StatsRow}>
                <div style={gpsV2StatCell}>
                    <p style={gpsV2StatLabel}>DISTANCE</p>
                    <p style={gpsV2StatMainGold}>{isDelivered ? "0.0 km" : isOutForDelivery ? "1.2 km" : "—"}</p>
                    <p style={gpsV2StatSub}>{isDelivered || isOutForDelivery ? "remaining" : ""}</p>
                </div>
                <div style={{ ...gpsV2StatCell, borderLeft: `1px solid ${t.border}` }}>
                    <p style={gpsV2StatLabel}>SPEED</p>
                    <p style={gpsV2StatMainCyan}>{isOutForDelivery ? "24" : "0"}</p>
                    <p style={gpsV2StatSub}>km/h</p>
                </div>
                <div style={{ ...gpsV2StatCell, borderLeft: `1px solid ${t.border}` }}>
                    <p style={gpsV2StatLabel}>ETA</p>
                    <p style={gpsV2StatMainGreen}>{isDelivered ? "Done" : isOutForDelivery ? "~8" : "—"}</p>
                    <p style={gpsV2StatSub}>{isDelivered || isOutForDelivery ? "minutes" : ""}</p>
                </div>
                <div style={{ ...gpsV2StatCell, borderLeft: `1px solid ${t.border}` }}>
                    <p style={gpsV2StatLabel}>RIDER</p>
                    <p style={gpsV2StatMainCyan}>{gpsRiderStatLine1}</p>
                    <p style={gpsV2StatSub}>{gpsRiderStatLine2}</p>
                </div>
            </div>

            <div style={gpsV2Breadcrumb}>
                <span style={gpsV2CrumbDotGold}>●</span>
                <span style={gpsV2CrumbText}>Main Canteen</span>
                <span style={gpsV2CrumbSep}>›</span>
                <span style={gpsV2CrumbCyan}>Faculty Entrance</span>
                <span style={gpsV2CrumbSep}>›</span>
                <span style={gpsV2CrumbGreen}>
                    {isDelivered ? "Arrived ✓" : isOutForDelivery ? "En route" : "—"}
                </span>
            </div>

            {orderDetailLink ? (
                <Link to={orderDetailLink} state={{ ordersBackTo }} style={footerLinkStyle}>
                    View full order & tracking →
                </Link>
            ) : null}
        </section>
    );
}
