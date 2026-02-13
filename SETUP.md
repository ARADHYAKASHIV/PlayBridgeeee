# PlaylistBridge Setup Guide

## Prerequisites

- Node.js (v18+)
- MongoDB (Local or Docker)
- Git

## 1. Backend Setup

1. Navigate to backend: `cd backend`
2. Install dependencies: `npm install`
3. Setup Environment:
   - Create `.env` based on `.env.example`.
   - Fill in `DATABASE_URL` (MongoDB connection string) and OAuth credentials (see `OAUTH_SETUP.md`).
4. Setup Database:
   - Ensure MongoDB is running.
   - Generate Prisma Client: `npx prisma generate`
5. Build & Start Server:
   - Build: `npm run build`
   - Start: `npm run start` (Runs on port 3001)
   - Or for dev: `npm run dev`

## 2. Frontend Setup

1. Navigate to frontend: `cd frontend`
2. Install dependencies: `npm install`
3. Build & Start Client:
   - Build: `npm run build`
   - Start: `npm start` (Runs on port 3000)
   - Or for dev: `npm run dev`

## 3. Usage

1. Open `http://localhost:3000`.
2. Click **Connect YouTube Music** to sign in with Google.
3. Once connected, click **Connect Spotify**.
4. Allow permissions.
5. Go to **Dashboard**.
6. Select a playlist and click **Start Transfer**.
7. Watch the progress!

## Troubleshooting

- **Database Errors**: Check `DATABASE_URL` and ensure MongoDB is running.
- **Auth Errors**: Verify Redirect URIs in Google/Spotify consoles match `http://localhost:3001/api/auth/...` exactly.
- **Missing Dependencies**: Run `npm install` in both folders.

## 4. Deployment (Docker)

To run the entire stack (Backend, Frontend, MongoDB) using Docker:

1. Ensure Docker Desktop is running.
2. In the root directory, run:
   ```bash
   docker-compose up --build
   ```
3. Access the application at `http://localhost:3000`.

**Note:** The Docker setup includes a local MongoDB container. If you want to use an external database, update the `DATABASE_URL` in `docker-compose.yml` or your `.env` files.
