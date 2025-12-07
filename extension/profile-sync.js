// Syncs the web app's localStorage profileToken into chrome.storage.local.authToken
// Runs only on the QuickApply web app domains; keeps popup status in sync without refresh.

(() => {
    const PAGE_TOKEN_KEY = 'profileToken';
    const EXTENSION_KEY = 'authToken';
    const POLL_INTERVAL_MS = 3000; // Fallback poll to catch edge cases
    let lastToken = null;
    let pollTimer = null;

    const log = (...args) => console.log('[QuickApply Sync]', ...args);
    const warn = (...args) => console.warn('[QuickApply Sync]', ...args);

    // Debounce helper to avoid spamming storage writes
    function debounce(fn, wait) {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => fn(...args), wait);
        };
    }

    const pushTokenToExtension = debounce((token) => {
        if (!chrome?.storage?.local) {
            warn('chrome.storage.local not available; cannot sync token');
            return;
        }
        if (token) {
            chrome.storage.local.set({ [EXTENSION_KEY]: token }, () => {
                log('Stored token in chrome.storage.local');
            });
        } else {
            chrome.storage.local.remove(EXTENSION_KEY, () => {
                log('Removed token from chrome.storage.local');
            });
        }
    }, 150);

    function readPageToken() {
        try {
            return window.localStorage.getItem(PAGE_TOKEN_KEY);
        } catch (e) {
            warn('Failed to read localStorage.profileToken:', e);
            return null;
        }
    }

    function maybeSync(token) {
        if (token === lastToken) return;
        lastToken = token;
        pushTokenToExtension(token);
    }

    // Listen for token changes from the page context
    // Note: We can't inject inline scripts due to CSP, so we rely on:
    // 1. Storage events (for cross-tab changes)
    // 2. Polling (as fallback for same-tab changes)
    function injectPageHook() {
        try {
            // Listen for storage events from other tabs/windows
            // Note: storage event only fires for changes in OTHER tabs, not the current tab
            window.addEventListener('storage', (e) => {
                if (e.key === PAGE_TOKEN_KEY) {
                    window.dispatchEvent(new CustomEvent('qa-profile-token-changed', {
                        detail: { token: e.newValue }
                    }));
                }
            });
            
            // For same-tab changes, we rely on the polling mechanism (startPolling)
            // which is already implemented as a fallback
            log('Page hook initialized (using storage events + polling)');
        } catch (e) {
            warn('Failed to inject page hook:', e);
        }
    }

    function startPolling() {
        stopPolling();
        pollTimer = setInterval(() => {
            const current = readPageToken();
            maybeSync(current);
        }, POLL_INTERVAL_MS);
    }

    function stopPolling() {
        if (pollTimer) {
            clearInterval(pollTimer);
            pollTimer = null;
        }
    }

    function init() {
        log('Profile token sync script initialized');
        injectPageHook();

        // Initial sync
        maybeSync(readPageToken());

        // Listen for page events
        window.addEventListener('qa-profile-token-changed', (event) => {
            const token = event?.detail?.token ?? null;
            maybeSync(token);
        });

        // Fallback polling
        startPolling();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }

    // Cleanup on unload
    window.addEventListener('beforeunload', stopPolling);
})();

