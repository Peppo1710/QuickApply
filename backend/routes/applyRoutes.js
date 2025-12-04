const express = require('express');
const router = express.Router();
const { generateApplicationEmail } = require('../services/geminiClient');
const { sendApplicationEmail } = require('../services/mailer');
const { extractJobDetails } = require('../services/jobParser');
const UserProfile = require('../models/UserProfile');
const axios = require('axios');
const authMiddleware = require('../middleware/auth');
const { marked } = require('marked');


const groqApiKey = process.env.GROQ_API_KEY 
// Helper to get profile from DB
const getProfile = async (userInfo) => {
    let profile = null;
    
    // Find profile by userId (if exists) or by email/googleId
    if (userInfo.userId) {
        profile = await UserProfile.findById(userInfo.userId).select('-password');
    } else if (userInfo.email) {
        profile = await UserProfile.findOne({ email: userInfo.email.toLowerCase() }).select('-password');
    } else if (userInfo.googleId) {
        profile = await UserProfile.findOne({ googleId: userInfo.googleId }).select('-password');
    }
    
    if (!profile) {
        throw new Error('Profile not found. Please set up your profile first.');
    }
    return profile;
};

// POST /api/apply/rewrite
// New endpoint for AI rewriting
router.post('/rewrite', authMiddleware, async (req, res) => {
    try {
        const { currentEmail, prompt } = req.body;

        // TEST MODE
        if (process.env.TEST_MODE === 'true') {
            return res.json({
                rewrittenEmail: currentEmail + `\n\n[Rewritten with: "${prompt}"]`
            });
        }

        if (!groqApiKey) {
            return res.status(500).json({ error: 'Groq API key not configured' });
        }

        const aiPrompt = `You are a professional editor.
Rewrite the email below based on this instruction: "${prompt}".
Keep the markdown formatting intact, make the message shorter and clearer, and avoid any spammy or salesy tone.
Return ONLY the markdown email body, no code fences or extra text.

Original Email (markdown):
${currentEmail}`;

        const response = await axios.post(
            'https://api.groq.com/openai/v1/chat/completions',
            {
                model: "llama-3.3-70b-versatile",
                messages: [{ role: "user", content: aiPrompt }],
                temperature: 0.4,
                max_tokens: 512
            },
            {
                headers: {
                    'Authorization': `Bearer ${groqApiKey}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        const content = response.data.choices?.[0]?.message?.content || "";
        const cleaned = content.replace(/```markdown|```/g, '').trim();

        res.json({ rewrittenEmail: cleaned });

    } catch (error) {
        console.error('Rewrite Error:', error);
        res.status(500).json({ error: 'Failed to rewrite email' });
    }
});

// POST /api/apply - Generate email OR send email based on emailBody parameter
router.post('/', authMiddleware, async (req, res) => {
    try {
        const { postText, detectedEmail, detectedRole, emailBody } = req.body;
        const userProfile = await getProfile(req.user);

        // If emailBody is provided, send the email (convert markdown to HTML)
        if (emailBody && typeof emailBody === 'string' && emailBody.trim().length > 0) {
            const jobDetails = extractJobDetails(postText, detectedEmail, detectedRole);
            const finalEmail = jobDetails.email || detectedEmail;
            
            if (!finalEmail) {
                return res.status(400).json({ error: 'No email found to send to.' });
            }

            const emailSubject = `Application for ${jobDetails.role || detectedRole || 'Position'} - ${userProfile.fullName}`;
            
            // Convert markdown to HTML
            const bodyHtml = marked.parse(emailBody);
            
            await sendApplicationEmail({
                to: finalEmail,
                subject: emailSubject,
                bodyHtml: bodyHtml,
                userProfile
            });

            return res.json({
                success: true,
                message: `Application sent to ${finalEmail}`
            });
        }

        // Otherwise, generate email draft (does NOT send)
        if (!postText || typeof postText !== 'string' || postText.trim().length === 0) {
            return res.status(400).json({ error: 'Post text is required.' });
        }

        if (!detectedEmail || typeof detectedEmail !== 'string' || detectedEmail.trim().length === 0) {
            return res.status(400).json({ error: 'Email address is required.' });
        }

        const jobDetails = extractJobDetails(postText, detectedEmail, detectedRole);
        const finalEmail = jobDetails.email || detectedEmail;
        const finalRole = jobDetails.role || detectedRole || 'Position';

        const emailResult = await generateApplicationEmail({
            userProfile,
            jobPostText: postText,
            detectedRole: finalRole
        });

        // Get markdown body (not HTML)
        const generatedBody = typeof emailResult === 'string' ? emailResult : (emailResult.bodyMarkdown || emailResult.bodyHtml);
        const emailSubject = typeof emailResult === 'object' && emailResult.subject 
            ? emailResult.subject 
            : `Application for - ${finalRole}`;

        if (!generatedBody || typeof generatedBody !== 'string') {
            return res.status(500).json({ error: 'Failed to generate email' });
        }

        res.json({
            success: true,
            generatedEmail: generatedBody, // Return markdown for editing
            subject: emailSubject
        });

    } catch (error) {
        console.error('Apply Error:', error);
        res.status(500).json({ error: error.message || 'Failed to process application' });
    }
});

module.exports = router;
