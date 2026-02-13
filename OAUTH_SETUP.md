# OAuth 2.0 Setup Guide for PlaylistBridge

To run the application, you need to configure Google (YouTube Music) and Spotify API credentials.

## 1. Google (YouTube Music) Setup

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project named `PlaylistBridge`.
3. In the sidebar, go to **APIs & Services > Library**.
4. Enable the following APIs:
   - **YouTube Data API v3**
   - **YouTube Analytics API** (optional but good to have)
5. Go to **APIs & Services > OAuth consent screen**.
   - Select **External**.
   - Fill in app name and support email.
   - Add scopes:
     - `.../auth/youtube.readonly`
     - `.../auth/userinfo.profile`
     - `.../auth/userinfo.email`
   - Add your email as a **Test User**.
6. Go to **APIs & Services > Credentials**.
   - Click **Create Credentials > OAuth client ID**.
   - Application type: **Web application**.
   - Name: `PlaylistBridge Web Client`.
   - **Authorized redirect URIs**: `http://localhost:3001/api/auth/google/callback`
7. Copy the **Client ID** and **Client Secret** into your backend `.env` file.

## 2. Spotify Setup

1. Go to the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard/).
2. Log in and click **Create App**.
3. Name: `PlaylistBridge`, Description: `Transfer playlists`.
4. Redirect URI: `http://127.0.0.1:3001/api/auth/spotify/callback`
5. Click **Save**.
6. In settings, find the **Client ID** and **Client Secret**.
7. Copy them into your backend `.env` file.
8. **Important**: While in development mode, you must add your Spotify email (and any testers) to the **Users and Access** section in the dashboard to clarify access.

## 3. Environment Variables

Ensure your `backend/.env` file looks like this:

```env
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=http://localhost:3001/api/auth/google/callback

SPOTIFY_CLIENT_ID=...
SPOTIFY_CLIENT_SECRET=...
SPOTIFY_REDIRECT_URI=http://127.0.0.1:3001/api/auth/spotify/callback
```
