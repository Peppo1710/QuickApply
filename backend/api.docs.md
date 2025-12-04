Backend API Documentation
=========================

Base URL
--------

- **Local development**: `http://localhost:<PORT>`
- **API prefix**: All endpoints are mounted under `/api`

Authentication
--------------

- **Scheme**: Bearer token (JWT)
- **Header**: `Authorization: Bearer <JWT_TOKEN>`
- **Token source**: JWTs are issued by:
  - `GET /oauth/callback` (after successful Google OAuth authentication)

**Google OAuth Authentication**: Users must authenticate with Google to use the application. This provides secure access to Gmail API for sending application emails. The OAuth flow requests the following scopes:
- `profile` - User's basic profile information
- `email` - User's email address
- `https://www.googleapis.com/auth/gmail.send` - Permission to send emails via Gmail API

Unless otherwise noted, authenticated endpoints require a valid JWT in the `Authorization` header.

High-level Flow
----------------

- **1. Authenticate with Google (website → backend)**  
  The website redirects to `GET /api/auth/google` which initiates Google OAuth. After user consent, Google redirects to `GET /oauth/callback` with OAuth tokens. The backend:
  - Creates or updates a `UserProfile` in MongoDB
  - Stores Google OAuth tokens (access token, refresh token)
  - Generates a **JWT token** for session management
  - Redirects to frontend with token: `/auth/callback?token=<JWT>`

- **2. Store token (website → browser)**  
  The website saves that token in:
  - `localStorage.profileToken` for the web app itself, and  
  - `chrome.storage.local.authToken` so the browser extension can use it.

- **3. Use token (extension/website → backend)**  
  - The website uses the token with `GET /api/profile/get` to load your profile.
  - The website uses the token with `PUT /api/profile/update` to update your profile.
  - The extension uses the token with:
    - `POST /api/apply` to generate + send application emails via Gmail API, and  
    - `POST /api/apply/rewrite` to refine an email before sending.

- **4. LinkedIn flow (extension ↔ backend)**  
  On LinkedIn, the extension:
  - Checks if the token exists → shows Quick Apply buttons if it does.  
  - Scrapes job post text and calls `POST /api/apply` with the token.  
  - Shows the generated email in an editable overlay and lets you send it (second `POST /api/apply` with the edited email body).
  - The backend uses the user's stored Google OAuth tokens to send emails via Gmail API.

Health Check
------------

### GET `/api/status`

- **Auth**: Not required
- **Description**: Simple health check for the API and MongoDB connection.

**Response 200**

```json
{
  "status": "ok",
  "mongo": "connected"
}
```

Possible values for `mongo` are:
- `"connected"` – MongoDB connection established
- `"disconnected"` – MongoDB not connected

Authentication APIs (`/api/auth`)
---------------------------------

### GET `/api/auth/google`

- **Auth**: Not required
- **Description**: Initiates Google OAuth authentication flow. Redirects user to Google's consent screen.

**Query Parameters**: None

**Response**: Redirects to Google OAuth consent screen

**Scopes Requested**:
- `profile` - User's basic profile information
- `email` - User's email address
- `https://www.googleapis.com/auth/gmail.send` - Permission to send emails via Gmail API

### GET `/oauth/callback`

- **Auth**: Not required (handled by Google OAuth)
- **Description**: Google OAuth callback endpoint. Receives OAuth tokens from Google, creates/updates user profile, and redirects to frontend with JWT token.

**Query Parameters** (from Google):
- `code` - OAuth authorization code
- `scope` - Granted scopes
- `authuser` - Authenticated user index
- `prompt` - Prompt type

**Response**: Redirects to `${FRONTEND_URL}/auth/callback?token=<JWT_TOKEN>`

**On Success**:
- Creates or updates `UserProfile` in MongoDB
- Stores `googleId`, `googleAccessToken`, and `googleRefreshToken`
- Generates JWT token
- Redirects to frontend with token

**On Error**: Redirects to `${FRONTEND_URL}/auth/callback?error=authentication_failed`

**Note**: This endpoint is also accessible at `/api/auth/callback` for backward compatibility.

### GET `/api/auth/me`

- **Auth**: Required (Bearer token)
- **Description**: Get current authenticated user information.

**Headers**
- `Authorization: Bearer <JWT_TOKEN>`

**Response 200**

```json
{
  "user": {
    "_id": "<mongo_object_id>",
    "fullName": "John Doe",
    "email": "user@example.com",
    "currentRole": "Software Engineer",
    "bio": "Short professional bio...",
    "skills": "JavaScript, React, Node.js",
    "resumeUrl": "https://example.com/resume.pdf",
    "portfolioUrl": "https://example.com",
    "linkedinUrl": "https://linkedin.com/in/johndoe",
    "githubUrl": "https://github.com/johndoe",
    "phone": "+1-555-1234",
    "googleId": "123456789",
    "isLocked": false,
    "lastUpdated": "2024-01-01T00:00:00.000Z"
  },
  "authenticated": true
}
```

**Error Responses**
- `401 Unauthorized` – Missing, invalid, or expired token
- `404 Not Found` – User not found

Profile APIs (`/api/profile`)
-----------------------------

### POST `/api/profile/save`

- **Auth**: Not required (legacy endpoint, primarily used for backward compatibility)
- **Description**: Create or update a user profile by email and return a JWT tied to that profile.

**Note**: This endpoint is kept for backward compatibility. New users should authenticate via Google OAuth (`GET /api/auth/google`). If a profile with the given email already exists, it is **updated**. Otherwise a new profile is created.

**Request Body (JSON)**

Same shape as the user profile (all fields optional except `email`, but the UI usually provides most fields):

```json
{
  "fullName": "John Doe",
  "email": "user@example.com",
  "currentRole": "Software Engineer",
  "bio": "Short professional bio...",
  "skills": "JavaScript, React, Node.js",
  "resumeUrl": "https://example.com/resume.pdf",
  "portfolioUrl": "https://example.com",
  "linkedinUrl": "https://linkedin.com/in/johndoe",
  "githubUrl": "https://github.com/johndoe",
  "phone": "+1-555-1234"
}
```

**Response 200**

```json
{
  "message": "Profile saved successfully",
  "profile": {
    "_id": "<mongo_object_id>",
    "fullName": "John Doe",
    "email": "user@example.com",
    "currentRole": "Software Engineer",
    "bio": "Short professional bio...",
    "skills": "JavaScript, React, Node.js",
    "resumeUrl": "https://example.com/resume.pdf",
    "portfolioUrl": "https://example.com",
    "linkedinUrl": "https://linkedin.com/in/johndoe",
    "githubUrl": "https://github.com/johndoe",
    "phone": "+1-555-1234",
    "isLocked": false,
    "lastUpdated": "2024-01-01T00:00:00.000Z",
    "__v": 0
  },
  "token": "<JWT_TOKEN>"
}
```

**Error Responses**

- `500 Internal Server Error` – Failed to save profile

### PUT `/api/profile/update`

- **Auth**: Required
- **Description**: Update an existing profile. Use this after a token has already been issued by `/api/profile/save`.

**Headers**

- `Authorization: Bearer <JWT_TOKEN>`
- `Content-Type: application/json`

**Request Body (JSON)**

- Same as `/api/profile/save`. You can send only the fields you want to change.

**Response 200**

```json
{
  "message": "Profile updated successfully",
  "profile": {
    "_id": "<mongo_object_id>",
    "fullName": "John Doe",
    "email": "user@example.com",
    "currentRole": "Software Engineer",
    "bio": "Short professional bio...",
    "skills": "JavaScript, React, Node.js",
    "resumeUrl": "https://example.com/resume.pdf",
    "portfolioUrl": "https://example.com",
    "linkedinUrl": "https://linkedin.com/in/johndoe",
    "githubUrl": "https://github.com/johndoe",
    "phone": "+1-555-1234",
    "isLocked": false,
    "lastUpdated": "2024-01-01T00:00:00.000Z",
    "__v": 0
  }
}
```

**Error Responses**

- `401 Unauthorized` – Missing/invalid token
- `404 Not Found` – Profile not found
- `500 Internal Server Error` – Failed to update profile

### GET `/api/profile/get`

- **Auth**: Required
- **Description**: Retrieve the authenticated user's profile (without password).

**Headers**

- `Authorization: Bearer <JWT_TOKEN>`

**Response 200**

Same shape as the `profile` object returned from `/api/profile/save`.

**Error Responses**

- `401 Unauthorized` – Missing, invalid, or expired token
- `404 Not Found` – Profile not found
- `500 Internal Server Error` – Failed to load profile

### GET `/api/profile/`

- **Auth**: Required
- **Description**: Legacy endpoint kept for backward compatibility (older extension versions). Returns the same data as `/api/profile/get`, or `{}` if no profile is found.

**Headers**

- `Authorization: Bearer <JWT_TOKEN>`

**Response 200 (profile found)**

Same as `/api/profile/get`.

**Response 200 (no profile)**

```json
{}
```

**Error Responses**

- `401 Unauthorized` – Missing, invalid, or expired token
- `500 Internal Server Error` – Failed to load profile

Application APIs (`/api/apply`)
-------------------------------

### POST `/api/apply/rewrite`

- **Auth**: Required
- **Description**: Use Groq (LLM) to rewrite an existing email body based on a natural-language prompt. Primarily used by the extension UI for refining the generated email.

**Headers**

- `Authorization: Bearer <JWT_TOKEN>`

**Request Body (JSON)**

```json
{
  "currentEmail": "<html email content>",
  "prompt": "Make the tone more formal and concise."
}
```

**Response 200**

```json
{
  "rewrittenEmail": "<rewritten html email content>"
}
```

**Notes**

- In `TEST_MODE` (`process.env.TEST_MODE === "true"`), the backend simply echoes `currentEmail` with an annotation instead of calling the Groq API.

**Error Responses**

- `500 Internal Server Error` – Failed to rewrite email

### POST `/api/apply`

- **Auth**: Required
- **Description**: Main endpoint to process a LinkedIn job application: parse job post text, optionally generate an email via Groq, and send via SMTP.

**Headers**

- `Authorization: Bearer <JWT_TOKEN>`

**Request Body (JSON)**

```json
{
  "postText": "Full job post text from LinkedIn...",
  "detectedEmail": "recruiter@company.com",
  "detectedRole": "Software Engineer",
  "emailBody": "<optional pre-composed html email content>"
}
```

- `postText` – Raw job post text (used for parsing and AI generation).
- `detectedEmail` – Email detected on the frontend (optional; backend will attempt to parse if missing).
- `detectedRole` – Role detected on the frontend (optional; backend will fallback to a generic `"Potential Role"` if missing).
- `emailBody` – If provided, the backend **uses this as-is** instead of generating a new email with Gemini.

**Behavior**

1. **Profile lookup**: Loads the authenticated user's profile using the JWT.
2. **Email selection / generation**:
   - If `emailBody` is present, it is used as the email content.
   - If `emailBody` is not present:
     - `extractJobDetails` parses `postText` to get `email` and `role`.
     - If no email can be found, the request fails with `400`.
     - `generateApplicationEmail` uses Groq to create an HTML email based on the profile and job post (or falls back to a simple built-in template if Groq is unavailable).
3. **Recipient email resolution**:
   - If `emailBody` is provided and `detectedEmail` is missing, the backend re-runs `extractJobDetails` on `postText` to attempt to find a recipient email.
   - If no recipient email is available, the request fails with `400`.
4. **Email sending**:
   - `sendApplicationEmail` sends the email using Gmail API with the user's stored Google OAuth tokens.
   - If the access token is expired, it automatically refreshes using the refresh token.
   - Requires the user to have authenticated with Google OAuth and granted Gmail send permissions.

**Response 200**

```json
{
  "success": true,
  "message": "Application sent to recruiter@company.com",
  "generatedEmail": "<final html email content used for sending>"
}
```

**Error Responses**

- `400 Bad Request` – No email found in job post / no email found to send to
- `401 Unauthorized` – Missing, invalid, or expired token
- `500 Internal Server Error` – Error during processing or sending the application (error message may contain more detail)

Models
------

### `UserProfile` Schema (MongoDB)

Fields (all stored on the `UserProfile` model):

- `fullName` (String, required)
- `email` (String, required, lowercased, trimmed)
- `currentRole` (String, required)
- `bio` (String, required)
- `skills` (String, required)
- `resumeUrl` (String, optional)
- `portfolioUrl` (String, optional)
- `linkedinUrl` (String, optional)
- `githubUrl` (String, optional)
- `phone` (String, optional)
- `password` (String, optional, hashed with bcrypt - legacy field)
- `googleId` (String, optional) - Google OAuth user ID
- `googleAccessToken` (String, optional) - Google OAuth access token (encrypted in production)
- `googleRefreshToken` (String, optional) - Google OAuth refresh token (encrypted in production)
- `isLocked` (Boolean, default: `false`)
- `lastUpdated` (Date, default: `Date.now`)

Environment Variables
---------------------

Key environment variables used by the backend:

- `PORT` – Server port (default: `3000`)
- `MONGO_URI` – MongoDB connection string
- `JWT_SECRET` – Secret key for signing JWTs
- `GROQ_API_KEY` – API key for Groq (required for AI email generation)
- `CLIENT_ID` – Google OAuth Client ID (required for authentication)
- `CLIENT_SECRET` – Google OAuth Client Secret (required for authentication)
- `BACKEND_URL` – Backend URL for OAuth callback (default: `http://localhost:3000`)
- `FRONTEND_URL` – Frontend URL for OAuth redirects (default: `http://localhost:5173`)
- `TEST_MODE` – If set to `"true"`, Groq and Gmail API operations are mocked for testing

**Note**: `SMTP_USER` and `SMTP_PASS` are no longer used. Email sending is now handled via Gmail API using OAuth tokens.


