import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { MainLayout } from "./MainLayout";
import { theme as t } from "./theme";
import { api } from "./api";

const accentGold = "#fcd535";
const LAST_ORDER_KEY = "snackSmartLastOrder";

function shortOrderRef(orderId) {
    const s = String(orderId || "").replace(/-/g, "");
    const chunk = s.slice(0, 6).toUpperCase();
    return chunk || "ORDER";
}

function isFoodLine(item) {
    if (!item?.id || String(item.id).startsWith("offer:")) return false;
    if (item.isOffer === true) return false;
    if (item.kind === "offer") return false;
    return true;
}

function readStoredOrder() {
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

function StarRow({ rating }) {
    return (
        <div style={{ display: "flex", gap: "4px", alignItems: "center" }} aria-label={`${rating} out of 5 stars`}>
            {[1, 2, 3, 4, 5].map((n) => (
                <span key={n} style={{ color: n <= rating ? accentGold : t.textDim, fontSize: "18px", lineHeight: 1 }}>
                    ★
                </span>
            ))}
        </div>
    );
}

/** Shared layout: thumb + details on the left, Edit / Delete top-right (matches “All My Reviews” cards). */
function SubmittedReviewCard({ item, saved, onEdit, onDelete }) {
    return (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px" }}>
            <div style={{ display: "flex", gap: "14px", flex: 1, minWidth: 0 }}>
                <div style={thumb}>
                    {item.image_url ? (
                        <img src={item.image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                        <span style={{ fontSize: "10px", color: t.textDim }}>—</span>
                    )}
                </div>
                <div style={{ minWidth: 0 }}>
                    <p style={{ margin: 0, fontWeight: 800, color: t.text, fontSize: "16px" }}>{item.name}</p>
                    <p style={{ margin: "6px 0 0", fontSize: "14px", color: t.textMuted }}>
                        LKR {Number(item.unitPrice).toFixed(2)} × {item.quantity}
                    </p>
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                            flexWrap: "wrap",
                            marginTop: "10px",
                        }}
                    >
                        <StarRow rating={saved.rating} />
                        <span style={{ color: t.textDim, fontSize: "13px" }}>
                            {new Date(saved.submittedAt).toLocaleDateString()}
                        </span>
                    </div>
                    {saved.comment ? (
                        <p style={{ margin: "10px 0 0", color: t.text, fontSize: "15px", lineHeight: 1.45, whiteSpace: "pre-wrap" }}>
                            {saved.comment}
                        </p>
                    ) : null}
                </div>
            </div>
            <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                <button type="button" onClick={onEdit} style={btnEdit}>
                    Edit
                </button>
                <button type="button" onClick={onDelete} style={btnDelete}>
                    Delete
                </button>
            </div>
        </div>
    );
}

export default function OrderReviews() {
    const location = useLocation();
    const data = useMemo(() => {
        if (location.state && location.state.orderId) return location.state;
        return readStoredOrder();
    }, [location.state]);

    const [expandedId, setExpandedId] = useState(null);
    const autoOpenedForOrderRef = useRef(null);
    const editingFromSavedRef = useRef(null);

    useEffect(() => {
        if (!data?.openFirstReview || !data?.orderId) return;
        if (autoOpenedForOrderRef.current === data.orderId) return;
        const first = data.items?.find(isFoodLine);
        if (first) {
            setExpandedId(String(first.id));
            autoOpenedForOrderRef.current = data.orderId;
        }
    }, [data?.orderId, data?.openFirstReview, data?.items]);

    if (!data || !data.orderId || !Array.isArray(data.items)) {
        return <Navigate to="/food" replace />;
    }

    const orderRef = useMemo(() => shortOrderRef(data.orderId), [data.orderId]);
    const [ratingById, setRatingById] = useState({});
    const [commentById, setCommentById] = useState({});
    const [errorById, setErrorById] = useState({});
    const [submittingId, setSubmittingId] = useState(null);
    /** id -> { rating, comment, submittedAt } */
    const [savedById, setSavedById] = useState({});

    const savedList = useMemo(() => {
        return Object.entries(savedById)
            .map(([id, saved]) => {
                const item = data.items.find((x) => String(x.id) === id);
                return item ? { id, saved, item } : null;
            })
            .filter(Boolean);
    }, [savedById, data.items]);

    const submitReview = async (item) => {
        const id = String(item.id);
        const rating = ratingById[id];
        if (!rating || rating < 1 || rating > 5) {
            setErrorById((prev) => ({ ...prev, [id]: "Please select a rating between 1 and 5 stars." }));
            return;
        }
        setErrorById((prev) => ({ ...prev, [id]: "" }));
        const comment = (commentById[id] || "").trim();
        const isEditOnly = editingFromSavedRef.current === id;

        setSubmittingId(id);
        try {
            if (!isEditOnly) {
                await api.post(`/food-items/${id}/reviews`, { rating });
            }
            editingFromSavedRef.current = null;
            setSavedById((prev) => ({
                ...prev,
                [id]: {
                    rating,
                    comment,
                    submittedAt: prev[id]?.submittedAt ?? new Date().toISOString(),
                },
            }));
            setExpandedId(null);
            setRatingById((prev) => ({ ...prev, [id]: undefined }));
            setCommentById((prev) => ({ ...prev, [id]: "" }));
        } catch (err) {
            const msg = err.response?.data?.message;
            setErrorById((prev) => ({
                ...prev,
                [id]: typeof msg === "string" ? msg : "Could not submit review. Try again.",
            }));
        } finally {
            setSubmittingId(null);
        }
    };

    const startEdit = (id, saved) => {
        editingFromSavedRef.current = id;
        setRatingById((prev) => ({ ...prev, [id]: saved.rating }));
        setCommentById((prev) => ({ ...prev, [id]: saved.comment || "" }));
        setErrorById((prev) => ({ ...prev, [id]: "" }));
        setExpandedId(id);
    };

    const removeSaved = (id) => {
        editingFromSavedRef.current = null;
        setSavedById((prev) => {
            const next = { ...prev };
            delete next[id];
            return next;
        });
        if (expandedId === id) {
            setExpandedId(null);
            setRatingById((prev) => ({ ...prev, [id]: undefined }));
            setCommentById((prev) => ({ ...prev, [id]: "" }));
        }
    };

    return (
        <MainLayout>
            <div style={shell}>
                <div style={inner}>
                    <h1 style={pageTitle}>My Reviews</h1>
                    <p style={sectionLead}>Review items from Order #{orderRef}</p>
                    <div style={divider} />

                    <div style={{ display: "grid", gap: "16px", marginBottom: "40px" }}>
                        {data.items.map((item, idx) => {
                            const id = String(item.id);
                            const food = isFoodLine(item);
                            const saved = savedById[id];
                            const expanded = expandedId === id;

                            return (
                                <div key={`${id}-${idx}`} style={card}>
                                    {!food ? (
                                        <div style={{ display: "flex", gap: "14px", alignItems: "flex-start" }}>
                                            <div style={thumb}>
                                                <span style={{ fontSize: "10px", color: t.textDim }}>—</span>
                                            </div>
                                            <div>
                                                <p style={{ margin: 0, fontWeight: 800, color: t.text, fontSize: "16px" }}>{item.name}</p>
                                                <p style={{ margin: "12px 0 0", fontSize: "13px", color: t.textDim }}>
                                                    Offers cannot be reviewed as menu items.
                                                </p>
                                            </div>
                                        </div>
                                    ) : saved && !expanded ? (
                                        <SubmittedReviewCard
                                            item={item}
                                            saved={saved}
                                            onEdit={() => startEdit(id, saved)}
                                            onDelete={() => removeSaved(id)}
                                        />
                                    ) : !expanded ? (
                                        <div style={{ display: "flex", gap: "14px", alignItems: "flex-start" }}>
                                            <div style={thumb}>
                                                {item.image_url ? (
                                                    <img src={item.image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                                ) : (
                                                    <span style={{ fontSize: "10px", color: t.textDim }}>—</span>
                                                )}
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <p style={{ margin: 0, fontWeight: 800, color: t.text, fontSize: "16px" }}>{item.name}</p>
                                                <p style={{ margin: "6px 0 0", fontSize: "14px", color: t.textMuted }}>
                                                    LKR {Number(item.unitPrice).toFixed(2)} × {item.quantity}
                                                </p>
                                                <button type="button" onClick={() => setExpandedId(id)} style={btnDashed}>
                                                    + Write a Review
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div>
                                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
                                                <div style={{ display: "flex", gap: "14px", flex: 1, minWidth: 0 }}>
                                                    <div style={thumb}>
                                                        {item.image_url ? (
                                                            <img src={item.image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                                        ) : (
                                                            <span style={{ fontSize: "10px", color: t.textDim }}>—</span>
                                                        )}
                                                    </div>
                                                    <div style={{ minWidth: 0 }}>
                                                        <p style={{ margin: 0, fontWeight: 800, color: t.text, fontSize: "16px" }}>{item.name}</p>
                                                        <p style={{ margin: "6px 0 0", fontSize: "14px", color: t.textMuted }}>
                                                            LKR {Number(item.unitPrice).toFixed(2)} × {item.quantity}
                                                        </p>
                                                    </div>
                                                </div>
                                                {saved ? (
                                                    <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                                                        <button type="button" onClick={() => startEdit(id, saved)} style={btnEdit}>
                                                            Edit
                                                        </button>
                                                        <button type="button" onClick={() => removeSaved(id)} style={btnDelete}>
                                                            Delete
                                                        </button>
                                                    </div>
                                                ) : null}
                                            </div>
                                            <div style={{ marginTop: "16px" }}>
                                                <p style={{ margin: "0 0 8px", fontSize: "13px", color: t.textMuted }}>Your Rating</p>
                                                <div style={{ display: "flex", gap: "6px", marginBottom: "14px" }} role="group" aria-label="Rating">
                                                    {[1, 2, 3, 4, 5].map((n) => (
                                                        <button
                                                            key={n}
                                                            type="button"
                                                            onClick={() => {
                                                                setRatingById((prev) => ({ ...prev, [id]: n }));
                                                                setErrorById((prev) => ({ ...prev, [id]: "" }));
                                                            }}
                                                            style={starBtn}
                                                            aria-pressed={ratingById[id] === n}
                                                            aria-label={`${n} stars`}
                                                        >
                                                            <span style={{ color: (ratingById[id] || 0) >= n ? accentGold : t.textDim, fontSize: "22px" }}>
                                                                ★
                                                            </span>
                                                        </button>
                                                    ))}
                                                </div>
                                                <label style={{ display: "block", marginBottom: "8px", fontSize: "13px", color: t.textMuted }}>
                                                    Comment (optional)
                                                </label>
                                                <textarea
                                                    value={commentById[id] || ""}
                                                    onChange={(e) => {
                                                        const v = e.target.value.slice(0, 1000);
                                                        setCommentById((prev) => ({ ...prev, [id]: v }));
                                                    }}
                                                    rows={4}
                                                    style={textarea}
                                                    placeholder="Share your experience…"
                                                />
                                                <div style={{ textAlign: "right", fontSize: "12px", color: t.textDim, marginTop: "4px" }}>
                                                    {(commentById[id] || "").length}/1000
                                                </div>
                                                {errorById[id] ? (
                                                    <p style={{ margin: "10px 0 0", fontSize: "13px", color: "#f87171", fontWeight: 600 }} role="alert">
                                                        {errorById[id]}
                                                    </p>
                                                ) : null}
                                                <div style={{ display: "flex", gap: "12px", marginTop: "16px", flexWrap: "wrap" }}>
                                                    <button
                                                        type="button"
                                                        disabled={!!submittingId}
                                                        onClick={() => submitReview(item)}
                                                        style={btnSubmit}
                                                    >
                                                        {submittingId === id ? "Submitting…" : saved ? "Save changes" : "Submit Review"}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            editingFromSavedRef.current = null;
                                                            setExpandedId(null);
                                                            setErrorById((prev) => ({ ...prev, [id]: "" }));
                                                        }}
                                                        style={btnCancel}
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    <h2 style={sectionTitle}>All My Reviews</h2>
                    <div style={divider} />
                    {savedList.length === 0 ? (
                        <p style={{ margin: "16px 0 0", fontSize: "14px", color: t.textMuted }}>You haven&apos;t written any reviews yet.</p>
                    ) : (
                        <div style={{ display: "grid", gap: "14px", marginTop: "16px" }}>
                            {savedList.map(({ id, saved, item }) => (
                                <div key={`all-${id}`} style={card}>
                                    <SubmittedReviewCard
                                        item={item}
                                        saved={saved}
                                        onEdit={() => startEdit(id, saved)}
                                        onDelete={() => removeSaved(id)}
                                    />
                                </div>
                            ))}
                        </div>
                    )}

                    <Link to="/home" style={{ ...backLink, marginTop: "28px", display: "inline-block" }}>
                        ← Back to Home
                    </Link>
                </div>
            </div>
        </MainLayout>
    );
}

const shell = {
    flex: "1 1 auto",
    width: "100%",
    backgroundColor: "#0b0e11",
    minHeight: 0,
};

const inner = {
    maxWidth: "720px",
    margin: "0 auto",
    padding: "32px 20px 48px",
    boxSizing: "border-box",
};

const pageTitle = {
    margin: "0 0 8px",
    fontSize: "clamp(26px, 4vw, 32px)",
    fontWeight: 800,
    color: t.text,
};

const sectionLead = {
    margin: 0,
    fontSize: "16px",
    fontWeight: 600,
    color: t.text,
};

const sectionTitle = {
    margin: "0 0 0",
    fontSize: "18px",
    fontWeight: 800,
    color: t.text,
};

const divider = {
    height: "1px",
    backgroundColor: t.borderSubtle,
    marginTop: "12px",
};

const card = {
    backgroundColor: "#161b22",
    borderRadius: t.radius,
    border: `1px solid ${t.borderSubtle}`,
    padding: "18px 16px",
};

const thumb = {
    width: "56px",
    height: "56px",
    borderRadius: t.radiusSm,
    backgroundColor: t.surfaceHover,
    overflow: "hidden",
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
};

const btnEdit = {
    padding: "8px 14px",
    borderRadius: t.radiusSm,
    border: `1px solid ${t.border}`,
    backgroundColor: "transparent",
    color: t.text,
    fontWeight: 600,
    fontSize: "13px",
    cursor: "pointer",
    fontFamily: "inherit",
};

const btnDelete = {
    padding: "8px 14px",
    borderRadius: t.radiusSm,
    border: `1px solid ${t.danger}`,
    backgroundColor: "transparent",
    color: t.danger,
    fontWeight: 600,
    fontSize: "13px",
    cursor: "pointer",
    fontFamily: "inherit",
};

const btnDashed = {
    marginTop: "14px",
    padding: "10px 16px",
    borderRadius: t.radiusSm,
    border: `2px dashed ${accentGold}`,
    backgroundColor: "transparent",
    color: accentGold,
    fontWeight: 700,
    fontSize: "14px",
    cursor: "pointer",
    fontFamily: "inherit",
};

const starBtn = {
    padding: "4px",
    border: "none",
    background: "transparent",
    cursor: "pointer",
    lineHeight: 1,
    fontFamily: "inherit",
};

const textarea = {
    width: "100%",
    boxSizing: "border-box",
    padding: "12px 14px",
    borderRadius: t.radiusSm,
    border: `1px solid ${t.border}`,
    backgroundColor: t.surfaceHover,
    color: t.text,
    fontSize: "15px",
    resize: "vertical",
    minHeight: "100px",
    outline: "none",
    fontFamily: "inherit",
};

const btnSubmit = {
    padding: "12px 22px",
    borderRadius: t.radiusPill,
    border: "none",
    backgroundColor: accentGold,
    color: "#0b0e11",
    fontWeight: 800,
    fontSize: "15px",
    cursor: "pointer",
    fontFamily: "inherit",
};

const btnCancel = {
    padding: "12px 22px",
    borderRadius: t.radiusPill,
    border: `1px solid ${t.border}`,
    backgroundColor: t.surfaceHover,
    color: t.text,
    fontWeight: 600,
    fontSize: "15px",
    cursor: "pointer",
    fontFamily: "inherit",
};

const backLink = {
    color: accentGold,
    fontWeight: 700,
    fontSize: "14px",
    textDecoration: "none",
};
