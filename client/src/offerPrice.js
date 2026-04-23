/**
 * Extract a percentage value from a discount label for editing (e.g. "15% off" → "15").
 */
export function parsePercentFromDiscountLabel(label) {
    const s = String(label || "").trim();
    const m = s.match(/(\d+(?:\.\d+)?)\s*%/);
    return m ? m[1] : "";
}

/**
 * Build the stored discount label from a numeric percent only (admin enters digits; % is added here).
 */
export function formatDiscountLabelFromPercent(percentString) {
    const s = String(percentString ?? "").trim().replace(",", ".");
    if (s === "") return "";
    const n = parseFloat(s);
    if (!Number.isFinite(n)) return "";
    return `${n}% off`;
}

/**
 * Derive offer price from list price + discount text (e.g. "15% off", "Rs. 50 off", "LKR 50 off").
 * Returns null if original is missing or discount cannot be interpreted as a price change.
 */
export function computeOfferPriceFromDiscount(originalPrice, discountLabel) {
    if (originalPrice == null || originalPrice === "") return null;
    const o = Number(originalPrice);
    if (!Number.isFinite(o) || o < 0) return null;

    const s = String(discountLabel || "").trim().toLowerCase();
    if (!s) return null;

    // Percentage: "15% off", "15%", "10.5% off"
    const pctMatch = s.match(/(\d+(?:\.\d+)?)\s*%/);
    if (pctMatch) {
        const p = parseFloat(pctMatch[1]);
        if (Number.isFinite(p) && p >= 0 && p <= 100) {
            const out = o * (1 - p / 100);
            return Math.round(out * 100) / 100;
        }
    }

    // Flat currency: rs. 50, lkr 50, rs 50 off
    const flatCur = s.match(/(?:rs\.?|lkr)\s*(\d+(?:\.\d+)?)/i);
    if (flatCur) {
        const off = parseFloat(flatCur[1]);
        if (Number.isFinite(off) && off >= 0) {
            return Math.max(0, Math.round((o - off) * 100) / 100);
        }
    }

    // "50 off" when not already caught as percent
    const flatOff = s.match(/(\d+(?:\.\d+)?)\s*off/);
    if (flatOff && !pctMatch) {
        const off = parseFloat(flatOff[1]);
        if (Number.isFinite(off) && off >= 0) {
            return Math.max(0, Math.round((o - off) * 100) / 100);
        }
    }

    return null;
}
