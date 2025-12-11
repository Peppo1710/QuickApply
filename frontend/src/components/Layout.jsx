import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Layout = ({ children }) => {
    const { isAuthenticated, logout } = useAuth();
    const [showDevModal, setShowDevModal] = useState(false);

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

                        <div className="flex gap-3 items-center">
                            <button
                                onClick={() => setShowDevModal(true)}
                                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-black transition-colors"
                            >
                                Dev
                            </button>
                            {isAuthenticated ? (
                                <>
                                    {/* <Link
                                        to="/profile"
                                        className="px-6 py-2.5 bg-white text-black rounded font-medium hover:bg-gray-50 transition-colors"
                                        style={{ border: '2px solid #000' }}
                                    >
                                        Go to Profile
                                    </Link> */}
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

            {/* Dev Modal */}
            {showDevModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowDevModal(false)}>
                    <div className="bg-white p-8 rounded-lg max-w-md w-full relative border-2 border-black" onClick={e => e.stopPropagation()}>
                        <button
                            onClick={() => setShowDevModal(false)}
                            className="absolute top-4 right-4 text-gray-500 hover:text-black"
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M18 6L6 18M6 6l12 12" />
                            </svg>
                        </button>
                        <h3 className="text-xl font-bold mb-4">Developer Info</h3>
                        <p className="text-gray-800 text-lg leading-relaxed">
                            Hii myself pradyumn shirsath developer of this project . minimal .
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Layout;
