Connection Architecture (Website, Extension, Backend)
=====================================================

Overview
--------

This project has three main pieces that talk to each other:

- **Website (frontend)** – A React app where you authenticate with Google and manage your profile.
- **Backend (API server)** – An Express server that handles Google OAuth, stores your profile, talks to Groq AI, and sends emails via Gmail API.
- **Browser Extension** – Runs on LinkedIn, detects job posts, and calls the backend to generate/send applications.

**Authentication**: Users must sign in with Google OAuth to use the application. This provides secure access to Gmail API for sending application emails.

Step 1: Authentication (Google OAuth)
------------------------------------

1. You open the website (for local dev, something like `http://localhost:5173`).
2. You click **"Get Started"** or navigate to `/login`.
3. You click **"Continue with Google"** which redirects you to:
   - **Endpoint**: `GET http://localhost:3000/api/auth/google`
   - This initiates Google OAuth flow requesting:
     - Profile information (name, email)
     - Gmail send permissions (`https://www.googleapis.com/auth/gmail.send`)

4. Google redirects back to:
   - **Endpoint**: `GET http://localhost:3000/oauth/callback`
   - The backend:
     - Receives OAuth tokens (access token, refresh token)
     - Finds or creates a `UserProfile` in MongoDB
     - Stores Google OAuth tokens in the profile
     - Generates a **JWT token** for session management
     - Redirects to frontend with token: `/auth/callback?token=<JWT>`

5. The frontend (`/auth/callback`):
   - Extracts the token from URL
   - Stores it in `localStorage` as `profileToken`
   - Stores it in `chrome.storage.local` as `authToken` (for extension)
   - Redirects to `/profile`

Result: You are authenticated with Google, your profile is linked to your Google account, and both the website and extension have a token for API access.

Step 2: Website → Backend (Profile Setup)
----------------------------------------

1. After authentication, you access the **Profile** page (protected route).
2. On the **Profile** page you can view/edit:
   - Name, email, role, bio, skills
   - Links (resume, portfolio, GitHub, LinkedIn)
3. When you click **"Save Profile"**, the frontend sends a request to the backend:

   - **Endpoint**: `PUT http://localhost:3000/api/profile/update` (if updating)
   - **Headers**: `Authorization: Bearer <JWT_TOKEN>`
   - **Body**: Your profile data (name, email, links, etc.)

4. The backend:
   - Verifies the JWT token
   - Updates the `UserProfile` document in MongoDB
   - Returns the updated profile

Result: Your profile is saved/updated in the database with all your details.

Step 2: Extension → Backend (Quick Apply Flow)
---------------------------------------------

1. You browse LinkedIn with the extension installed.
2. The **content script** runs on LinkedIn pages and:
   - Looks for job posts in the feed.
   - Adds a **“Quick Apply”** button to each post.
3. When you click **“Quick Apply”** on a post:
   - The extension reads the job post text from the page.
   - It tries to detect:
     - **Email address** in the post.
     - **Role title** (e.g., “Frontend Engineer”).
   - It loads your token from `chrome.storage.local` (`authToken`).
4. The extension calls the backend:

   - **Endpoint**: `POST http://localhost:3000/api/apply`
   - **Headers**:
     - `Authorization: Bearer <authToken>`
     - `Content-Type: application/json`
   - **Body**:
     - `postText`, `detectedEmail`, `detectedRole`

5. The backend:
   - Verifies the JWT (using the same secret it used to sign it).
   - Loads your `UserProfile` from MongoDB (including Google OAuth tokens).
   - Uses `postText` + your profile to:
     - **Generate** an email using Groq AI (if no `emailBody` is provided), or
     - Use the `emailBody` you provided from the UI.
   - Sends the final email via **Gmail API** using the user's stored Google OAuth tokens.
   - Returns the generated email HTML so the extension can show/edit it in an overlay.

6. The extension:
   - Opens an overlay on top of LinkedIn with the generated email.
   - Lets you:
     - Edit the email manually, or
     - Click **“✨ Rewrite”** which calls:
       - **Endpoint**: `POST /api/apply/rewrite` with your current email + a prompt.
   - When you click **“Send Application”**, it calls `POST /api/apply` **again**, this time including your edited `emailBody`, so the backend just sends that version.

Result: From LinkedIn, you can generate, refine, and send a personalized application email with minimal friction.

Where the Token Flows
---------------------

- **Generated at**: `GET /oauth/callback` (after Google OAuth)
- **Stored in**:
  - `localStorage.profileToken` (website)
  - `chrome.storage.local.authToken` (extension)
- **Used by**:
  - Website:
    - `GET /api/profile/get` (to reload your profile when you revisit the page)
    - `PUT /api/profile/update` (to update your profile)
  - Extension:
    - `POST /api/apply` (to generate and send application emails)
    - `POST /api/apply/rewrite` (to refine email content)

If the token is missing or expired, the extension will show a message telling you to **log in again via the website**.

Gmail API Integration
--------------------

- **OAuth Tokens**: Stored in `UserProfile` model:
  - `googleAccessToken` - Short-lived token for API calls
  - `googleRefreshToken` - Long-lived token to refresh access token
- **Email Sending**: Uses `googleapis` library with Gmail API
- **Token Refresh**: Automatically refreshes expired access tokens using refresh token
- **Permissions**: Requires `https://www.googleapis.com/auth/gmail.send` scope

High-Level Diagram (Text Version)
---------------------------------

1. **Authentication**
   - You → Website (Login page) → Click "Continue with Google"
   - Website → `GET /api/auth/google` → Google OAuth
   - Google → `GET /api/auth/google/callback` → Backend
   - Backend → Creates/updates UserProfile with Google tokens → Generates JWT
   - Backend → Redirects to `/auth/callback?token=<JWT>`
   - Website → Stores token (localStorage + chrome.storage) → Redirects to Profile

2. **Profile Setup**
   - You → Website (Profile page) → Fill in details → `PUT /api/profile/update`
   - Backend → Updates MongoDB → Returns profile

3. **Quick Apply**
   - Extension (on LinkedIn) → reads job post
   - Extension → `POST /api/apply` with `Authorization: Bearer <token>`
   - Backend:
     - Verifies JWT token
     - Loads profile from MongoDB (including Google OAuth tokens)
     - Generates email with Groq AI (if needed)
     - Uses Gmail API with user's OAuth tokens to send email
     - Returns generated email back to extension

4. **Rewrite & Send**
   - Extension overlay → `POST /api/apply/rewrite` (optional)
   - Extension overlay → `POST /api/apply` with final `emailBody`

In short: **You authenticate with Google once, set up your profile, and the extension uses your Google account to send application emails via Gmail API.**


