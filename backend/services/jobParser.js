/**
 * Extracts job details from text using regex and heuristics.
 * @param {string} text - The raw job post text.
 * @param {string} [detectedEmail] - Email already detected by frontend.
 * @param {string} [detectedRole] - Role already detected by frontend.
 * @returns {Object} { email, role }
 */
const extractJobDetails = (text, detectedEmail, detectedRole) => {
    let email = detectedEmail;
    let role = detectedRole;

    // 1. Try to find email in text if not provided
    if (!email) {
        const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi;
        const matches = text.match(emailRegex);
        if (matches && matches.length > 0) {
            // Pick the first one that looks like a company email (simple heuristic)
            // For now, just pick the first one found.
            email = matches[0];
        }
    }

    // 2. Try to find role if not provided (very basic heuristic)
    if (!role) {
        // Look for patterns like "hiring a [Role]" or "looking for a [Role]"
        // This is hard to do perfectly with regex, so we rely mostly on frontend or user input.
        // Fallback: "Potential Role"
        role = "Potential Role";
    }

    return { email, role };
};

module.exports = { extractJobDetails };
