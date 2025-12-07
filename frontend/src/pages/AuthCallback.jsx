import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const AuthCallback = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    useEffect(() => {
        console.log("🟢 [FRONTEND] AuthCallback component mounted");
        console.log("🟢 [FRONTEND] Current URL:", window.location.href);
        console.log("🟢 [FRONTEND] Search params:", window.location.search);
        
        const token = searchParams.get('token');
        const error = searchParams.get('error');

        console.log("🟢 [FRONTEND] Token from URL:", token ? `${token.substring(0, 50)}...` : "null");
        console.log("🟢 [FRONTEND] Error from URL:", error || "null");

        if (error) {
            console.error("🔴 [FRONTEND] Authentication error received:", error);
            navigate('/login?error=authentication_failed', { replace: true });
            return;
        }

        if (token) {
            console.log("🟢 [FRONTEND] Token received, storing in localStorage");
            console.log("🟢 [FRONTEND] Token length:", token.length);
            
            // Store token in localStorage for authentication
            // NOTE: Do NOT set chrome.storage here - extension status only turns on after profile is saved
            localStorage.setItem('profileToken', token);
            
            // Verify token was stored
            const storedToken = localStorage.getItem('profileToken');
            console.log("🟢 [FRONTEND] Token stored in localStorage:", storedToken ? "YES" : "NO");
            console.log("🟢 [FRONTEND] Stored token matches:", storedToken === token ? "YES" : "NO");
            console.log("🟢 [FRONTEND] Stored token length:", storedToken?.length || 0);
            
            // Use setTimeout to ensure localStorage is written before navigation
            // This prevents race conditions with ProtectedRoute
            setTimeout(() => {
                console.log("🟢 [FRONTEND] Navigating to /profile");
                // Redirect to profile page where user can fill in their details
                navigate('/profile', { replace: true });
            }, 0);
        } else {
            console.error("🔴 [FRONTEND] No token in URL, redirecting to login");
            navigate('/login?error=no_token', { replace: true });
        }
    }, [searchParams, navigate]);

    return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="text-xl">Completing authentication...</div>
        </div>
    );
};

export default AuthCallback;

