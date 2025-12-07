const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

const authMiddleware = async (req, res, next) => {
    try {
        console.log("🔵 [BACKEND] authMiddleware called");
        console.log("🔵 [BACKEND] Request path:", req.path);
        console.log("🔵 [BACKEND] Request method:", req.method);
        
        const authHeader = req.headers.authorization;
        console.log("🔵 [BACKEND] Authorization header:", authHeader ? `${authHeader.substring(0, 50)}...` : "null");

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            console.error("🔴 [BACKEND] authMiddleware: No token provided");
            return res.status(401).json({ error: 'No token provided' });
        }

        const token = authHeader.substring(7); // Remove 'Bearer ' prefix
        console.log("🔵 [BACKEND] Token extracted, length:", token.length);
        console.log("🔵 [BACKEND] Token preview:", token.substring(0, 50) + "...");

        const decoded = jwt.verify(token, JWT_SECRET);
        console.log("🔵 [BACKEND] Token verified successfully");
        console.log("🔵 [BACKEND] Decoded token:", {
            userId: decoded.userId,
            email: decoded.email,
            googleId: decoded.googleId,
            fullName: decoded.fullName
        });
        
        // JWT can contain either:
        // 1. { userId, email } - after profile is saved
        // 2. { email, googleId, ... } - after OAuth but before profile is saved
        req.user = decoded;

        next();
    } catch (error) {
        console.error("🔴 [BACKEND] authMiddleware error:", error.name);
        console.error("🔴 [BACKEND] authMiddleware error message:", error.message);
        
        if (error.name === 'JsonWebTokenError') {
            console.error("🔴 [BACKEND] Invalid token");
            return res.status(401).json({ error: 'Invalid token' });
        }
        if (error.name === 'TokenExpiredError') {
            console.error("🔴 [BACKEND] Token expired");
            return res.status(401).json({ error: 'Token expired' });
        }
        console.error("🔴 [BACKEND] Authentication failed:", error);
        return res.status(500).json({ error: 'Authentication failed' });
    }
};

module.exports = authMiddleware;
