const express = require("express");
const mongoose = require("mongoose");
const Category = require("../models/category");
const FoodItem = require("../models/foodItem");
const Offer = require("../models/offer");
const Order = require("../models/order");
const Studentmodel = require("../models/students");

const router = express.Router();

function resolveProfileAccountEmail(req) {
    const fromHeader = String(req.headers["x-user-email"] || "").trim();
    if (fromHeader) return fromHeader;
    const fromQuery = String(req.query?.accountEmail || req.query?.email || "").trim();
    if (fromQuery) return fromQuery;
    const fromBody = String(req.body?.accountEmail || req.body?.email || "").trim();
    return fromBody;
}

function profileFromStudent(user, accountEmail) {
    return {
        fullName: String(user?.profileFullName || user?.name || "").trim(),
        email: String(user?.profileEmail || user?.email || accountEmail || "").trim(),
        phoneNumber: String(user?.profilePhoneNumber || "").trim(),
        dietPreference: String(user?.profileDietPreference || "No Preference").trim() || "No Preference",
        notificationPreference:
            String(user?.profileNotificationPreference || "Email").trim() || "Email",
        profileImage: String(user?.profileImage || "").trim(),
    };
}

router.get("/profile", async (req, res) => {
    try {
        const accountEmail = resolveProfileAccountEmail(req);
        if (!accountEmail) {
            return res.status(400).json({ message: "accountEmail is required" });
        }
        const user = await Studentmodel.findOne({ email: accountEmail }).lean();
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        return res.json({ ok: true, profile: profileFromStudent(user, accountEmail) });
    } catch (err) {
        return res.status(500).json({ message: err.message || "Could not fetch profile" });
    }
});

router.patch("/profile", async (req, res) => {
    try {
        const accountEmail = resolveProfileAccountEmail(req);
        if (!accountEmail) {
            return res.status(400).json({ message: "accountEmail is required" });
        }
        const body = req.body || {};
        const update = {};

        if (Object.prototype.hasOwnProperty.call(body, "fullName")) {
            update.profileFullName = String(body.fullName || "").trim();
        }
        if (Object.prototype.hasOwnProperty.call(body, "email")) {
            update.profileEmail = String(body.email || "").trim();
        }
        if (Object.prototype.hasOwnProperty.call(body, "phoneNumber")) {
            update.profilePhoneNumber = String(body.phoneNumber || "").replace(/\D/g, "").slice(0, 10);
        }
        if (Object.prototype.hasOwnProperty.call(body, "dietPreference")) {
            const diet = String(body.dietPreference || "").trim();
            update.profileDietPreference = diet || "No Preference";
        }
        if (Object.prototype.hasOwnProperty.call(body, "notificationPreference")) {
            const pref = String(body.notificationPreference || "").trim();
            update.profileNotificationPreference = pref || "Email";
        }
        if (Object.prototype.hasOwnProperty.call(body, "profileImage")) {
            update.profileImage = String(body.profileImage || "").trim();
        }

        if (Object.keys(update).length === 0) {
            return res.status(400).json({ message: "Nothing to update." });
        }

        const updated = await Studentmodel.findOneAndUpdate(
            { email: accountEmail },
            { $set: update },
            { new: true }
        ).lean();
        if (!updated) {
            return res.status(404).json({ message: "User not found" });
        }
        return res.json({ ok: true, profile: profileFromStudent(updated, accountEmail) });
    } catch (err) {
        return res.status(500).json({ message: err.message || "Could not update profile" });
    }
});

/**
 * Staff dashboard login. Override with env: ADMIN_USERNAME, ADMIN_PASSWORD (required for production).
 * Default demo credentials are for local development only.
 */
router.post("/admin/login", (req, res) => {
    try {
        const username = String(req.body?.username || "").trim();
        const password = String(req.body?.password || "").trim();
        if (!username || !password) {
            return res.status(400).json({ message: "Username and password are required" });
        }
        const okUser = String(process.env.ADMIN_USERNAME || "canteen_admin").trim();
        const okPass = String(process.env.ADMIN_PASSWORD || "admin123").trim();
        if (username === okUser && password === okPass) {
            return res.json({ ok: true, username });
        }
        return res.status(401).json({ message: "Invalid staff username or password" });
    } catch (err) {
        res.status(500).json({ message: err.message || "Server error" });
    }
});

function escapeRegex(s) {
    return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function serializeCategory(c) {
    if (!c) return null;
    const o = c.toObject ? c.toObject() : c;
    return { id: String(o._id), name: o.name };
}

function itemsSummary(items) {
    if (!Array.isArray(items) || items.length === 0) return "—";
    const parts = items.slice(0, 3).map((i) => `${i.name || "Item"} ×${i.quantity || 0}`);
    const more = items.length > 3 ? ` +${items.length - 3} more` : "";
    return parts.join(", ") + more;
}

function formatPlacedAt(d) {
    if (!d) return "—";
    const dt = d instanceof Date ? d : new Date(d);
    if (Number.isNaN(dt.getTime())) return "—";
    return dt.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function serializeOrder(doc) {
    if (!doc) return null;
    const o = doc.toObject ? doc.toObject() : doc;
    const oid = String(o.orderId || "");
    const suffix = oid.length >= 4 ? oid.slice(-4) : oid || String(o._id || "").slice(-4);
    const email = o.email || "";
    const student = email.includes("@") ? email.split("@")[0] : email || "—";
    return {
        id: String(o._id),
        orderId: oid,
        displayId: `###${suffix}`,
        transactionId: o.transactionId || "",
        email,
        paymentMethod: o.paymentMethod,
        paymentLabel: o.paymentMethod === "cash" ? "Cash on delivery" : "Online (card)",
        cardHolder: o.cardHolder || "",
        cardLast4: o.cardLast4 || "",
        amount: o.amount,
        orderNote: o.orderNote || "",
        items: o.items || [],
        adminStatus: o.adminStatus,
        orderStatus: o.orderStatus,
        placedAt: o.createdAt,
        placedAtLabel: formatPlacedAt(o.createdAt),
        acceptedAt: o.acceptedAt,
        acceptedAtLabel: o.acceptedAt ? formatPlacedAt(o.acceptedAt) : null,
        rejectedAt: o.rejectedAt || null,
        rejectedAtLabel: o.rejectedAt ? formatPlacedAt(o.rejectedAt) : null,
        student,
        itemsSummary: itemsSummary(o.items),
        rider: o.riderName || "—",
        riderName: o.riderName || "",
        riderPhone: o.riderPhone || "",
    };
}

function serializeFood(doc) {
    const o = doc.toObject ? doc.toObject() : doc;
    const cat = o.category && typeof o.category === "object" && o.category.name
        ? serializeCategory(o.category)
        : null;
    return {
        id: String(o._id),
        name: o.name,
        description: o.description || "",
        price: o.price,
        inventory_count: o.inventory_count ?? 0,
        category: cat,
        category_id: o.category && o.category._id ? String(o.category._id) : String(o.category || ""),
        image_url: o.image_url || "",
        is_available: !!o.is_available,
        average_rating: o.average_rating ?? 0,
        review_count: o.review_count ?? 0,
        createdAt: o.createdAt,
        updatedAt: o.updatedAt,
        click_count: o.click_count ?? 0,
    };
}

function parseOptionalPrice(v) {
    if (v === "" || v === null || v === undefined) return undefined;
    const n = typeof v === "number" ? v : Number(v);
    if (!Number.isFinite(n) || n < 0) return undefined;
    return n;
}

function serializeOffer(doc) {
    const o = doc.toObject ? doc.toObject() : doc;
    const op = o.original_price;
    return {
        id: String(o._id),
        title: o.title,
        discount_label: o.discount_label,
        original_price: op != null && Number.isFinite(Number(op)) ? Number(op) : null,
        available_count: o.available_count ?? 0,
        sort_order: o.sort_order ?? 0,
        is_active: !!o.is_active,
        createdAt: o.createdAt,
        updatedAt: o.updatedAt,
    };
}

/** Categories */
router.get("/categories", async (req, res) => {
    try {
        const list = await Category.find().sort({ name: 1 }).lean();
        res.json(list.map((c) => ({ id: String(c._id), name: c.name })));
    } catch (err) {
        res.status(500).json({ message: err.message || "Failed to list categories" });
    }
});

router.post("/categories", async (req, res) => {
    try {
        const name = String(req.body?.name || "").trim();
        if (!name) {
            return res.status(400).json({ message: "Category name is required" });
        }
        const cat = await Category.create({ name });
        res.status(201).json({ id: String(cat._id), name: cat.name });
    } catch (err) {
        if (err.code === 11000) {
            return res.status(400).json({ message: "That category already exists" });
        }
        res.status(400).json({ message: err.message || "Could not create category" });
    }
});

router.delete("/categories/:id", async (req, res) => {
    try {
        const id = req.params.id;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid category id" });
        }
        const count = await FoodItem.countDocuments({ category: id });
        if (count > 0) {
            return res.status(400).json({
                message: "Cannot delete a category that still has food items. Remove or reassign items first.",
            });
        }
        const result = await Category.deleteOne({ _id: id });
        if (result.deletedCount === 0) {
            return res.status(404).json({ message: "Category not found" });
        }
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ message: err.message || "Could not delete category" });
    }
});

/** Food items */
/** Most-clicked recommendations (in stock + available) */
router.get("/food-items/recommended", async (req, res) => {
    try {
        const limit = Math.min(24, Math.max(1, parseInt(req.query.limit, 10) || 6));
        const items = await FoodItem.find({ is_available: true, inventory_count: { $gt: 0 } })
            .populate("category")
            .sort({ click_count: -1, updatedAt: -1 })
            .limit(limit)
            .lean();
        res.json(items.map((row) => serializeFood({ ...row, category: row.category })));
    } catch (err) {
        res.status(500).json({ message: err.message || "Failed to load recommendations" });
    }
});

router.post("/food-items/:id/click", async (req, res) => {
    try {
        const id = req.params.id;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid id" });
        }
        const doc = await FoodItem.findOneAndUpdate(
            { _id: id, is_available: true },
            { $inc: { click_count: 1 } },
            { new: true }
        ).populate("category");
        if (!doc) {
            return res.status(404).json({ message: "Food item not found" });
        }
        res.json({ ok: true, item: serializeFood(doc) });
    } catch (err) {
        res.status(500).json({ message: err.message || "Could not record click" });
    }
});

router.get("/food-items", async (req, res) => {
    try {
        const search = String(req.query.search || "").trim();
        const categoryId = String(req.query.category || "").trim();
        const stock = String(req.query.stock || "all").toLowerCase();

        const q = {};
        const and = [];

        if (search) {
            const rx = new RegExp(escapeRegex(search), "i");
            const catIds = await Category.find({ name: rx }).distinct("_id");
            const or = [{ name: rx }, { description: rx }];
            if (catIds.length) {
                or.push({ category: { $in: catIds } });
            }
            and.push({ $or: or });
        }

        if (categoryId && categoryId !== "all") {
            if (!mongoose.Types.ObjectId.isValid(categoryId)) {
                return res.status(400).json({ message: "Invalid category filter" });
            }
            and.push({ category: categoryId });
        }

        if (stock === "in") {
            and.push({ inventory_count: { $gt: 0 }, is_available: true });
        } else if (stock === "out") {
            and.push({
                $or: [{ inventory_count: { $lte: 0 } }, { is_available: false }],
            });
        }

        if (and.length) {
            q.$and = and;
        }

        const items = await FoodItem.find(q).populate("category").sort({ name: 1 }).lean();
        res.json(items.map((row) => serializeFood({ ...row, category: row.category })));
    } catch (err) {
        res.status(500).json({ message: err.message || "Failed to list food items" });
    }
});

router.post("/food-items", async (req, res) => {
    try {
        const body = req.body || {};
        const name = String(body.name || "").trim();
        const description = String(body.description || "").trim();
        const price = Number(body.price);
        const invParsed = parseInt(body.inventory_count, 10);
        const inventory_count = Number.isNaN(invParsed) ? 0 : invParsed;
        const category = String(body.category_id || body.category || "").trim();
        const image_url = String(body.image_url || "").trim();
        const is_available = Boolean(body.is_available);

        if (!name) {
            return res.status(400).json({ message: "Food name is required" });
        }
        if (!Number.isFinite(price) || price <= 0) {
            return res.status(400).json({ message: "Price must be greater than 0" });
        }
        if (inventory_count < 0 || inventory_count > 100) {
            return res.status(400).json({ message: "Stock must be between 0 and 100" });
        }
        if (!mongoose.Types.ObjectId.isValid(category)) {
            return res.status(400).json({ message: "Valid category is required" });
        }

        const exists = await Category.findById(category);
        if (!exists) {
            return res.status(400).json({ message: "Category not found" });
        }

        const doc = await FoodItem.create({
            name,
            description,
            price,
            inventory_count,
            category,
            image_url,
            is_available,
        });
        const populated = await FoodItem.findById(doc._id).populate("category");
        res.status(201).json(serializeFood(populated));
    } catch (err) {
        res.status(400).json({ message: err.message || "Could not create food item" });
    }
});

router.put("/food-items/:id", async (req, res) => {
    try {
        const id = req.params.id;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid id" });
        }
        const body = req.body || {};
        const update = {};

        if (body.name !== undefined) update.name = String(body.name).trim();
        if (body.description !== undefined) update.description = String(body.description).trim();
        if (body.price !== undefined) {
            const p = Number(body.price);
            if (!Number.isFinite(p) || p <= 0) {
                return res.status(400).json({ message: "Price must be greater than 0" });
            }
            update.price = p;
        }
        if (body.inventory_count !== undefined) {
            const inv = parseInt(body.inventory_count, 10);
            const v = Number.isNaN(inv) ? 0 : inv;
            if (v < 0 || v > 100) {
                return res.status(400).json({ message: "Stock must be between 0 and 100" });
            }
            update.inventory_count = v;
        }
        if (body.image_url !== undefined) update.image_url = String(body.image_url).trim();
        if (body.is_available !== undefined) update.is_available = Boolean(body.is_available);
        if (body.category_id !== undefined || body.category !== undefined) {
            const cid = String(body.category_id || body.category).trim();
            if (!mongoose.Types.ObjectId.isValid(cid)) {
                return res.status(400).json({ message: "Valid category is required" });
            }
            const exists = await Category.findById(cid);
            if (!exists) {
                return res.status(400).json({ message: "Category not found" });
            }
            update.category = cid;
        }

        if (update.name !== undefined && !update.name) {
            return res.status(400).json({ message: "Food name cannot be empty" });
        }

        const doc = await FoodItem.findByIdAndUpdate(id, update, { new: true }).populate("category");
        if (!doc) {
            return res.status(404).json({ message: "Food item not found" });
        }
        res.json(serializeFood(doc));
    } catch (err) {
        res.status(400).json({ message: err.message || "Could not update food item" });
    }
});

router.delete("/food-items/:id", async (req, res) => {
    try {
        const id = req.params.id;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid id" });
        }
        const result = await FoodItem.deleteOne({ _id: id });
        if (result.deletedCount === 0) {
            return res.status(404).json({ message: "Food item not found" });
        }
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ message: err.message || "Could not delete food item" });
    }
});

/** Offers (homepage promos — managed from Inventory) */
router.get("/offers", async (req, res) => {
    try {
        const activeOnly = String(req.query.active || req.query.activeOnly || "") === "true" || String(req.query.active || "") === "1";
        const q = activeOnly ? { is_active: true } : {};
        const list = await Offer.find(q).sort({ sort_order: 1, title: 1 }).lean();
        res.json(list.map((row) => serializeOffer({ ...row, _id: row._id })));
    } catch (err) {
        res.status(500).json({ message: err.message || "Failed to list offers" });
    }
});

router.post("/offers", async (req, res) => {
    try {
        const body = req.body || {};
        const title = String(body.title || "").trim();
        const discount_label = String(body.discount_label || "").trim();
        const original_price = parseOptionalPrice(body.original_price);
        const available_count = Math.max(0, parseInt(body.available_count, 10) || 0);
        const sort_order = Number.isFinite(Number(body.sort_order)) ? Number(body.sort_order) : 0;
        const is_active = Boolean(body.is_active);

        if (!title || !discount_label) {
            return res.status(400).json({ message: "Title and discount text are required" });
        }

        const doc = await Offer.create({
            title,
            discount_label,
            ...(original_price !== undefined ? { original_price } : {}),
            available_count,
            sort_order,
            is_active,
        });
        res.status(201).json(serializeOffer(doc));
    } catch (err) {
        res.status(400).json({ message: err.message || "Could not create offer" });
    }
});

router.put("/offers/:id", async (req, res) => {
    try {
        const id = req.params.id;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid id" });
        }
        const body = req.body || {};
        const update = {};

        if (body.title !== undefined) update.title = String(body.title).trim();
        if (body.discount_label !== undefined) update.discount_label = String(body.discount_label).trim();
        if (body.original_price !== undefined) {
            const p = parseOptionalPrice(body.original_price);
            update.original_price = p === undefined ? null : p;
        }
        if (body.available_count !== undefined) {
            update.available_count = Math.max(0, parseInt(body.available_count, 10) || 0);
        }
        if (body.sort_order !== undefined) {
            update.sort_order = Number.isFinite(Number(body.sort_order)) ? Number(body.sort_order) : 0;
        }
        if (body.is_active !== undefined) update.is_active = Boolean(body.is_active);

        if (update.title !== undefined && !update.title) {
            return res.status(400).json({ message: "Title cannot be empty" });
        }
        if (update.discount_label !== undefined && !update.discount_label) {
            return res.status(400).json({ message: "Discount text cannot be empty" });
        }

        const doc = await Offer.findByIdAndUpdate(id, update, { new: true });
        if (!doc) {
            return res.status(404).json({ message: "Offer not found" });
        }
        res.json(serializeOffer(doc));
    } catch (err) {
        res.status(400).json({ message: err.message || "Could not update offer" });
    }
});

router.delete("/offers/:id", async (req, res) => {
    try {
        const id = req.params.id;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid id" });
        }
        const result = await Offer.deleteOne({ _id: id });
        if (result.deletedCount === 0) {
            return res.status(404).json({ message: "Offer not found" });
        }
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ message: err.message || "Could not delete offer" });
    }
});

/**
 * Checkout: decrease food inventory_count and offer available_count for each cart line.
 * Rolls back prior lines if any line fails (not enough stock).
 */
router.post("/checkout/apply-stock", async (req, res) => {
    const raw = req.body?.lines;
    if (!Array.isArray(raw) || raw.length === 0) {
        return res.status(400).json({ message: "No line items to apply." });
    }

    const lines = raw
        .map((row) => ({
            kind: row.kind === "offer" ? "offer" : "food",
            id: String(row.id || "").trim(),
            quantity: Math.max(0, Math.floor(Number(row.quantity) || 0)),
        }))
        .filter((x) => x.quantity > 0 && x.id);

    if (!lines.length) {
        return res.status(400).json({ message: "Invalid line items." });
    }

    const applied = [];

    const rollback = async () => {
        for (let i = applied.length - 1; i >= 0; i--) {
            const a = applied[i];
            try {
                if (a.kind === "offer") {
                    await Offer.updateOne({ _id: a.id }, { $inc: { available_count: a.quantity } });
                } else {
                    await FoodItem.updateOne({ _id: a.id }, { $inc: { inventory_count: a.quantity } });
                }
            } catch {
                /* best-effort */
            }
        }
    };

    try {
        for (const line of lines) {
            if (line.kind === "offer") {
                if (!mongoose.Types.ObjectId.isValid(line.id)) {
                    throw new Error("Invalid offer id.");
                }
                const doc = await Offer.findOneAndUpdate(
                    { _id: line.id, available_count: { $gte: line.quantity } },
                    { $inc: { available_count: -line.quantity } },
                    { new: true }
                );
                if (!doc) {
                    const o = await Offer.findById(line.id).lean();
                    const name = o?.title || "Offer";
                    throw new Error(
                        `Not enough stock for “${name}”. Update your cart and try again.`
                    );
                }
                applied.push({ kind: "offer", id: line.id, quantity: line.quantity });
            } else {
                if (!mongoose.Types.ObjectId.isValid(line.id)) {
                    throw new Error("Invalid food item id.");
                }
                const doc = await FoodItem.findOneAndUpdate(
                    { _id: line.id, inventory_count: { $gte: line.quantity } },
                    { $inc: { inventory_count: -line.quantity } },
                    { new: true }
                );
                if (!doc) {
                    const f = await FoodItem.findById(line.id).lean();
                    const name = f?.name || "Food item";
                    throw new Error(
                        `Not enough stock for “${name}”. Update your cart and try again.`
                    );
                }
                applied.push({ kind: "food", id: line.id, quantity: line.quantity });
            }
        }
        res.json({ ok: true });
    } catch (err) {
        await rollback();
        const msg = err.message || "Could not update inventory.";
        res.status(400).json({ message: msg });
    }
});

/** Create order after checkout (pending admin acceptance). */
router.post("/orders/checkout", async (req, res) => {
    try {
        const body = req.body || {};
        const orderId = String(body.orderId || "").trim();
        if (!orderId) {
            return res.status(400).json({ message: "orderId is required" });
        }
        const pm = body.paymentMethod;
        const paymentMethod = pm === "cash" ? "cash" : pm === "card" ? "card" : null;
        if (!paymentMethod) {
            return res.status(400).json({ message: "paymentMethod must be card or cash" });
        }
        const amount = Number(body.amount);
        if (!Number.isFinite(amount) || amount < 0) {
            return res.status(400).json({ message: "Invalid amount" });
        }
        const items = Array.isArray(body.items)
            ? body.items.map((i) => ({
                  id: String(i.id ?? ""),
                  name: String(i.name ?? ""),
                  quantity: Math.max(0, Math.floor(Number(i.quantity) || 0)),
                  unitPrice: Number(i.unitPrice) || 0,
                  lineTotal: Number(i.lineTotal) || 0,
                  image_url: String(i.image_url ?? ""),
                  isOffer: Boolean(i.isOffer),
              }))
            : [];

        const doc = await Order.create({
            orderId,
            transactionId: String(body.transactionId || ""),
            email: String(body.email || "").trim(),
            paymentMethod,
            cardHolder: body.cardHolder != null ? String(body.cardHolder) : "",
            cardLast4: body.cardLast4 != null ? String(body.cardLast4) : "",
            amount,
            orderNote: String(body.orderNote || ""),
            items,
        });
        res.status(201).json(serializeOrder(doc));
    } catch (err) {
        if (err.code === 11000) {
            return res.status(409).json({ message: "Duplicate order id" });
        }
        res.status(400).json({ message: err.message || "Could not create order" });
    }
});

/** Orders awaiting admin acceptance (online + cash on delivery). */
router.get("/orders/pending", async (req, res) => {
    try {
        const list = await Order.find({ adminStatus: "pending_accept" }).sort({ createdAt: -1 }).lean();
        res.json(list.map((o) => serializeOrder(o)));
    } catch (err) {
        res.status(500).json({ message: err.message || "Server error" });
    }
});

/** Student order history — match checkout email (case-insensitive). */
router.get("/orders/mine", async (req, res) => {
    try {
        const email = String(req.query.email || "").trim();
        if (!email) {
            return res.status(400).json({ message: "email is required" });
        }
        const pattern = new RegExp(`^${escapeRegex(email)}$`, "i");
        const list = await Order.find({ email: pattern }).sort({ createdAt: -1 }).limit(50).lean();
        res.json(list.map((o) => serializeOrder(o)));
    } catch (err) {
        res.status(500).json({ message: err.message || "Server error" });
    }
});

/** Admin dashboard: 7-day chart + accepted orders in range + pending count. */
router.get("/orders/dashboard", async (req, res) => {
    try {
        const since = new Date();
        since.setDate(since.getDate() - 7);
        since.setHours(0, 0, 0, 0);

        const orders = await Order.find({
            adminStatus: "accepted",
            acceptedAt: { $gte: since },
        })
            .sort({ acceptedAt: -1 })
            .lean();

        const chart = [];
        for (let i = 6; i >= 0; i -= 1) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            d.setHours(0, 0, 0, 0);
            const next = new Date(d);
            next.setDate(next.getDate() + 1);
            const count = await Order.countDocuments({
                adminStatus: "accepted",
                acceptedAt: { $gte: d, $lt: next },
            });
            chart.push({
                date: d.toISOString().slice(0, 10),
                label: d.toLocaleDateString(undefined, { weekday: "short" }),
                count,
            });
        }

        const pendingCount = await Order.countDocuments({ adminStatus: "pending_accept" });

        res.json({
            chart,
            orders: orders.map((o) => serializeOrder(o)),
            pendingCount,
        });
    } catch (err) {
        res.status(500).json({ message: err.message || "Server error" });
    }
});

router.post("/orders/:id/accept", async (req, res) => {
    try {
        const id = req.params.id;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid id" });
        }
        const updated = await Order.findOneAndUpdate(
            { _id: id, adminStatus: "pending_accept" },
            { $set: { adminStatus: "accepted", orderStatus: "Accepted", acceptedAt: new Date() } },
            { new: true }
        );
        if (!updated) {
            return res.status(404).json({ message: "Order not found or already processed" });
        }
        res.json(serializeOrder(updated));
    } catch (err) {
        res.status(400).json({ message: err.message || "Could not accept order" });
    }
});

router.post("/orders/:id/reject", async (req, res) => {
    try {
        const id = req.params.id;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid id" });
        }
        const updated = await Order.findOneAndUpdate(
            { _id: id, adminStatus: "pending_accept" },
            {
                $set: {
                    adminStatus: "rejected",
                    orderStatus: "Cancelled",
                    rejectedAt: new Date(),
                },
            },
            { new: true }
        );
        if (!updated) {
            return res.status(404).json({ message: "Order not found or already processed" });
        }
        res.json(serializeOrder(updated));
    } catch (err) {
        res.status(400).json({ message: err.message || "Could not reject order" });
    }
});

function normalizeStudentEmail(e) {
    return String(e || "").trim().toLowerCase();
}

function orderEmailsMatch(orderEmail, requestEmail) {
    const a = normalizeStudentEmail(orderEmail);
    const b = normalizeStudentEmail(requestEmail);
    return Boolean(a && b && a === b);
}

function stockLinesFromOrderItems(items) {
    return (Array.isArray(items) ? items : [])
        .map((i) => {
            const q = Math.max(0, Math.floor(Number(i.quantity) || 0));
            if (q <= 0) return null;
            const isOffer = Boolean(i.isOffer);
            let id = String(i.id || "").replace(/^offer:/, "");
            if (!mongoose.Types.ObjectId.isValid(id)) return null;
            return { kind: isOffer ? "offer" : "food", id, quantity: q };
        })
        .filter(Boolean);
}

async function restoreStockForLines(lines) {
    for (const line of lines) {
        if (line.kind === "offer") {
            await Offer.updateOne({ _id: line.id }, { $inc: { available_count: line.quantity } });
        } else {
            await FoodItem.updateOne({ _id: line.id }, { $inc: { inventory_count: line.quantity } });
        }
    }
}

async function applyStockForLines(lines) {
    const applied = [];
    const rollbackApplied = async () => {
        for (let i = applied.length - 1; i >= 0; i -= 1) {
            const a = applied[i];
            try {
                if (a.kind === "offer") {
                    await Offer.updateOne({ _id: a.id }, { $inc: { available_count: a.quantity } });
                } else {
                    await FoodItem.updateOne({ _id: a.id }, { $inc: { inventory_count: a.quantity } });
                }
            } catch {
                /* best-effort */
            }
        }
    };
    for (const line of lines) {
        if (line.kind === "offer") {
            const doc = await Offer.findOneAndUpdate(
                { _id: line.id, available_count: { $gte: line.quantity } },
                { $inc: { available_count: -line.quantity } },
                { new: true }
            );
            if (!doc) {
                await rollbackApplied();
                const o = await Offer.findById(line.id).lean();
                const name = o?.title || "Offer";
                throw new Error(`Not enough stock for “${name}”.`);
            }
            applied.push({ kind: "offer", id: line.id, quantity: line.quantity });
        } else {
            const doc = await FoodItem.findOneAndUpdate(
                { _id: line.id, inventory_count: { $gte: line.quantity } },
                { $inc: { inventory_count: -line.quantity } },
                { new: true }
            );
            if (!doc) {
                await rollbackApplied();
                const f = await FoodItem.findById(line.id).lean();
                const name = f?.name || "Food item";
                throw new Error(`Not enough stock for “${name}”.`);
            }
            applied.push({ kind: "food", id: line.id, quantity: line.quantity });
        }
    }
}

function normalizeOrderItemsFromBody(raw) {
    if (!Array.isArray(raw)) return [];
    return raw
        .map((i) => ({
            id: String(i.id ?? ""),
            name: String(i.name ?? ""),
            quantity: Math.max(0, Math.floor(Number(i.quantity) || 0)),
            unitPrice: Number(i.unitPrice) || 0,
            lineTotal: Number(i.lineTotal) || 0,
            image_url: String(i.image_url ?? ""),
            isOffer: Boolean(i.isOffer),
        }))
        .filter((i) => i.quantity > 0 && i.id);
}

/** Student: cancel before canteen accepts — restores inventory and marks order cancelled. */
router.post("/orders/:id/cancel-pending", async (req, res) => {
    try {
        const id = req.params.id;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid id" });
        }
        const email = String(req.body?.email || "").trim();
        if (!email) {
            return res.status(400).json({ message: "email is required" });
        }

        const existing = await Order.findOne({ _id: id, adminStatus: "pending_accept" }).lean();
        if (!existing) {
            const any = await Order.findById(id).lean();
            if (!any) {
                return res.status(404).json({ message: "Not found" });
            }
            return res.status(400).json({ message: "This order can no longer be cancelled." });
        }
        if (!orderEmailsMatch(existing.email, email)) {
            return res.status(403).json({ message: "You can only cancel your own pending orders." });
        }

        const updated = await Order.findOneAndUpdate(
            { _id: id, adminStatus: "pending_accept" },
            {
                $set: {
                    adminStatus: "rejected",
                    orderStatus: "Cancelled",
                    rejectedAt: new Date(),
                },
            },
            { new: true }
        );
        if (!updated) {
            return res.status(404).json({ message: "Order not found or already processed" });
        }

        const oldLines = stockLinesFromOrderItems(existing.items);
        try {
            await restoreStockForLines(oldLines);
        } catch (restoreErr) {
            console.error("[cancel-pending] stock restore failed", restoreErr);
        }

        res.json(serializeOrder(updated));
    } catch (err) {
        res.status(400).json({ message: err.message || "Could not cancel order" });
    }
});

/** Student: edit items / note / payment while adminStatus is pending_accept. */
router.patch("/orders/:id/pending", async (req, res) => {
    try {
        const id = req.params.id;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid id" });
        }
        const body = req.body || {};
        const email = String(body.email || "").trim();
        if (!email) {
            return res.status(400).json({ message: "email is required" });
        }

        const order = await Order.findById(id).lean();
        if (!order) {
            return res.status(404).json({ message: "Not found" });
        }
        if (order.adminStatus !== "pending_accept") {
            return res.status(400).json({
                message: "This order can no longer be edited — the canteen has already accepted or rejected it.",
            });
        }
        if (!orderEmailsMatch(order.email, email)) {
            return res.status(403).json({ message: "You can only edit your own pending orders." });
        }

        const updates = {};
        if (body.orderNote !== undefined) {
            updates.orderNote = String(body.orderNote || "").slice(0, 2000);
        }
        if (body.paymentMethod !== undefined) {
            const pm = body.paymentMethod === "cash" ? "cash" : body.paymentMethod === "card" ? "card" : null;
            if (!pm) {
                return res.status(400).json({ message: "paymentMethod must be card or cash" });
            }
            updates.paymentMethod = pm;
        }
        if (body.cardHolder !== undefined) {
            updates.cardHolder = String(body.cardHolder || "").slice(0, 120);
        }
        if (body.cardLast4 !== undefined) {
            const d = String(body.cardLast4 || "").replace(/\D/g, "");
            updates.cardLast4 = d.slice(-4);
        }

        if (body.items !== undefined) {
            const nextItems = normalizeOrderItemsFromBody(body.items);
            if (nextItems.length === 0) {
                return res.status(400).json({ message: "Add at least one item with quantity 1 or more." });
            }
            const oldLines = stockLinesFromOrderItems(order.items);
            const newLines = stockLinesFromOrderItems(nextItems);
            await restoreStockForLines(oldLines);
            try {
                await applyStockForLines(newLines);
            } catch (stockErr) {
                try {
                    await applyStockForLines(oldLines);
                } catch (reapplyErr) {
                    console.error("[patch pending] failed to re-apply original stock after edit failure", reapplyErr);
                }
                return res.status(400).json({
                    message: stockErr.message || "Could not apply stock for updated items.",
                });
            }
            updates.items = nextItems;
            const amount = nextItems.reduce(
                (s, i) => s + (Number(i.lineTotal) || Number(i.unitPrice) * Number(i.quantity) || 0),
                0
            );
            updates.amount = Math.round(amount * 100) / 100;
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ message: "Nothing to update." });
        }

        const updated = await Order.findByIdAndUpdate(id, { $set: updates }, { new: true }).lean();
        if (!updated) {
            return res.status(404).json({ message: "Not found" });
        }
        res.json(serializeOrder(updated));
    } catch (err) {
        res.status(400).json({ message: err.message || "Could not update order" });
    }
});

const ORDER_STATUS_ENUM = [
    "Accepted",
    "Preparing",
    "Ready",
    "Out for Delivery",
    "Delivered",
    "Cancelled",
];

/** Update fulfilment status / rider (admin workflow). */
router.patch("/orders/:id", async (req, res) => {
    try {
        const id = req.params.id;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid id" });
        }
        const body = req.body || {};
        const existingOrder = await Order.findById(id).lean();
        if (!existingOrder) {
            return res.status(404).json({ message: "Not found" });
        }
        if (existingOrder.adminStatus === "rejected") {
            return res.status(400).json({ message: "This order was rejected and cannot be updated." });
        }
        const updates = {};
        if (body.orderStatus != null) {
            const s = String(body.orderStatus);
            if (!ORDER_STATUS_ENUM.includes(s)) {
                return res.status(400).json({ message: "Invalid orderStatus" });
            }
            updates.orderStatus = s;
        }
        const touchesRider = body.riderName != null || body.riderPhone != null;
        if (touchesRider) {
            if (existingOrder.orderStatus !== "Ready") {
                return res.status(400).json({
                    message: "Rider details can only be updated when order status is Ready.",
                });
            }
        }
        if (body.riderName != null) {
            const nm = String(body.riderName).trim().slice(0, 120);
            if (nm.length > 0 && nm.length < 2) {
                return res.status(400).json({ message: "riderName must be at least 2 characters." });
            }
            updates.riderName = nm;
        }
        if (body.riderPhone != null) {
            const phoneDigits = String(body.riderPhone).replace(/\D/g, "");
            if (phoneDigits.length > 0 && (phoneDigits.length < 9 || phoneDigits.length > 15)) {
                return res.status(400).json({ message: "riderPhone must be 9–15 digits (numbers only)." });
            }
            updates.riderPhone = phoneDigits.slice(0, 15);
        }
        if (Object.keys(updates).length === 0) {
            return res.json(serializeOrder(existingOrder));
        }
        const updated = await Order.findByIdAndUpdate(id, { $set: updates }, { new: true }).lean();
        if (!updated) {
            return res.status(404).json({ message: "Not found" });
        }
        res.json(serializeOrder(updated));
    } catch (err) {
        res.status(400).json({ message: err.message || "Could not update order" });
    }
});

router.get("/orders/:id", async (req, res) => {
    try {
        const id = req.params.id;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid id" });
        }
        const doc = await Order.findById(id).lean();
        if (!doc) {
            return res.status(404).json({ message: "Not found" });
        }
        res.json(serializeOrder(doc));
    } catch (err) {
        res.status(500).json({ message: err.message || "Server error" });
    }
});

router.post("/food-items/:id/reviews", async (req, res) => {
    try {
        const id = req.params.id;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid id" });
        }
        const rating = Number(req.body?.rating);
        if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
            return res.status(400).json({ message: "Rating must be between 1 and 5" });
        }
        const item = await FoodItem.findById(id);
        if (!item) {
            return res.status(404).json({ message: "Food item not found" });
        }
        const n = item.review_count + 1;
        const newAvg = (item.average_rating * item.review_count + rating) / n;
        item.review_count = n;
        item.average_rating = Math.round(newAvg * 10) / 10;
        await item.save();
        const populated = await FoodItem.findById(id).populate("category");
        res.json(serializeFood(populated));
    } catch (err) {
        res.status(400).json({ message: err.message || "Could not submit review" });
    }
});

module.exports = router;
