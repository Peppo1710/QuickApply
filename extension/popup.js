// Popup logic: show whether Quick Apply is ON (token present) or OFF
document.addEventListener('DOMContentLoaded', () => {
    const statusBadge = document.getElementById('statusBadge');
    const statusText = document.getElementById('statusText');
    const hintText = document.getElementById('hintText');

    if (!statusBadge || !statusText || !hintText) return;

    chrome.storage.local.get(['authToken'], (result) => {
        const token = result.authToken || null;

        if (token) {
            statusBadge.classList.remove('status-off');
            statusBadge.classList.add('status-on');
            statusText.textContent = 'ON';
            hintText.textContent =
                'Quick Apply is ready. Visit LinkedIn and look for the Quick Apply button on job posts.';
        } else {
            statusBadge.classList.remove('status-on');
            statusBadge.classList.add('status-off');
            statusText.textContent = 'OFF';
            hintText.textContent =
                'No profile token found. Open the site, fill your profile, and click “Save Profile” once.';
        }
    });
});
