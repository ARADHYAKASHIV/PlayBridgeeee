import { Request, Response } from 'express';
import { authService } from '../services/auth.service';
import { logger } from '../utils/logger';

export class AuthController {

    // GET /api/auth/google
    async loginGoogle(req: Request, res: Response) {
        const url = authService.getGoogleAuthUrl();
        res.redirect(url);
    }

    // GET /api/auth/google/callback
    async googleCallback(req: Request, res: Response) {
        try {
            const { code } = req.query;
            if (!code || typeof code !== 'string') {
                return res.status(400).json({ error: 'Missing code' });
            }

            const user = await authService.handleGoogleCallback(code);

            // In a real app, we would issue a JWT session token here.
            // For simplicity, we can redirect to frontend with userId ? 
            // OR set a secure HTTP-only cookie.
            // Let's assume we redirect to frontend dashboard with userId (NOT SECURE for production but simple for local tool).
            // BETTER: Set a cookie.

            // We'll create a simple session cookie for now or just redirect with a query param for the local demo.
            // Ideally, use express-session or JWT interaction.
            // Given constraints (Simple, robust), let's redirect to frontend with `?userId=...`
            // The frontend can then store it in localStorage (again, not best security practice but functional for local dev).
            // Or we can issue a specialized temporary token.

            res.redirect(`${process.env.FRONTEND_URL}/dashboard?userId=${user.id}`);
        } catch (error: any) {
            logger.error({ err: error, message: error?.message, stack: error?.stack }, 'Google OAuth callback failed');
            res.redirect(`${process.env.FRONTEND_URL}/?error=auth_failed`);
        }
    }

    // GET /api/auth/spotify?userId=...
    async connectSpotify(req: Request, res: Response) {
        const { userId } = req.query;
        if (!userId || typeof userId !== 'string') {
            return res.status(400).json({ error: 'userId required' });
        }

        // Pass userId through OAuth state param — survives the redirect round-trip
        const url = authService.getSpotifyAuthUrl(userId);
        res.redirect(url);
    }

    // GET /api/auth/spotify/callback
    async spotifyCallback(req: Request, res: Response) {
        // console.log('Spotify callback hit'); // Removed potential huge log
        try {
            const { code, state, error: spotifyError } = req.query;

            // Spotify can redirect back with an error if user denied access
            if (spotifyError) {
                logger.error({ spotifyError }, 'Spotify returned an error');
                return res.redirect(`${process.env.FRONTEND_URL}/dashboard?error=spotify_denied`);
            }

            const userId = typeof state === 'string' ? state : undefined;

            logger.info({ code: code ? 'present' : 'missing', userId, state }, 'Spotify callback received');

            if (!code || typeof code !== 'string') {
                return res.status(400).json({ error: 'Missing code' });
            }

            if (!userId) {
                return res.status(400).json({ error: 'User session lost (missing state)' });
            }

            await authService.handleSpotifyCallback(code, userId);

            res.redirect(`${process.env.FRONTEND_URL}/dashboard?status=spotify_connected`);
        } catch (error: any) {
            console.error('Spotify Callback Error:', error);
            // logger.error({ err: error, message: error?.message, statusCode: error?.statusCode, body: error?.body }, 'Spotify OAuth callback failed');
            res.redirect(`${process.env.FRONTEND_URL}/dashboard?error=spotify_failed`);
        }
    }

    // POST /api/auth/disconnect
    // Body: { userId, provider }
    async disconnect(req: Request, res: Response) {
        const { userId, provider } = req.body;

        if (!userId || !provider) {
            return res.status(400).json({ error: 'userId and provider required' });
        }

        try {
            await authService.disconnectProvider(userId, provider);
            res.json({ success: true });
        } catch (error: any) {
            logger.error(error, 'Disconnect failed');
            res.status(500).json({ error: 'Disconnect failed' });
        }
    }
}

export const authController = new AuthController();
