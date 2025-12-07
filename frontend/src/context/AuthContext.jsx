import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    // Check session with backend
    const checkSession = async () => {
        try {
            const response = await fetch(`${backendUrl}/api/auth/session`, {
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                setIsAuthenticated(data.authenticated || false);
            } else {
                setIsAuthenticated(false);
            }
        } catch (error) {
            console.error('🔴 [AUTH_CONTEXT] Error checking session:', error);
            setIsAuthenticated(false);
        } finally {
            setLoading(false);
        }
    };

    // Logout function
    const logout = async () => {
        try {
            console.log('🚪 [AUTH_CONTEXT] Logout initiated');

            const response = await fetch(`${backendUrl}/api/auth/logout`, {
                method: 'POST',
                credentials: 'include'
            });

            if (response.ok) {
                // Clear local storage
                localStorage.removeItem('profileToken');

                // Clear chrome storage if available
                if (typeof chrome !== 'undefined' && chrome.storage) {
                    chrome.storage.local.remove(['authToken', 'profileToken'], () => {
                        console.log('✅ [AUTH_CONTEXT] Chrome storage cleared');
                    });
                }

                // Update authentication state
                setIsAuthenticated(false);

                console.log('✅ [AUTH_CONTEXT] Logout complete, redirecting...');

                // Navigate to home
                navigate('/');
            }
        } catch (error) {
            console.error('🔴 [AUTH_CONTEXT] Error during logout:', error);
        }
    };

    // Check session on mount
    useEffect(() => {
        checkSession();
    }, []);

    const value = {
        isAuthenticated,
        setIsAuthenticated,
        loading,
        checkSession,
        logout
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

// Custom hook to use auth context
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
