const mongoose = require('mongoose');

const userProfileSchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true
    },
    currentRole: {
        type: String,
        required: true,
        trim: true
    },
    bio: {
        type: String,
        required: true
    },
    skills: {
        type: String,
        required: true
    },
    resumeUrl: {
        type: String,
        trim: true
    },
    portfolioUrl: {
        type: String,
        trim: true
    },
    linkedinUrl: {
        type: String,
        trim: true
    },
    githubUrl: {
        type: String,
        trim: true
    },
    phone: {
        type: String,
        trim: true
    },
    password: {
        type: String,
        required: false
    },
    googleId: {
        type: String,
        trim: true
    },
    googleAccessToken: {
        type: String,
        trim: true
    },
    googleRefreshToken: {
        type: String,
        trim: true
    },
    isLocked: {
        type: Boolean,
        default: false
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    }
});

// Create a singleton model - we assume one user for this MVP
// In a real app, we'd have auth and multiple users
const UserProfile = mongoose.model('UserProfile', userProfileSchema);

module.exports = UserProfile;
