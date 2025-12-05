import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

const emptyProfile = {
    fullName: '',
    email: '',
    phone: '',
    currentRole: '',
    bio: '',
    skills: '',
    resumeUrl: '',
    portfolioUrl: '',
    linkedinUrl: '',
    githubUrl: ''
};

const Profile = () => {
    const navigate = useNavigate();
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
    const [profile, setProfile] = useState({
        fullName: '',
        email: '',
        phone: '',
        currentRole: '',
        bio: '',
        skills: '',
        resumeUrl: '',
        portfolioUrl: '',
        linkedinUrl: '',
        githubUrl: ''
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [saveToast, setSaveToast] = useState(null);
    const [token, setToken] = useState(null);
    const [hasExistingProfile, setHasExistingProfile] = useState(false);

    useEffect(() => {
        fetchProfile();
    }, []);

    useEffect(() => {
        if (success) {
            const timeout = setTimeout(() => setSuccess(null), 3000);
            return () => clearTimeout(timeout);
        }
    }, [success]);

    useEffect(() => {
        if (saveToast) {
            const timeout = setTimeout(() => setSaveToast(null), 3000);
            return () => clearTimeout(timeout);
        }
    }, [saveToast]);

    const fetchProfile = async () => {
        try {
            const storedToken = localStorage.getItem('profileToken');
            if (!storedToken) {
                // No token, redirect to login
                navigate('/login');
                return;
            }

            setToken(storedToken);
            const res = await fetch(`${backendUrl}/api/profile/get`, {
                headers: { 'Authorization': `Bearer ${storedToken}` }
            });

            if (res.status === 401) {
                // Token expired or invalid, redirect to login
                localStorage.removeItem('profileToken');
                navigate('/login');
                return;
            }

            if (res.ok) {
                const data = await res.json();
                // Check if profile exists (has required fields)
                if (data && data.email) {
                    setProfile(data);
                    setHasExistingProfile(true);
                } else {
                    // User is authenticated but hasn't saved profile yet
                    // Pre-fill with email from token if available
                    const storedToken = localStorage.getItem('profileToken');
                    if (storedToken) {
                        try {
                            // Try to decode token to get email (if it's an OAuth token)
                            // This is just for display, actual email will come from backend
                        } catch (e) {
                            // Ignore
                        }
                    }
                    setHasExistingProfile(false);
                }
            }
        } catch (err) {
            console.error('Failed to load profile:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        setProfile({ ...profile, [e.target.name]: e.target.value });
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError(null);
        setSuccess(null);

        try {
            const payload = { ...profile };
            delete payload._id;
            delete payload.__v;
            delete payload.lastUpdated;

            // Use 'update' only if user has an existing saved profile
            // Otherwise use 'save' (even if they have an OAuth token)
            const isUpdate = hasExistingProfile && Boolean(token);
            const endpoint = isUpdate ? 'update' : 'save';

            // Always send token if available (for both new saves with OAuth token and updates)
            const headers = {
                'Content-Type': 'application/json'
            };
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const res = await fetch(`${backendUrl}/api/profile/${endpoint}`, {
                method: isUpdate ? 'PUT' : 'POST',
                headers,
                body: JSON.stringify(payload)
            });

            if (!res.ok) throw new Error('Failed to save profile');

            const data = await res.json();

            // Handle token - update if new token is returned (after first save)
            if (data.token) {
                localStorage.setItem('profileToken', data.token);
                setToken(data.token);
            }

            // Set extension token ONLY when profile is saved (not on login)
            // This turns on the extension status
            if (window.chrome && chrome.storage) {
                const tokenToStore = data.token || token; // Use new token if available, otherwise existing token
                if (tokenToStore) {
                    chrome.storage.local.set({ authToken: tokenToStore });
                }
            }

            setProfile(data.profile || profile);
            setHasExistingProfile(true);
            setSaveToast('Changes saved successfully!');
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('profileToken');
        if (window.chrome && chrome.storage) {
            chrome.storage.local.remove('authToken');
        }
        setToken(null);
        setProfile(emptyProfile);
        setHasExistingProfile(false);
        setSuccess('Logged out successfully');
        // Redirect to login after a short delay
        setTimeout(() => {
            navigate('/login');
        }, 1000);
    };

    const lockedInputStyle = useMemo(() => ({
        border: `2px solid ${hasExistingProfile ? '#999' : '#000'}`,
        backgroundColor: hasExistingProfile ? '#f5f5f5' : '#fff',
        transition: 'all 0.2s ease',
        boxShadow: hasExistingProfile ? 'inset 0 0 0 1px rgba(0,0,0,0.04)' : 'none'
    }), [hasExistingProfile]);

    const lockedTextAreaStyle = {
        ...lockedInputStyle,
        resize: 'none'
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-xl">Loading...</div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto px-6 py-12">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-4xl font-bold">Your Profile</h1>
                    <p className="text-gray-600 mt-2">Set up your details for automated job applications</p>
                </div>
                {token && (
                    <button
                        onClick={handleLogout}
                        className="px-6 py-2.5 bg-white rounded font-medium hover:bg-gray-50 transition-colors"
                        style={{ border: '2px solid #000' }}
                    >
                        Logout
                    </button>
                )}
            </div>

            {error && (
                <div className="mb-6 p-4 rounded" style={{ backgroundColor: '#fee', border: '2px solid #c00', color: '#c00' }}>
                    {error}
                </div>
            )}

            {success && (
                <div className="mb-6 p-4 rounded" style={{ backgroundColor: '#efe', border: '2px solid #0c0', color: '#060' }}>
                    {success}
                </div>
            )}

            <form onSubmit={handleSave} className="space-y-6">
                {/* Personal Information */}
                <div className="bg-white rounded-lg p-6" style={{ border: '2px solid #000' }}>
                    <h2 className="text-2xl font-bold mb-6">Personal Information</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-2">Full Name *</label>
                            <input
                                type="text"
                                name="fullName"
                                value={profile.fullName}
                                onChange={handleChange}
                                required
                                className="w-full px-4 py-2.5 rounded focus:outline-none"
                                style={lockedInputStyle}
                                placeholder="John Doe"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2">Email *</label>
                            <input
                                type="email"
                                name="email"
                                value={profile.email}
                                onChange={handleChange}
                                required
                                className="w-full px-4 py-2.5 rounded focus:outline-none"
                                style={lockedInputStyle}
                                placeholder="john@example.com"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2">Phone</label>
                            <input
                                type="tel"
                                name="phone"
                                value={profile.phone}
                                onChange={handleChange}
                                className="w-full px-4 py-2.5 rounded focus:outline-none"
                                style={lockedInputStyle}
                                placeholder="+1 234 567 8900"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2">Current Role *</label>
                            <input
                                type="text"
                                name="currentRole"
                                value={profile.currentRole}
                                onChange={handleChange}
                                required
                                className="w-full px-4 py-2.5 rounded focus:outline-none"
                                style={lockedInputStyle}
                                placeholder="Software Engineer"
                            />
                        </div>
                    </div>
                </div>

                {/* About */}
                <div className="bg-white rounded-lg p-6" style={{ border: '2px solid #000' }}>
                    <h2 className="text-2xl font-bold mb-6">About You</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-2">Bio / Summary *</label>
                            <textarea
                                name="bio"
                                value={profile.bio}
                                onChange={handleChange}
                                required
                                rows="4"
                                className="w-full px-4 py-2.5 rounded focus:outline-none"
                                style={lockedTextAreaStyle}
                                placeholder="Brief professional summary..."
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2">Skills (comma separated) *</label>
                            <input
                                type="text"
                                name="skills"
                                value={profile.skills}
                                onChange={handleChange}
                                required
                                className="w-full px-4 py-2.5 rounded focus:outline-none"
                                style={lockedInputStyle}
                                placeholder="React, Node.js, Python, AWS..."
                            />
                        </div>
                    </div>
                </div>

                {/* Links */}
                <div className="bg-white rounded-lg p-6" style={{ border: '2px solid #000' }}>
                    <h2 className="text-2xl font-bold mb-6">Portfolio & Links</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-2">Resume URL</label>
                            <input
                                type="url"
                                name="resumeUrl"
                                value={profile.resumeUrl}
                                onChange={handleChange}
                                className="w-full px-4 py-2.5 rounded focus:outline-none"
                                style={lockedInputStyle}
                                placeholder="https://..."
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2">Portfolio URL</label>
                            <input
                                type="url"
                                name="portfolioUrl"
                                value={profile.portfolioUrl}
                                onChange={handleChange}
                                className="w-full px-4 py-2.5 rounded focus:outline-none"
                                style={lockedInputStyle}
                                placeholder="https://..."
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2">LinkedIn URL</label>
                            <input
                                type="url"
                                name="linkedinUrl"
                                value={profile.linkedinUrl}
                                onChange={handleChange}
                                className="w-full px-4 py-2.5 rounded focus:outline-none"
                                style={lockedInputStyle}
                                placeholder="https://linkedin.com/in/..."
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2">GitHub URL</label>
                            <input
                                type="url"
                                name="githubUrl"
                                value={profile.githubUrl}
                                onChange={handleChange}
                                className="w-full px-4 py-2.5 rounded focus:outline-none"
                                style={lockedInputStyle}
                                placeholder="https://github.com/..."
                            />
                        </div>
                    </div>
                </div>

                {/* Save Button */}
                <div className="flex justify-end items-center gap-4 relative">
                    {saveToast && (
                        <div
                            className="py-2 px-4 rounded text-sm"
                            style={{
                                backgroundColor: '#e7f8ef',
                                border: '2px solid #0c8a43',
                                color: '#0c8a43'
                            }}
                        >
                            {saveToast}
                        </div>
                    )}
                    <button
                        type="submit"
                        disabled={saving}
                        className="px-8 py-3 bg-black text-white rounded font-medium hover:bg-gray-900 disabled:opacity-50 transition-colors"
                    >
                        {saving ? 'Saving...' : 'Save Profile'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default Profile;
