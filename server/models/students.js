const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema({
    name: String,
    email: String,
    password: String
});

const studentModel = mongoose.model("students", studentSchema);

module.exports = studentModel;