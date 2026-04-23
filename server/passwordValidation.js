/** Same rules as client: ≥6 chars and at least one non-alphanumeric. */
function validatePassword(password) {
    const pwd = String(password || "").trim();
    if (pwd.length < 6) {
        return { ok: false, message: "Password must be at least 6 characters long." };
    }
    if (!/[^A-Za-z0-9]/.test(pwd)) {
        return { ok: false, message: "Password must include at least one special character." };
    }
    return { ok: true };
}

module.exports = { validatePassword };
