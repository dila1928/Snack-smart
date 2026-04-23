const mongoose = require("mongoose");

const lineItemSchema = new mongoose.Schema(
    {
        id: { type: String, default: "" },
        name: { type: String, default: "" },
        quantity: { type: Number, default: 0 },
        unitPrice: { type: Number, default: 0 },
        lineTotal: { type: Number, default: 0 },
        image_url: { type: String, default: "" },
        isOffer: { type: Boolean, default: false },
    },
    { _id: false }
);

const orderSchema = new mongoose.Schema(
    {
        orderId: { type: String, required: true, unique: true, trim: true },
        transactionId: { type: String, default: "" },
        email: { type: String, default: "" },
        paymentMethod: { type: String, enum: ["card", "cash"], required: true },
        cardHolder: { type: String, default: "" },
        cardLast4: { type: String, default: "" },
        amount: { type: Number, required: true, min: 0 },
        orderNote: { type: String, default: "" },
        items: [lineItemSchema],
        /** Awaiting admin confirmation after checkout */
        adminStatus: {
            type: String,
            enum: ["pending_accept", "accepted", "rejected"],
            default: "pending_accept",
        },
        /** Kitchen / delivery pipeline */
        orderStatus: {
            type: String,
            enum: ["Pending", "Accepted", "Preparing", "Ready", "Out for Delivery", "Delivered", "Cancelled"],
            default: "Pending",
        },
        acceptedAt: { type: Date, default: null },
        rejectedAt: { type: Date, default: null },
        riderName: { type: String, default: "" },
        riderPhone: { type: String, default: "" },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);
