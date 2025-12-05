require('dotenv').config();

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const passport = require('passport');
const jwt = require('jsonwebtoken');

const profileRoutes = require('./routes/profileRoutes');
const applyRoutes = require('./routes/applyRoutes');
const authRoutes = require('./routes/authRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

/* -----------------------------------------------------
   ✅ FIXED FRONTEND URL (NO TRAILING SLASH EVER)
------------------------------------------------------*/
const FRONTEND = (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/$/, "");

/* -----------------------------------------------------
   ✅ CLEAN, SAFE CORS CONFIG
------------------------------------------------------*/
const allowedOrigins = [
    FRONTEND,
    "https://www.linkedin.com",
    "https://linkedin.com"
];

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (Postman, extensions, mobile apps)
        if (!origin) return callback(null, true);

        console.log("🌐 Incoming Origin:", origin);

        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        // Allow local dev
        if (origin.startsWith("http://localhost:") || origin.startsWith("https://localhost:")) {
            return callback(null, true);
        }

        console.warn("❌ CORS Blocked Origin:", origin);
        return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());
app.use(passport.initialize());

/* -----------------------------------------------------
   ✅ MONGO CONNECTION
------------------------------------------------------*/
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ MongoDB Connected"))
    .catch(err => console.error("❌ MongoDB Connection Error:", err));

/* -----------------------------------------------------
   ✅ ROUTES
------------------------------------------------------*/
app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/apply", applyRoutes);

/* -----------------------------------------------------
   ✅ GOOGLE OAUTH CALLBACK → FRONTEND
------------------------------------------------------*/
app.get("/oauth/callback",
    passport.authenticate("google", { session: false }),
    async (req, res) => {
        try {
            const JWT_SECRET = process.env.JWT_SECRET;
            const oauthUser = req.user; // Google user info

            const token = jwt.sign(
                {
                    email: oauthUser.email,
                    googleId: oauthUser.googleId,
                    fullName: oauthUser.fullName,
                    googleAccessToken: oauthUser.googleAccessToken,
                    googleRefreshToken: oauthUser.googleRefreshToken
                },
                JWT_SECRET,
                { expiresIn: "30d" }
            );

            console.log("🔐 Redirecting to:", `${FRONTEND}/auth/callback?token=${token}`);

            res.redirect(`${FRONTEND}/auth/callback?token=${token}`);
        } catch (error) {
            console.error("OAuth callback error:", error);
            res.redirect(`${FRONTEND}/auth/callback?error=authentication_failed`);
        }
    }
);

/* -----------------------------------------------------
   ✅ API STATUS (for debugging)
------------------------------------------------------*/
app.get("/api/status", (req, res) => {
    res.json({
        status: "ok",
        mongo: mongoose.connection.readyState === 1 ? "connected" : "disconnected"
    });
});

/* -----------------------------------------------------
   ✅ START SERVER
------------------------------------------------------*/
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
