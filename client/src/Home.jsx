import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { theme as t } from "./theme";
import { MainLayout } from "./MainLayout";
import homeBg from "./assets/home-bg.png";
import { isAuthSession } from "./authSession";
import { api } from "./api";
import { useCart } from "./CartContext";
import { computeOfferPriceFromDiscount } from "./offerPrice";
import { trackFoodItemClick } from "./foodClickTrack";

/** Matches category names like "Today's special", "todays special", "Today’s special" */
function normalizeCategoryName(s) {
    return String(s || "")
        .toLowerCase()
        .replace(/[''`]/g, "")
        .replace(/\s+/g, " ")
        .trim();
}

const TODAYS_SPECIAL_KEY = "todays special";

function toTitleCase(text) {
    return String(text || "")
        .toLowerCase()
        .split(" ")
        .filter(Boolean)
        .map((word) => word[0].toUpperCase() + word.slice(1))
        .join(" ");
}

/** Small thumbnail for Today’s special cards (~80px) */
function SpecialThumb({ url, name }) {
    const [failed, setFailed] = useState(false);
    if (!url || failed) {
        return (
            <div style={thumbStyles.fallback} aria-hidden>
                <div style={thumbStyles.brandMark}>Snack Smart</div>
                <span style={thumbStyles.fallbackText}>Coming soon</span>
            </div>
        );
    }
    return (
        <img
            src={url}
            alt={name ? `${name} photo` : ""}
            style={thumbStyles.img}
            onError={() => setFailed(true)}
        />
    );
}

const thumbStyles = {
    fallback: {
        width: "96px",
        aspectRatio: "4 / 3",
        flexShrink: 0,
        borderRadius: "8px",
        border: `1px solid rgba(249, 200, 81, 0.4)`,
        background: "linear-gradient(145deg, #1b2232 0%, #0f1419 100%)",
        display: "flex",
        flexDirection: "column",
        gap: "6px",
        alignItems: "center",
        justifyContent: "center",
        boxSizing: "border-box",
        padding: "6px",
    },
    brandMark: {
        fontSize: "10px",
        fontWeight: "700",
        color: t.gold,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
    },
    fallbackText: {
        fontSize: "9px",
        fontWeight: "600",
        color: t.textDim,
        textAlign: "center",
        lineHeight: 1.3,
        padding: "4px",
    },
    img: {
        width: "96px",
        aspectRatio: "4 / 3",
        flexShrink: 0,
        objectFit: "cover",
        borderRadius: "8px",
        border: `1px solid rgba(249, 200, 81, 0.25)`,
        display: "block",
        boxSizing: "border-box",
    },
};

function CartIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M6 6h15l-1.5 9h-12z" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="9" cy="20" r="1" fill="currentColor" stroke="none" />
            <circle cx="18" cy="20" r="1" fill="currentColor" stroke="none" />
            <path d="M6 6L5 3H2" strokeLinecap="round" />
        </svg>
    );
}

function SearchIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
        </svg>
    );
}

export default function Home() {
    const { addItemQuantity, addOfferQuantity } = useCart();
    const [search, setSearch] = useState("");
    const [quantities, setQuantities] = useState({});
    const [offerQuantities, setOfferQuantities] = useState({});
    const [specialItems, setSpecialItems] = useState([]);
    const [specialsLoading, setSpecialsLoading] = useState(true);
    const [specialsError, setSpecialsError] = useState("");
    const [noSpecialCategory, setNoSpecialCategory] = useState(false);
    const [offerList, setOfferList] = useState([]);
    const [offersLoading, setOffersLoading] = useState(true);
    const [offersError, setOffersError] = useState("");
    const [recommendedItems, setRecommendedItems] = useState([]);
    const [recLoading, setRecLoading] = useState(() => isAuthSession());
    const [recError, setRecError] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("all");
    const [hoveredCardId, setHoveredCardId] = useState("");
    const location = useLocation();
    const [loggedIn, setLoggedIn] = useState(() => isAuthSession());

    useEffect(() => {
        setLoggedIn(isAuthSession());
    }, [location.pathname]);

    useEffect(() => {
        let cancelled = false;
        async function loadOffers() {
            setOffersLoading(true);
            setOffersError("");
            try {
                const { data } = await api.get("/offers", { params: { active: true } });
                if (!cancelled) setOfferList(Array.isArray(data) ? data : []);
            } catch (e) {
                if (!cancelled) {
                    setOffersError(e.response?.data?.message || e.message || "Could not load offers");
                    setOfferList([]);
                }
            } finally {
                if (!cancelled) setOffersLoading(false);
            }
        }
        loadOffers();
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        let cancelled = false;
        async function loadSpecials() {
            setSpecialsLoading(true);
            setSpecialsError("");
            try {
                const { data: cats } = await api.get("/categories");
                const list = Array.isArray(cats) ? cats : [];
                const match = list.find((c) => normalizeCategoryName(c.name) === TODAYS_SPECIAL_KEY);
                if (cancelled) return;
                if (!match) {
                    setNoSpecialCategory(true);
                    setSpecialItems([]);
                    return;
                }
                setNoSpecialCategory(false);
                const { data: foods } = await api.get("/food-items", { params: { category: match.id } });
                if (cancelled) return;
                const raw = Array.isArray(foods) ? foods : [];
                setSpecialItems(raw.filter((x) => x.is_available));
            } catch (e) {
                if (!cancelled) {
                    setSpecialsError(e.response?.data?.message || e.message || "Could not load today's specials");
                    setSpecialItems([]);
                }
            } finally {
                if (!cancelled) setSpecialsLoading(false);
            }
        }
        loadSpecials();
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        let cancelled = false;
        if (!loggedIn) {
            setRecommendedItems([]);
            setRecError("");
            setRecLoading(false);
            return undefined;
        }
        async function loadRecommended() {
            setRecLoading(true);
            setRecError("");
            try {
                const { data } = await api.get("/food-items/recommended", { params: { limit: 6 } });
                if (!cancelled) setRecommendedItems(Array.isArray(data) ? data : []);
            } catch (e) {
                if (!cancelled) {
                    setRecError(e.response?.data?.message || e.message || "Could not load recommendations");
                    setRecommendedItems([]);
                }
            } finally {
                if (!cancelled) setRecLoading(false);
            }
        }
        loadRecommended();
        return () => {
            cancelled = true;
        };
    }, [loggedIn]);

    const getQty = (id) => quantities[id] ?? 0;

    const setQtyDelta = (item, delta) => {
        const max = Math.max(0, Math.floor(Number(item.inventory_count) || 0));
        setQuantities((prev) => {
            const cur = prev[item.id] ?? 0;
            const next = Math.max(0, Math.min(max, cur + delta));
            return { ...prev, [item.id]: next };
        });
    };

    const getOfferQty = (id) => offerQuantities[id] ?? 0;

    const setOfferQtyDelta = (offer, delta) => {
        const max = Math.max(0, Math.floor(Number(offer.available_count) || 0));
        setOfferQuantities((prev) => {
            const cur = prev[offer.id] ?? 0;
            const next = Math.max(0, Math.min(max, cur + delta));
            return { ...prev, [offer.id]: next };
        });
    };

    const filteredSpecials = useMemo(() => {
        const q = search.trim().toLowerCase();
        return specialItems.filter((item) => {
            const name = (item.name || "").toLowerCase();
            const desc = (item.description || "").toLowerCase();
            const cat = (item.category?.name || "").toLowerCase();
            const matchesSearch = !q || name.includes(q) || desc.includes(q) || cat.includes(q);
            const matchesCat = selectedCategory === "all" || cat === selectedCategory;
            return matchesSearch && matchesCat;
        });
    }, [search, selectedCategory, specialItems]);

    const filteredRecommended = useMemo(() => {
        const q = search.trim().toLowerCase();
        return recommendedItems.filter((item) => {
            const name = (item.name || "").toLowerCase();
            const desc = (item.description || "").toLowerCase();
            const cat = (item.category?.name || "").toLowerCase();
            const matchesSearch = !q || name.includes(q) || desc.includes(q) || cat.includes(q);
            const matchesCat = selectedCategory === "all" || cat === selectedCategory;
            return matchesSearch && matchesCat;
        });
    }, [search, selectedCategory, recommendedItems]);

    const categoryTabs = useMemo(() => {
        const map = new Map();
        [...specialItems, ...recommendedItems].forEach((item) => {
            const raw = String(item.category?.name || "").trim();
            if (!raw) return;
            const key = raw.toLowerCase();
            if (!map.has(key)) map.set(key, toTitleCase(raw));
        });
        return [{ key: "all", label: "All" }, ...Array.from(map.entries()).map(([key, label]) => ({ key, label }))];
    }, [specialItems, recommendedItems]);

    const filteredOffers = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return offerList;
        return offerList.filter((o) => {
            const hay = [
                o.title,
                o.discount_label,
                o.original_price != null ? String(o.original_price) : "",
            ]
                .join(" ")
                .toLowerCase();
            return hay.includes(q);
        });
    }, [search, offerList]);

    return (
        <MainLayout>
            <div style={styles.shell}>
                <div style={styles.bgOverlay} aria-hidden />
                <div style={styles.shellContent}>
                    <div style={styles.inner}>
                    <div style={styles.toolbar}>
                        <h2 style={styles.pageTitle}>Browse menu</h2>
                        <div style={styles.searchWrap}>
                            <span style={styles.searchIcon}>
                                <SearchIcon />
                            </span>
                            <input
                                type="search"
                                placeholder="search for an item"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                style={styles.search}
                                aria-label="Search menu"
                            />
                        </div>
                    </div>
                    <div style={styles.tabRail}>
                        {categoryTabs.map((tab) => {
                            const active = selectedCategory === tab.key;
                            return (
                                <button
                                    key={tab.key}
                                    type="button"
                                    style={active ? styles.tabBtnActive : styles.tabBtn}
                                    onClick={() => setSelectedCategory(tab.key)}
                                >
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>

                    <section id="menu" style={{ ...styles.section, scrollMarginTop: "88px" }} aria-labelledby="menu-heading">
                        <h3 id="menu-heading" style={styles.sectionTitle}>
                            Today&apos;s special
                        </h3>
                        {specialsLoading ? (
                            <p style={styles.empty}>Loading today&apos;s specials…</p>
                        ) : specialsError ? (
                            <p style={styles.empty} role="alert">
                                {specialsError}
                            </p>
                        ) : noSpecialCategory ? (
                            <p style={styles.empty}>
                                Add a category named <strong style={{ color: t.text }}>Today&apos;s special</strong> on the Inventory
                                page, then assign food items to it. This section will list those items automatically.
                            </p>
                        ) : (
                            <>
                                <div style={styles.menuGrid}>
                                    {filteredSpecials.map((item) => {
                                        const stock = Math.max(0, Math.floor(Number(item.inventory_count) || 0));
                                        const subline = String(item.description || "").trim() || "—";
                                        const canAdd = stock > 0 && getQty(item.id) > 0;
                                        return (
                                            <article
                                                key={item.id}
                                                style={{
                                                    ...styles.menuCard,
                                                    ...(hoveredCardId === item.id ? styles.menuCardHover : null),
                                                }}
                                                onMouseEnter={() => setHoveredCardId(item.id)}
                                                onMouseLeave={() => setHoveredCardId("")}
                                            >
                                                <div style={styles.specialCardRow}>
                                                    <div style={styles.menuColRightFull}>
                                                        <div style={styles.titleRow}>
                                                            <div style={styles.nameWithBadge}>
                                                                <h4 style={styles.itemName}>{toTitleCase(item.name)}</h4>
                                                            </div>
                                                            <span style={styles.priceInline}>Rs. {Number(item.price).toFixed(0)}</span>
                                                        </div>
                                                        <p style={styles.timeSlot}>{subline}</p>
                                                        <p style={styles.availableLine}>
                                                            Available : <span style={styles.availableNum}>{stock}</span>
                                                        </p>
                                                        {getQty(item.id) === 0 ? (
                                                            <button
                                                                type="button"
                                                                style={{
                                                                    ...styles.addToCartBtn,
                                                                    opacity: stock > 0 ? 1 : 0.55,
                                                                    cursor: stock > 0 ? "pointer" : "not-allowed",
                                                                }}
                                                                disabled={stock <= 0}
                                                                onClick={() => setQtyDelta(item, 1)}
                                                            >
                                                                <span>Add to cart</span>
                                                                <CartIcon />
                                                            </button>
                                                        ) : (
                                                            <>
                                                                <div style={styles.stepper}>
                                                                    <button
                                                                        type="button"
                                                                        style={styles.stepBtn}
                                                                        aria-label="Decrease quantity"
                                                                        onClick={() => setQtyDelta(item, -1)}
                                                                        disabled={stock <= 0}
                                                                    >
                                                                        −
                                                                    </button>
                                                                    <span style={styles.stepValue}>{getQty(item.id)}</span>
                                                                    <button
                                                                        type="button"
                                                                        style={styles.stepBtn}
                                                                        aria-label="Increase quantity"
                                                                        onClick={() => setQtyDelta(item, 1)}
                                                                        disabled={stock <= 0 || getQty(item.id) >= stock}
                                                                    >
                                                                        +
                                                                    </button>
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    style={{
                                                                        ...styles.addToCartBtn,
                                                                        opacity: canAdd ? 1 : 0.55,
                                                                        cursor: canAdd ? "pointer" : "not-allowed",
                                                                    }}
                                                                    disabled={!canAdd}
                                                                    onClick={() => {
                                                                        if (!canAdd) return;
                                                                        trackFoodItemClick(item.id);
                                                                        addItemQuantity(item, getQty(item.id));
                                                                        setQuantities((prev) => ({ ...prev, [item.id]: 0 }));
                                                                    }}
                                                                >
                                                                    <span>Add {getQty(item.id)} to cart</span>
                                                                    <CartIcon />
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                    <div style={styles.specialThumbWrap}>
                                                        <SpecialThumb url={item.image_url} name={item.name} />
                                                    </div>
                                                </div>
                                            </article>
                                        );
                                    })}
                                </div>
                                {!specialsLoading && !specialsError && !noSpecialCategory && filteredSpecials.length === 0 ? (
                                    <p style={styles.empty}>
                                        {specialItems.length === 0
                                            ? "No items in Today’s special yet. Add foods under Inventory and choose this category."
                                            : "No items match your search. Try another keyword."}
                                    </p>
                                ) : null}
                            </>
                        )}
                    </section>

                    {loggedIn ? (
                    <section
                        id="recommended-for-you"
                        style={{ ...styles.section, ...styles.recommendedSection, scrollMarginTop: "88px" }}
                        aria-labelledby="recommended-heading"
                    >
                        <h3 id="recommended-heading" style={styles.sectionTitle}>
                            Recommended for you
                        </h3>
                        {recLoading ? (
                            <p style={styles.empty}>Loading recommendations…</p>
                        ) : recError ? (
                            <p style={styles.empty} role="alert">
                                {recError}
                            </p>
                        ) : (
                            <>
                                <div style={styles.menuGrid}>
                                    {filteredRecommended.map((item) => {
                                        const stock = Math.max(0, Math.floor(Number(item.inventory_count) || 0));
                                        const subline = String(item.description || "").trim() || "—";
                                        const canAdd = stock > 0 && getQty(item.id) > 0;
                                        return (
                                            <article
                                                key={`rec-${item.id}`}
                                                style={{
                                                    ...styles.menuCard,
                                                    ...(hoveredCardId === `rec-${item.id}` ? styles.menuCardHover : null),
                                                }}
                                                onMouseEnter={() => setHoveredCardId(`rec-${item.id}`)}
                                                onMouseLeave={() => setHoveredCardId("")}
                                            >
                                                <div style={styles.specialCardRow}>
                                                    <div style={styles.menuColRightFull}>
                                                        <div style={styles.titleRow}>
                                                            <div style={styles.nameWithBadge}>
                                                                <h4 style={styles.itemName}>{toTitleCase(item.name)}</h4>
                                                            </div>
                                                            <span style={styles.priceInline}>Rs. {Number(item.price).toFixed(0)}</span>
                                                        </div>
                                                        <p style={styles.timeSlot}>{subline}</p>
                                                        <p style={styles.availableLine}>
                                                            Available : <span style={styles.availableNum}>{stock}</span>
                                                        </p>
                                                        {getQty(item.id) === 0 ? (
                                                            <button
                                                                type="button"
                                                                style={{
                                                                    ...styles.addToCartBtn,
                                                                    opacity: stock > 0 ? 1 : 0.55,
                                                                    cursor: stock > 0 ? "pointer" : "not-allowed",
                                                                }}
                                                                disabled={stock <= 0}
                                                                onClick={() => setQtyDelta(item, 1)}
                                                            >
                                                                <span>Add to cart</span>
                                                                <CartIcon />
                                                            </button>
                                                        ) : (
                                                            <>
                                                                <div style={styles.stepper}>
                                                                    <button
                                                                        type="button"
                                                                        style={styles.stepBtn}
                                                                        aria-label="Decrease quantity"
                                                                        onClick={() => setQtyDelta(item, -1)}
                                                                        disabled={stock <= 0}
                                                                    >
                                                                        −
                                                                    </button>
                                                                    <span style={styles.stepValue}>{getQty(item.id)}</span>
                                                                    <button
                                                                        type="button"
                                                                        style={styles.stepBtn}
                                                                        aria-label="Increase quantity"
                                                                        onClick={() => setQtyDelta(item, 1)}
                                                                        disabled={stock <= 0 || getQty(item.id) >= stock}
                                                                    >
                                                                        +
                                                                    </button>
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    style={{
                                                                        ...styles.addToCartBtn,
                                                                        opacity: canAdd ? 1 : 0.55,
                                                                        cursor: canAdd ? "pointer" : "not-allowed",
                                                                    }}
                                                                    disabled={!canAdd}
                                                                    onClick={() => {
                                                                        if (!canAdd) return;
                                                                        trackFoodItemClick(item.id);
                                                                        addItemQuantity(item, getQty(item.id));
                                                                        setQuantities((prev) => ({ ...prev, [item.id]: 0 }));
                                                                    }}
                                                                >
                                                                    <span>Add {getQty(item.id)} to cart</span>
                                                                    <CartIcon />
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                    <div style={styles.specialThumbWrap}>
                                                        <SpecialThumb url={item.image_url} name={item.name} />
                                                    </div>
                                                </div>
                                            </article>
                                        );
                                    })}
                                </div>
                                {!recLoading && !recError && filteredRecommended.length === 0 ? (
                                    <p style={styles.empty}>
                                        {recommendedItems.length === 0
                                            ? "No recommendations yet. Browse the Food Menu — clicks help build this list."
                                            : "No items match your search. Try another keyword."}
                                    </p>
                                ) : null}
                            </>
                        )}
                    </section>
                    ) : null}

                    <section
                        id="offers"
                        style={{ ...styles.section, scrollMarginTop: "88px" }}
                        aria-labelledby="offers-heading"
                    >
                        <h3 id="offers-heading" style={styles.sectionTitle}>
                            Offers
                        </h3>
                        {offersLoading ? (
                            <p style={styles.empty}>Loading offers…</p>
                        ) : offersError ? (
                            <p style={styles.empty} role="alert">
                                {offersError}
                            </p>
                        ) : (
                            <>
                                <div style={styles.menuGrid}>
                                    {filteredOffers.map((offer) => {
                                        const avail = Math.max(0, Math.floor(Number(offer.available_count) || 0));
                                        const canOfferAdd = avail > 0 && getOfferQty(offer.id) > 0;
                                        const computedNow = computeOfferPriceFromDiscount(
                                            offer.original_price,
                                            offer.discount_label
                                        );
                                        return (
                                            <article
                                                key={offer.id}
                                                style={{
                                                    ...styles.menuCard,
                                                    ...(hoveredCardId === `offer-${offer.id}` ? styles.menuCardHover : null),
                                                }}
                                                onMouseEnter={() => setHoveredCardId(`offer-${offer.id}`)}
                                                onMouseLeave={() => setHoveredCardId("")}
                                            >
                                                <div style={styles.menuCardRow}>
                                                    <div style={styles.menuColLeft}>
                                                        <div style={styles.leadBox}>
                                                            <span style={styles.leadBoxText}>{offer.discount_label}</span>
                                                        </div>
                                                    </div>
                                                    <div style={styles.menuColRight}>
                                                        <div style={styles.titleRow}>
                                                            <h4 style={styles.itemName}>{offer.title}</h4>
                                                        </div>
                                                        {offer.original_price != null && offer.original_price !== "" ? (
                                                            <p style={styles.timeSlot}>
                                                                Was:{" "}
                                                                <strong style={{ color: t.text }}>
                                                                    LKR {Number(offer.original_price).toFixed(2)}
                                                                </strong>
                                                            </p>
                                                        ) : null}
                                                        {computedNow != null ? (
                                                            <p style={styles.timeSlot}>
                                                                Now:{" "}
                                                                <strong style={{ color: t.gold }}>
                                                                    LKR {computedNow.toFixed(2)}
                                                                </strong>
                                                            </p>
                                                        ) : null}
                                                        <p style={styles.availableLine}>
                                                            Available : <span style={styles.availableNum}>{avail}</span>
                                                        </p>
                                                        {getOfferQty(offer.id) === 0 ? (
                                                            <button
                                                                type="button"
                                                                style={{
                                                                    ...styles.addToCartBtn,
                                                                    opacity: avail > 0 ? 1 : 0.55,
                                                                    cursor: avail > 0 ? "pointer" : "not-allowed",
                                                                }}
                                                                disabled={avail <= 0}
                                                                onClick={() => setOfferQtyDelta(offer, 1)}
                                                            >
                                                                <span>Add to cart</span>
                                                                <CartIcon />
                                                            </button>
                                                        ) : (
                                                            <>
                                                                <div style={styles.stepper}>
                                                                    <button
                                                                        type="button"
                                                                        style={styles.stepBtn}
                                                                        aria-label="Decrease quantity"
                                                                        onClick={() => setOfferQtyDelta(offer, -1)}
                                                                        disabled={avail <= 0}
                                                                    >
                                                                        −
                                                                    </button>
                                                                    <span style={styles.stepValue}>{getOfferQty(offer.id)}</span>
                                                                    <button
                                                                        type="button"
                                                                        style={styles.stepBtn}
                                                                        aria-label="Increase quantity"
                                                                        onClick={() => setOfferQtyDelta(offer, 1)}
                                                                        disabled={avail <= 0 || getOfferQty(offer.id) >= avail}
                                                                    >
                                                                        +
                                                                    </button>
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    style={{
                                                                        ...styles.addToCartBtn,
                                                                        opacity: canOfferAdd ? 1 : 0.55,
                                                                        cursor: canOfferAdd ? "pointer" : "not-allowed",
                                                                    }}
                                                                    disabled={!canOfferAdd}
                                                                    onClick={() => {
                                                                        if (!canOfferAdd) return;
                                                                        addOfferQuantity(offer, getOfferQty(offer.id));
                                                                        setOfferQuantities((prev) => ({ ...prev, [offer.id]: 0 }));
                                                                    }}
                                                                >
                                                                    <span>Add {getOfferQty(offer.id)} to cart</span>
                                                                    <CartIcon />
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </article>
                                        );
                                    })}
                                </div>
                                {!offersLoading && !offersError && filteredOffers.length === 0 ? (
                                    <p style={styles.empty}>
                                        {offerList.length === 0
                                            ? "No offers yet. Add offers from the Inventory page."
                                            : "No offers match your search."}
                                    </p>
                                ) : null}
                            </>
                        )}
                    </section>

                    <section
                        id="about"
                        style={{ ...styles.section, scrollMarginTop: "88px", textAlign: "center" }}
                        aria-labelledby="about-heading"
                    >
                        <h3 id="about-heading" style={{ ...styles.sectionTitle, textAlign: "center" }}>
                            About Us
                        </h3>
                        <div style={styles.aboutBox}>
                            <p style={styles.aboutParagraph}>
                                Snack Smart is a modern canteen management system designed to enhance the overall dining
                                experience for students and staff. It focuses on creating a well-organized, efficient, and
                                user-friendly environment that makes accessing canteen services more convenient and
                                reliable.
                            </p>
                            <p style={{ ...styles.aboutParagraph, marginBottom: 0 }}>
                                Our goal is to support a smarter approach to everyday dining by promoting simplicity,
                                accessibility, and better time management within the canteen setting.{" "}
                                <strong style={styles.aboutStrong}>Snack Smart</strong> is built with the vision of
                                improving the way users interact with canteen services while ensuring a smooth and
                                comfortable experience for everyone.
                            </p>
                        </div>
                    </section>
                    </div>
                </div>
            </div>
        </MainLayout>
    );
}

const styles = {
    shell: {
        position: "relative",
        width: "100%",
        boxSizing: "border-box",
        display: "block",
        backgroundImage: `url(${homeBg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
    },
    bgOverlay: {
        position: "absolute",
        inset: 0,
        minHeight: "100%",
        background:
            "linear-gradient(180deg, rgba(7, 8, 12, 0.52) 0%, rgba(7, 8, 12, 0.62) 45%, rgba(7, 8, 12, 0.72) 100%)",
        pointerEvents: "none",
        zIndex: 0,
    },
    shellContent: {
        position: "relative",
        zIndex: 1,
        padding: "20px 16px 32px",
        boxSizing: "border-box",
    },
    inner: {
        maxWidth: "1100px",
        margin: "0 auto",
    },
    toolbar: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "16px",
        marginBottom: "22px",
        width: "100%",
    },
    searchWrap: {
        width: "min(100%, 440px)",
        maxWidth: "100%",
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "0 16px",
        borderRadius: t.radiusPill,
        border: `2px solid ${t.gold}`,
        boxShadow: `0 0 0 1px rgba(249, 200, 81, 0.15), 0 4px 20px rgba(0, 0, 0, 0.25)`,
        backgroundColor: "rgba(26, 30, 40, 0.92)",
        color: t.textMuted,
        boxSizing: "border-box",
    },
    searchIcon: {
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        color: t.gold,
        flexShrink: 0,
    },
    pageTitle: {
        margin: 0,
        color: t.text,
        fontSize: "22px",
        fontWeight: "700",
        textAlign: "center",
        width: "100%",
    },
    search: {
        minWidth: 0,
        width: "100%",
        padding: "10px 0",
        borderRadius: 0,
        border: "none",
        backgroundColor: "transparent",
        color: t.text,
        fontSize: "15px",
        outline: "none",
    },
    tabRail: {
        display: "flex",
        gap: "10px",
        overflowX: "auto",
        paddingBottom: "6px",
        marginBottom: "14px",
        scrollbarWidth: "thin",
    },
    tabBtn: {
        padding: "8px 14px",
        borderRadius: t.radiusPill,
        border: `1px solid ${t.border}`,
        backgroundColor: t.surface,
        color: t.textMuted,
        fontSize: "13px",
        fontWeight: "600",
        cursor: "pointer",
        whiteSpace: "nowrap",
        flexShrink: 0,
    },
    tabBtnActive: {
        padding: "8px 14px",
        borderRadius: t.radiusPill,
        border: `1px solid ${t.gold}`,
        backgroundColor: "rgba(249, 200, 81, 0.12)",
        color: t.gold,
        fontSize: "13px",
        fontWeight: "700",
        cursor: "pointer",
        whiteSpace: "nowrap",
        flexShrink: 0,
    },
    section: {
        marginBottom: "28px",
    },
    recommendedSection: {
        marginTop: "42px",
    },
    sectionTitle: {
        margin: "0 0 14px 0",
        color: t.gold,
        fontSize: "18px",
        fontWeight: "700",
    },
    menuGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 340px), 1fr))",
        gap: "16px",
    },
    menuCard: {
        backgroundColor: t.surface,
        borderRadius: t.radius,
        border: `1px solid rgba(249, 200, 81, 0.35)`,
        boxShadow: t.shadow,
        padding: "14px",
        minHeight: "268px",
        transition: "transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease",
    },
    menuCardHover: {
        transform: "translateY(-5px)",
        boxShadow: "0 12px 36px rgba(0, 0, 0, 0.45)",
        borderColor: "rgba(249, 200, 81, 0.55)",
    },
    menuCardRow: {
        display: "flex",
        flexDirection: "row",
        gap: "14px",
        alignItems: "flex-start",
    },
    /** Today’s special: text + small image on the right */
    specialCardRow: {
        display: "flex",
        flexDirection: "row",
        gap: "12px",
        alignItems: "flex-start",
        justifyContent: "space-between",
    },
    specialThumbWrap: {
        flexShrink: 0,
        paddingTop: "2px",
    },
    menuColRightFull: {
        flex: 1,
        minWidth: 0,
        width: "100%",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        minHeight: "238px",
    },
    nameWithBadge: {
        display: "flex",
        alignItems: "flex-start",
        gap: "8px",
        flex: 1,
        minWidth: 0,
    },
    priceInline: {
        fontSize: "18px",
        fontWeight: "800",
        color: t.gold,
        flexShrink: 0,
        lineHeight: 1.35,
        paddingTop: "1px",
    },
    menuColLeft: {
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "8px",
        width: "104px",
    },
    leadBox: {
        width: "104px",
        minHeight: "104px",
        borderRadius: t.radiusSm,
        backgroundColor: t.surfaceHover,
        border: `1px solid ${t.border}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "10px 8px",
        boxSizing: "border-box",
    },
    leadBoxText: {
        fontSize: "12px",
        fontWeight: "700",
        color: t.gold,
        textAlign: "center",
        lineHeight: 1.35,
    },
    codeUnderLead: {
        margin: 0,
        fontSize: "11px",
        fontWeight: "700",
        color: t.textMuted,
        textAlign: "center",
        width: "104px",
        letterSpacing: "0.04em",
    },
    menuColRight: {
        flex: 1,
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        gap: "6px",
    },
    titleRow: {
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: "8px",
    },
    itemName: {
        margin: 0,
        color: t.text,
        fontSize: "15px",
        fontWeight: "700",
        lineHeight: 1.3,
        flex: 1,
        minWidth: 0,
    },
    timeSlot: {
        margin: 0,
        fontSize: "12px",
        color: t.textMuted,
    },
    availableLine: {
        margin: 0,
        fontSize: "13px",
        color: t.textMuted,
    },
    availableNum: {
        color: t.text,
        fontWeight: "700",
    },
    stepper: {
        display: "inline-flex",
        alignItems: "center",
        alignSelf: "flex-start",
        marginTop: "4px",
        backgroundColor: "#0f1419",
        border: `1px solid ${t.border}`,
        borderRadius: t.radiusPill,
        overflow: "hidden",
    },
    stepBtn: {
        width: "36px",
        height: "32px",
        border: "none",
        backgroundColor: "transparent",
        color: t.text,
        fontSize: "18px",
        fontWeight: "600",
        cursor: "pointer",
        lineHeight: 1,
        padding: 0,
    },
    stepValue: {
        minWidth: "28px",
        textAlign: "center",
        fontSize: "14px",
        fontWeight: "600",
        color: t.text,
    },
    addToCartBtn: {
        marginTop: "8px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        width: "100%",
        padding: "10px 14px",
        borderRadius: t.radiusSm,
        border: `1px solid ${t.gold}`,
        backgroundColor: "transparent",
        color: t.gold,
        fontWeight: "600",
        fontSize: "14px",
        cursor: "pointer",
    },
    empty: {
        color: t.textMuted,
        fontSize: "14px",
    },
    /** Same horizontal span as menu / offers grids (full width of `.inner`, max 1100px) */
    aboutBox: {
        width: "100%",
        maxWidth: "100%",
        boxSizing: "border-box",
        marginLeft: "auto",
        marginRight: "auto",
        textAlign: "center",
        background: `linear-gradient(165deg, rgba(249, 200, 81, 0.14) 0%, ${t.surface} 42%, ${t.surface} 100%)`,
        borderRadius: t.radius,
        border: `1px solid rgba(249, 200, 81, 0.35)`,
        boxShadow: t.shadow,
        padding: "22px 20px 20px",
    },
    aboutParagraph: {
        margin: "0 0 14px 0",
        color: t.text,
        fontSize: "15px",
        fontWeight: "600",
        lineHeight: 1.65,
        textAlign: "center",
    },
    aboutStrong: {
        color: t.text,
        fontWeight: "700",
    },
};
