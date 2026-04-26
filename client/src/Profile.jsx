import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { theme as t } from "./theme";
import { MainLayout } from "./MainLayout";
import { getProfileField, migrateLegacyProfileToUser, setProfileField } from "./profileStorage";
import { clearAllAuth, getAuthEmail, isAuthSession } from "./authSession";
import { api } from "./api";
import { LiveGpsTrackingPanel } from "./LiveGpsTrackingPanel";

function cloneOrderItemsForEdit(items) {
    return (Array.isArray(items) ? items : []).map((i) => ({
        id: i.id,
        name: i.name,
        quantity: Math.max(1, Math.floor(Number(i.quantity) || 1)),
        unitPrice: Number(i.unitPrice) || 0,
        lineTotal: Number(i.lineTotal) || 0,
        image_url: i.image_url || "",
        isOffer: Boolean(i.isOffer),
    }));
}

function recalcDraftLine(line) {
    const q = Math.max(1, Math.floor(Number(line.quantity) || 1));
    const unit = Number(line.unitPrice) || 0;
    const lineTotal = Math.round(unit * q * 100) / 100;
    return { ...line, quantity: q, lineTotal };
}

function draftItemsTotal(draftItems) {
    return draftItems.reduce((s, i) => s + (Number(i.lineTotal) || 0), 0);
}

function studentOrderBadge(row, s) {
    if (row.adminStatus === "rejected") {
        return { label: "Cancelled", style: s.badgeCancelled };
    }
    if (row.adminStatus === "pending_accept") {
        return { label: "Awaiting canteen", style: s.badgePending };
    }
    const st = row.orderStatus || "";
    if (st === "Delivered") {
        return { label: "Delivered", style: s.badgeDelivered };
    }
    if (st === "Cancelled") {
        return { label: "Cancelled", style: s.badgeCancelled };
    }
    if (st === "Out for Delivery") {
        return { label: "Out for delivery", style: s.badgeOutForDelivery };
    }
    if (st === "Ready") {
        return { label: "Ready", style: s.badgeReady };
    }
    if (st === "Preparing") {
        return { label: "Preparing", style: s.badgeProgress };
    }
    if (st === "Accepted") {
        return { label: "Accepted", style: s.badgeProgress };
    }
    if (st === "Pending") {
        return { label: "Processing", style: s.badgePending };
    }
    return { label: st || "Order", style: s.badgeProgress };
}
function sanitizePhone(value) {
    return String(value || "").replace(/\D/g, "").slice(0, 10);
}

function normalizeProfileNameFromStorage(raw) {
    const s = (raw || "").trim();
    if (!s) return "";
    const lower = s.toLowerCase();
    if (lower === "snack mart user" || lower === "snack smart user") return "";
    return s;
}

function validateProfileField(field, value) {
    if (field === "fullName") {
        const v = String(value || "").trim();
        if (v && v.length < 2) return "Full name must be at least 2 characters.";
    }
    if (field === "email") {
        const v = String(value || "").trim();
        if (!v) return "Email is required.";
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return "Enter a valid email address.";
    }
    if (field === "phone") {
        const v = sanitizePhone(value);
        if (v && v.length !== 10) return "Phone number must be exactly 10 digits.";
    }
    return "";
}

function LockIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={t.gold} strokeWidth="2" aria-hidden>
            <rect x="5" y="11" width="14" height="10" rx="2" />
            <path d="M8 11V8a4 4 0 0 1 8 0v3" />
        </svg>
    );
}

function LogoutDoorIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" strokeLinecap="round" />
            <path d="M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function Profile() {
    const navigate = useNavigate();
    const isLoggedIn = isAuthSession();
    const accountEmail = getAuthEmail();
    migrateLegacyProfileToUser(accountEmail);

    const storedEmail = accountEmail || "guest@snacksmart.com";
    const [profileImage, setProfileImage] = useState(() => getProfileField(accountEmail, "profileImage") || "");
    const [fullName, setFullName] = useState(() => {
        const raw = getProfileField(accountEmail, "profileFullName");
        const normalized = normalizeProfileNameFromStorage(raw);
        if (raw && normalized === "" && raw.trim()) {
            setProfileField(accountEmail, "profileFullName", "");
        }
        return normalized;
    });
    const [email, setEmail] = useState(() => getProfileField(accountEmail, "profileEmail") || storedEmail);
    const [phoneNumber, setPhoneNumber] = useState(() =>
        sanitizePhone(getProfileField(accountEmail, "profilePhoneNumber"))
    );
    const [dietPreference, setDietPreference] = useState(
        () => getProfileField(accountEmail, "profileDietPreference") || "No Preference"
    );
    const [notificationPreference, setNotificationPreference] = useState(
        () => getProfileField(accountEmail, "profileNotificationPreference") || "Email"
    );
    const [fieldUnlocked, setFieldUnlocked] = useState({
        fullName: false,
        email: false,
        phone: false,
    });
    const [fieldErrors, setFieldErrors] = useState({
        fullName: "",
        email: "",
        phone: "",
    });
    const [profileDraftSnapshot, setProfileDraftSnapshot] = useState({
        fullName: "",
        email: "",
        phone: "",
    });
    const [profileStatus, setProfileStatus] = useState("");
    const [myOrders, setMyOrders] = useState([]);
    const [ordersLoading, setOrdersLoading] = useState(false);
    const [ordersError, setOrdersError] = useState("");
    const [ordersRefreshKey, setOrdersRefreshKey] = useState(0);
    const [expandedPendingId, setExpandedPendingId] = useState(null);
    const [pendingDraft, setPendingDraft] = useState(null);
    const [pendingActionError, setPendingActionError] = useState("");
    const [pendingSavingId, setPendingSavingId] = useState(null);
    const [pendingCancellingId, setPendingCancellingId] = useState(null);
    const [gpsSelectedOrderId, setGpsSelectedOrderId] = useState(null);

    const fullNameRef = useRef(null);
    const emailRef = useRef(null);
    const phoneRef = useRef(null);

    const handleLogout = () => {
        clearAllAuth();
        navigate("/login");
    };

    const unlockAndFocus = (field, ref) => {
        setProfileDraftSnapshot({ fullName, email, phone: phoneNumber });
        setFieldErrors((prev) => ({ ...prev, [field]: "" }));
        setProfileStatus("");
        setFieldUnlocked((prev) => ({ ...prev, [field]: true }));
        setTimeout(() => ref.current?.focus(), 0);
    };

    const cancelFieldEdit = (field) => {
        if (field === "fullName") setFullName(profileDraftSnapshot.fullName);
        if (field === "email") setEmail(profileDraftSnapshot.email);
        if (field === "phone") setPhoneNumber(sanitizePhone(profileDraftSnapshot.phone));
        setFieldErrors((prev) => ({ ...prev, [field]: "" }));
        setFieldUnlocked((prev) => ({ ...prev, [field]: false }));
    };

    const saveFieldEdit = (field) => {
        const valueByField = {
            fullName,
            email,
            phone: phoneNumber,
        };
        const err = validateProfileField(field, valueByField[field]);
        if (err) {
            setFieldErrors((prev) => ({ ...prev, [field]: err }));
            return;
        }
        if (field === "fullName") {
            const normalized = normalizeProfileNameFromStorage(fullName);
            setFullName(normalized);
            setProfileDraftSnapshot((prev) => ({ ...prev, fullName: normalized }));
        }
        if (field === "phone") {
            const phone = sanitizePhone(phoneNumber);
            setPhoneNumber(phone);
            setProfileDraftSnapshot((prev) => ({ ...prev, phone }));
        }
        if (field === "email") {
            setEmail(String(email || "").trim());
            setProfileDraftSnapshot((prev) => ({ ...prev, email: String(email || "").trim() }));
        }
        setFieldErrors((prev) => ({ ...prev, [field]: "" }));
        setFieldUnlocked((prev) => ({ ...prev, [field]: false }));
    };

    const handleSaveProfile = async (e) => {
        e.preventDefault();
        const nameToSave = normalizeProfileNameFromStorage(fullName);
        const emailToSave = String(email || "").trim();
        const phoneToSave = sanitizePhone(phoneNumber);

        const nextErrors = {
            fullName: validateProfileField("fullName", nameToSave),
            email: validateProfileField("email", emailToSave),
            phone: validateProfileField("phone", phoneToSave),
        };
        setFieldErrors(nextErrors);
        if (nextErrors.fullName || nextErrors.email || nextErrors.phone) {
            setProfileStatus("Please fix the highlighted fields before saving.");
            return;
        }

        setFullName(nameToSave);
        setEmail(emailToSave);
        setPhoneNumber(phoneToSave);
        if (nameToSave) {
            setProfileField(accountEmail, "profileFullName", nameToSave);
        } else {
            setProfileField(accountEmail, "profileFullName", "");
        }
        setProfileField(accountEmail, "profileEmail", emailToSave);
        setProfileField(accountEmail, "profilePhoneNumber", phoneToSave);
        setFieldUnlocked({
            fullName: false,
            email: false,
            phone: false,
        });
        setProfileDraftSnapshot({ fullName: nameToSave, email: emailToSave, phone: phoneToSave });
        try {
            if (isLoggedIn && accountEmail) {
                await api.patch("/profile", {
                    accountEmail,
                    fullName: nameToSave,
                    email: emailToSave,
                    phoneNumber: phoneToSave,
                    profileImage,
                });
            }
            setProfileStatus("Profile saved.");
        } catch (err) {
            setProfileStatus(
                err.response?.data?.message || "Saved locally, but could not sync to server right now."
            );
        }
    };

    const handleSavePreferences = async (e) => {
        e.preventDefault();
        setProfileField(accountEmail, "profileDietPreference", dietPreference);
        setProfileField(accountEmail, "profileNotificationPreference", notificationPreference);
        try {
            if (isLoggedIn && accountEmail) {
                await api.patch("/profile", {
                    accountEmail,
                    dietPreference,
                    notificationPreference,
                });
            }
            setProfileStatus("Preferences updated.");
        } catch (err) {
            setProfileStatus(
                err.response?.data?.message || "Preferences saved locally, but server sync failed."
            );
        }
    };

    const handleImageChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => {
            const imageData = reader.result;
            if (typeof imageData === "string") {
                setProfileImage(imageData);
                setProfileField(accountEmail, "profileImage", imageData);
                window.dispatchEvent(
                    new CustomEvent("ss-profile-image-updated", { detail: { email: accountEmail, image: imageData } })
                );
                if (isLoggedIn && accountEmail) {
                    api.patch("/profile", { accountEmail, profileImage: imageData }).catch(() => {});
                }
            }
        };
        reader.readAsDataURL(file);
    };

    const handleRemovePhoto = () => {
        setProfileImage("");
        setProfileField(accountEmail, "profileImage", "");
        window.dispatchEvent(
            new CustomEvent("ss-profile-image-updated", { detail: { email: accountEmail, image: "" } })
        );
        if (isLoggedIn && accountEmail) {
            api.patch("/profile", { accountEmail, profileImage: "" }).catch(() => {});
        }
    };

    const bumpOrdersRefresh = useCallback(() => {
        setOrdersRefreshKey((k) => k + 1);
    }, []);

    useEffect(() => {
        if (!isLoggedIn || !accountEmail) return;
        let cancelled = false;
        (async () => {
            try {
                const { data } = await api.get("/profile", { params: { accountEmail } });
                const profile = data?.profile || {};
                if (cancelled) return;
                const name = normalizeProfileNameFromStorage(profile.fullName || "");
                const em = String(profile.email || storedEmail).trim();
                const phone = sanitizePhone(profile.phoneNumber || "");
                const image = String(profile.profileImage || "");
                const diet = String(profile.dietPreference || "No Preference");
                const notify = String(profile.notificationPreference || "Email");
                setFullName(name);
                setEmail(em);
                setPhoneNumber(phone);
                setProfileImage(image);
                setDietPreference(diet);
                setNotificationPreference(notify);
                setProfileDraftSnapshot({ fullName: name, email: em, phone });
                setProfileField(accountEmail, "profileFullName", name);
                setProfileField(accountEmail, "profileEmail", em);
                setProfileField(accountEmail, "profilePhoneNumber", phone);
                setProfileField(accountEmail, "profileImage", image);
                setProfileField(accountEmail, "profileDietPreference", diet);
                setProfileField(accountEmail, "profileNotificationPreference", notify);
                window.dispatchEvent(
                    new CustomEvent("ss-profile-image-updated", { detail: { email: accountEmail, image } })
                );
                setProfileStatus("");
            } catch {
                if (!cancelled) {
                    setProfileStatus("Using local profile data. Server profile unavailable.");
                }
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [isLoggedIn, accountEmail, storedEmail]);

    useEffect(() => {
        if (!isLoggedIn || !accountEmail) {
            setMyOrders([]);
            setOrdersError("");
            setOrdersLoading(false);
            return;
        }
        let cancelled = false;
        (async () => {
            setOrdersLoading(true);
            setOrdersError("");
            try {
                const { data } = await api.get("/orders/mine", { params: { email: accountEmail } });
                if (!cancelled) {
                    setMyOrders(Array.isArray(data) ? data : []);
                }
            } catch (e) {
                if (!cancelled) {
                    setMyOrders([]);
                    setOrdersError(
                        e.response?.data?.message ||
                            (e.response ? "Could not load orders." : "Network error — is the API running?")
                    );
                }
            } finally {
                if (!cancelled) {
                    setOrdersLoading(false);
                }
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [isLoggedIn, accountEmail, ordersRefreshKey]);

    const pendingPurchases = myOrders.filter((o) => o.adminStatus === "pending_accept");

    useEffect(() => {
        if (!expandedPendingId) return;
        const stillPending = myOrders.some((o) => o.id === expandedPendingId && o.adminStatus === "pending_accept");
        if (!stillPending) {
            setExpandedPendingId(null);
            setPendingDraft(null);
            setPendingActionError("");
        }
    }, [myOrders, expandedPendingId]);

    const openPendingEditor = (row) => {
        setPendingActionError("");
        setExpandedPendingId(row.id);
        setPendingDraft({
            orderId: row.id,
            items: cloneOrderItemsForEdit(row.items),
            orderNote: row.orderNote || "",
        });
    };

    const closePendingEditor = () => {
        setExpandedPendingId(null);
        setPendingDraft(null);
        setPendingActionError("");
    };

    const updateDraftQty = (lineId, delta) => {
        setPendingDraft((d) => {
            if (!d) return d;
            const next = d.items.map((line) => {
                if (line.id !== lineId) return line;
                const q = Math.max(0, Math.floor(Number(line.quantity) || 0) + delta);
                return recalcDraftLine({ ...line, quantity: q });
            });
            const positive = next.filter((l) => l.quantity > 0);
            const merged = positive.length === 0 ? [recalcDraftLine({ ...d.items[0], quantity: 1 })] : positive;
            return { ...d, items: merged };
        });
    };

    const removeDraftLine = (lineId) => {
        setPendingDraft((d) => {
            if (!d || d.items.length <= 1) return d;
            return { ...d, items: d.items.filter((l) => l.id !== lineId).map((l) => recalcDraftLine(l)) };
        });
    };

    const savePendingEdits = async () => {
        if (!pendingDraft || !accountEmail) return;
        setPendingSavingId(pendingDraft.orderId);
        setPendingActionError("");
        try {
            await api.patch(`/orders/${pendingDraft.orderId}/pending`, {
                email: accountEmail,
                items: pendingDraft.items.map((l) => ({
                    id: l.id,
                    name: l.name,
                    quantity: l.quantity,
                    unitPrice: l.unitPrice,
                    lineTotal: l.lineTotal,
                    image_url: l.image_url || "",
                    isOffer: l.isOffer,
                })),
                orderNote: pendingDraft.orderNote,
            });
            bumpOrdersRefresh();
            closePendingEditor();
        } catch (e) {
            const msg = e.response?.data?.message;
            setPendingActionError(typeof msg === "string" ? msg : "Could not save changes.");
        } finally {
            setPendingSavingId(null);
        }
    };

    const cancelPendingOrder = async (orderId) => {
        if (!accountEmail) return;
        const ok = window.confirm(
            "Cancel this order? Your items go back in stock and the canteen will not see this order anymore."
        );
        if (!ok) return;
        setPendingCancellingId(orderId);
        setPendingActionError("");
        try {
            await api.post(`/orders/${orderId}/cancel-pending`, { email: accountEmail });
            if (expandedPendingId === orderId) {
                closePendingEditor();
            }
            bumpOrdersRefresh();
        } catch (e) {
            const msg = e.response?.data?.message;
            setPendingActionError(typeof msg === "string" ? msg : "Could not cancel order.");
        } finally {
            setPendingCancellingId(null);
        }
    };

    const orderPreview = myOrders.slice(0, 6);

    const autoGpsOrder = useMemo(() => {
        if (!myOrders.length) return null;
        const out = myOrders.find((o) => o.adminStatus === "accepted" && o.orderStatus === "Out for Delivery");
        if (out) return out;
        return myOrders.find((o) => o.adminStatus === "accepted" && o.orderStatus === "Delivered") || null;
    }, [myOrders]);

    const gpsTrackingOrder = useMemo(() => {
        if (!myOrders.length) return null;
        if (gpsSelectedOrderId) {
            const pick = myOrders.find((o) => o.id === gpsSelectedOrderId);
            if (pick) return pick;
        }
        return autoGpsOrder;
    }, [myOrders, gpsSelectedOrderId, autoGpsOrder]);

    const gpsRiderDisplayName = useMemo(() => {
        if (!gpsTrackingOrder) return "Rider";
        const rn =
            (gpsTrackingOrder.riderName && String(gpsTrackingOrder.riderName).trim()) ||
            (gpsTrackingOrder.rider && gpsTrackingOrder.rider !== "—" ? String(gpsTrackingOrder.rider).trim() : "");
        return rn || "Rider";
    }, [gpsTrackingOrder]);

    const selectOrderForGps = (orderId) => {
        setGpsSelectedOrderId(orderId);
        document.getElementById("live-gps")?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    return (
        <MainLayout>
            <div style={styles.profileShell}>
                <div style={styles.wrapper}>
                    <header style={styles.pageHeader}>
                        <h1 style={styles.pageTitle}>My Account</h1>
                        <p style={styles.pageSubtitle}>Manage your profile and dining preferences</p>
                    </header>

                    <div style={styles.layoutRow}>
                        <div style={styles.leftColumn}>
                            <div style={styles.card}>
                                <div style={styles.cardHeaderRow}>
                                    <div style={styles.cardHeaderAvatar}>
                                        {profileImage ? (
                                            <img src={profileImage} alt="" style={styles.avatarSmall} />
                                        ) : (
                                            <div style={styles.avatarSmallPlaceholder} aria-hidden />
                                        )}
                                    </div>
                                    <div style={styles.cardHeaderText}>
                                        <h2 style={styles.cardTitle}>Profile picture</h2>
                                        <p style={styles.cardSubtitle}>Upload or change your photo for your account</p>
                                    </div>
                                </div>

                                <div style={styles.avatarToolbar}>
                                    <label style={styles.uploadLabel}>
                                        Upload photo
                                        <input type="file" accept="image/*" onChange={handleImageChange} style={styles.hiddenInput} />
                                    </label>
                                    {profileImage ? (
                                        <button type="button" onClick={handleRemovePhoto} style={styles.removePhotoBtn}>
                                            Remove
                                        </button>
                                    ) : null}
                                </div>

                                <form onSubmit={handleSaveProfile}>
                                    <div style={styles.fieldBlock}>
                                        <label style={styles.labelUpper}>Full name</label>
                                        <div style={styles.inputRow}>
                                            <input
                                                ref={fullNameRef}
                                                type="text"
                                                value={fullName}
                                                onChange={(e) => setFullName(e.target.value)}
                                                readOnly={!fieldUnlocked.fullName}
                                                style={{
                                                    ...styles.inputField,
                                                    ...(fieldUnlocked.fullName ? {} : styles.inputLocked),
                                                }}
                                                placeholder="Your full name"
                                            />
                                            <div style={styles.fieldActionRow}>
                                                {!fieldUnlocked.fullName ? (
                                                    <button
                                                        type="button"
                                                        style={styles.fieldEditBtn}
                                                        aria-label="Edit full name"
                                                        onClick={() => unlockAndFocus("fullName", fullNameRef)}
                                                    >
                                                        Edit
                                                    </button>
                                                ) : (
                                                    <>
                                                        <button
                                                            type="button"
                                                            style={styles.fieldSaveBtn}
                                                            onClick={() => saveFieldEdit("fullName")}
                                                        >
                                                            Save
                                                        </button>
                                                        <button
                                                            type="button"
                                                            style={styles.fieldCancelBtn}
                                                            onClick={() => cancelFieldEdit("fullName")}
                                                        >
                                                            Cancel
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        {fieldErrors.fullName ? (
                                            <p style={styles.fieldErrorText} role="alert">
                                                {fieldErrors.fullName}
                                            </p>
                                        ) : null}
                                    </div>

                                    <div style={styles.fieldBlock}>
                                        <label style={styles.labelUpper}>Email address</label>
                                        <div style={styles.inputRow}>
                                            <input
                                                ref={emailRef}
                                                type="email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                readOnly={!fieldUnlocked.email}
                                                style={{
                                                    ...styles.inputField,
                                                    ...(fieldUnlocked.email ? {} : styles.inputLocked),
                                                }}
                                                required
                                            />
                                            <div style={styles.fieldActionRow}>
                                                {!fieldUnlocked.email ? (
                                                    <button
                                                        type="button"
                                                        style={styles.fieldEditBtn}
                                                        aria-label="Edit email"
                                                        onClick={() => unlockAndFocus("email", emailRef)}
                                                    >
                                                        Edit
                                                    </button>
                                                ) : (
                                                    <>
                                                        <button
                                                            type="button"
                                                            style={styles.fieldSaveBtn}
                                                            onClick={() => saveFieldEdit("email")}
                                                        >
                                                            Save
                                                        </button>
                                                        <button
                                                            type="button"
                                                            style={styles.fieldCancelBtn}
                                                            onClick={() => cancelFieldEdit("email")}
                                                        >
                                                            Cancel
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        {fieldErrors.email ? (
                                            <p style={styles.fieldErrorText} role="alert">
                                                {fieldErrors.email}
                                            </p>
                                        ) : null}
                                    </div>

                                    <div style={styles.fieldBlock}>
                                        <label style={styles.labelUpper}>Phone number</label>
                                        <div style={styles.inputRow}>
                                            <input
                                                ref={phoneRef}
                                                type="tel"
                                                inputMode="numeric"
                                                autoComplete="tel"
                                                maxLength={10}
                                                value={phoneNumber}
                                                onChange={(e) => setPhoneNumber(sanitizePhone(e.target.value))}
                                                readOnly={!fieldUnlocked.phone}
                                                style={{
                                                    ...styles.inputField,
                                                    ...(fieldUnlocked.phone ? {} : styles.inputLocked),
                                                }}
                                                placeholder="10 digit number"
                                            />
                                            <div style={styles.fieldActionRow}>
                                                {!fieldUnlocked.phone ? (
                                                    <button
                                                        type="button"
                                                        style={styles.fieldEditBtn}
                                                        aria-label="Edit phone number"
                                                        onClick={() => unlockAndFocus("phone", phoneRef)}
                                                    >
                                                        Edit
                                                    </button>
                                                ) : (
                                                    <>
                                                        <button
                                                            type="button"
                                                            style={styles.fieldSaveBtn}
                                                            onClick={() => saveFieldEdit("phone")}
                                                        >
                                                            Save
                                                        </button>
                                                        <button
                                                            type="button"
                                                            style={styles.fieldCancelBtn}
                                                            onClick={() => cancelFieldEdit("phone")}
                                                        >
                                                            Cancel
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        {fieldErrors.phone ? (
                                            <p style={styles.fieldErrorText} role="alert">
                                                {fieldErrors.phone}
                                            </p>
                                        ) : null}
                                    </div>

                                    <div style={styles.securityBar}>
                                        <div style={styles.securityBarLeft}>
                                            <LockIcon />
                                            <span style={styles.securityBarLabel}>Security</span>
                                        </div>
                                        <div style={styles.securityBarField}>
                                            <input
                                                type="password"
                                                readOnly
                                                value=""
                                                onChange={() => {}}
                                                style={{
                                                    ...styles.inputFieldBare,
                                                    ...styles.inputLocked,
                                                }}
                                                placeholder="Tap Update to change password"
                                                autoComplete="off"
                                            />
                                            <button
                                                type="button"
                                                style={styles.updateNowBtn}
                                                onClick={() =>
                                                    navigate("/reset-password", {
                                                        state: { email: (accountEmail || email || "").trim() },
                                                    })
                                                }
                                            >
                                                Update
                                            </button>
                                        </div>
                                    </div>

                                    <div
                                        style={{
                                            ...styles.saveRow,
                                            justifyContent: "space-between",
                                        }}
                                    >
                                        <button type="button" style={styles.logoutPill} onClick={handleLogout}>
                                            <LogoutDoorIcon />
                                            Logout
                                        </button>
                                        <button type="submit" style={styles.primaryBtnGradient}>
                                            Save profile changes
                                        </button>
                                    </div>
                                    {profileStatus ? (
                                        <p style={styles.profileStatusText} role="status">
                                            {profileStatus}
                                        </p>
                                    ) : null}
                                </form>
                            </div>

                            {isLoggedIn ? (
                                <div id="live-gps" style={{ ...styles.liveGpsSection, scrollMarginTop: "88px" }}>
                                    <div style={styles.liveGpsSectionHeader}>
                                        <h2 style={styles.cardTitle}>Live GPS tracking</h2>
                                        <p style={styles.cardSubtitle}>
                                            Tap an order in <strong style={{ color: t.text }}>Order history</strong> on the
                                            right to show that order&apos;s map here — stay on your profile, no admin pages.
                                        </p>
                                    </div>
                                    {ordersLoading && myOrders.length === 0 ? (
                                        <div style={{ ...styles.card, padding: "20px" }}>
                                            <p style={{ margin: 0, color: t.textMuted, fontSize: "14px" }}>
                                                Loading your orders…
                                            </p>
                                        </div>
                                    ) : (
                                        <LiveGpsTrackingPanel
                                            compact
                                            orderStatus={gpsTrackingOrder?.orderStatus || "Pending"}
                                            adminStatus={gpsTrackingOrder?.adminStatus || ""}
                                            riderDisplayName={gpsRiderDisplayName}
                                            trackedOrderDisplayId={gpsTrackingOrder?.displayId || null}
                                            ordersBackTo="/profile#live-gps"
                                        />
                                    )}
                                </div>
                            ) : (
                                <div style={{ ...styles.card, ...styles.liveGpsWrap, marginTop: "20px" }}>
                                    <h2 style={styles.cardTitle}>Live GPS tracking</h2>
                                    <p style={{ ...styles.cardSubtitle, marginBottom: 0 }}>
                                        Log in to see delivery tracking for your active orders on your profile.
                                    </p>
                                </div>
                            )}
                        </div>

                        <div style={styles.rightColumn}>
                            <div style={{ ...styles.card, ...styles.preferencesCard }}>
                                <div style={styles.cardHeaderTextOnly}>
                                    <h3 style={styles.cardTitleSmall}>Dining preferences</h3>
                                    <p style={styles.cardSubtitleSmall}>Meal and notification settings</p>
                                </div>
                                <form onSubmit={handleSavePreferences}>
                                    <div style={styles.prefGrid}>
                                        <div>
                                            <label style={styles.labelUpper}>Meal preference</label>
                                            <select
                                                value={dietPreference}
                                                onChange={(e) => setDietPreference(e.target.value)}
                                                style={styles.selectField}
                                            >
                                                <option>No Preference</option>
                                                <option>Vegetarian</option>
                                                <option>Non Vegetarian</option>
                                                <option>Vegan</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label style={styles.labelUpper}>Notification style</label>
                                            <select
                                                value={notificationPreference}
                                                onChange={(e) => setNotificationPreference(e.target.value)}
                                                style={styles.selectField}
                                            >
                                                <option>Email</option>
                                                <option>SMS</option>
                                                <option>Push Notification</option>
                                            </select>
                                        </div>
                                    </div>
                                    <button type="submit" style={styles.outlinedBtn}>
                                        Save preferences
                                    </button>
                                </form>
                            </div>

                            <div
                                id="pending-orders"
                                style={{ ...styles.card, ...styles.pendingPurchasesCard, scrollMarginTop: "88px" }}
                            >
                                <div style={styles.cardHeaderTextOnly}>
                                    <h3 style={styles.cardTitleSmall}>Awaiting canteen</h3>
                                    <p style={styles.cardSubtitleSmall}>
                                        Purchases you can edit or cancel until the canteen accepts or rejects them.
                                    </p>
                                </div>
                                {!isLoggedIn ? (
                                    <p style={{ ...styles.orderMeta, fontSize: "14px", color: t.textMuted, margin: 0 }}>
                                        Log in to manage orders after checkout.
                                    </p>
                                ) : ordersLoading && pendingPurchases.length === 0 && !ordersError ? (
                                    <p style={{ ...styles.orderMeta, fontSize: "14px", color: t.textMuted, margin: 0 }}>
                                        Loading…
                                    </p>
                                ) : ordersError ? (
                                    <p style={{ ...styles.orderMeta, fontSize: "13px", color: "#f87171", margin: 0 }} role="alert">
                                        {ordersError}
                                    </p>
                                ) : pendingPurchases.length === 0 ? (
                                    <p style={{ ...styles.orderMeta, fontSize: "14px", color: t.textMuted, margin: 0 }}>
                                        No orders waiting on the canteen. After checkout, they appear here until accepted or
                                        rejected.
                                    </p>
                                ) : (
                                    <div style={styles.orderList}>
                                        {pendingActionError ? (
                                            <p
                                                style={{
                                                    margin: "0 0 12px",
                                                    fontSize: "13px",
                                                    color: "#f87171",
                                                    fontWeight: 600,
                                                }}
                                                role="alert"
                                            >
                                                {pendingActionError}
                                            </p>
                                        ) : null}
                                        {pendingPurchases.map((row) => {
                                            const isOpen = expandedPendingId === row.id;
                                            const isSaving = pendingSavingId === row.id;
                                            const isCancelling = pendingCancellingId === row.id;
                                            const busy = isSaving || isCancelling;
                                            return (
                                                <div key={row.id} style={styles.pendingPurchaseBlock}>
                                                    <div style={styles.pendingPurchaseTop}>
                                                        <div>
                                                            <div style={styles.orderId}>Order {row.displayId}</div>
                                                            <div style={styles.orderMeta}>
                                                                Rs. {Number(row.amount).toFixed(2)}
                                                            </div>
                                                            <div style={styles.orderPlacedSub}>{row.placedAtLabel || "—"}</div>
                                                        </div>
                                                        <span style={styles.badgePending}>Awaiting canteen</span>
                                                    </div>
                                                    <p style={styles.pendingItemsPreview}>{row.itemsSummary || "—"}</p>
                                                    <div style={styles.pendingActionsRow}>
                                                        <button
                                                            type="button"
                                                            disabled={busy}
                                                            onClick={() => (isOpen ? closePendingEditor() : openPendingEditor(row))}
                                                            style={{
                                                                ...styles.pendingActionBtn,
                                                                ...(busy ? styles.pendingActionBtnDisabled : {}),
                                                            }}
                                                        >
                                                            {isOpen ? "Close editor" : "Edit items & note"}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            disabled={busy}
                                                            onClick={() => cancelPendingOrder(row.id)}
                                                            style={{
                                                                ...styles.pendingCancelBtn,
                                                                ...(busy ? styles.pendingActionBtnDisabled : {}),
                                                            }}
                                                        >
                                                            {isCancelling ? "Cancelling…" : "Cancel order"}
                                                        </button>
                                                    </div>
                                                    {isOpen && pendingDraft && pendingDraft.orderId === row.id ? (
                                                        <div style={styles.pendingEditor}>
                                                            <p style={styles.labelUpper}>Items</p>
                                                            <ul style={styles.pendingEditorList}>
                                                                {pendingDraft.items.map((line) => (
                                                                    <li key={line.id} style={styles.pendingEditorLine}>
                                                                        <div style={{ minWidth: 0, flex: "1 1 auto" }}>
                                                                            <div style={styles.pendingLineName}>{line.name}</div>
                                                                            <div style={styles.pendingLineSub}>
                                                                                Rs. {Number(line.unitPrice).toFixed(2)} each
                                                                            </div>
                                                                        </div>
                                                                        <div style={styles.qtyRow}>
                                                                            <button
                                                                                type="button"
                                                                                disabled={busy}
                                                                                style={styles.qtyBtn}
                                                                                onClick={() => updateDraftQty(line.id, -1)}
                                                                                aria-label="Decrease quantity"
                                                                            >
                                                                                −
                                                                            </button>
                                                                            <span style={styles.qtyValue}>{line.quantity}</span>
                                                                            <button
                                                                                type="button"
                                                                                disabled={busy}
                                                                                style={styles.qtyBtn}
                                                                                onClick={() => updateDraftQty(line.id, 1)}
                                                                                aria-label="Increase quantity"
                                                                            >
                                                                                +
                                                                            </button>
                                                                            {pendingDraft.items.length > 1 ? (
                                                                                <button
                                                                                    type="button"
                                                                                    disabled={busy}
                                                                                    style={styles.removeLineBtn}
                                                                                    onClick={() => removeDraftLine(line.id)}
                                                                                >
                                                                                    Remove
                                                                                </button>
                                                                            ) : null}
                                                                        </div>
                                                                        <div style={styles.pendingLineTotal}>
                                                                            Rs. {Number(line.lineTotal).toFixed(2)}
                                                                        </div>
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                            <div style={styles.pendingDraftTotalRow}>
                                                                <span style={styles.pendingDraftTotalLabel}>New total</span>
                                                                <span style={styles.pendingDraftTotalValue}>
                                                                    Rs. {draftItemsTotal(pendingDraft.items).toFixed(2)}
                                                                </span>
                                                            </div>
                                                            <label style={styles.labelUpper}>Order note</label>
                                                            <textarea
                                                                value={pendingDraft.orderNote}
                                                                onChange={(e) =>
                                                                    setPendingDraft((d) =>
                                                                        d ? { ...d, orderNote: e.target.value } : d
                                                                    )
                                                                }
                                                                rows={3}
                                                                placeholder="Special instructions…"
                                                                style={styles.pendingNoteArea}
                                                            />
                                                            <div style={styles.pendingSaveRow}>
                                                                <button
                                                                    type="button"
                                                                    disabled={busy}
                                                                    onClick={savePendingEdits}
                                                                    style={{
                                                                        ...styles.primaryBtnGradient,
                                                                        opacity: busy ? 0.6 : 1,
                                                                        cursor: busy ? "not-allowed" : "pointer",
                                                                    }}
                                                                >
                                                                    {isSaving ? "Saving…" : "Save changes"}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : null}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            <div id="orders" style={{ ...styles.card, ...styles.orderHistoryCard, scrollMarginTop: "88px" }}>
                                <div style={styles.orderHistoryHeader}>
                                    <h3 style={styles.cardTitleSmall}>Order history</h3>
                                    <Link to="/my-orders" style={styles.viewAllLink}>
                                        View all
                                    </Link>
                                </div>
                                <div style={styles.orderList}>
                                    {!isLoggedIn ? (
                                        <p style={{ ...styles.orderMeta, fontSize: "14px", color: t.textMuted, margin: 0 }}>
                                            Log in to see orders from checkout.
                                        </p>
                                    ) : ordersLoading ? (
                                        <p style={{ ...styles.orderMeta, fontSize: "14px", color: t.textMuted, margin: 0 }}>
                                            Loading orders…
                                        </p>
                                    ) : ordersError ? (
                                        <p style={{ ...styles.orderMeta, fontSize: "13px", color: "#f87171", margin: 0 }} role="alert">
                                            {ordersError}
                                        </p>
                                    ) : orderPreview.length === 0 ? (
                                        <p style={{ ...styles.orderMeta, fontSize: "14px", color: t.textMuted, margin: 0 }}>
                                            No orders yet. After you checkout, status updates here — including{" "}
                                            <strong style={{ color: t.text }}>Out for delivery</strong> when the canteen sends
                                            your order on the way.
                                        </p>
                                    ) : (
                                        orderPreview.map((row) => {
                                            const { label, style: badgeStyle } = studentOrderBadge(row, styles);
                                            const isGpsSel =
                                                (gpsSelectedOrderId && row.id === gpsSelectedOrderId) ||
                                                (!gpsSelectedOrderId && autoGpsOrder && row.id === autoGpsOrder.id);
                                            return (
                                                <div
                                                    key={row.id}
                                                    role="button"
                                                    tabIndex={0}
                                                    onClick={() => selectOrderForGps(row.id)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === "Enter" || e.key === " ") {
                                                            e.preventDefault();
                                                            selectOrderForGps(row.id);
                                                        }
                                                    }}
                                                    style={{
                                                        ...styles.orderCard,
                                                        ...(isGpsSel ? styles.orderCardGpsSelected : {}),
                                                        cursor: "pointer",
                                                    }}
                                                    aria-label={`Show GPS for order ${row.displayId}`}
                                                >
                                                    <div style={styles.orderCardTop}>
                                                        <span style={styles.orderId}>Order {row.displayId}</span>
                                                        <span style={badgeStyle}>{label}</span>
                                                    </div>
                                                    <div style={styles.orderMeta}>Rs. {Number(row.amount).toFixed(2)}</div>
                                                    <div style={styles.orderPlacedSub}>{row.placedAtLabel || "—"}</div>
                                                    <Link
                                                        to={`/orders/${row.id}`}
                                                        state={{ ordersBackTo: "/profile#orders" }}
                                                        style={styles.orderDetailsLink}
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        Full details
                                                    </Link>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>

                            <div style={styles.supportCard}>
                                <h4 style={styles.supportTitle}>Need help?</h4>
                                <p style={styles.supportText}>Account and order questions — we&apos;re here to assist.</p>
                                <button type="button" style={styles.supportBtn} onClick={() => navigate("/home")}>
                                    Contact support
                                </button>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </MainLayout>
    );
}

const pageBg = "#07080c";
const cardBg = "#12151c";
const inputBg = "#1a1f2a";
const borderSoft = "rgba(249, 200, 81, 0.12)";
const localProfileBackgroundImage = "/profile-bg.jpg";
const fallbackProfileBackgroundImage =
    "https://images.pexels.com/photos/31846553/pexels-photo-31846553.jpeg?auto=compress&cs=tinysrgb&w=1600";

const styles = {
    profileShell: {
        flex: 1,
        width: "100%",
        minHeight: "100%",
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        padding: "28px 20px 48px",
        boxSizing: "border-box",
        backgroundColor: pageBg,
        backgroundImage: `linear-gradient(rgba(7, 8, 12, 0.84), rgba(7, 8, 12, 0.84)), url(${localProfileBackgroundImage}), url(${fallbackProfileBackgroundImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundAttachment: "fixed",
    },
    wrapper: {
        width: "100%",
        maxWidth: "1120px",
    },
    pageHeader: {
        marginBottom: "28px",
    },
    pageTitle: {
        margin: "0 0 8px",
        color: t.text,
        fontWeight: "800",
        fontSize: "clamp(28px, 4vw, 36px)",
        letterSpacing: "-0.03em",
    },
    pageSubtitle: {
        margin: 0,
        color: t.textMuted,
        fontSize: "15px",
        fontWeight: "500",
        maxWidth: "520px",
        lineHeight: 1.5,
    },
    layoutRow: {
        display: "flex",
        gap: "22px",
        alignItems: "flex-start",
        flexWrap: "wrap",
    },
    leftColumn: {
        flex: "1 1 58%",
        minWidth: "min(100%, 360px)",
        display: "flex",
        flexDirection: "column",
        gap: 0,
    },
    liveGpsWrap: {
        marginTop: "20px",
    },
    liveGpsSection: {
        marginTop: "24px",
        width: "100%",
    },
    liveGpsSectionHeader: {
        marginBottom: "14px",
    },
    rightColumn: {
        flex: "1 1 36%",
        minWidth: "min(100%, 300px)",
        display: "flex",
        flexDirection: "column",
        gap: "18px",
    },
    card: {
        width: "100%",
        backgroundColor: cardBg,
        borderRadius: "20px",
        boxShadow: "0 24px 48px rgba(0,0,0,0.45)",
        padding: "26px 26px 24px",
        marginBottom: 0,
        border: `1px solid ${borderSoft}`,
    },
    preferencesCard: {},
    cardHeaderRow: {
        display: "flex",
        alignItems: "center",
        gap: "16px",
        marginBottom: "18px",
    },
    cardHeaderAvatar: {
        flexShrink: 0,
    },
    avatarSmall: {
        width: "64px",
        height: "64px",
        borderRadius: "50%",
        objectFit: "cover",
        border: `2px solid ${t.gold}`,
        display: "block",
    },
    avatarSmallPlaceholder: {
        width: "64px",
        height: "64px",
        borderRadius: "50%",
        border: `2px dashed ${t.border}`,
        backgroundColor: inputBg,
    },
    cardHeaderText: {
        minWidth: 0,
    },
    cardTitle: {
        margin: "0 0 4px",
        color: t.text,
        fontWeight: "700",
        fontSize: "20px",
        letterSpacing: "-0.02em",
    },
    cardSubtitle: {
        margin: 0,
        color: t.textMuted,
        fontSize: "13px",
        lineHeight: 1.45,
    },
    cardHeaderTextOnly: {
        marginBottom: "18px",
    },
    cardTitleSmall: {
        margin: "0 0 4px",
        color: t.text,
        fontWeight: "700",
        fontSize: "17px",
        letterSpacing: "-0.02em",
    },
    cardSubtitleSmall: {
        margin: 0,
        color: t.textMuted,
        fontSize: "12px",
    },
    avatarToolbar: {
        display: "flex",
        flexWrap: "wrap",
        gap: "10px",
        marginBottom: "22px",
    },
    labelUpper: {
        display: "block",
        marginBottom: "8px",
        fontSize: "11px",
        color: t.textDim,
        fontWeight: "700",
        letterSpacing: "0.12em",
        textTransform: "uppercase",
    },
    fieldBlock: {
        marginBottom: "16px",
    },
    inputRow: {
        display: "flex",
        alignItems: "stretch",
        gap: "10px",
    },
    fieldActionRow: {
        display: "flex",
        alignItems: "stretch",
        gap: "8px",
    },
    inputField: {
        flex: 1,
        minWidth: 0,
        border: `1px solid ${t.border}`,
        borderRadius: "12px",
        padding: "12px 14px",
        outline: "none",
        backgroundColor: inputBg,
        color: t.text,
        fontSize: "15px",
        transition: "border-color 0.15s ease",
    },
    inputFieldBare: {
        flex: 1,
        minWidth: 0,
        border: "none",
        backgroundColor: "transparent",
        color: t.text,
        fontSize: "14px",
        padding: "8px 10px",
        outline: "none",
    },
    inputLocked: {
        cursor: "default",
        opacity: 0.88,
        userSelect: "none",
    },
    fieldEditBtn: {
        minWidth: "68px",
        border: `1px solid rgba(249, 200, 81, 0.45)`,
        borderRadius: "12px",
        backgroundColor: "rgba(249, 200, 81, 0.08)",
        color: t.gold,
        cursor: "pointer",
        fontWeight: 700,
        fontSize: "12px",
        letterSpacing: "0.03em",
        fontFamily: "inherit",
        padding: "0 12px",
    },
    fieldSaveBtn: {
        minWidth: "68px",
        border: `1px solid rgba(74, 222, 128, 0.45)`,
        borderRadius: "12px",
        backgroundColor: "rgba(74, 222, 128, 0.12)",
        color: "#4ade80",
        cursor: "pointer",
        fontWeight: 700,
        fontSize: "12px",
        letterSpacing: "0.03em",
        fontFamily: "inherit",
        padding: "0 12px",
    },
    fieldCancelBtn: {
        minWidth: "72px",
        border: `1px solid ${t.border}`,
        borderRadius: "12px",
        backgroundColor: "rgba(0,0,0,0.35)",
        color: t.textMuted,
        cursor: "pointer",
        fontWeight: 700,
        fontSize: "12px",
        letterSpacing: "0.03em",
        fontFamily: "inherit",
        padding: "0 12px",
    },
    fieldErrorText: {
        margin: "8px 2px 0",
        fontSize: "12px",
        color: "#f87171",
        fontWeight: 600,
    },
    securityBar: {
        marginTop: "8px",
        marginBottom: "22px",
        padding: "12px 14px",
        borderRadius: "14px",
        border: `1px solid ${t.border}`,
        backgroundColor: "rgba(0,0,0,0.25)",
    },
    securityBarLeft: {
        display: "flex",
        alignItems: "center",
        gap: "10px",
        marginBottom: "10px",
    },
    securityBarLabel: {
        fontSize: "12px",
        fontWeight: "700",
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        color: t.textMuted,
    },
    securityBarField: {
        display: "flex",
        alignItems: "center",
        gap: "8px",
        backgroundColor: inputBg,
        borderRadius: "12px",
        border: `1px solid ${t.borderSubtle}`,
        overflow: "hidden",
    },
    updateNowBtn: {
        flexShrink: 0,
        border: "none",
        backgroundColor: "transparent",
        color: t.text,
        fontSize: "11px",
        fontWeight: "800",
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        padding: "12px 14px",
        cursor: "pointer",
        borderLeft: `1px solid ${t.borderSubtle}`,
    },
    saveRow: {
        display: "flex",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "12px",
        marginTop: "4px",
    },
    profileStatusText: {
        margin: "12px 2px 0",
        fontSize: "13px",
        color: t.textMuted,
        fontWeight: 600,
    },
    logoutPill: {
        display: "inline-flex",
        alignItems: "center",
        gap: "8px",
        padding: "12px 20px",
        borderRadius: t.radiusPill,
        border: "1px solid rgba(248, 113, 113, 0.55)",
        backgroundColor: "transparent",
        color: "#f87171",
        fontSize: "11px",
        fontWeight: "800",
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        cursor: "pointer",
        fontFamily: "inherit",
    },
    primaryBtnGradient: {
        border: "none",
        background: `linear-gradient(135deg, ${t.gold} 0%, ${t.goldDark} 100%)`,
        color: t.onGold,
        borderRadius: t.radiusPill,
        padding: "14px 28px",
        cursor: "pointer",
        fontWeight: "800",
        fontSize: "14px",
        letterSpacing: "0.02em",
        boxShadow: "0 8px 24px rgba(249, 200, 81, 0.25)",
    },
    prefGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
        gap: "14px",
        marginBottom: "16px",
    },
    selectField: {
        width: "100%",
        border: `1px solid ${t.border}`,
        borderRadius: "12px",
        padding: "12px 14px",
        outline: "none",
        backgroundColor: inputBg,
        color: t.text,
        fontSize: "14px",
        cursor: "pointer",
        appearance: "none",
        backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 12px center",
        paddingRight: "36px",
    },
    outlinedBtn: {
        width: "100%",
        border: `1px solid rgba(249, 200, 81, 0.45)`,
        backgroundColor: "transparent",
        color: t.gold,
        borderRadius: t.radiusPill,
        padding: "12px 18px",
        cursor: "pointer",
        fontWeight: "700",
        fontSize: "13px",
        letterSpacing: "0.04em",
        textTransform: "uppercase",
    },
    orderHistoryHeader: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: "16px",
    },
    viewAllLink: {
        fontSize: "11px",
        fontWeight: "800",
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color: t.gold,
        textDecoration: "none",
    },
    orderList: {
        display: "flex",
        flexDirection: "column",
        gap: "12px",
    },
    orderCard: {
        padding: "14px 16px",
        borderRadius: "14px",
        border: `1px solid ${t.borderSubtle}`,
        backgroundColor: "rgba(0,0,0,0.2)",
    },
    orderCardGpsSelected: {
        borderColor: "rgba(250, 204, 21, 0.55)",
        boxShadow: "0 0 0 1px rgba(250, 204, 21, 0.22)",
    },
    orderDetailsLink: {
        display: "inline-block",
        marginTop: "10px",
        fontSize: "12px",
        fontWeight: 700,
        color: t.gold,
        textDecoration: "none",
    },
    orderCardTop: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "10px",
        marginBottom: "6px",
    },
    orderId: {
        fontSize: "12px",
        color: t.textDim,
        fontWeight: "600",
    },
    orderMeta: {
        fontSize: "18px",
        fontWeight: "700",
        color: t.text,
    },
    orderPlacedSub: {
        fontSize: "11px",
        color: t.textDim,
        marginTop: "6px",
        fontWeight: 600,
    },
    badgeDelivered: {
        fontSize: "10px",
        fontWeight: "800",
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: "#4ade80",
        backgroundColor: "rgba(34, 197, 94, 0.15)",
        border: "1px solid rgba(74, 222, 128, 0.35)",
        padding: "4px 10px",
        borderRadius: t.radiusPill,
    },
    badgeCancelled: {
        fontSize: "10px",
        fontWeight: "800",
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: "#f87171",
        backgroundColor: "rgba(239, 68, 68, 0.12)",
        border: "1px solid rgba(248, 113, 113, 0.35)",
        padding: "4px 10px",
        borderRadius: t.radiusPill,
    },
    badgePending: {
        fontSize: "10px",
        fontWeight: "800",
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: "#fcd34d",
        backgroundColor: "rgba(245, 158, 11, 0.15)",
        border: "1px solid rgba(251, 191, 36, 0.4)",
        padding: "4px 10px",
        borderRadius: t.radiusPill,
    },
    badgeOutForDelivery: {
        fontSize: "10px",
        fontWeight: "800",
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: "#67e8f9",
        backgroundColor: "rgba(34, 211, 238, 0.12)",
        border: "1px solid rgba(103, 232, 249, 0.4)",
        padding: "4px 10px",
        borderRadius: t.radiusPill,
    },
    badgeReady: {
        fontSize: "10px",
        fontWeight: "800",
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: "#a78bfa",
        backgroundColor: "rgba(139, 92, 246, 0.14)",
        border: "1px solid rgba(167, 139, 250, 0.4)",
        padding: "4px 10px",
        borderRadius: t.radiusPill,
    },
    badgeProgress: {
        fontSize: "10px",
        fontWeight: "800",
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: t.textMuted,
        backgroundColor: "rgba(148, 163, 184, 0.12)",
        border: `1px solid ${t.border}`,
        padding: "4px 10px",
        borderRadius: t.radiusPill,
    },
    supportCard: {
        padding: "22px",
        borderRadius: "20px",
        border: `1px solid ${borderSoft}`,
        background: `linear-gradient(165deg, rgba(249, 200, 81, 0.08) 0%, ${cardBg} 55%)`,
    },
    supportTitle: {
        margin: "0 0 8px",
        color: t.text,
        fontSize: "16px",
        fontWeight: "700",
    },
    supportText: {
        margin: "0 0 16px",
        color: t.textMuted,
        fontSize: "13px",
        lineHeight: 1.55,
    },
    supportBtn: {
        width: "100%",
        border: `1px solid ${t.border}`,
        backgroundColor: "rgba(0,0,0,0.35)",
        color: t.text,
        borderRadius: t.radiusPill,
        padding: "12px 18px",
        cursor: "pointer",
        fontWeight: "800",
        fontSize: "11px",
        letterSpacing: "0.14em",
        textTransform: "uppercase",
    },
    uploadLabel: {
        border: `1px solid rgba(249, 200, 81, 0.5)`,
        borderRadius: t.radiusPill,
        padding: "8px 16px",
        cursor: "pointer",
        fontSize: "12px",
        color: t.gold,
        backgroundColor: "rgba(249, 200, 81, 0.08)",
        fontWeight: "700",
        letterSpacing: "0.04em",
    },
    removePhotoBtn: {
        border: `1px solid ${t.border}`,
        borderRadius: t.radiusPill,
        padding: "8px 16px",
        cursor: "pointer",
        fontSize: "12px",
        color: t.textMuted,
        backgroundColor: inputBg,
        fontWeight: "600",
    },
    hiddenInput: {
        display: "none",
    },
    orderHistoryCard: {
        alignSelf: "stretch",
    },
    pendingPurchasesCard: {
        alignSelf: "stretch",
    },
    pendingPurchaseBlock: {
        padding: "14px 16px",
        borderRadius: "14px",
        border: `1px solid ${t.borderSubtle}`,
        backgroundColor: "rgba(0,0,0,0.22)",
        marginBottom: "12px",
    },
    pendingPurchaseTop: {
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: "12px",
        marginBottom: "8px",
    },
    pendingItemsPreview: {
        margin: "0 0 12px",
        fontSize: "13px",
        color: t.textMuted,
        lineHeight: 1.45,
    },
    pendingActionsRow: {
        display: "flex",
        flexWrap: "wrap",
        gap: "10px",
    },
    pendingActionBtn: {
        border: `1px solid rgba(249, 200, 81, 0.45)`,
        backgroundColor: "rgba(249, 200, 81, 0.08)",
        color: t.gold,
        borderRadius: t.radiusPill,
        padding: "10px 16px",
        cursor: "pointer",
        fontWeight: 700,
        fontSize: "12px",
        letterSpacing: "0.04em",
        fontFamily: "inherit",
    },
    pendingCancelBtn: {
        border: "1px solid rgba(248, 113, 113, 0.45)",
        backgroundColor: "rgba(248, 113, 113, 0.08)",
        color: "#f87171",
        borderRadius: t.radiusPill,
        padding: "10px 16px",
        cursor: "pointer",
        fontWeight: 700,
        fontSize: "12px",
        letterSpacing: "0.04em",
        fontFamily: "inherit",
    },
    pendingActionBtnDisabled: {
        opacity: 0.55,
        cursor: "not-allowed",
    },
    pendingEditor: {
        marginTop: "16px",
        paddingTop: "16px",
        borderTop: `1px solid ${t.borderSubtle}`,
    },
    pendingEditorList: {
        listStyle: "none",
        margin: "0 0 12px",
        padding: 0,
        display: "flex",
        flexDirection: "column",
        gap: "10px",
    },
    pendingEditorLine: {
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: "10px 14px",
        padding: "10px 12px",
        borderRadius: "12px",
        backgroundColor: inputBg,
        border: `1px solid ${t.borderSubtle}`,
    },
    pendingLineName: {
        fontSize: "14px",
        fontWeight: 700,
        color: t.text,
    },
    pendingLineSub: {
        fontSize: "12px",
        color: t.textDim,
        marginTop: "2px",
    },
    qtyRow: {
        display: "flex",
        alignItems: "center",
        gap: "8px",
        flexShrink: 0,
    },
    qtyBtn: {
        width: "34px",
        height: "34px",
        borderRadius: "10px",
        border: `1px solid ${t.border}`,
        backgroundColor: "rgba(0,0,0,0.35)",
        color: t.text,
        fontSize: "18px",
        fontWeight: 700,
        cursor: "pointer",
        fontFamily: "inherit",
        lineHeight: 1,
    },
    qtyValue: {
        minWidth: "28px",
        textAlign: "center",
        fontWeight: 800,
        color: t.text,
        fontSize: "15px",
    },
    removeLineBtn: {
        marginLeft: "6px",
        border: "none",
        background: "none",
        color: "#f87171",
        fontSize: "12px",
        fontWeight: 700,
        cursor: "pointer",
        fontFamily: "inherit",
        textDecoration: "underline",
    },
    pendingLineTotal: {
        fontWeight: 800,
        color: t.gold,
        fontSize: "14px",
        marginLeft: "auto",
    },
    pendingDraftTotalRow: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "14px",
        padding: "10px 12px",
        borderRadius: "12px",
        backgroundColor: "rgba(249, 200, 81, 0.08)",
        border: `1px solid rgba(249, 200, 81, 0.2)`,
    },
    pendingDraftTotalLabel: {
        fontSize: "12px",
        fontWeight: 800,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: t.textMuted,
    },
    pendingDraftTotalValue: {
        fontSize: "18px",
        fontWeight: 800,
        color: t.gold,
    },
    pendingNoteArea: {
        width: "100%",
        boxSizing: "border-box",
        marginBottom: "14px",
        borderRadius: "12px",
        border: `1px solid ${t.border}`,
        backgroundColor: inputBg,
        color: t.text,
        padding: "12px 14px",
        fontSize: "14px",
        fontFamily: "inherit",
        resize: "vertical",
        minHeight: "72px",
        outline: "none",
    },
    pendingSaveRow: {
        display: "flex",
        justifyContent: "flex-end",
    },
};

export default Profile;
