import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { sumCartTotals } from "./cartPricing";

const STORAGE_KEY = "snackSmartCart:v1";

/** @typedef {{ id: string, name: string, price: number, quantity: number, image_url: string, maxQty: number }} CartLine */

const CartContext = createContext(null);

function readStored() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

export function CartProvider({ children }) {
    const [items, setItems] = useState(() => readStored());

    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
        } catch {
            /* ignore */
        }
    }, [items]);

    const totalCount = useMemo(() => items.reduce((s, x) => s + (x.quantity || 0), 0), [items]);

    const totalPrice = useMemo(() => sumCartTotals(items), [items]);

    /** Add one unit; respects current stock (inventory_count). */
    const addItem = useCallback((food) => {
        const max = Math.max(0, Math.floor(Number(food.inventory_count) || 0));
        if (max <= 0) return;
        setItems((prev) => {
            const i = prev.findIndex((x) => x.id === food.id);
            if (i >= 0) {
                const next = [...prev];
                const q = Math.min(next[i].quantity + 1, max);
                next[i] = {
                    ...next[i],
                    kind: next[i].kind || "food",
                    quantity: q,
                    maxQty: max,
                    price: Number(food.price),
                    name: food.name,
                };
                return next;
            }
            return [
                ...prev,
                {
                    id: food.id,
                    kind: "food",
                    name: food.name,
                    price: Number(food.price),
                    quantity: 1,
                    image_url: food.image_url || "",
                    maxQty: max,
                },
            ];
        });
    }, []);

    /** Add `qtyToAdd` units at once (e.g. home page stepper). Clamped to stock. */
    const addItemQuantity = useCallback((food, qtyToAdd) => {
        const add = Math.max(0, Math.floor(Number(qtyToAdd) || 0));
        if (add <= 0) return;
        const max = Math.max(0, Math.floor(Number(food.inventory_count) || 0));
        if (max <= 0) return;
        setItems((prev) => {
            const i = prev.findIndex((x) => x.id === food.id);
            if (i >= 0) {
                const next = [...prev];
                const q = Math.min(next[i].quantity + add, max);
                next[i] = {
                    ...next[i],
                    kind: next[i].kind || "food",
                    quantity: q,
                    maxQty: max,
                    price: Number(food.price),
                    name: food.name,
                    image_url: food.image_url || next[i].image_url,
                };
                return next;
            }
            const q = Math.min(add, max);
            return [
                ...prev,
                {
                    id: food.id,
                    kind: "food",
                    name: food.name,
                    price: Number(food.price),
                    quantity: q,
                    image_url: food.image_url || "",
                    maxQty: max,
                },
            ];
        });
    }, []);

    /** Homepage offers — cart id prefix `offer:` so it does not clash with food ids. */
    const addOfferQuantity = useCallback((offer, qtyToAdd) => {
        const add = Math.max(0, Math.floor(Number(qtyToAdd) || 0));
        if (add <= 0) return;
        const max = Math.max(0, Math.floor(Number(offer.available_count) || 0));
        if (max <= 0) return;
        const cartId = `offer:${offer.id}`;
        setItems((prev) => {
            const i = prev.findIndex((x) => x.id === cartId);
            if (i >= 0) {
                const next = [...prev];
                const q = Math.min(next[i].quantity + add, max);
                next[i] = {
                    ...next[i],
                    kind: "offer",
                    quantity: q,
                    maxQty: max,
                    name: offer.title,
                    price: 0,
                    discount_label: offer.discount_label,
                    originalPrice:
                        offer.original_price != null && offer.original_price !== ""
                            ? Number(offer.original_price)
                            : next[i].originalPrice ?? null,
                };
                return next;
            }
            const q = Math.min(add, max);
            return [
                ...prev,
                {
                    id: cartId,
                    kind: "offer",
                    name: offer.title,
                    price: 0,
                    quantity: q,
                    image_url: "",
                    maxQty: max,
                    discount_label: offer.discount_label || "",
                    originalPrice:
                        offer.original_price != null && offer.original_price !== ""
                            ? Number(offer.original_price)
                            : null,
                },
            ];
        });
    }, []);

    const setQuantity = useCallback((id, qty) => {
        const q = Math.max(0, Math.floor(Number(qty) || 0));
        setItems((prev) => {
            const i = prev.findIndex((x) => x.id === id);
            if (i < 0) return prev;
            const line = prev[i];
            const cap = Math.max(0, Math.floor(line.maxQty ?? 9999));
            const nextQ = Math.min(q, cap);
            if (nextQ <= 0) {
                return prev.filter((x) => x.id !== id);
            }
            const next = [...prev];
            next[i] = { ...line, quantity: nextQ };
            return next;
        });
    }, []);

    const removeLine = useCallback((id) => {
        setItems((prev) => prev.filter((x) => x.id !== id));
    }, []);

    const clearCart = useCallback(() => setItems([]), []);

    const value = useMemo(
        () => ({
            items,
            totalCount,
            totalPrice,
            addItem,
            addItemQuantity,
            addOfferQuantity,
            setQuantity,
            removeLine,
            clearCart,
        }),
        [items, totalCount, totalPrice, addItem, addItemQuantity, addOfferQuantity, setQuantity, removeLine, clearCart]
    );

    return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
    const ctx = useContext(CartContext);
    if (!ctx) {
        throw new Error("useCart must be used within CartProvider");
    }
    return ctx;
}
