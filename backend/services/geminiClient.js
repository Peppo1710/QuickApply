const axios = require('axios');

const groqApiKey = process.env.GROQ_API_KEY 
if (!groqApiKey) {
    console.warn('[Quick Apply][Backend] GROQ_API_KEY is missing; using fallback email template only.');
}

/**
 * Generates a personalized job application email using Groq API directly
 * Returns: { subject: string, bodyMarkdown: string }
 */
const generateApplicationEmail = async ({ userProfile, jobPostText, detectedRole }) => {
    try {
        // TEST MODE returns a simple subject + body object for local testing
        if (process.env.TEST_MODE === 'true') {
            return {
                subject: `Application for - ${detectedRole}`,
                bodyMarkdown: `Dear Hiring Manager,

I am ${userProfile.fullName}, currently working as a ${userProfile.currentRole} with expertise in ${userProfile.skills}. ${userProfile.bio}

I noticed your opening for the **${detectedRole}** and I have hands-on experience in this area through projects and roles aligned to this work.

My resume and portfolio are attached. If you'd like more details or to schedule a call, please contact me.

Best regards,
${userProfile.fullName}`
            };
        }

        if (!groqApiKey) {
            throw new Error('Groq API key not found');
        }

        // NEW PROMPT: explicitly requests a subject and a markdown body
        const prompt = `You are a professional career assistant.

Produce two outputs separated clearly and with no extra commentary:
1) A single-line SUBJECT suitable for an email in this exact format: \"Application for - <ROLE>\" where <ROLE> is the Role value below.
2) The email BODY as MARKDOWN (not HTML). Return ONLY the markdown body after the subject, and do NOT include any metadata, JSON, or code fences.

Requirements for the BODY (important):
- Use exactly THREE short paragraphs separated by blank lines. Do NOT produce more than three paragraphs.
- Use markdown formatting: **bold** for emphasis, regular text for paragraphs.
- Do NOT use HTML tags like <p>, <br>, etc. Use plain markdown.

Paragraph 1 (Intro):
- Short, 1-2 sentences.
- Introduce the candidate: name, current role, and core areas of expertise (use the most relevant skills from the profile).

Paragraph 2 (Fit):
- Short, 1-3 sentences.
- Mention that the candidate saw the opening for the role and clearly state relevant experience and projects that align with the role. Use content from the user's bio/skills/current role to make it specific and natural.

Paragraph 3 (Close & Attachments):
- Short, 1-2 sentences.
- State that resume/portfolio links are attached/available and include a call-to-action: if they need more details or want to schedule a call, contact the candidate.
- Finish with sign-off: "Best regards," on one line, then "${userProfile.fullName}" on the next line (name should be BELOW "Best regards", not beside it).

Tone: calm, confident, concise, professional (no buzzwords, no salesy language, no exaggeration).
Length: compact — keep the full body under ~180 words.

User Profile:
- Name: ${userProfile.fullName}
- Current Role: ${userProfile.currentRole}
- Bio: ${userProfile.bio}
- Skills: ${userProfile.skills}

Job Details:
- Role: ${detectedRole}
- Job Post Text (may be noisy or truncated):
\"\"\"
${jobPostText.substring(0, 2000)}
\"\"\"

Important: Return the subject line on the first line exactly as: Application for - ${detectedRole}
Then return the markdown body (three paragraphs with blank lines between them). Do not include any other text or code fences.`;

        const response = await axios.post(
            'https://api.groq.com/openai/v1/chat/completions',
            {
                model: "llama-3.3-70b-versatile",
                messages: [{ role: "user", content: prompt }],
                temperature: 0.35,
                max_tokens: 512
            },
            {
                headers: {
                    'Authorization': `Bearer ${groqApiKey}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        const rawOutput = response.data.choices?.[0]?.message?.content || "";

        // The model is instructed to return subject then markdown body. Split by newline first occurrence.
        const lines = rawOutput.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        // First non-empty line should be the subject
        const subjectLine = lines.length ? lines[0] : `Application for - ${detectedRole}`;
        // The rest joined form the markdown body. If model returned subject on same line with body, attempt to remove subject prefix.
        let bodyMarkdown = rawOutput.replace(subjectLine, '').trim();
        // If bodyMarkdown is empty but there are remaining lines, join them
        if (!bodyMarkdown && lines.length > 1) {
            bodyMarkdown = lines.slice(1).join('\n');
        }
        // Basic cleanup: remove markdown code fences if present
        bodyMarkdown = bodyMarkdown.replace(/```markdown|```/gi, '').trim();

        return {
            subject: subjectLine,
            bodyMarkdown
        };
    } catch (err) {
        console.error("Groq Generation Error → Aborting email generation:", err.response?.data || err.message);
        // IMPORTANT: Do NOT return a hardcoded email body. Bubble the error up so the caller can decide how to handle failures
        // (for example: prompt user to re-authenticate, log the error, or ask the user to try again).
        throw new Error(`Email generation failed: ${err.response?.data?.error?.message || err.message}`);
    }
};

module.exports = { generateApplicationEmail };
