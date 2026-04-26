import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { theme as t, headerChipLinkStyle } from "./theme";
import { clearAdminSession, getAuthEmail, isAdminSession, isAuthSession } from "./authSession";
import { useCart } from "./CartContext";
import { getProfileField } from "./profileStorage";

const ls = {
    page: {
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        backgroundColor: t.bg,
        color: t.text,
    },
    header: {
        backgroundColor: t.surface,
        color: t.text,
        padding: "14px 26px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "12px",
        borderBottom: `1px solid ${t.border}`,
    },
    brandSection: {
        display: "flex",
        alignItems: "center",
        gap: "10px",
    },
    brand: {
        margin: 0,
        fontSize: "26px",
        fontWeight: "700",
        color: t.gold,
        letterSpacing: "-0.02em",
    },
    brandLink: {
        textDecoration: "none",
    },
    topMenu: {
        display: "flex",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "clamp(18px, 2.8vw, 44px)",
        rowGap: "12px",
    },
    topLink: {
        textDecoration: "none",
        color: t.text,
        fontWeight: "600",
        fontSize: "15px",
    },
    topLinkActive: {
        textDecoration: "none",
        color: t.gold,
        fontWeight: "700",
        fontSize: "15px",
        borderBottom: `2px solid ${t.gold}`,
        paddingBottom: "2px",
    },
    cartBtn: {
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: "44px",
        height: "44px",
        borderRadius: t.radiusSm,
        border: `2px solid ${t.gold}`,
        backgroundColor: "transparent",
        color: t.gold,
        textDecoration: "none",
        boxSizing: "border-box",
        position: "relative",
    },
    profileIconBtn: {
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: "44px",
        height: "44px",
        borderRadius: "50%",
        border: `2px solid ${t.gold}`,
        backgroundColor: "transparent",
        color: t.gold,
        textDecoration: "none",
        boxSizing: "border-box",
        position: "relative",
        overflow: "hidden",
    },
    profileAvatarImage: {
        width: "100%",
        height: "100%",
        objectFit: "cover",
        display: "block",
    },
    cartBadge: {
        position: "absolute",
        top: "-4px",
        right: "-4px",
        minWidth: "20px",
        height: "20px",
        padding: "0 5px",
        borderRadius: "999px",
        backgroundColor: "#ff4d4d",
        color: "#fff",
        fontSize: "11px",
        fontWeight: 800,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        lineHeight: 1,
        boxSizing: "border-box",
    },
    authNav: {
        display: "flex",
        alignItems: "center",
        gap: "40px",
    },
    content: {
        flex: "1 1 auto",
        display: "block",
        width: "100%",
        color: "inherit",
    },
    footer: {
        backgroundColor: t.surface,
        color: t.textMuted,
        textAlign: "center",
        padding: "16px",
        borderTop: `1px solid ${t.border}`,
    },
    footerText: {
        margin: 0,
        fontSize: "13px",
    },
};

function CartIcon() {
    return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M6 6h15l-1.5 9h-12z" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="9" cy="20" r="1" fill="currentColor" stroke="none" />
            <circle cx="18" cy="20" r="1" fill="currentColor" stroke="none" />
            <path d="M6 6L5 3H2" strokeLinecap="round" />
        </svg>
    );
}

function UserIcon() {
    return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="12" cy="7" r="4" />
        </svg>
    );
}

export function MainLayout({ children }) {
    const location = useLocation();
    const navigate = useNavigate();
    const { totalCount } = useCart();
    const [isLoggedIn, setIsLoggedIn] = useState(() => isAuthSession());
    const [navProfileImage, setNavProfileImage] = useState("");

    useEffect(() => {
        setIsLoggedIn(isAuthSession());
    }, [location.pathname]);

    useEffect(() => {
        if (!isLoggedIn) {
            setNavProfileImage("");
            return;
        }
        const email = getAuthEmail();
        const img = getProfileField(email, "profileImage", "");
        setNavProfileImage(img || "");
    }, [isLoggedIn, location.pathname]);

    useEffect(() => {
        const onProfileImageUpdated = (evt) => {
            const email = getAuthEmail();
            const next = evt?.detail?.image ?? getProfileField(email, "profileImage", "");
            setNavProfileImage(typeof next === "string" ? next : "");
        };
        const onStorage = () => {
            const email = getAuthEmail();
            const img = getProfileField(email, "profileImage", "");
            setNavProfileImage(img || "");
        };
        window.addEventListener("ss-profile-image-updated", onProfileImageUpdated);
        window.addEventListener("storage", onStorage);
        return () => {
            window.removeEventListener("ss-profile-image-updated", onProfileImageUpdated);
            window.removeEventListener("storage", onStorage);
        };
    }, []);

    const path = location.pathname;
    /** Staff header: admin + inventory routes, or any page while staff session is active. */
    const showStaffNav = isAdminSession() || path.startsWith("/admin") || path === "/inventory";

    /** Student menu only — staff uses the fixed trio below. */
    const orderHistoryActive =
        path.startsWith("/profile") || path === "/my-orders" || /^\/orders\//.test(path);

    const nav = (to, label) => {
        let active = path === to;
        if (to === "/food") active = path === "/food" || path === "/home";
        return (
            <Link to={to} style={active ? ls.topLinkActive : ls.topLink}>
                {label}
            </Link>
        );
    };

    return (
        <div style={ls.page}>
            <header style={ls.header}>
                <div style={ls.brandSection}>
                    <Link to={showStaffNav ? "/admin" : "/home"} style={ls.brandLink}>
                        <h1 style={ls.brand}>Snack Smart</h1>
                    </Link>
                </div>

                <nav style={ls.topMenu} aria-label={showStaffNav ? "Canteen staff navigation" : "Main navigation"}>
                    {showStaffNav ? (
                        <>
                            <Link to="/admin" style={path === "/admin" ? ls.topLinkActive : ls.topLink}>
                                Admin
                            </Link>
                            <Link
                                to="/admin/pending-orders"
                                style={path === "/admin/pending-orders" ? ls.topLinkActive : ls.topLink}
                            >
                                Pending orders
                            </Link>
                            <Link to="/inventory" style={path === "/inventory" ? ls.topLinkActive : ls.topLink}>
                                Inventory
                            </Link>
                        </>
                    ) : (
                        <>
                            {nav("/food", "Food")}
                            <Link to="/faq" style={path === "/faq" ? ls.topLinkActive : ls.topLink}>
                                FAQ
                            </Link>
                            <Link to="/contact" style={path === "/contact" ? ls.topLinkActive : ls.topLink}>
                                Contact Us
                            </Link>
                            <Link
                                to="/profile#orders"
                                style={orderHistoryActive ? ls.topLinkActive : ls.topLink}
                            >
                                Order History
                            </Link>
                        </>
                    )}
                </nav>

                <nav style={{ ...ls.authNav, flexWrap: "wrap" }}>
                    {showStaffNav ? (
                        <button
                            type="button"
                            onClick={() => {
                                clearAdminSession();
                                navigate("/home", { replace: false });
                            }}
                            style={{
                                border: `1px solid ${t.border}`,
                                backgroundColor: "rgba(0,0,0,0.2)",
                                color: t.textMuted,
                                fontSize: "12px",
                                fontWeight: 700,
                                letterSpacing: "0.06em",
                                textTransform: "uppercase",
                                padding: "10px 14px",
                                borderRadius: t.radiusSm,
                                cursor: "pointer",
                                fontFamily: "inherit",
                            }}
                        >
                            Staff logout
                        </button>
                    ) : (
                        <>
                            <Link
                                to="/cart"
                                style={ls.cartBtn}
                                aria-label={totalCount > 0 ? `Shopping cart, ${totalCount} items` : "Shopping cart"}
                                title={totalCount > 0 ? `Cart (${totalCount})` : "Cart"}
                            >
                                <CartIcon />
                                {totalCount > 0 ? (
                                    <span style={ls.cartBadge}>{totalCount > 99 ? "99+" : totalCount}</span>
                                ) : null}
                            </Link>
                            {isLoggedIn ? (
                                <Link
                                    to="/profile"
                                    style={{
                                        ...ls.profileIconBtn,
                                        ...(path.startsWith("/profile")
                                            ? { backgroundColor: "rgba(249, 200, 81, 0.12)" }
                                            : null),
                                    }}
                                    aria-label="Profile"
                                    title="Profile"
                                >
                                    {navProfileImage ? (
                                        <img src={navProfileImage} alt="" style={ls.profileAvatarImage} />
                                    ) : (
                                        <UserIcon />
                                    )}
                                </Link>
                            ) : null}
                            {!isLoggedIn && (
                                <>
                                    <Link to="/login" style={headerChipLinkStyle}>
                                        Login
                                    </Link>
                                    <Link to="/register" style={headerChipLinkStyle}>
                                        Register
                                    </Link>
                                </>
                            )}
                        </>
                    )}
                </nav>
            </header>

            <div style={ls.content}>{children}</div>

            <footer style={ls.footer}>
                <p style={ls.footerText}>
                    Snack Smart © 2026. All rights reserved.
                    {!showStaffNav ? (
                        <>
                            {" · "}
                            <Link
                                to="/login"
                                style={{
                                    color: t.textDim,
                                    fontWeight: 600,
                                    textDecoration: "none",
                                    borderBottom: `1px solid ${t.border}`,
                                }}
                                title="Canteen staff sign-in"
                            >
                                Canteen staff
                            </Link>
                        </>
                    ) : null}
                </p>
            </footer>
        </div>
    );
}
