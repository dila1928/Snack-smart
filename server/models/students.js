const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema({
    name: String,
    email: String,
    password: String,
    profileFullName: { type: String, default: "" },
    profileImage: { type: String, default: "" },
    profilePhoneNumber: { type: String, default: "" },
    profileEmail: { type: String, default: "" },
    profileDietPreference: { type: String, default: "No Preference" },
    profileNotificationPreference: { type: String, default: "Email" },
});

const studentModel = mongoose.model("students", studentSchema);

module.exports = studentModel;