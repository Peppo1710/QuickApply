const express = require('express');
const router = express.Router();
const UserProfile = require('../models/UserProfile');
const authMiddleware = require('../middleware/auth');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// POST /api/profile/save - Save profile and generate JWT (no auth required, but can have OAuth token)
router.post('/save', async (req, res) => {
    try {
        const profileData = req.body;
        
        // Check if request has OAuth token in Authorization header or session
        let oauthInfo = null;
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            try {
                const token = authHeader.substring(7);
                const decoded = jwt.verify(token, JWT_SECRET);
                    // Use email from JWT if not provided in body
                    if (!profileData.email && decoded.email) {
                        profileData.email = decoded.email;
                    }
            } catch (err) {
                // Invalid token, continue
            }
        }
        
        // Check session for OAuth info
        if (req.session && req.session.googleId) {
            oauthInfo = {
                googleId: req.session.googleId,
                googleAccessToken: req.session.googleAccessToken,
                googleRefreshToken: req.session.googleRefreshToken
            };
            // Use email from session if not provided in body
            if (!profileData.email && req.session.email) {
                profileData.email = req.session.email;
            }
        }

        // Find existing profile by email or googleId
        let profile = null;
        if (profileData.email) {
            profile = await UserProfile.findOne({ email: profileData.email.toLowerCase() });
        }
        if (!profile && oauthInfo && oauthInfo.googleId) {
            profile = await UserProfile.findOne({ googleId: oauthInfo.googleId });
        }

        if (profile) {
            // Update existing profile
            Object.assign(profile, {
                ...profileData,
                email: profileData.email.toLowerCase(),
                lastUpdated: Date.now()
            });
            // Add OAuth info if available
            if (oauthInfo) {
                profile.googleId = oauthInfo.googleId;
                profile.googleAccessToken = oauthInfo.googleAccessToken;
                profile.googleRefreshToken = oauthInfo.googleRefreshToken;
            }
            await profile.save();
        } else {
            // Create new profile
            const defaultPassword = await bcrypt.hash('default-password', 10);
            const newProfileData = {
                ...profileData,
                email: profileData.email.toLowerCase(),
                password: defaultPassword
            };
            // Add OAuth info if available
            if (oauthInfo) {
                newProfileData.googleId = oauthInfo.googleId;
                newProfileData.googleAccessToken = oauthInfo.googleAccessToken;
                newProfileData.googleRefreshToken = oauthInfo.googleRefreshToken;
            }
            profile = new UserProfile(newProfileData);
            await profile.save();
        }

        // Generate new JWT with only email
        const token = jwt.sign(
            { email: profile.email },
            JWT_SECRET,
            { expiresIn: '30d' }
        );

        const profileResponse = profile.toObject();
        delete profileResponse.password;

        res.json({
            message: 'Profile saved successfully',
            profile: profileResponse,
            token
        });
    } catch (error) {
        console.error('🔴 [BACKEND] Error saving profile:', error);
        res.status(500).json({ error: 'Failed to save profile', details: error.message });
    }
});

// PUT /api/profile/update - Update existing profile fields (auth required)
router.put('/update', authMiddleware, async (req, res) => {
    try {
        const updates = { ...req.body };
        
        if (!req.user || !req.user.email) {
            return res.status(401).json({ error: 'Invalid authentication' });
        }

        // Find profile by email
        let profile = await UserProfile.findOne({ email: req.user.email.toLowerCase() });

        if (!profile) {
            return res.status(404).json({ error: 'Profile not found. Please save your profile first.' });
        }

        if (updates.email) {
            updates.email = updates.email.toLowerCase();
        }

        // Add OAuth info from session if present and not already in profile
        if (req.session && req.session.googleId && !profile.googleId) {
            profile.googleId = req.session.googleId;
            if (req.session.googleAccessToken) {
                profile.googleAccessToken = req.session.googleAccessToken;
            }
            if (req.session.googleRefreshToken) {
                profile.googleRefreshToken = req.session.googleRefreshToken;
            }
        }

        Object.assign(profile, updates, { lastUpdated: Date.now() });
        await profile.save();

        const profileResponse = profile.toObject();
        delete profileResponse.password;

        res.json({
            message: 'Profile updated successfully',
            profile: profileResponse
        });
    } catch (error) {
        console.error('🔴 [BACKEND] Error updating profile:', error);
        res.status(500).json({ error: 'Failed to update profile', details: error.message });
    }
});

// GET /api/profile/get - Get profile with JWT
router.get('/get', authMiddleware, async (req, res) => {
    try {
        console.log("🔵 [BACKEND] GET /api/profile/get called");
        console.log("🔵 [BACKEND] req.user:", req.user ? {
            email: req.user.email
        } : "null");
        
        if (!req.user || !req.user.email) {
            return res.status(401).json({ error: 'Invalid authentication' });
        }

        // Find profile by email
        const profile = await UserProfile.findOne({ email: req.user.email.toLowerCase() }).select('-password');

        if (!profile) {
            console.log("🔵 [BACKEND] No profile found, returning empty object");
            // Return empty profile object if not found (user hasn't saved profile yet)
            return res.json({});
        }

        console.log("🔵 [BACKEND] Profile found:", {
            _id: profile._id,
            email: profile.email,
            fullName: profile.fullName
        });
        res.json(profile);
    } catch (error) {
        console.error("🔴 [BACKEND] Error fetching profile:", error);
        console.error("🔴 [BACKEND] Error stack:", error.stack);
        res.status(500).json({ error: 'Failed to load profile' });
    }
});

// Keep old routes for backward compatibility with extension
// router.get('/', authMiddleware, async (req, res) => {
//     try {
//         const profile = await UserProfile.findById(req.user.userId).select('-password');

//         if (!profile) {
//             return res.json({});
//         }

//         res.json(profile);
//     } catch (error) {
//         console.error('Error fetching profile:', error);
//         res.status(500).json({ error: 'Failed to load profile' });
//     }
// });

module.exports = router;
