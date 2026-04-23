import { api } from "./api";

const SESSION_KEY = "snacksmart_food_clicks";

function getClickedSet() {
    try {
        const raw = sessionStorage.getItem(SESSION_KEY);
        const arr = raw ? JSON.parse(raw) : [];
        return new Set(Array.isArray(arr) ? arr : []);
    } catch {
        return new Set();
    }
}

function saveClickedSet(set) {
    try {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify([...set]));
    } catch {
        /* ignore */
    }
}

/**
 * Records one click per food item per browser tab session (stops spam).
 * Call this when the user opens/clicks a food card (or similar).
 */
export function trackFoodItemClick(foodId) {
    if (!foodId) return;
    const id = String(foodId);
    const set = getClickedSet();
    if (set.has(id)) return;
    set.add(id);
    saveClickedSet(set);
    api.post(`/food-items/${id}/click`).catch(() => {
        set.delete(id);
        saveClickedSet(set);
    });
}