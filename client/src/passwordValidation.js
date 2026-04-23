/** Password must be at least 6 characters and include one non-alphanumeric character. */
export function validatePassword(password) {
    const pwd = String(password || "").trim();
    if (pwd.length < 6) {
        return { valid: false, message: "Password must be at least 6 characters long." };
    }
    if (!/[^A-Za-z0-9]/.test(pwd)) {
        return { valid: false, message: "Password must include at least one special character." };
    }
    return { valid: true, message: "" };
}
