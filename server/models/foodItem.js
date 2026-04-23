const mongoose = require("mongoose");

const foodItemSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        description: { type: String, default: "" },
        price: { type: Number, required: true, min: 0.01 },
        inventory_count: { type: Number, default: 0, min: 0, max: 100 },
        category: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Category",
            required: true,
        },
        image_url: { type: String, default: "" },
        is_available: { type: Boolean, default: true },
        average_rating: { type: Number, default: 0, min: 0, max: 5 },
        review_count: { type: Number, default: 0, min: 0 },
        click_count: { type: Number, default: 0, min: 0 },
    },
    { timestamps: true }
);

module.exports = mongoose.model("FoodItem", foodItemSchema);
