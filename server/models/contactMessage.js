const mongoose = require("mongoose");

const contactMessageSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true, minlength: 2, maxlength: 120 },
        email: { type: String, required: true, trim: true, lowercase: true, maxlength: 180 },
        issueType: {
            type: String,
            required: true,
            enum: ["general", "order", "payment", "feedback"],
            default: "general",
        },
        message: { type: String, required: true, trim: true, minlength: 10, maxlength: 2000 },
    },
    { timestamps: true }
);

module.exports = mongoose.model("ContactMessage", contactMessageSchema);
