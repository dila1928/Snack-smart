import React, { useMemo, useState } from "react";
import { MainLayout } from "./MainLayout";
import { theme as t } from "./theme";
import homeBg from "./assets/home-bg.png";

const FAQ_ITEMS = [
    {
        id: "ordering-1",
        category: "Ordering",
        question: "How do I place an order in Snack Smart?",
        answer:
            "Go to Food, choose your items, add quantities, and click Add to cart. Then open Cart and continue to Checkout to confirm your order.",
    },
    {
        id: "ordering-2",
        category: "Ordering",
        question: "Can I change my order after placing it?",
        answer:
            "You can edit quantities before checkout. After confirmation, changes depend on preparation status, so please contact canteen staff quickly.",
    },
    {
        id: "payment-1",
        category: "Payment",
        question: "What payment options are available?",
        answer:
            "Snack Smart supports the payment methods shown during checkout. Available options can vary based on canteen configuration.",
    },
    {
        id: "delivery-1",
        category: "Pickup",
        question: "How do I know when my order is ready?",
        answer:
            "Track progress from My Orders. You will see order status updates from placed to prepared and ready for pickup.",
    },
    {
        id: "account-1",
        category: "Account",
        question: "Do I need an account to use Snack Smart?",
        answer:
            "You can browse the menu without login, but an account is required to place orders, track history, and manage your profile.",
    },
    {
        id: "offers-1",
        category: "Offers",
        question: "Where can I find discounts or special offers?",
        answer:
            "Open Home and scroll to the Offers section. Active promotions and discounted prices are displayed there.",
    },
    {
        id: "support-1",
        category: "Support",
        question: "What should I do if something goes wrong?",
        answer:
            "If an item, price, or order status looks incorrect, contact canteen staff and share your order details for faster support.",
    },
];

export default function FAQ() {
    const [query, setQuery] = useState("");
    const [activeCategory, setActiveCategory] = useState("All");
    const [openIds, setOpenIds] = useState(() => new Set(["ordering-1"]));

    const categories = useMemo(() => {
        return ["All", ...Array.from(new Set(FAQ_ITEMS.map((item) => item.category)))];
    }, []);

    const filteredFaqs = useMemo(() => {
        const q = query.trim().toLowerCase();
        return FAQ_ITEMS.filter((item) => {
            const matchesCategory = activeCategory === "All" || item.category === activeCategory;
            const haystack = `${item.question} ${item.answer} ${item.category}`.toLowerCase();
            const matchesQuery = !q || haystack.includes(q);
            return matchesCategory && matchesQuery;
        });
    }, [activeCategory, query]);

    const toggleOpen = (id) => {
        setOpenIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const expandAll = () => {
        setOpenIds(new Set(filteredFaqs.map((item) => item.id)));
    };

    const collapseAll = () => {
        setOpenIds(new Set());
    };

    return (
        <MainLayout>
            <div style={styles.shell}>
                <div style={styles.overlay} aria-hidden />
                <div style={styles.contentWrap}>
                    <div style={styles.inner}>
                        <section style={styles.hero}>
                            <h2 style={styles.title}>Frequently Asked Questions</h2>
                            <p style={styles.subtitle}>
                                Quick answers to help students and staff use Snack Smart smoothly.
                            </p>
                            <input
                                type="search"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Search a question..."
                                aria-label="Search FAQ"
                                style={styles.search}
                            />
                        </section>

                        <section style={styles.controls} aria-label="FAQ filters">
                            <div style={styles.categoryRail}>
                                {categories.map((category) => {
                                    const active = activeCategory === category;
                                    return (
                                        <button
                                            key={category}
                                            type="button"
                                            onClick={() => setActiveCategory(category)}
                                            style={active ? styles.chipActive : styles.chip}
                                        >
                                            {category}
                                        </button>
                                    );
                                })}
                            </div>
                            <div style={styles.actionRow}>
                                <button type="button" onClick={expandAll} style={styles.actionBtn}>
                                    Expand all
                                </button>
                                <button type="button" onClick={collapseAll} style={styles.actionBtn}>
                                    Collapse all
                                </button>
                            </div>
                        </section>

                        <section style={styles.faqList} aria-label="FAQ list">
                            {filteredFaqs.length === 0 ? (
                                <p style={styles.empty}>No matching questions found. Try another keyword or category.</p>
                            ) : (
                                filteredFaqs.map((item) => {
                                    const isOpen = openIds.has(item.id);
                                    return (
                                        <article key={item.id} style={styles.card}>
                                            <button
                                                type="button"
                                                onClick={() => toggleOpen(item.id)}
                                                style={styles.questionBtn}
                                                aria-expanded={isOpen}
                                            >
                                                <span style={styles.questionText}>{item.question}</span>
                                                <span style={styles.chevron} aria-hidden>
                                                    {isOpen ? "−" : "+"}
                                                </span>
                                            </button>
                                            {isOpen ? (
                                                <div style={styles.answerWrap}>
                                                    <span style={styles.categoryTag}>{item.category}</span>
                                                    <p style={styles.answerText}>{item.answer}</p>
                                                </div>
                                            ) : null}
                                        </article>
                                    );
                                })
                            )}
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
        backgroundImage: `url(${homeBg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
    },
    overlay: {
        position: "absolute",
        inset: 0,
        background:
            "linear-gradient(180deg, rgba(7, 8, 12, 0.52) 0%, rgba(7, 8, 12, 0.62) 45%, rgba(7, 8, 12, 0.72) 100%)",
        pointerEvents: "none",
        zIndex: 0,
    },
    contentWrap: {
        position: "relative",
        zIndex: 1,
        padding: "22px 16px 40px",
    },
    inner: {
        maxWidth: "980px",
        margin: "0 auto",
    },
    hero: {
        textAlign: "center",
        marginBottom: "20px",
    },
    title: {
        margin: 0,
        color: t.gold,
        fontSize: "30px",
        fontWeight: "800",
    },
    subtitle: {
        margin: "10px auto 0",
        maxWidth: "720px",
        color: t.text,
        fontSize: "15px",
        lineHeight: 1.6,
    },
    search: {
        marginTop: "16px",
        width: "min(100%, 540px)",
        borderRadius: t.radiusPill,
        border: `2px solid ${t.gold}`,
        backgroundColor: "rgba(26, 30, 40, 0.92)",
        color: t.text,
        padding: "11px 16px",
        outline: "none",
        fontSize: "14px",
    },
    controls: {
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "12px",
        marginBottom: "14px",
    },
    categoryRail: {
        display: "flex",
        gap: "8px",
        overflowX: "auto",
    },
    chip: {
        border: `1px solid ${t.border}`,
        backgroundColor: t.surface,
        color: t.textMuted,
        borderRadius: t.radiusPill,
        padding: "8px 13px",
        fontSize: "12px",
        fontWeight: "700",
        cursor: "pointer",
        whiteSpace: "nowrap",
    },
    chipActive: {
        border: `1px solid ${t.gold}`,
        backgroundColor: "rgba(249, 200, 81, 0.12)",
        color: t.gold,
        borderRadius: t.radiusPill,
        padding: "8px 13px",
        fontSize: "12px",
        fontWeight: "700",
        cursor: "pointer",
        whiteSpace: "nowrap",
    },
    actionRow: {
        display: "flex",
        gap: "8px",
    },
    actionBtn: {
        border: `1px solid ${t.border}`,
        backgroundColor: "rgba(22, 27, 38, 0.95)",
        color: t.text,
        borderRadius: t.radiusSm,
        padding: "7px 12px",
        fontSize: "12px",
        fontWeight: "700",
        cursor: "pointer",
    },
    faqList: {
        display: "grid",
        gap: "12px",
    },
    card: {
        backgroundColor: t.surface,
        border: `1px solid rgba(249, 200, 81, 0.34)`,
        borderRadius: t.radius,
        boxShadow: t.shadow,
        overflow: "hidden",
    },
    questionBtn: {
        width: "100%",
        border: "none",
        backgroundColor: "transparent",
        color: t.text,
        padding: "15px 16px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        textAlign: "left",
        cursor: "pointer",
        gap: "12px",
    },
    questionText: {
        fontSize: "15px",
        fontWeight: "700",
        lineHeight: 1.4,
    },
    chevron: {
        color: t.gold,
        fontSize: "24px",
        fontWeight: "700",
        lineHeight: 1,
        flexShrink: 0,
    },
    answerWrap: {
        borderTop: `1px solid ${t.borderSubtle}`,
        padding: "12px 16px 16px",
    },
    categoryTag: {
        display: "inline-block",
        fontSize: "11px",
        fontWeight: "800",
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        color: t.gold,
        marginBottom: "8px",
    },
    answerText: {
        margin: 0,
        fontSize: "14px",
        color: t.textMuted,
        lineHeight: 1.6,
    },
    empty: {
        backgroundColor: t.surface,
        border: `1px solid ${t.border}`,
        borderRadius: t.radius,
        color: t.textMuted,
        padding: "14px 16px",
        margin: 0,
    },
};
