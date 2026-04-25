import React, { useCallback, useEffect, useState } from "react";
import { MainLayout } from "./MainLayout";
import { theme as t } from "./theme";
import { api } from "./api";
import { useCart } from "./CartContext";
import { trackFoodItemClick } from "./foodClickTrack";
import homeBg from "./assets/home-bg.png";

function StarRow({ value }) {
    const v = Math.min(5, Math.max(0, Math.round(Number(value) || 0)));
    return (
        <span style={{ letterSpacing: "1px", fontSize: "15px" }} aria-hidden>
            <span style={{ color: t.gold }}>{"★".repeat(v)}</span>
            <span style={{ color: t.textDim }}>{"☆".repeat(5 - v)}</span>
        </span>
    );
}

function CardImage({ url }) {
    const [failed, setFailed] = useState(false);
    if (!url || failed) {
        return (
            <div
                style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: t.textDim,
                    fontSize: "13px",
                    backgroundColor: "#0f1419",
                }}
            >
                No image
            </div>
        );
    }
    return (
        <img
            src={url}
            alt=""
            style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                objectPosition: "center",
                display: "block",
            }}
            onError={() => setFailed(true)}
        />
    );
}

export default function FoodMenu() {
    const { addItem } = useCart();
    const [searchInput, setSearchInput] = useState("");
    const [search, setSearch] = useState("");
    const [categoryId, setCategoryId] = useState("all");
    const [stock, setStock] = useState("all");
    const [categories, setCategories] = useState([]);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [rateItem, setRateItem] = useState(null);
    const [rateValue, setRateValue] = useState(5);
    const [rateSubmitting, setRateSubmitting] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setSearch(searchInput), 400);
        return () => clearTimeout(timer);
    }, [searchInput]);

    const loadCategories = useCallback(async () => {
        const { data } = await api.get("/categories");
        setCategories(Array.isArray(data) ? data : []);
    }, []);

    const loadItems = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const params = { search: search || undefined, stock: stock === "all" ? undefined : stock };
            if (categoryId && categoryId !== "all") {
                params.category = categoryId;
            }
            const { data } = await api.get("/food-items", { params });
            const list = Array.isArray(data) ? data : [];
            setItems(list.filter((x) => x.is_available));
        } catch (e) {
            setError(e.response?.data?.message || e.message || "Could not load menu");
            setItems([]);
        } finally {
            setLoading(false);
        }
    }, [search, categoryId, stock]);

    useEffect(() => {
        loadCategories().catch(() => {});
    }, [loadCategories]);

    useEffect(() => {
        loadItems();
    }, [loadItems]);

    const submitRating = async () => {
        if (!rateItem) return;
        setRateSubmitting(true);
        try {
            const { data } = await api.post(`/food-items/${rateItem.id}/reviews`, { rating: rateValue });
            setItems((prev) => prev.map((x) => (x.id === data.id ? data : x)));
            setRateItem(null);
        } catch (e) {
            setError(e.response?.data?.message || e.message || "Could not submit rating");
        } finally {
            setRateSubmitting(false);
        }
    };

    return (
        <MainLayout>
            <div style={styles.shell}>
                <div style={styles.bgOverlay} aria-hidden />
                <div style={styles.banner}>
                    <h1 style={styles.bannerTitle}>Food Menu</h1>
                </div>

                <div style={styles.inner}>
                    <div style={styles.filters}>
                        <input
                            type="search"
                            placeholder="Search by name, description, or category..."
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            style={styles.search}
                            aria-label="Search food"
                        />
                        <select
                            value={categoryId}
                            onChange={(e) => setCategoryId(e.target.value)}
                            style={styles.select}
                            aria-label="Category filter"
                        >
                            <option value="all">All Categories</option>
                            {categories.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.name}
                                </option>
                            ))}
                        </select>
                        <select
                            value={stock}
                            onChange={(e) => setStock(e.target.value)}
                            style={styles.select}
                            aria-label="Stock filter"
                        >
                            <option value="all">All Stock</option>
                            <option value="in">In Stock</option>
                            <option value="out">Out of Stock</option>
                        </select>
                    </div>

                    {error ? (
                        <p style={styles.err} role="alert">
                            {error}
                        </p>
                    ) : null}

                    {loading ? (
                        <p style={styles.muted}>Loading menu…</p>
                    ) : (
                        <div style={styles.grid}>
                            {items.map((item) => {
                                const inStock = item.inventory_count > 0 && item.is_available;
                                const catName = item.category?.name || "—";
                                return (
                                    <article
                                        key={item.id}
                                        style={styles.card}
                                        onClick={() => trackFoodItemClick(item.id)}
                                    >
                                        <div style={styles.imgWrap}>
                                            <CardImage url={item.image_url} />
                                        </div>
                                        <div style={styles.cardBody}>
                                            <div style={styles.cardMain}>
                                                <div style={styles.cardHead}>
                                                    <h2 style={styles.itemName}>{item.name}</h2>
                                                    <span
                                                        style={{
                                                            ...styles.badge,
                                                            backgroundColor: inStock ? "rgba(34,197,94,0.2)" : "rgba(244,63,94,0.2)",
                                                            color: inStock ? t.success : "#f43f5e",
                                                            borderColor: inStock ? t.success : "#f43f5e",
                                                        }}
                                                    >
                                                        {inStock ? "In Stock" : "Out of Stock"}
                                                    </span>
                                                </div>
                                                <p style={styles.desc}>{item.description || "—"}</p>
                                                <p style={styles.meta}>Category: {catName}</p>
                                                <div style={styles.ratingBlock}>
                                                    {(item.review_count || 0) === 0 ? (
                                                        <p style={styles.noReviews}>No reviews yet — be the first.</p>
                                                    ) : (
                                                        <div style={styles.ratingRow}>
                                                            <StarRow value={item.average_rating} />
                                                            <span style={styles.ratingNum}>
                                                                {Number(item.average_rating || 0).toFixed(1)} ({item.review_count || 0})
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                                <p style={styles.meta}>
                                                    Available stock: <strong style={{ color: t.text }}>{item.inventory_count}</strong>
                                                </p>
                                                <p style={styles.price}>LKR {Number(item.price).toFixed(2)}</p>
                                            </div>
                                            <div style={styles.actions}>
                                                <button
                                                    type="button"
                                                    style={styles.btnOutline}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        trackFoodItemClick(item.id);
                                                        setRateItem(item);
                                                        setRateValue(5);
                                                    }}
                                                >
                                                    Rate
                                                </button>
                                                <button
                                                    type="button"
                                                    style={inStock ? styles.btnPrimary : styles.btnDisabled}
                                                    disabled={!inStock}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (!inStock) return;
                                                        trackFoodItemClick(item.id);
                                                        addItem(item);
                                                    }}
                                                >
                                                    {inStock ? "Buy Now" : "Unavailable"}
                                                </button>
                                            </div>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    )}

                    {!loading && items.length === 0 && !error ? (
                        <p style={styles.muted}>No items match your filters.</p>
                    ) : null}
                </div>
            </div>

            {rateItem ? (
                <div style={styles.modalBackdrop} role="presentation" onClick={() => !rateSubmitting && setRateItem(null)}>
                    <div
                        style={styles.modal}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="rate-title"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 id="rate-title" style={{ margin: "0 0 12px", color: t.text }}>
                            Rate &quot;{rateItem.name}&quot;
                        </h3>
                        <label style={{ display: "block", marginBottom: "12px", color: t.textMuted, fontSize: "14px" }}>
                            Stars (1–5)
                            <select
                                value={rateValue}
                                onChange={(e) => setRateValue(Number(e.target.value))}
                                style={{ ...styles.select, width: "100%", marginTop: "6px" }}
                            >
                                {[1, 2, 3, 4, 5].map((n) => (
                                    <option key={n} value={n}>
                                        {n}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                            <button type="button" style={styles.btnOutline} onClick={() => setRateItem(null)} disabled={rateSubmitting}>
                                Cancel
                            </button>
                            <button type="button" style={styles.btnPrimary} onClick={submitRating} disabled={rateSubmitting}>
                                {rateSubmitting ? "Saving…" : "Submit"}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </MainLayout>
    );
}

const styles = {
    shell: {
        position: "relative",
        width: "100%",
        minHeight: "60vh",
        backgroundImage: `url(${homeBg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
    },
    bgOverlay: {
        position: "absolute",
        inset: 0,
        background:
            "linear-gradient(180deg, rgba(7, 8, 12, 0.52) 0%, rgba(7, 8, 12, 0.62) 45%, rgba(7, 8, 12, 0.72) 100%)",
        pointerEvents: "none",
        zIndex: 0,
    },
    banner: {
        position: "relative",
        zIndex: 1,
        background: "rgba(15, 23, 42, 0.55)",
        borderBottom: `1px solid rgba(249, 200, 81, 0.24)`,
        padding: "22px 16px",
        textAlign: "center",
        backdropFilter: "blur(2px)",
    },
    bannerTitle: {
        margin: 0,
        fontSize: "28px",
        fontWeight: 800,
        color: t.gold,
        letterSpacing: "-0.02em",
    },
    inner: {
        position: "relative",
        zIndex: 1,
        maxWidth: "1120px",
        margin: "0 auto",
        padding: "22px 16px 40px",
        boxSizing: "border-box",
    },
    filters: {
        display: "grid",
        gridTemplateColumns: "1fr auto auto",
        gap: "12px",
        marginBottom: "22px",
        alignItems: "center",
    },
    search: {
        padding: "12px 16px",
        borderRadius: t.radiusSm,
        border: `1px solid ${t.border}`,
        backgroundColor: "#ffffff",
        color: "#0f172a",
        fontSize: "15px",
        outline: "none",
        minWidth: 0,
    },
    select: {
        padding: "12px 14px",
        borderRadius: t.radiusSm,
        border: `1px solid ${t.border}`,
        backgroundColor: t.surface,
        color: t.text,
        fontSize: "14px",
        minWidth: "140px",
        cursor: "pointer",
    },
    grid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 280px), 1fr))",
        gap: "24px",
        alignItems: "stretch",
    },
    card: {
        backgroundColor: t.surface,
        borderRadius: t.radius,
        border: `1px solid ${t.borderSubtle}`,
        overflow: "hidden",
        boxShadow: t.shadow,
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 0,
    },
    imgWrap: {
        position: "relative",
        width: "100%",
        flexShrink: 0,
        aspectRatio: "4 / 3",
        backgroundColor: "#0f1419",
        borderBottom: `1px solid ${t.borderSubtle}`,
        overflow: "hidden",
    },
    cardBody: {
        padding: "14px 16px 16px",
        display: "flex",
        flexDirection: "column",
        flex: "1 1 auto",
        minHeight: 0,
    },
    cardMain: {
        flex: "1 1 auto",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        minHeight: 0,
    },
    cardHead: {
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: "10px",
    },
    itemName: {
        margin: 0,
        fontSize: "17px",
        fontWeight: 700,
        color: t.text,
        lineHeight: 1.3,
        flex: 1,
        minWidth: 0,
    },
    badge: {
        fontSize: "11px",
        fontWeight: 700,
        padding: "4px 8px",
        borderRadius: t.radiusSm,
        border: "1px solid",
        flexShrink: 0,
        textTransform: "uppercase",
        letterSpacing: "0.04em",
    },
    desc: {
        margin: 0,
        fontSize: "13px",
        color: t.textMuted,
        lineHeight: 1.45,
        display: "-webkit-box",
        WebkitLineClamp: 3,
        WebkitBoxOrient: "vertical",
        overflow: "hidden",
    },
    meta: {
        margin: 0,
        fontSize: "13px",
        color: t.textMuted,
    },
    ratingBlock: {
        minHeight: "48px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        flexShrink: 0,
    },
    noReviews: {
        margin: 0,
        fontSize: "13px",
        color: t.textDim,
        lineHeight: 1.45,
        fontStyle: "italic",
    },
    ratingRow: {
        display: "flex",
        alignItems: "center",
        gap: "10px",
        flexWrap: "wrap",
    },
    ratingNum: {
        fontSize: "13px",
        color: t.textMuted,
    },
    price: {
        margin: "4px 0 0",
        fontSize: "18px",
        fontWeight: 800,
        color: t.gold,
        flexShrink: 0,
    },
    actions: {
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "10px",
        paddingTop: "14px",
        flexShrink: 0,
        borderTop: `1px solid ${t.borderSubtle}`,
        marginTop: "4px",
    },
    btnOutline: {
        padding: "10px 14px",
        borderRadius: t.radiusSm,
        border: `1px solid ${t.gold}`,
        backgroundColor: "transparent",
        color: t.gold,
        fontWeight: 600,
        fontSize: "14px",
        cursor: "pointer",
    },
    btnPrimary: {
        padding: "10px 14px",
        borderRadius: t.radiusSm,
        border: `1px solid ${t.gold}`,
        backgroundColor: t.gold,
        color: t.onGold,
        fontWeight: 700,
        fontSize: "14px",
        cursor: "pointer",
    },
    btnDisabled: {
        padding: "10px 14px",
        borderRadius: t.radiusSm,
        border: `1px solid ${t.border}`,
        backgroundColor: t.borderSubtle,
        color: t.textDim,
        fontWeight: 600,
        fontSize: "14px",
        cursor: "not-allowed",
    },
    muted: {
        color: t.textMuted,
        fontSize: "15px",
    },
    err: {
        color: t.danger,
        marginBottom: "12px",
    },
    modalBackdrop: {
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.65)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "16px",
    },
    modal: {
        backgroundColor: t.surface,
        borderRadius: t.radius,
        border: `1px solid ${t.border}`,
        padding: "20px",
        maxWidth: "400px",
        width: "100%",
        boxShadow: t.shadow,
    },
};
