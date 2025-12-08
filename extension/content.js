// Content script shared between the profile web app and LinkedIn pages
// - On the profile web app, it syncs the saved JWT token into chrome.storage for the extension.
// - On LinkedIn, it injects Quick Apply controls.

const API_BASE_URL = 'https://quickapply-4kue.onrender.com/api';
const log = (...args) => console.log('[Quick Apply]', ...args);
const warn = (...args) => console.warn('[Quick Apply]', ...args);
const PROFILE_APP_ORIGINS = [
    'http://localhost:5173',
    'https://localhost:5173',
    'http://127.0.0.1:5173',
    'https://127.0.0.1:5173',
    'https://quickapply.pradyumn.co.in',

];
const isProfileAppContext = PROFILE_APP_ORIGINS.some(origin =>
    window.location.origin.startsWith(origin)
);

if (isProfileAppContext) {
    log('Detected profile web app context.');
    // chrome APIs might not exist when running as plain web page without extension context
    if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) {
        log('chrome.storage.local not available on this page; skipping token sync.');
    } else {
        initProfileTokenSync();
    }
} else {
    log('Detected LinkedIn context.');
    bootstrapLinkedInQuickApply();
}

function initProfileTokenSync() {
    log('Token sync active on profile site.');
    let lastToken = null;

    const syncToken = () => {
        let currentToken = null;
        try {
            currentToken = window.localStorage.getItem('profileToken');
        } catch (error) {
            currentToken = null;
        }

        if (currentToken !== lastToken) {
            lastToken = currentToken;
            if (currentToken) {
                chrome.storage.local.set({ authToken: currentToken });
                log('Token stored from profile site.');
            } else {
                chrome.storage.local.remove('authToken');
                log('Token cleared from profile site.');
            }
        }
    };

    syncToken();

    // Listen for storage changes triggered in other tabs
    window.addEventListener('storage', (event) => {
        if (event.key === 'profileToken') {
            syncToken();
        }
    });

    // Poll as a fallback to catch in-tab updates
    setInterval(syncToken, 1500);
}

function bootstrapLinkedInQuickApply() {
    // --- Auth Helper ---
    let authToken = null;

    async function getAuthToken() {
        if (authToken) return authToken;

        return new Promise((resolve) => {
            if (!chrome.storage || !chrome.storage.local) {
                warn('chrome.storage.local not available in this context.');
                authToken = null;
                resolve(null);
                return;
            }

            chrome.storage.local.get(['authToken'], (result = {}) => {
                authToken = result.authToken || null;
                resolve(authToken);
            });
        });
    }

    async function checkAuth() {
        const token = await getAuthToken();
        if (!token) {
            showNotification('Please open the website at http://localhost:5173, fill out your profile, and click "Save Profile" once.', 'error');
            warn('Auth token missing when attempting Quick Apply.');
            return false;
        }
        log('Auth token present.');
        return true;
    }

    // --- Overlay Logic ---

    let overlayContainer = null;
    let shadowRoot = null;
    let currentPostData = null;

    // Create and inject the overlay
    async function createOverlay() {
        if (overlayContainer && shadowRoot) {
            // Already created, verify elements exist
            const testEditor = shadowRoot.getElementById('emailEditor');
            if (testEditor) return; // Everything is ready
        }

        overlayContainer = document.createElement('div');
        overlayContainer.className = 'quick-apply-overlay-host';
        overlayContainer.style.display = 'none'; // Hidden by default
        document.body.appendChild(overlayContainer);

        shadowRoot = overlayContainer.attachShadow({ mode: 'open' });
        
        if (!shadowRoot) {
            warn('Failed to create shadow root');
            return;
        }

        // Load font
        const fontLink = document.createElement('link');
        fontLink.rel = 'stylesheet';
        fontLink.href = 'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;700&display=swap';
        shadowRoot.appendChild(fontLink);

        // Load CSS
        try {
            if (chrome && chrome.runtime && typeof chrome.runtime.getURL === 'function') {
                const styleUrl = chrome.runtime.getURL('overlay.css');
                const styleLink = document.createElement('link');
                styleLink.rel = 'stylesheet';
                styleLink.href = styleUrl;
                shadowRoot.appendChild(styleLink);
            } else {
                throw new Error('chrome.runtime.getURL not available');
            }
        } catch (error) {
            // Fallback: inject CSS directly if chrome.runtime is not available
            warn('chrome.runtime.getURL not available, using inline CSS fallback:', error);
            const style = document.createElement('style');
            // Inline the essential CSS for the overlay - Mono, Boxy Design
            style.textContent = `
                .overlay-container { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0, 0, 0, 0.7); backdrop-filter: blur(4px); z-index: 2147483647; display: flex; align-items: center; justify-content: center; font-family: 'Courier New', Courier, monospace, system-ui; opacity: 0; transition: opacity 0.3s ease; }
                .overlay-container.visible { opacity: 1; }
                .editor-card { background: #ffffff; width: 90%; max-width: 800px; height: 80vh; border-radius: 0; box-shadow: none; display: flex; flex-direction: column; overflow: hidden; border: 2px solid #000000; transform: scale(0.95); transition: transform 0.3s ease; }
                .overlay-container.visible .editor-card { transform: scale(1); }
                .header { padding: 20px 24px; border-bottom: 2px solid #000000; display: flex; justify-content: space-between; align-items: center; background: #ffffff; }
                .title { font-size: 18px; font-weight: 700; color: #000000; font-family: 'Courier New', Courier, monospace; }
                .close-btn { background: transparent; border: 2px solid #000000; color: #000000; cursor: pointer; padding: 6px 12px; border-radius: 0; transition: all 0.2s; font-family: 'Courier New', Courier, monospace; font-weight: 700; }
                .close-btn:hover { background: #000000; color: #ffffff; }
                .content { flex: 1; padding: 24px; overflow-y: auto; background: #ffffff; }
                #emailEditor { width: 100%; min-height: 300px; padding: 16px; border: 2px solid #000000; border-radius: 0; font-family: 'Courier New', Courier, monospace; font-size: 14px; line-height: 1.6; resize: vertical; }
                #emailEditor:focus { outline: none; border-color: #000000; }
                .prompt-bar { display: flex; gap: 12px; background: #ffffff; padding: 12px; border-radius: 0; border: 2px solid #000000; }
                .prompt-input { flex: 1; background: transparent; border: none; color: #000000; font-size: 14px; font-family: 'Courier New', Courier, monospace; outline: none; }
                .footer { padding: 20px 24px; border-top: 2px solid #000000; display: flex; gap: 12px; justify-content: flex-end; background: #ffffff; }
                .action-btn { padding: 8px 16px; border-radius: 0; font-size: 14px; font-weight: 700; cursor: pointer; transition: all 0.2s; border: 2px solid #000000; font-family: 'Courier New', Courier, monospace; }
                .btn-rewrite { background: #ffffff; color: #000000; border: 2px solid #000000; }
                .btn-rewrite:hover { background: #000000; color: #ffffff; }
                .btn-cancel { background: #ffffff; color: #000000; border: 2px solid #000000; }
                .btn-cancel:hover { background: #000000; color: #ffffff; }
                .btn-send { background: #000000; color: #ffffff; font-weight: 700; border: 2px solid #000000; }
                .btn-send:hover { background: #333333; border-color: #333333; }
                #loadingOverlay { position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(255, 255, 255, 0.95); display: none; align-items: center; justify-content: center; z-index: 10; font-family: 'Courier New', Courier, monospace; font-weight: 700; }
                #loadingOverlay.active { display: flex; }
            `;
            shadowRoot.appendChild(style);
        }

        // Create HTML structure
        const wrapper = document.createElement('div');
        wrapper.className = 'overlay-container';
        wrapper.innerHTML = `
        <div class="editor-card">
            <div class="header">
                <div class="title">
                    <span>🚀 Quick Apply</span>
                </div>
                <button class="close-btn" id="closeBtn">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M18 6L6 18M6 6l12 12"/>
                    </svg>
                </button>
            </div>
            
            <div class="content">
                <textarea class="email-editor" id="emailEditor" placeholder="Generating email..."></textarea>
                
                <div class="prompt-bar">
                    <input type="text" class="prompt-input" id="promptInput" placeholder="Ask AI to rewrite (e.g., 'Make it more formal', 'Mention my React experience')...">
                    <button class="action-btn btn-rewrite" id="rewriteBtn">
                        ✨ Rewrite
                    </button>
                </div>
            </div>

            <div class="footer">
                <button class="action-btn btn-cancel" id="cancelBtn">Cancel</button>
                <button class="action-btn btn-send" id="sendBtn">
                    Send Application
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
                    </svg>
                </button>
            </div>

            <div class="loading-overlay" id="loadingOverlay" style="display: none;">
                <div class="spinner">Processing...</div>
            </div>
        </div>
    `;
        shadowRoot.appendChild(wrapper);

        // Wait a tick to ensure DOM is ready
        await new Promise(resolve => setTimeout(resolve, 0));

        // Verify elements are accessible
        const verifyEditor = shadowRoot.getElementById('emailEditor');
        if (!verifyEditor) {
            warn('Email editor not found after creating overlay, retrying...');
            // Try one more time after a short delay
            await new Promise(resolve => setTimeout(resolve, 100));
            const retryEditor = shadowRoot.getElementById('emailEditor');
            if (!retryEditor) {
                warn('Email editor still not found after retry');
            }
        }

        // Event Listeners
        const close = () => {
            wrapper.classList.remove('visible');
            setTimeout(() => {
                overlayContainer.style.display = 'none';
            }, 300);
        };

        shadowRoot.getElementById('closeBtn').onclick = close;
        shadowRoot.getElementById('cancelBtn').onclick = close;

        shadowRoot.getElementById('rewriteBtn').onclick = async () => {
            const prompt = shadowRoot.getElementById('promptInput').value.trim();
            if (!prompt) return;
            log('Rewrite requested with prompt:', prompt);

            setLoading(true, 'Rewriting...');
            try {
                const token = await getAuthToken();
                const currentEmail = shadowRoot.getElementById('emailEditor').value;
                const response = await fetch(`${API_BASE_URL}/apply/rewrite`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ currentEmail, prompt })
                });

                if (response.status === 401) {
                    showNotification('Session expired. Please log in again.', 'error');
                    return;
                }

                const data = await response.json();
                if (data.rewrittenEmail) {
                    log('Rewrite successful.');
                    shadowRoot.getElementById('emailEditor').value = data.rewrittenEmail;
                    shadowRoot.getElementById('promptInput').value = '';
                }
            } catch (error) {
                console.error('Rewrite failed:', error);
                alert('Failed to rewrite email');
            } finally {
                setLoading(false);
            }
        };

        shadowRoot.getElementById('sendBtn').onclick = async () => {
            setLoading(true, 'Sending...');
            try {
                const token = await getAuthToken();
                const emailBody = shadowRoot.getElementById('emailEditor').value.trim();
                
                if (!emailBody) {
                    alert('Email body cannot be empty');
                    setLoading(false);
                    return;
                }

                log('Sending finalized email to backend...');
                const response = await fetch(`${API_BASE_URL}/apply`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        postText: currentPostData.postText,
                        detectedEmail: currentPostData.detectedEmail,
                        detectedRole: currentPostData.detectedRole,
                        emailBody: emailBody
                    })
                });

                if (response.status === 401) {
                    showNotification('Session expired. Please log in again.', 'error');
                    setLoading(false);
                    return;
                }

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Failed to send email');
                }

                const result = await response.json();
                if (result.success) {
                    log('Email sent successfully via backend.');
                    close();
                    showNotification('Application sent successfully!', 'success');
                    if (currentPostData.button) {
                        currentPostData.button.innerHTML = 'Applied! ✓';
                        currentPostData.button.disabled = true;
                    }
                } else {
                    throw new Error(result.error || 'Failed to send');
                }
            } catch (error) {
                console.error('Send failed:', error);
                alert('Failed to send application: ' + (error.message || 'Unknown error'));
            } finally {
                setLoading(false);
            }
        };
    }

    function setLoading(isLoading, text = 'Processing...') {
        const loader = shadowRoot.getElementById('loadingOverlay');
        if (isLoading) {
            loader.querySelector('.spinner').textContent = text;
            loader.style.display = 'flex';
        } else {
            loader.style.display = 'none';
        }
    }

    
async function openOverlay(postData, initialEmail) {
    // Ensure overlay is created first
    if (!overlayContainer || !shadowRoot) {
        await createOverlay();
    }
    
    // Add another safety check after createOverlay
    if (!shadowRoot) {
        warn('shadowRoot still not available after createOverlay, cannot open overlay');
        return;
    }

    currentPostData = postData;

    // Wait for elements to be available with exponential backoff
    let wrapper = null;
    let editor = null;
    let retries = 0;
    const maxRetries = 15;
    
    while (retries < maxRetries) {
        wrapper = shadowRoot.querySelector('.overlay-container');
        editor = shadowRoot.getElementById('emailEditor');
        
        if (wrapper && editor) {
            break; // Both found, exit loop
        }
        
        // Exponential backoff: 50ms, 100ms, 200ms, etc.
        const delay = Math.min(50 * Math.pow(2, retries), 500);
        await new Promise(resolve => setTimeout(resolve, delay));
        retries++;
        
        log(`Retry ${retries}/${maxRetries}: wrapper=${!!wrapper}, editor=${!!editor}`);
    }

    if (!wrapper) {
        warn('Overlay wrapper not found after retries');
        showNotification('Failed to open editor. Please try again.', 'error');
        return;
    }

    if (!editor) {
        warn('Email editor element not found in shadow DOM after retries');
        showNotification('Failed to open editor. Please try again.', 'error');
        return;
    }

    // Now safe to set value
    editor.value = initialEmail || 'Generating draft...';
    overlayContainer.style.display = 'block';

    // Trigger reflow
    wrapper.offsetHeight;
    wrapper.classList.add('visible');
    
    log('Overlay opened successfully');
}

    // --- Core Logic ---

    // Debounce function
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Extract email from text
    function extractEmail(text) {
        const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi;
        const matches = text.match(emailRegex);
        return matches && matches.length > 0 ? matches[0] : null;
    }

    // Extract role
    function extractRole(text) {
        const patterns = [
            /(?:hiring|looking for|seeking)\s+(?:a\s+)?([A-Z][a-zA-Z\s]+?)(?:\s+at|\s+to|\s+for|\.)/i,
            /(?:position|role|job):\s*([A-Z][a-zA-Z\s]+?)(?:\s+at|\s+-|\.)/i,
            /([A-Z][a-zA-Z\s]+?)\s+(?:position|role|opening)/i
        ];

        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match && match[1]) {
                return match[1].trim();
            }
        }
        return null;
    }

    // Check if job post
    function isJobPost(text) {
        const jobKeywords = [
            'hiring', 'job', 'position', 'role', 'opening', 'opportunity',
            'apply', 'candidate', 'resume', 'cv', 'looking for', 'seeking',
            'join our team', 'we are hiring', 'career'
        ];
        return jobKeywords.some(keyword => text.toLowerCase().includes(keyword));
    }

    // Create Quick Apply button
    function createQuickApplyButton(post) {
        const button = document.createElement('button');
        button.className = 'quick-apply-btn';
        button.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 0L10.5 5.5L16 6.5L12 10.5L13 16L8 13L3 16L4 10.5L0 6.5L5.5 5.5L8 0Z"/>
        </svg>
        Quick Apply
    `;

        button.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            await handleQuickApply(post, button);
        });

        return button;
    }

    // Handle Quick Apply button click
    async function handleQuickApply(post, button) {
        const originalHTML = button.innerHTML;

        // Check auth first
        if (!(await checkAuth())) {
            return;
        }

        try {
            log('Quick Apply button clicked, starting processing...');
            button.disabled = true;
            button.classList.add('loading');
            button.innerHTML = 'Generating...';

            const postTextElement = post.querySelector('.feed-shared-update-v2__description, .feed-shared-text, .update-components-text');
            if (!postTextElement) {
                warn('Unable to locate post text container.');
                throw new Error('Could not extract post text');
            }

            const postText = postTextElement.innerText || postTextElement.textContent;
            const detectedEmail = extractEmail(postText);
            const detectedRole = extractRole(postText);

            if (!detectedEmail) {
                warn('No email detected in post; skipping apply attempt.', { snippet: postText.slice(0, 140) });
                showNotification('No email address found in this post. Please open the job details and try again.', 'error');
                return;
            }

            const token = await getAuthToken();
            log('Generating email draft...');
            
            // Validate data before sending
            if (!postText || postText.trim().length === 0) {
                throw new Error('Post text is empty. Cannot generate email.');
            }
            
            if (!detectedEmail || detectedEmail.trim().length === 0) {
                throw new Error('Email address is required.');
            }
            
            // Call generate endpoint (does NOT send email)
            const requestBody = {
                postText: postText.trim(),
                detectedEmail: detectedEmail.trim(),
                detectedRole: detectedRole ? detectedRole.trim() : null
            };
            
            log('Sending request to /apply (generate)');
            
            const response = await fetch(`${API_BASE_URL}/api/apply`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(requestBody)
            });
            // console.log(response.data);
            

            if (response.status === 401) {
                showNotification('Session expired. Please open the website, save your profile again, and then retry.', 'error');
                chrome.storage.local.remove('authToken');
                authToken = null;
                return;
            }

            if (!response.ok) {
                let errorMessage = 'Failed to generate email';
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.error || errorMessage;
                } catch (e) {
                    errorMessage = `Server error: ${response.status} ${response.statusText}`;
                }
                throw new Error(errorMessage);
            }

            const result = await response.json();

            // Extract email body - handle both string and object responses
            let emailBody = result.generatedEmail;
            if (typeof emailBody === 'object' && emailBody !== null) {
                // If it's an object, try to extract bodyHtml
                emailBody = emailBody.bodyHtml || emailBody.body || JSON.stringify(emailBody);
            }
            
            if (!emailBody || typeof emailBody !== 'string') {
                throw new Error('Invalid email format received from server');
            }

            log('Generated email received from backend.');
            await openOverlay({
                postText,
                detectedEmail,
                detectedRole,
                button
            }, emailBody);

        } catch (error) {
            console.error('Quick Apply Error:', error);
            showNotification(error.message || 'Failed to generate email', 'error');
        } finally {
            button.disabled = false;
            button.classList.remove('loading');
            button.innerHTML = originalHTML;
        }
    }

    // Show notification (simple toast)
    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `quick-apply-notification ${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 5000);
    }

    // Process posts
    function processPosts() {
        const posts = document.querySelectorAll('.feed-shared-update-v2, .occludable-update');
        posts.forEach(post => {
            if (post.querySelector('.quick-apply-btn')) return;

            const actionBar = post.querySelector('.feed-shared-social-action-bar, .social-actions-bar');
            if (actionBar) {
                const button = createQuickApplyButton(post);
                const wrapper = document.createElement('div');
                wrapper.className = 'quick-apply-wrapper';
                wrapper.appendChild(button);
                actionBar.appendChild(wrapper);
                log('Quick Apply button injected into post.');
            }
        });
    }

    // Initialize
    function init() {
        console.log('LinkedIn Quick Apply 2.0 loaded');
        processPosts();
        const observer = new MutationObserver(debounce(() => {
            processPosts();
        }, 500));
        observer.observe(document.body, { childList: true, subtree: true });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
}
