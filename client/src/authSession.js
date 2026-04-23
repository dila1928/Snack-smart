/**
 * Auth state lives in sessionStorage so it does not persist across browser sessions.
 * A new run / new tab shows Login + Register until the user signs in again.
 * (localStorage was keeping "last logged user" forever.)
 */

const KEY_LOGGED_IN = "isLoggedIn";
const KEY_EMAIL = "loggedInUserEmail";
const KEY_ADMIN = "isAdminLoggedIn";
const KEY_ADMIN_USER = "adminUsername";

export function setAuthSession(email) {
    clearAdminSession();
    const e = String(email || "").trim();
    sessionStorage.setItem(KEY_LOGGED_IN, "true");
    sessionStorage.setItem(KEY_EMAIL, e);
    /* Ignore stale keys from older versions */
    try {
        localStorage.removeItem(KEY_LOGGED_IN);
        localStorage.removeItem(KEY_EMAIL);
    } catch {
        /* ignore */
    }
}

export function clearAuthSession() {
    sessionStorage.removeItem(KEY_LOGGED_IN);
    sessionStorage.removeItem(KEY_EMAIL);
    try {
        localStorage.removeItem(KEY_LOGGED_IN);
        localStorage.removeItem(KEY_EMAIL);
    } catch {
        /* ignore */
    }
}

/** Canteen staff session (separate from student login). */
export function setAdminSession(username) {
    clearAuthSession();
    const u = String(username || "").trim();
    sessionStorage.setItem(KEY_ADMIN, "true");
    sessionStorage.setItem(KEY_ADMIN_USER, u || "staff");
}

export function clearAdminSession() {
    sessionStorage.removeItem(KEY_ADMIN);
    sessionStorage.removeItem(KEY_ADMIN_USER);
}

export function isAdminSession() {
    return sessionStorage.getItem(KEY_ADMIN) === "true";
}

export function getAdminUsername() {
    return sessionStorage.getItem(KEY_ADMIN_USER) || "";
}

/** Sign out both student and staff (e.g. profile Logout). */
export function clearAllAuth() {
    clearAuthSession();
    clearAdminSession();
}

export function getAuthEmail() {
    return sessionStorage.getItem(KEY_EMAIL) || "";
}

export function isAuthSession() {
    return sessionStorage.getItem(KEY_LOGGED_IN) === "true";
}

/** Remove old localStorage auth from before sessionStorage migration */
export function clearLegacyAuthFromLocalStorage() {
    try {
        localStorage.removeItem(KEY_LOGGED_IN);
        localStorage.removeItem(KEY_EMAIL);
    } catch {
        /* ignore */
    }
}
