import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Layout = ({ children }) => {
    const { isAuthenticated, logout } = useAuth();

    return (
        <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#f5f5f5' }}>
            <nav
                className="bg-white sticky top-0 z-50"
                style={{ borderBottom: '2px solid #000' }}
            >
                <div className="max-w-7xl mx-auto px-6 lg:px-8">
                    <div className="flex justify-between h-20 items-center">
                        <Link to="/" className="flex items-center gap-3">
                            <img src="/logo.png" alt="Logo" className="h-10 w-10" />
                            <span className="font-bold text-xl tracking-tight">QuickApply</span>
                        </Link>

                        <div className="flex gap-3">
                            {isAuthenticated ? (
                                <>
                                    <Link
                                        to="/profile"
                                        className="px-6 py-2.5 bg-white text-black rounded font-medium hover:bg-gray-50 transition-colors"
                                        style={{ border: '2px solid #000' }}
                                    >
                                        Go to Profile
                                    </Link>
                                    <button
                                        onClick={logout}
                                        className="px-6 py-2.5 bg-black text-white rounded font-medium hover:bg-gray-900 transition-colors"
                                    >
                                        Logout
                                    </button>
                                </>
                            ) : (
                                <Link
                                    to="/login"
                                    className="px-6 py-2.5 bg-black text-white rounded font-medium hover:bg-gray-900 transition-colors"
                                >
                                    Get Started
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            </nav>

            <main className="flex-grow">
                {children}
            </main>

            <footer
                className="bg-white py-8 mt-auto"
                style={{ borderTop: '2px solid #000' }}
            >
                <div className="max-w-7xl mx-auto px-6 text-center text-gray-500 text-sm">
                    <p>&copy; {new Date().getFullYear()} QuickApply. AI-Powered Job Applications.</p>
                </div>
            </footer>
        </div>
    );
};

export default Layout;
