require('dotenv').config();

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const cookieSession = require('cookie-session');

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
    "https://linkedin.com",
];

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (Postman, curl, etc.)
        if (!origin) return callback(null, true);

        console.log("🌐 Incoming Origin:", origin);

        const isWhitelisted =
            allowedOrigins.includes(origin) ||
            origin.startsWith("http://localhost:") ||
            origin.startsWith("https://localhost:") ||
            origin.startsWith("chrome-extension://");

        if (isWhitelisted) {
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

/* -----------------------------------------------------
   ✅ SESSION CONFIGURATION
------------------------------------------------------*/
app.use(cookieSession({
    name: 'session',
    keys: [process.env.SESSION_SECRET || 'your-session-secret-key-change-in-production'],
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // Only send over HTTPS in production
    sameSite: 'lax'
}));

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
            console.log("🔵 [BACKEND] OAuth callback received");
            console.log("🔵 [BACKEND] req.user:", req.user ? {
                email: req.user.email,
                googleId: req.user.googleId,
                fullName: req.user.fullName,
                hasGoogleAccessToken: !!req.user.googleAccessToken,
                hasGoogleRefreshToken: !!req.user.googleRefreshToken
            } : "null");
            
            const JWT_SECRET = process.env.JWT_SECRET;
            const oauthUser = req.user; // Google user info

            if (!oauthUser) {
                console.error("🔴 [BACKEND] OAuth user is null");
                res.redirect(`${FRONTEND}/auth/callback?error=no_user`);
                return;
            }

            // Create session with user email
            req.session.email = oauthUser.email;
            req.session.googleId = oauthUser.googleId;
            req.session.googleAccessToken = oauthUser.googleAccessToken;
            req.session.googleRefreshToken = oauthUser.googleRefreshToken;

            // Generate JWT with only email
            const token = jwt.sign(
                { email: oauthUser.email },
                JWT_SECRET,
                { expiresIn: "30d" }
            );
            console.log(token.email);
            

            const redirectUrl = `${FRONTEND}/auth/callback?token=${token}`;
            console.log("🔵 [BACKEND] Session created and token generated successfully");
            console.log("🔵 [BACKEND] Token length:", token.length);
            console.log("🔵 [BACKEND] Token preview:", token.substring(0, 50) + "...");
            console.log("🔵 [BACKEND] Redirecting to:", redirectUrl);
            console.log("🔵 [BACKEND] FRONTEND URL:", FRONTEND);

            res.redirect(redirectUrl);
        } catch (error) {
            console.error("🔴 [BACKEND] OAuth callback error:", error);
            console.error("🔴 [BACKEND] Error stack:", error.stack);
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
