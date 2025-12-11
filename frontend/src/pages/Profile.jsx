import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

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
    const { logout } = useAuth();
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
    const [isEditing, setIsEditing] = useState(false);
    const [googleEmail, setGoogleEmail] = useState('');
    const [savedProfile, setSavedProfile] = useState(null);

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
        console.log("🟣 [FRONTEND] Profile.fetchProfile called");
        try {
            const storedToken = localStorage.getItem('profileToken');
            console.log("🟣 [FRONTEND] Profile: Token from localStorage:", storedToken ? `${storedToken.substring(0, 50)}...` : "null");
            console.log("🟣 [FRONTEND] Profile: Token exists:", storedToken ? "YES" : "NO");

            if (!storedToken) {
                console.error("🔴 [FRONTEND] Profile: No token, redirecting to login");
                // No token, redirect to login
                navigate('/login');
                return;
            }

            console.log("🟣 [FRONTEND] Profile: Setting token in state");
            setToken(storedToken);

            // Fetch email from session
            try {
                const sessionRes = await fetch(`${backendUrl}/api/auth/session`, {
                    credentials: 'include'
                });
                if (sessionRes.ok) {
                    const sessionData = await sessionRes.json();
                    if (sessionData.authenticated && sessionData.email) {
                        console.log("🟣 [FRONTEND] Profile: Email from session:", sessionData.email);
                        setGoogleEmail(sessionData.email);
                        // Pre-fill email in profile if not already set
                        setProfile(prev => ({
                            ...prev,
                            email: prev.email || sessionData.email
                        }));
                    }
                }
            } catch (err) {
                console.error("🔴 [FRONTEND] Profile: Error fetching session:", err);
            }

            console.log("🟣 [FRONTEND] Profile: Fetching profile from backend");
            console.log("🟣 [FRONTEND] Profile: Backend URL:", `${backendUrl}/api/profile/get`);

            const res = await fetch(`${backendUrl}/api/profile/get`, {
                headers: { 'Authorization': `Bearer ${storedToken}` }
            });

            console.log("🟣 [FRONTEND] Profile: Response status:", res.status);
            console.log("🟣 [FRONTEND] Profile: Response ok:", res.ok);

            if (res.status === 401) {
                console.error("🔴 [FRONTEND] Profile: 401 Unauthorized, token invalid/expired");
                // Token expired or invalid, redirect to login
                localStorage.removeItem('profileToken');
                navigate('/login');
                return;
            }

            if (res.ok) {
                const data = await res.json();
                console.log("🟣 [FRONTEND] Profile: Response data:", data);
                console.log("🟣 [FRONTEND] Profile: Has email:", data && data.email ? "YES" : "NO");

                // Check if profile exists (has required fields)
                if (data && data.email) {
                    console.log("🟣 [FRONTEND] Profile: Existing profile found, setting hasExistingProfile = true");
                    // Ensure email is set from Google auth (not from saved profile)
                    const profileData = {
                        ...data,
                        email: googleEmail || data.email
                    };
                    setProfile(profileData);
                    setSavedProfile(profileData); // Save a copy for cancel functionality
                    setHasExistingProfile(true);
                } else {
                    console.log("🟣 [FRONTEND] Profile: No existing profile, setting hasExistingProfile = false");
                    // Ensure email is set from Google auth
                    const profileData = {
                        ...emptyProfile,
                        email: googleEmail || ''
                    };
                    setProfile(profileData);
                    setSavedProfile(profileData);
                    setHasExistingProfile(false);
                }
            } else {
                const errorText = await res.text();
                console.error("🔴 [FRONTEND] Profile: Response not ok, status:", res.status);
                console.error("🔴 [FRONTEND] Profile: Error response:", errorText);
            }
        } catch (err) {
            console.error("🔴 [FRONTEND] Profile: Error in fetchProfile:", err);
            console.error("🔴 [FRONTEND] Profile: Error stack:", err.stack);
            setError('Failed to load profile. Please try again.');
        } finally {
            console.log("🟣 [FRONTEND] Profile: Setting loading to false");
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
            // Ensure email is always from Google auth
            payload.email = googleEmail || profile.email;

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
                credentials: 'include',
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({ error: 'Failed to save profile' }));
                console.error("🔴 [FRONTEND] Profile: Save failed, status:", res.status);
                console.error("🔴 [FRONTEND] Profile: Error response:", errorData);
                throw new Error(errorData.error || 'Failed to save profile');
            }

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
                    console.log('🔐 [PROFILE] Setting authToken in chrome.storage:', tokenToStore.substring(0, 20) + '...');
                    chrome.storage.local.set({ authToken: tokenToStore }, () => {
                        console.log('✅ [PROFILE] authToken set in chrome.storage successfully');
                    });
                } else {
                    console.log('⚠️ [PROFILE] No token to store in chrome.storage');
                }
            } else {
                console.log('⚠️ [PROFILE] chrome.storage not available (not running as extension)');
            }

            const savedData = {
                ...(data.profile || profile),
                email: googleEmail || (data.profile?.email || profile.email)
            };
            setProfile(savedData);
            setSavedProfile(savedData); // Update saved profile copy
            setHasExistingProfile(true);
            setSaveToast('Changes saved successfully!');
            setIsEditing(false); // Exit edit mode after saving
        } catch (err) {
            console.error("🔴 [FRONTEND] Profile: Error saving profile:", err);
            console.error("🔴 [FRONTEND] Profile: Error message:", err.message);
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleEdit = () => {
        // Save current state before entering edit mode
        setSavedProfile({ ...profile });
        setIsEditing(true);
    };

    const handleCancel = () => {
        // Reset profile to saved state
        if (savedProfile) {
            setProfile({ ...savedProfile });
        }
        setIsEditing(false);
    };

    const handleLogout = () => {
        console.log('🚪 [PROFILE] Logout initiated via context');
        logout();
    };

    const lockedInputStyle = useMemo(() => ({
        border: `2px solid ${!isEditing ? '#999' : '#000'}`,
        backgroundColor: !isEditing ? '#f5f5f5' : '#fff',
        transition: 'all 0.2s ease',
        boxShadow: !isEditing ? 'inset 0 0 0 1px rgba(0,0,0,0.04)' : 'none',
        cursor: !isEditing ? 'not-allowed' : 'text'
    }), [isEditing]);

    const lockedTextAreaStyle = useMemo(() => ({
        ...lockedInputStyle,
        resize: 'none'
    }), [lockedInputStyle]);

    const emailInputStyle = useMemo(() => ({
        border: '2px solid #999',
        backgroundColor: '#f5f5f5',
        transition: 'all 0.2s ease',
        boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.04)',
        cursor: 'not-allowed'
    }), []);

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
                    <div className="flex gap-3">
                        <button
                            onClick={isEditing ? handleCancel : handleEdit}
                            className="px-6 py-2.5 bg-white rounded font-medium hover:bg-gray-50 transition-colors"
                            style={{ border: '2px solid #000' }}
                        >
                            {isEditing ? 'Cancel' : 'Edit'}
                        </button>
                        <button
                            onClick={handleLogout}
                            className="px-6 py-2.5 bg-white rounded font-medium hover:bg-gray-50 transition-colors"
                            style={{ border: '2px solid #000' }}
                        >
                            Logout
                        </button>
                    </div>
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
                                disabled={!isEditing}
                                readOnly={!isEditing}
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
                                value={googleEmail || profile.email}
                                readOnly
                                disabled
                                required
                                className="w-full px-4 py-2.5 rounded focus:outline-none"
                                style={emailInputStyle}
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
                                disabled={!isEditing}
                                readOnly={!isEditing}
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
                                disabled={!isEditing}
                                readOnly={!isEditing}
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
                                disabled={!isEditing}
                                readOnly={!isEditing}
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
                                disabled={!isEditing}
                                readOnly={!isEditing}
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
                                disabled={!isEditing}
                                readOnly={!isEditing}
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
                                disabled={!isEditing}
                                readOnly={!isEditing}
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
                                disabled={!isEditing}
                                readOnly={!isEditing}
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
                                disabled={!isEditing}
                                readOnly={!isEditing}
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
                        disabled={saving || !isEditing}
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
