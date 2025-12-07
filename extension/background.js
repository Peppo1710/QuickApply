// Background service worker for the extension
// Handles background tasks and message passing

chrome.runtime.onInstalled.addListener(() => {
    console.log('LinkedIn Quick Apply extension installed');
});

// Listen for messages from content script or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'checkBackend') {
        // Check if backend is running
        fetch('https://quickapply.pradyumn.co.in/api/status')
            .then(response => response.json())
            .then(data => sendResponse({ success: true, data }))
            .catch(error => sendResponse({ success: false, error: error.message }));

        return true; // Keep message channel open for async response
    }

    if (request.action === 'getProfile') {
        // Fetch user profile
        fetch('https://quickapply.pradyumn.co.in/api/profile')
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
