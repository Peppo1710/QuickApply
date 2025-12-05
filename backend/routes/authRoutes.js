const express = require('express');
const router = express.Router();
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const UserProfile = require('../models/UserProfile');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET ;
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const BACKEND_URL = process.env.BACKEND_URL ;
const FRONTEND_URL = process.env.FRONTEND_URL ;

// Configure Google OAuth Strategy
if (CLIENT_ID && CLIENT_SECRET) {
    passport.use(new GoogleStrategy({
        clientID: CLIENT_ID,
        clientSecret: CLIENT_SECRET,
        callbackURL: `${BACKEND_URL}/oauth/callback`
    },
    async (accessToken, refreshToken, profile, done) => {
        try {
            // Don't create UserProfile in DB during OAuth
            // Just pass OAuth info to callback - profile will be created when user saves the form
            const oauthUser = {
                googleId: profile.id,
                email: profile.emails[0].value.toLowerCase(),
                fullName: profile.displayName || '',
                googleAccessToken: accessToken,
                googleRefreshToken: refreshToken
            };
            
            return done(null, oauthUser);
        } catch (error) {
            return done(error, null);
        }
    }));
} else {
    console.warn('[Quick Apply][Backend] Google OAuth credentials (CLIENT_ID, CLIENT_SECRET) not configured. OAuth will not work.');
}

// Serialize user for session (not used with session: false, but required by passport)
passport.serializeUser((user, done) => {
    // Since we're not using sessions, just pass the user object
    done(null, user);
});

passport.deserializeUser(async (user, done) => {
    // Since we're not using sessions, just pass the user object back
    done(null, user);
});

// Initiate Google OAuth
router.get('/google',
    passport.authenticate('google', {
        scope: ['profile', 'email', 'https://www.googleapis.com/auth/gmail.send']
    })
);


// Get current user (for checking auth status)
router.get('/me', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }
        
        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, JWT_SECRET);
        
        let user = null;
        
        // Find user by userId (if exists) or by email/googleId
        if (decoded.userId) {
            user = await UserProfile.findById(decoded.userId).select('-password -googleAccessToken -googleRefreshToken');
        } else if (decoded.email) {
            user = await UserProfile.findOne({ email: decoded.email.toLowerCase() }).select('-password -googleAccessToken -googleRefreshToken');
        } else if (decoded.googleId) {
            user = await UserProfile.findOne({ googleId: decoded.googleId }).select('-password -googleAccessToken -googleRefreshToken');
        }
        
        if (!user) {
            // User is authenticated but hasn't saved profile yet
            return res.json({ 
                authenticated: true, 
                hasProfile: false,
                email: decoded.email || null
            });
        }
        
        res.json({ user, authenticated: true, hasProfile: true });
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
});

module.exports = router;

