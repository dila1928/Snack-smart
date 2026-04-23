import React, { useCallback, useEffect, useState } from "react";
import { MainLayout } from "./MainLayout";
import { theme as t } from "./theme";
import { api } from "./api";
import OffersManager from "./OffersManager";

const MAX_STOCK = 100;

const emptyForm = () => ({
    name: "",
    description: "",
    price: "",
    inventory_count: "0",
    category_id: "",
    image_url: "",
    is_available: true,
});

export default function Inventory() {
    const [categories, setCategories] = useState([]);
    const [newCategory, setNewCategory] = useState("");
    const [items, setItems] = useState([]);
    const [form, setForm] = useState(emptyForm);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [editing, setEditing] = useState(null);

    const loadCategories = useCallback(async () => {
        const { data } = await api.get("/categories");
        setCategories(Array.isArray(data) ? data : []);
    }, []);

    const loadItems = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const { data } = await api.get("/food-items");
            setItems(Array.isArray(data) ? data : []);
        } catch (e) {
            setError(e.response?.data?.message || e.message || "Could not load items");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadCategories().catch(() => {});
    }, [loadCategories]);

    useEffect(() => {
        loadItems();
    }, [loadItems]);

    const addCategory = async (e) => {
        e.preventDefault();
        const name = newCategory.trim();
        if (!name) return;
        setSaving(true);
        setError("");
        try {
            await api.post("/categories", { name });
            setNewCategory("");
            await loadCategories();
        } catch (err) {
            setError(err.response?.data?.message || err.message || "Could not add category");
        } finally {
            setSaving(false);
        }
    };

    const deleteCategory = async (id) => {
        if (!window.confirm("Delete this category?")) return;
        setError("");
        try {
            await api.delete(`/categories/${id}`);
            await loadCategories();
            await loadItems();
            if (form.category_id === id) {
                setForm((f) => ({ ...f, category_id: "" }));
            }
        } catch (err) {
            setError(err.response?.data?.message || err.message || "Could not delete category");
        }
    };

    const validateFoodNumbers = () => {
        const priceNum = Number(form.price);
        if (!Number.isFinite(priceNum) || priceNum <= 0) {
            setError("Price must be greater than 0.");
            return false;
        }
        const inv = parseInt(form.inventory_count, 10);
        const invVal = Number.isNaN(inv) ? 0 : inv;
        if (invVal < 0 || invVal > MAX_STOCK) {
            setError(`Stock must be between 0 and ${MAX_STOCK}.`);
            return false;
        }
        return true;
    };

    const onInventoryInput = (raw) => {
        if (raw === "") {
            setForm((f) => ({ ...f, inventory_count: "" }));
            return;
        }
        if (!/^\d+$/.test(raw)) return;
        const n = parseInt(raw, 10);
        if (Number.isNaN(n)) return;
        const clamped = Math.min(MAX_STOCK, Math.max(0, n));
        setForm((f) => ({ ...f, inventory_count: String(clamped) }));
    };

    const createFood = async (e) => {
        e.preventDefault();
        if (!validateFoodNumbers()) return;
        setSaving(true);
        setError("");
        try {
            await api.post("/food-items", {
                name: form.name.trim(),
                description: form.description.trim(),
                price: Number(form.price),
                inventory_count: parseInt(form.inventory_count, 10) || 0,
                category_id: form.category_id,
                image_url: form.image_url.trim(),
                is_available: form.is_available,
            });
            setForm(emptyForm());
            await loadItems();
        } catch (err) {
            setError(err.response?.data?.message || err.message || "Could not create food");
        } finally {
            setSaving(false);
        }
    };

    const startEdit = (item) => {
        setEditing(item.id);
        const inv = Math.min(MAX_STOCK, Math.max(0, Math.floor(Number(item.inventory_count ?? 0))));
        setForm({
            name: item.name,
            description: item.description || "",
            price: String(item.price),
            inventory_count: String(inv),
            category_id: item.category?.id || item.category_id || "",
            image_url: item.image_url || "",
            is_available: !!item.is_available,
        });
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const cancelEdit = () => {
        setEditing(null);
        setForm(emptyForm());
    };

    const updateFood = async (e) => {
        e.preventDefault();
        if (!editing) return;
        if (!validateFoodNumbers()) return;
        setSaving(true);
        setError("");
        try {
            await api.put(`/food-items/${editing}`, {
                name: form.name.trim(),
                description: form.description.trim(),
                price: Number(form.price),
                inventory_count: parseInt(form.inventory_count, 10) || 0,
                category_id: form.category_id,
                image_url: form.image_url.trim(),
                is_available: form.is_available,
            });
            cancelEdit();
            await loadItems();
        } catch (err) {
            setError(err.response?.data?.message || err.message || "Could not update food");
        } finally {
            setSaving(false);
        }
    };

    const deleteFood = async (id) => {
        if (!window.confirm("Delete this food item?")) return;
        setError("");
        try {
            await api.delete(`/food-items/${id}`);
            if (editing === id) cancelEdit();
            await loadItems();
        } catch (err) {
            setError(err.response?.data?.message || err.message || "Could not delete");
        }
    };

    const input = {
        width: "100%",
        padding: "10px 12px",
        borderRadius: t.radiusSm,
        border: `1px solid ${t.border}`,
        backgroundColor: "#ffffff",
        color: "#0f172a",
        fontSize: "15px",
        boxSizing: "border-box",
    };

    const labelStyle = { display: "block", marginBottom: "6px", fontWeight: 600, fontSize: "14px", color: t.text };

    return (
        <MainLayout>
            <div style={{ width: "100%", backgroundColor: t.bg, minHeight: "70vh", padding: "24px 16px 48px" }}>
                <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
                    <h1 style={{ margin: "0 0 24px", fontSize: "28px", fontWeight: 800, color: t.text }}>
                        Admin Food Management
                    </h1>

                    {error ? (
                        <p style={{ color: t.danger, marginBottom: "16px" }} role="alert">
                            {error}
                        </p>
                    ) : null}

                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))",
                            gap: "24px",
                            alignItems: "start",
                        }}
                    >
                        <section
                            style={{
                                backgroundColor: t.surface,
                                borderRadius: t.radius,
                                border: `1px solid ${t.borderSubtle}`,
                                padding: "18px",
                            }}
                        >
                            <h2 style={{ margin: "0 0 14px", fontSize: "18px", color: t.text }}>Categories</h2>
                            <form className="inventory-form" onSubmit={addCategory}>
                                <input
                                    placeholder="e.g. Beverages"
                                    value={newCategory}
                                    onChange={(e) => setNewCategory(e.target.value)}
                                    style={input}
                                    aria-label="New category name"
                                />
                                <button
                                    type="submit"
                                    disabled={saving}
                                    style={{
                                        marginTop: "10px",
                                        width: "100%",
                                        padding: "12px",
                                        borderRadius: t.radiusSm,
                                        border: "none",
                                        backgroundColor: t.gold,
                                        color: t.onGold,
                                        fontWeight: 700,
                                        cursor: "pointer",
                                    }}
                                >
                                    Add Category
                                </button>
                            </form>
                            <ul style={{ listStyle: "none", margin: "16px 0 0", padding: 0, display: "flex", flexDirection: "column", gap: "8px" }}>
                                {categories.map((c) => (
                                    <li
                                        key={c.id}
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "space-between",
                                            gap: "8px",
                                            padding: "10px 12px",
                                            borderRadius: t.radiusSm,
                                            border: `1px solid ${t.border}`,
                                            backgroundColor: t.bg,
                                        }}
                                    >
                                        <span style={{ color: t.text, fontSize: "14px" }}>{c.name}</span>
                                        <button
                                            type="button"
                                            onClick={() => deleteCategory(c.id)}
                                            style={{
                                                background: "transparent",
                                                border: `1px solid ${t.danger}`,
                                                color: t.danger,
                                                borderRadius: t.radiusSm,
                                                padding: "4px 10px",
                                                fontSize: "12px",
                                                cursor: "pointer",
                                                fontWeight: 600,
                                            }}
                                        >
                                            Delete
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </section>

                        <section
                            style={{
                                backgroundColor: t.surface,
                                borderRadius: t.radius,
                                border: `1px solid ${t.borderSubtle}`,
                                padding: "18px",
                            }}
                        >
                            <h2 style={{ margin: "0 0 14px", fontSize: "18px", color: t.text }}>
                                {editing ? "Edit Food" : "Add New Food"}
                            </h2>
                            <form className="inventory-form" onSubmit={editing ? updateFood : createFood}>
                                <div style={{ marginBottom: "12px" }}>
                                    <label style={labelStyle} htmlFor="food-name">
                                        Food name
                                    </label>
                                    <input
                                        id="food-name"
                                        required
                                        value={form.name}
                                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                                        style={input}
                                        placeholder="Food name"
                                        autoComplete="off"
                                    />
                                </div>
                                <div style={{ marginBottom: "12px" }}>
                                    <label style={labelStyle} htmlFor="food-description">
                                        Description
                                    </label>
                                    <textarea
                                        id="food-description"
                                        rows={3}
                                        value={form.description}
                                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                                        style={{ ...input, resize: "vertical", minHeight: "80px" }}
                                        placeholder="Description"
                                    />
                                </div>
                                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", marginBottom: "12px" }}>
                                    <div>
                                        <label style={labelStyle} htmlFor="food-price">
                                            Price
                                        </label>
                                        <input
                                            id="food-price"
                                            required
                                            type="number"
                                            min="0.01"
                                            step="0.01"
                                            value={form.price}
                                            onChange={(e) => setForm({ ...form, price: e.target.value })}
                                            style={input}
                                            placeholder="e.g. 120"
                                        />
                                    </div>
                                    <div>
                                        <label style={labelStyle} htmlFor="food-inventory">
                                            Inventory (quantity in stock)
                                        </label>
                                        <input
                                            id="food-inventory"
                                            type="number"
                                            min={0}
                                            max={MAX_STOCK}
                                            value={form.inventory_count}
                                            onChange={(e) => onInventoryInput(e.target.value)}
                                            style={input}
                                            placeholder="0"
                                            aria-describedby="inventory-hint"
                                        />
                                        <p
                                            id="inventory-hint"
                                            style={{
                                                margin: "8px 0 0",
                                                fontSize: "12px",
                                                color: t.textMuted,
                                                lineHeight: 1.5,
                                            }}
                                        >
                                            Maximum stock is {MAX_STOCK}. Use 0 for out of stock. Students can buy only when stock is
                                            above 0 and the item is marked available.
                                        </p>
                                    </div>
                                </div>
                                <div style={{ marginBottom: "12px" }}>
                                    <label style={labelStyle} htmlFor="food-category">
                                        Select category
                                    </label>
                                    <select
                                        id="food-category"
                                        required
                                        value={form.category_id}
                                        onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                                        style={{ ...input, backgroundColor: "#fff", cursor: "pointer" }}
                                    >
                                        <option value="" disabled>
                                            Select category
                                        </option>
                                        {categories.map((c) => (
                                            <option key={c.id} value={c.id}>
                                                {c.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div style={{ marginBottom: "12px" }}>
                                    <label style={labelStyle} htmlFor="food-image-url">
                                        Image URL (optional)
                                    </label>
                                    <input
                                        id="food-image-url"
                                        value={form.image_url}
                                        onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                                        style={input}
                                        placeholder="Image URL (optional)"
                                        autoComplete="off"
                                    />
                                </div>
                                <label
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "10px",
                                        marginBottom: "16px",
                                        cursor: "pointer",
                                        color: t.text,
                                        fontSize: "14px",
                                    }}
                                >
                                    <input
                                        type="checkbox"
                                        checked={form.is_available}
                                        onChange={(e) => setForm({ ...form, is_available: e.target.checked })}
                                    />
                                    Available in student menu
                                </label>
                                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                                    <button
                                        type="submit"
                                        disabled={saving || categories.length === 0}
                                        style={{
                                            padding: "12px 20px",
                                            borderRadius: t.radiusSm,
                                            border: "none",
                                            backgroundColor: t.gold,
                                            color: t.onGold,
                                            fontWeight: 700,
                                            cursor: categories.length === 0 ? "not-allowed" : "pointer",
                                        }}
                                    >
                                        {editing ? "Save Changes" : "Create Food"}
                                    </button>
                                    {editing ? (
                                        <button
                                            type="button"
                                            onClick={cancelEdit}
                                            style={{
                                                padding: "12px 20px",
                                                borderRadius: t.radiusSm,
                                                border: `1px solid ${t.border}`,
                                                backgroundColor: "transparent",
                                                color: t.text,
                                                fontWeight: 600,
                                                cursor: "pointer",
                                            }}
                                        >
                                            Cancel edit
                                        </button>
                                    ) : null}
                                </div>
                            </form>
                        </section>
                    </div>

                    <section style={{ marginTop: "28px" }}>
                        <h2 style={{ margin: "0 0 14px", fontSize: "20px", color: t.text }}>Current Food Items</h2>
                        <div style={{ overflowX: "auto", borderRadius: t.radius, border: `1px solid ${t.borderSubtle}` }}>
                            <table style={{ width: "100%", borderCollapse: "collapse", backgroundColor: t.surface, minWidth: "640px" }}>
                                <thead>
                                    <tr style={{ borderBottom: `1px solid ${t.border}`, textAlign: "left" }}>
                                        <th style={th}>Name</th>
                                        <th style={th}>Category</th>
                                        <th style={th}>Price (LKR)</th>
                                        <th style={th}>Stock</th>
                                        <th style={th}>Available</th>
                                        <th style={{ ...th, width: "160px" }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr>
                                            <td colSpan={6} style={td}>
                                                Loading…
                                            </td>
                                        </tr>
                                    ) : items.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} style={{ ...td, color: t.textMuted }}>
                                                No food items yet. Add a category, then create a food above.
                                            </td>
                                        </tr>
                                    ) : (
                                        items.map((row) => (
                                            <tr key={row.id} style={{ borderBottom: `1px solid ${t.borderSubtle}` }}>
                                                <td style={td}>{row.name}</td>
                                                <td style={td}>{row.category?.name || "—"}</td>
                                                <td style={td}>{Number(row.price).toFixed(2)}</td>
                                                <td style={td}>{row.inventory_count}</td>
                                                <td style={td}>{row.is_available ? "Yes" : "No"}</td>
                                                <td style={td}>
                                                    <button
                                                        type="button"
                                                        onClick={() => startEdit(row)}
                                                        style={{
                                                            marginRight: "8px",
                                                            padding: "6px 12px",
                                                            borderRadius: t.radiusSm,
                                                            border: `1px solid ${t.gold}`,
                                                            background: "transparent",
                                                            color: t.gold,
                                                            cursor: "pointer",
                                                            fontWeight: 600,
                                                            fontSize: "13px",
                                                        }}
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => deleteFood(row.id)}
                                                        style={{
                                                            padding: "6px 12px",
                                                            borderRadius: t.radiusSm,
                                                            border: `1px solid ${t.danger}`,
                                                            background: "transparent",
                                                            color: t.danger,
                                                            cursor: "pointer",
                                                            fontWeight: 600,
                                                            fontSize: "13px",
                                                        }}
                                                    >
                                                        Delete
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    <OffersManager />
                </div>
            </div>
        </MainLayout>
    );
}

const th = {
    padding: "12px 14px",
    fontSize: "13px",
    color: t.textMuted,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
};

const td = {
    padding: "12px 14px",
    fontSize: "14px",
    color: t.text,
    verticalAlign: "middle",
};
