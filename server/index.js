const express = require("express");
const mongoose = require("mongoose");
const dns = require("dns");
const cors = require("cors");
const Studentmodel = require("./models/students.js");
const apiRoutes = require("./routes/api.js");
const { validatePassword } = require("./passwordValidation.js");

const app = express();
app.use(express.json());
app.use(cors());

/** Fallback admin login route so staff auth works even if /routes/api.js changes. */
app.post("/api/admin/login", (req, res) => {
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
        return res.status(500).json({ message: err.message || "Server error" });
    }
});

app.use("/api", apiRoutes);

dns.setServers(["8.8.8.8", "1.1.1.1"]);

mongoose
    .connect(
        "mongodb+srv://admin:Dilshan1234@cluster0.mi0xh.mongodb.net/canteen?retryWrites=true&w=majority&appName=Cluster0"
    )
    .then(() => console.log("MongoDB connected"))
    .catch((err) => console.log(err));

app.post("/register", (req, res) => {
    const { name, email, password } = req.body || {};
    if (!String(name || "").trim() || !String(email || "").trim() || !String(password || "").trim()) {
        return res.status(400).json({ message: "All fields are required" });
    }
    Studentmodel.create(req.body)
        .then((student) => res.json(student))
        .catch((err) => res.status(400).json({ message: err.message || "Registration failed" }));
});

app.post("/login", (req, res) => {
    const { email, password } = req.body || {};
    if (!String(email || "").trim() || !String(password || "").trim()) {
        return res.status(400).json({ message: "Email and password are required" });
    }
    Studentmodel.findOne({ email })
        .then((user) => {
            if (user) {
                if (user.password === password) {
                    res.json("success");
                } else {
                    res.json("password is incorrect");
                }
            } else {
                res.json("user does not exists");
            }
        })
        .catch((err) => res.status(500).json({ message: err.message }));
});

/** Requires current password — used from login page */
app.post("/change-password", async (req, res) => {
    try {
        const { email, currentPassword, newPassword } = req.body || {};
        const em = String(email || "").trim();
        const cur = String(currentPassword || "").trim();
        const neu = String(newPassword || "").trim();
        if (!em || !cur || !neu) {
            return res.status(400).json({ message: "Email, current password, and new password are required" });
        }
        const user = await Studentmodel.findOne({ email: em });
        if (!user) {
            return res.status(404).json({ message: "No account found with this email" });
        }
        if (user.password !== cur) {
            return res.status(401).json({ message: "Current password is incorrect" });
        }
        if (user.password === neu) {
            return res.status(400).json({ message: "New password must be different from your current password" });
        }
        const pwdCheck = validatePassword(neu);
        if (!pwdCheck.ok) {
            return res.status(400).json({ message: pwdCheck.message });
        }
        await Studentmodel.updateOne({ email: em }, { password: neu });
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ message: err.message || "Could not update password" });
    }
});

/** Forgot password — set a new password if the account exists */
app.post("/reset-password", async (req, res) => {
    try {
        const { email, newPassword } = req.body || {};
        const em = String(email || "").trim();
        const neu = String(newPassword || "").trim();
        if (!em || !neu) {
            return res.status(400).json({ message: "Email and new password are required" });
        }
        const user = await Studentmodel.findOne({ email: em });
        if (!user) {
            return res.status(404).json({ message: "No account found with this email" });
        }
        if (user.password === neu) {
            return res.status(400).json({ message: "Choose a password different from your current one" });
        }
        const pwdCheck = validatePassword(neu);
        if (!pwdCheck.ok) {
            return res.status(400).json({ message: pwdCheck.message });
        }
        await Studentmodel.updateOne({ email: em }, { password: neu });
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ message: err.message || "Could not reset password" });
    }
});

app.listen(3001, () => {
    console.log("server is running");
});
