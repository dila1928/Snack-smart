
const LEGACY_KEYS = [
    "profileFullName",
    "profileImage",
    "profilePhoneNumber",
    "profileEmail",
    "profileDietPreference",
    "profileNotificationPreference",
];

function storageKeyForUser(email, field) {
    const e = String(email || "").trim().toLowerCase();
    if (!e) return null;
    return `ss_profile_${encodeURIComponent(e)}_${field}`;
}

export function getProfileField(email, field, fallback = "") {
    const key = storageKeyForUser(email, field);
    if (!key) return fallback;
    const v = localStorage.getItem(key);
    return v != null && v !== "" ? v : fallback;
}

export function setProfileField(email, field, value) {
    const key = storageKeyForUser(email, field);
    if (!key) return;
    if (value === null || value === undefined || value === "") {
        localStorage.removeItem(key);
    } else {
        localStorage.setItem(key, value);
    }
}

/** Old single-key storage — remove so data does not leak between users */
export function clearLegacyGlobalProfileKeys() {
    LEGACY_KEYS.forEach((k) => localStorage.removeItem(k));
}

function hasAnyLegacyProfileData() {
    return LEGACY_KEYS.some((k) => {
        const v = localStorage.getItem(k);
        return v != null && v !== "";
    });
}


export function migrateLegacyProfileToUser(email) {
    const em = String(email || "").trim().toLowerCase();
    if (!em) return;

    const legacyEmail = (localStorage.getItem("profileEmail") || "").trim().toLowerCase();

    if (legacyEmail && legacyEmail === em) {
        LEGACY_KEYS.forEach((field) => {
            const v = localStorage.getItem(field);
            if (v != null && v !== "") {
                const existing = getProfileField(em, field, "");
                if (!existing) {
                    setProfileField(em, field, v);
                }
            }
        });
        clearLegacyGlobalProfileKeys();
        return;
    }

    /* Orphan legacy data (no profileEmail or wrong user) — do not migrate */
    if (legacyEmail && legacyEmail !== em) {
        clearLegacyGlobalProfileKeys();
        return;
    }

    if (!legacyEmail && hasAnyLegacyProfileData()) {
        clearLegacyGlobalProfileKeys();
    }
}

/**
 * Call after successful login: clean up globals that belong to another account
 * or orphans, then migrate for this email if applicable.
 */
export function syncProfileStorageForLogin(email) {
    const em = String(email || "").trim().toLowerCase();
    if (!em) return;
    migrateLegacyProfileToUser(em);
}
