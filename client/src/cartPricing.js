import { computeOfferPriceFromDiscount } from "./offerPrice";

export function isOfferLine(line) {
    return line?.kind === "offer" || String(line?.id || "").startsWith("offer:");
}

/** Unit price in LKR for a cart line (food or computed offer). */
export function getCartLineUnitPrice(line) {
    if (!line) return 0;
    if (isOfferLine(line)) {
        const orig = line.originalPrice ?? line.original_price;
        return computeOfferPriceFromDiscount(orig, line.discount_label) ?? 0;
    }
    return Number(line.price) || 0;
}

export function getCartLineTotal(line) {
    return getCartLineUnitPrice(line) * (Number(line.quantity) || 0);
}

export function sumCartTotals(items) {
    if (!Array.isArray(items)) return 0;
    return items.reduce((s, line) => s + getCartLineTotal(line), 0);
}
