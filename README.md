# LinkedIn Quick Apply 

Automate your LinkedIn job applications with AI-powered email generation and one-click apply functionality.

## Features

- **Google OAuth Authentication**: Secure login with Google account
- **Profile Management**: Configure your professional profile once
- **AI Email Generation**: Uses Groq AI to create personalized application emails
- **Gmail API Integration**: Sends emails directly via Gmail API (no SMTP needed)
- **Browser Extension**: Adds "Quick Apply" buttons to LinkedIn job posts
- **Smart Parsing**: Extracts job details and contact information automatically

## Project Structure

```
linkedin-quick-apply/
├── backend/              # Express.js API server
│   ├── routes/          # API routes
│   ├── services/        # Business logic (Gemini, Mailer, Parser)
│   ├── server.js        # Entry point
│   ├── package.json     # Dependencies
│   └── .env.example     # Environment variables template
├── frontend/            # Profile configuration UI
│   ├── index.html       # Main page
│   ├── style.css        # Styling
│   └── app.js           # Frontend logic
└── extension/           # Chrome browser extension (coming soon)
```

## Setup Instructions

### 1. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file in the backend directory:

```env
PORT=3000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
SESSION_SECRET=your_session_secret_key
GROQ_API_KEY=your_groq_api_key_here
CLIENT_ID=your_google_oauth_client_id
CLIENT_SECRET=your_google_oauth_client_secret
BACKEND_URL=http://localhost:3000
FRONTEND_URL=http://localhost:5173
TEST_MODE=false
```

**Getting API Keys and OAuth Credentials:**

- **Groq API Key**: Get it from [Groq Console](https://console.groq.com/)
- **Google OAuth Credentials**:
  1. Go to [Google Cloud Console](https://console.cloud.google.com/)
  2. Create a new project or select an existing one
  3. Enable the Gmail API
  4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
  5. Configure OAuth consent screen (if not done already)
  6. Set application type to "Web application"
  7. Add authorized redirect URI: `http://localhost:3000/oauth/callback`
  8. Copy the Client ID and Client Secret to your `.env` file

Start the backend server:

```bash
npm start
# or for development with auto-reload:
npm run dev
```

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Then visit `http://localhost:5173`

### 3. Authentication and Profile Setup

1. Open the frontend in your browser
2. Click "Get Started" or navigate to `/login`
3. Click "Continue with Google" to authenticate with your Google account
   - This grants permission to send emails via Gmail API
4. After authentication, you'll be redirected to the Profile page
5. Fill in your profile information:
   - Personal details (name, email, role)
   - Bio and skills
   - Portfolio links (resume, GitHub, LinkedIn, etc.)
6. Click "Save Profile"

## API Endpoints

### Authentication

- `GET /api/auth/google` - Initiate Google OAuth login
- `GET /oauth/callback` - OAuth callback (handled automatically)
- `GET /api/auth/me` - Get current authenticated user

### Profile Management

- `GET /api/profile/get` - Retrieve saved profile (requires auth)
- `PUT /api/profile/update` - Update profile (requires auth)
- `POST /api/profile/save` - Legacy endpoint (backward compatibility)

### Job Application

- `POST /api/apply` - Process and send job application (requires auth)
  ```json
  {
    "postText": "Full job post text",
    "detectedEmail": "recruiter@company.com",
    "detectedRole": "Software Engineer",
    "emailBody": "<optional pre-composed email>"
  }
  ```
- `POST /api/apply/rewrite` - Rewrite email with AI (requires auth)

### Health Check

- `GET /api/status` - Check if backend is running

## How It Works

1. **User authenticates with Google** via OAuth (grants Gmail API access)
2. **User configures profile** via the frontend interface
3. **Browser extension** detects LinkedIn job posts and adds "Quick Apply" button
4. **User clicks "Quick Apply"** → Extension extracts job post text
5. **Backend processes request**:
   - Verifies JWT token
   - Parses job details (email, role)
   - Generates personalized email using Groq AI
   - Sends email via Gmail API using user's OAuth tokens
6. **User gets confirmation** of successful application

## Technologies Used

- **Backend**: Node.js, Express.js
- **Authentication**: Passport.js, Google OAuth 2.0
- **AI**: Groq API (Llama models)
- **Email**: Gmail API (via googleapis)
- **Frontend**: React, Vite, Tailwind CSS
- **Extension**: Chrome Extension API

## Development Status

✅ Backend API complete  
✅ Profile management UI complete  
⏳ Browser extension (in progress)  
⏳ End-to-end testing  

## Security Notes

- Never commit your `.env` file
- Keep your JWT_SECRET secure and random
- Keep your CLIENT_SECRET (Google OAuth Client Secret) private
- Keep your Groq API key private
- Profile data and OAuth tokens are stored in MongoDB (encrypt tokens in production)
- OAuth tokens are automatically refreshed when expired

## Future Enhancements

- [ ] Support for multiple email templates
- [ ] Application history tracking
- [ ] Support for attachments (PDF resume)
- [ ] LinkedIn OAuth integration
- [ ] Analytics dashboard

## License

MIT

## Contributing

Contributions welcome! Please feel free to submit issues and pull requests.
