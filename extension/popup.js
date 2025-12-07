

// Popup logic: show whether Quick Apply is ON (profile saved) or OFF
document.addEventListener('DOMContentLoaded', () => {
    const statusBadge = document.getElementById('statusBadge');
    const statusText = document.getElementById('statusText');
    const hintText = document.getElementById('hintText');

    if (!statusBadge || !statusText || !hintText) return;

    chrome.storage.local.get(['authToken'], async (result) => {
        const token = result.authToken || null;
        console.log(token)

        if (!token) {
            // No token at all
            statusBadge.classList.remove('status-on');
            statusBadge.classList.add('status-off');
            statusText.textContent = 'OFF';
            hintText.textContent =
                'Not logged in. Open the site, sign in with Google, fill your profile, and click "Save Profile".';
            return;
        }

        // Token exists, now check if profile is actually saved
        try {
            const backendUrl = 'http://localhost:3000'; // Production backend
            const res = await fetch(`${backendUrl}/api/profile/get`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            console.log(res.data)

            if (res.ok) {
                const data = await res.json();
                console.log(data)
                // Check if profile has required fields (email is mandatory)
                if (data && data.email && data.fullName && data.currentRole) {
                    // Profile is saved and complete
                    statusBadge.classList.remove('status-off');
                    statusBadge.classList.add('status-on');
                    statusText.textContent = 'ON';
                    hintText.textContent =
                        'Quick Apply is ready. Visit LinkedIn and look for the Quick Apply button on job posts.';
                } else {
                    // Authenticated but profile not saved yet
                    statusBadge.classList.remove('status-on');
                    statusBadge.classList.add('status-off');
                    statusText.textContent = 'OFF';
                    hintText.textContent =
                        'Logged in but profile incomplete. Open the site, fill your profile, and click "Save Profile".';
                }
            } else {
                // Token invalid or expired
                statusBadge.classList.remove('status-on');
                statusBadge.classList.add('status-off');
                statusText.textContent = 'OFF';
                hintText.textContent =
                    'Session expired. Open the site and sign in again.';
            }
        } catch (error) {
            // Network error or backend down
            statusBadge.classList.remove('status-on');
            statusBadge.classList.add('status-off');
            statusText.textContent = 'OFF';
            hintText.textContent =
                'Cannot connect to backend. Please check your internet connection.';
        }
    });
});
