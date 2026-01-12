importScripts('config.js');

chrome.runtime.onInstalled.addListener(() => {
    console.log('LinkedIn Quick Apply extension installed');
});

// Listen for messages from content script or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'checkBackend') {
        // Check if backend is running
        fetch(`${CONFIG.API_BASE_URL}/api/status`)
            .then(response => response.json())
            .then(data => sendResponse({ success: true, data }))
            .catch(error => sendResponse({ success: false, error: error.message }));

        return true; // Keep message channel open for async response
    }

    if (request.action === 'getProfile') {
        // Fetch user profile
        fetch(`${CONFIG.API_BASE_URL}/api/profile`)
            .then(response => response.json())
            .then(data => sendResponse({ success: true, data }))
            .catch(error => sendResponse({ success: false, error: error.message }));

        return true;
    }
});

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
    // This will open the popup, which is already configured in manifest
});
