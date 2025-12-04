import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const AuthCallback = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    useEffect(() => {
        const token = searchParams.get('token');
        const error = searchParams.get('error');

        if (error) {
            console.error('Authentication error:', error);
            navigate('/login?error=authentication_failed');
            return;
        }

        if (token) {
            // Store token in localStorage for authentication
            // NOTE: Do NOT set chrome.storage here - extension status only turns on after profile is saved
            localStorage.setItem('profileToken', token);

            // Redirect to profile page where user can fill in their details
            navigate('/profile');
        } else {
            navigate('/login?error=no_token');
        }
    }, [searchParams, navigate]);

    return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="text-xl">Completing authentication...</div>
        </div>
    );
};

export default AuthCallback;

