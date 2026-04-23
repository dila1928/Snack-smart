const mongoose = require("mongoose");

const offerSchema = new mongoose.Schema(
    {
        title: { type: String, required: true, trim: true },
        discount_label: { type: String, required: true, trim: true },
        /** LKR — optional list price; offer price is derived from discount text on the client */
        original_price: { type: Number, default: undefined },
        available_count: { type: Number, default: 0, min: 0 },
        sort_order: { type: Number, default: 0 },
        is_active: { type: Boolean, default: true },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Offer", offerSchema);
