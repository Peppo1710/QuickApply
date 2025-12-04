const { google } = require('googleapis');
const UserProfile = require('../models/UserProfile');
const { marked } = require('marked');

/**
 * Sends the application email using Gmail API.
 * @param {Object} params
 * @param {string} params.to - Recipient email.
 * @param {string} params.subject - Email subject.
 * @param {string} params.bodyHtml - Email body in HTML.
 * @param {Object} params.userProfile - User profile for "From" and links.
 */
const sendApplicationEmail = async ({ to, subject, bodyHtml, userProfile }) => {
    try {
        // Get user's Google OAuth tokens
        const user = await UserProfile.findById(userProfile._id || userProfile.id);
        
        if (!user || !user.googleAccessToken) {
            throw new Error('User not authenticated with Google. Please log in with Google to send emails.');
        }

        // TEST MODE: Skip actual email sending
        if (process.env.TEST_MODE === 'true') {
            // Test mode - email not sent (logs removed for production)
            return;
        }

        // Set up OAuth2 client
        const oauth2Client = new google.auth.OAuth2(
            process.env.CLIENT_ID,
            process.env.CLIENT_SECRET,
            process.env.BACKEND_URL ? `${process.env.BACKEND_URL}/oauth/callback` : 'http://localhost:3000/oauth/callback'
        );

        // Set up OAuth2 client with user's tokens
        oauth2Client.setCredentials({
            access_token: user.googleAccessToken,
            refresh_token: user.googleRefreshToken
        });

        // Get a valid access token (OAuth2Client will auto-refresh if needed)
        // This ensures we have a fresh token before making API calls
        try {
            const tokenResponse = await oauth2Client.getAccessToken();
            // Extract token string - getAccessToken() can return either a string or an object with a token property
            let currentAccessToken;
            if (typeof tokenResponse === 'string') {
                currentAccessToken = tokenResponse;
            } else if (tokenResponse && typeof tokenResponse === 'object') {
                currentAccessToken = tokenResponse.token || tokenResponse.access_token;
            } else {
                currentAccessToken = tokenResponse;
            }
            
            // Ensure we have a valid string token
            if (!currentAccessToken || typeof currentAccessToken !== 'string') {
                throw new Error('Invalid access token format received from OAuth client');
            }
            
            // If token was refreshed, update it in the database
            if (currentAccessToken && currentAccessToken !== user.googleAccessToken) {
                user.googleAccessToken = currentAccessToken;
                await user.save();
                // Update OAuth client with the new token
                oauth2Client.setCredentials({
                    access_token: currentAccessToken,
                    refresh_token: user.googleRefreshToken
                });
            }
        } catch (tokenError) {
            console.error('Error getting access token:', tokenError);
            if (!user.googleRefreshToken) {
                throw new Error('Google OAuth token expired and no refresh token available. Please log in again with Google.');
            }
            // If getAccessToken failed, try explicit refresh
            try {
                const { credentials } = await oauth2Client.refreshAccessToken();
                user.googleAccessToken = credentials.access_token;
                if (credentials.refresh_token) {
                    user.googleRefreshToken = credentials.refresh_token;
                }
                await user.save();
                oauth2Client.setCredentials({
                    access_token: credentials.access_token,
                    refresh_token: credentials.refresh_token || user.googleRefreshToken
                });
            } catch (refreshError) {
                console.error('Token refresh failed:', refreshError);
                throw new Error('Google OAuth token expired. Please log in again with Google.');
            }
        }

        // Create Gmail API client
        const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

        // Append links to the body - styled as buttons/boxes
        const links = [];
        if (userProfile.resumeUrl) links.push({ label: 'Resume', url: userProfile.resumeUrl });
        if (userProfile.portfolioUrl) links.push({ label: 'Portfolio', url: userProfile.portfolioUrl });
        if (userProfile.githubUrl) links.push({ label: 'GitHub', url: userProfile.githubUrl });
        if (userProfile.linkedinUrl) links.push({ label: 'LinkedIn', url: userProfile.linkedinUrl });
        
        const linksHtml = links.length > 0 ? `
            <div style="margin-top: 24px; padding-top: 24px; border-top: 2px solid #000000;">
                <p style="margin: 0 0 12px 0; font-weight: 700; font-size: 14px; color: #000000;">My Links:</p>
                <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                    ${links.map(link => `
                        <a href="${link.url}" style="display: inline-block; padding: 8px 16px; border: 2px solid #000000; background-color: #ffffff; color: #000000; text-decoration: none; font-weight: 600; font-size: 13px; transition: all 0.2s;">
                            ${link.label}
                        </a>
                    `).join('')}
                </div>
            </div>
        ` : '';

        const finalHtml = bodyHtml + linksHtml;

        // Create email message
        const emailLines = [
            `To: ${to}`,
            `From: ${userProfile.fullName} <${user.email}>`,
            `Reply-To: ${userProfile.email || user.email}`,
            `Subject: ${subject}`,
            'Content-Type: text/html; charset=utf-8',
            '',
            finalHtml
        ];

        const email = emailLines.join('\r\n');

        // Encode message in base64url format
        const encodedMessage = Buffer.from(email)
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');

        // Send email via Gmail API with retry logic
        try {
            await gmail.users.messages.send({
                userId: 'me',
                requestBody: {
                    raw: encodedMessage
                }
            });
        } catch (apiError) {
            // If we get a 401 and have a refresh token, try refreshing and retrying once
            if (apiError.code === 401 && user.googleRefreshToken) {
                try {
                    const { credentials } = await oauth2Client.refreshAccessToken();
                    user.googleAccessToken = credentials.access_token;
                    if (credentials.refresh_token) {
                        user.googleRefreshToken = credentials.refresh_token;
                    }
                    await user.save();
                    oauth2Client.setCredentials({
                        access_token: credentials.access_token,
                        refresh_token: credentials.refresh_token || user.googleRefreshToken
                    });
                    
                    // Retry the API call with fresh token
                    await gmail.users.messages.send({
                        userId: 'me',
                        requestBody: {
                            raw: encodedMessage
                        }
                    });
                } catch (retryError) {
                    console.error('Failed to refresh token or retry API call:', retryError);
                    throw new Error('Failed to send email: Invalid or expired Google OAuth credentials. Please log in again with Google.');
                }
            } else {
                throw apiError;
            }
        }
    } catch (error) {
        console.error('Gmail API Error:', error);
        throw new Error(`Failed to send email: ${error.message}`);
    }
};

module.exports = { sendApplicationEmail };
