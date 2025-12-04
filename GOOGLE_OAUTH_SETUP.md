# Google OAuth Setup Guide

## Current Issue: Error 403 - Access Denied

Your app "quickapply" is in **testing mode** and requires test users to be added in Google Cloud Console.

## Solution: Add Test Users

### Step 1: Go to Google Cloud Console
1. Visit [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (the one with "quickapply" OAuth app)

### Step 2: Navigate to OAuth Consent Screen
1. Go to **APIs & Services** → **OAuth consent screen**
2. Or directly visit: `https://console.cloud.google.com/apis/credentials/consent`

### Step 3: Add Test Users
1. Scroll down to the **"Test users"** section
2. Click **"+ ADD USERS"**
3. Add your email: `pradyumnshirsath1710@gmail.com`
4. Click **"ADD"**

### Step 4: Verify Settings
Make sure your OAuth consent screen has:
- **User Type**: External (or Internal if using Google Workspace)
- **Publishing status**: Testing
- **Test users**: Your email should be listed

### Step 5: Try Again
After adding your email as a test user, try signing in again. The 403 error should be resolved.

---

## Alternative: Publish Your App (For Production)

If you want anyone to use your app without adding them as test users:

1. Complete the OAuth consent screen:
   - Add app name, logo, support email
   - Add scopes you're using
   - Add privacy policy URL (required for production)
   - Add terms of service URL (required for production)

2. Submit for verification (if using sensitive scopes like Gmail)

3. Change publishing status to **"In production"**

**Note**: For development/testing, adding test users is the quickest solution.

---

## Environment Variables Required

Make sure your `.env` file in the `backend` directory has:

```env
CLIENT_ID=your-google-oauth-client-id
CLIENT_SECRET=your-google-oauth-client-secret
BACKEND_URL=http://localhost:3000
FRONTEND_URL=http://localhost:5173
JWT_SECRET=your-jwt-secret-key
```

---

## Callback URL Configuration

In Google Cloud Console → **APIs & Services** → **Credentials**:
- Make sure your OAuth 2.0 Client ID has the callback URL:
  - `http://localhost:3000/oauth/callback` (for local development)
  - Or your production URL if deployed

