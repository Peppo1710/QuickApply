require('dotenv').config();
// console.log(process.env.PORT );
// console.log(process.env.GROQ_API_KEY);
// console.log(process.env.CLIENT_ID);
// console.log(process.env.CLIENT_SECRET);
// console.log(process.env.MONGO_URI);
// console.log(process.env.GROQ_API_KEY);

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

// Middleware
// CORS configuration to allow both frontend and extension (LinkedIn) origins
const allowedOrigins = [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    'https://www.linkedin.com',
    'https://linkedin.com'
];

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps, Postman, or extension background scripts)
        if (!origin) return callback(null, true);
        
        // Check if origin exactly matches or starts with allowed origins
        const isAllowed = allowedOrigins.some(allowed => {
            return origin === allowed || origin.startsWith(allowed);
        });
        
        if (isAllowed) {
            callback(null, true);
        } else {
            // For development, allow localhost origins
            if (origin.startsWith('http://localhost:') || origin.startsWith('https://localhost:')) {
                callback(null, true);
            } else {
                console.warn('CORS blocked origin:', origin);
                callback(new Error('Not allowed by CORS'));
            }
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(passport.initialize());

// MongoDB Connection (single-user profile, no traditional login system)
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ MongoDB Connected'))
    .catch(err => console.error('❌ MongoDB Connection Error:', err));

// Routes
app.use('/api/auth', authRoutes);

// OAuth callback route (mounted separately to match Google Console callback URL: /oauth/callback)
app.get('/oauth/callback', 
    passport.authenticate('google', { session: false }),
    async (req, res) => {
        try {
            const JWT_SECRET = process.env.JWT_SECRET ;
            const FRONTEND_URL = process.envFRONTEND_URL;
            const oauthUser = req.user; // This is the OAuth info, not a DB user
            
            // Generate JWT token with OAuth info embedded
            // Profile will be created in DB when user saves the form
            const token = jwt.sign(
                { 
                    email: oauthUser.email,
                    googleId: oauthUser.googleId,
                    fullName: oauthUser.fullName,
                    googleAccessToken: oauthUser.googleAccessToken,
                    googleRefreshToken: oauthUser.googleRefreshToken
                },
                JWT_SECRET,
                { expiresIn: '30d' }
            );
            
            // Redirect to frontend with token
            res.redirect(`${FRONTEND_URL}/auth/callback?token=${token}`);
        } catch (error) {
            console.error('OAuth callback error:', error);
            const FRONTEND_URL = process.env.FRONTEND_URL ;
            res.redirect(`${FRONTEND_URL}/auth/callback?error=authentication_failed`);
        }
    }
);
app.use('/api/profile', profileRoutes);
app.use('/api/apply', applyRoutes);

app.get('/api/status', (req, res) => {
    res.json({
        status: 'ok',
        mongo: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
.