import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const LandingPage = () => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
    const { isAuthenticated } = useAuth();

    // Wake up backend on mount
    useEffect(() => {
        const wakeUpBackend = async () => {
            try {
                await fetch(`${backendUrl}/api/status`);
            } catch (error) {
                console.error('🔴 [FRONTEND] Error waking up backend:', error);
            }
        };

        wakeUpBackend();
    }, [backendUrl]);

    return (
        <div>
            {/* Hero Section - Centered */}
            <section className="pt-32 pb-20 px-6 lg:px-8 max-w-4xl mx-auto text-center">
                <h1 className="text-6xl lg:text-7xl font-bold tracking-tight mb-6 leading-tight">
                    Automate LinkedIn,<br />
                    Land Your Dream Job
                </h1>

                <p className="text-lg text-gray-600 mb-10 leading-relaxed max-w-2xl mx-auto">
                    AI-powered job applications with one click.
                    Generate personalized emails instantly and apply faster than ever.
                </p>

                <div className="flex gap-4 justify-center">
                    {!isAuthenticated ? (
                        <>
                            <Link
                                to="/login"
                                className="px-8 py-3 bg-black text-white rounded font-medium hover:bg-gray-900 transition-colors inline-flex items-center gap-2"
                            >
                                Get Started
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M6 12l4-4-4-4" />
                                </svg>
                            </Link>
                            <a
                                href="/demo"
                                className="px-8 py-3 bg-white text-black rounded font-medium hover:bg-gray-50 transition-colors"
                                style={{ border: '2px solid #000' }}
                            >
                                Demo and Extension
                            </a>

                        </>
                    ) : (
                        <>
                            <Link
                                to="/profile"
                                className="px-8 py-3 bg-black text-white rounded font-medium hover:bg-gray-900 transition-colors inline-flex items-center gap-2"
                            >
                                Go to Profile
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M6 12l4-4-4-4" />
                                </svg>
                            </Link>
                            <a
                                href="/demo"
                                className="px-8 py-3 bg-white text-black rounded font-medium hover:bg-gray-50 transition-colors ml-4"
                                style={{ border: '2px solid #000' }}
                            >
                                Extension and Demo
                            </a>
                        </>
                    )}
                </div>
            </section>

            {/* Features Grid */}
            <section id="features" className="py-20 px-6 lg:px-8 max-w-7xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <FeatureCard
                        icon={
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                            </svg>
                        }
                        title="AI-Powered Emails"
                        description="Generate personalized application emails using AI. Each email is tailored to the job description and your profile."
                    />
                    <FeatureCard
                        icon={
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                            </svg>
                        }
                        title="One-Click Apply"
                        description="Chrome extension injects 'Quick Apply' buttons directly into LinkedIn posts. Apply to jobs without leaving your feed."
                    />
                    <FeatureCard
                        icon={
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                            </svg>
                        }
                        title="Secure & Private"
                        description="Your data stays in your MongoDB database. No third-party tracking. Full control over your profile and applications."
                    />
                </div>
            </section>

            {/* How It Works Section */}
            <section className="py-20 px-6 lg:px-8 max-w-7xl mx-auto">
                <div className="max-w-3xl mx-auto">
                    <p className="text-sm text-gray-400 uppercase tracking-wider mb-4 text-center">HOW IT WORKS</p>
                    <h2 className="text-5xl font-bold mb-12 text-center">Simple. Fast. Effective.</h2>

                    <div className="space-y-6">
                        <StepCard
                            number="1"
                            title="Set Up Your Profile"
                            description="Add your details, skills, resume, and portfolio links once in the dashboard."
                        />
                        <StepCard
                            number="2"
                            title="Browse LinkedIn"
                            description="See job posts on LinkedIn? Click the 'Quick Apply' button that appears automatically."
                        />
                        <StepCard
                            number="3"
                            title="AI Generates Email"
                            description="Our AI creates a personalized application email. Edit it if needed, then send with one click."
                        />
                    </div>
                </div>
            </section>
        </div>
    );
};

const FeatureCard = ({ icon, title, description }) => (
    <div
        className="p-8 rounded-lg bg-white hover:shadow-lg transition-shadow"
        style={{ border: '2px solid #000' }}
    >
        <div className="mb-4 text-black">
            {icon}
        </div>
        <h3 className="text-xl font-bold mb-3">{title}</h3>
        <p className="text-gray-600 leading-relaxed text-sm">{description}</p>
    </div>
);

const StepCard = ({ number, title, description }) => (
    <div
        className="p-6 rounded-lg bg-white flex gap-6 items-start"
        style={{ border: '2px solid #000' }}
    >
        <div
            className="w-12 h-12 rounded-full bg-black text-white flex items-center justify-center font-bold text-xl flex-shrink-0"
        >
            {number}
        </div>
        <div>
            <h3 className="text-xl font-bold mb-2">{title}</h3>
            <p className="text-gray-600 text-sm">{description}</p>
        </div>
    </div>
);

export default LandingPage;
