import { google } from 'googleapis';
import { authService } from './auth.service';
import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';
import { AuthProvider } from '@prisma/client';

export class YouTubeService {

    private async getAuthenticatedClient(userId: string) {
        const token = await prisma.oAuthToken.findUnique({
            where: { userId_provider: { userId, provider: AuthProvider.GOOGLE } }
        });

        if (!token) throw new Error('User not connected to YouTube Music');

        // Check if expired or close to expiring (within 5 mins)
        const now = new Date();
        const expiry = token.expiresAt ? new Date(token.expiresAt) : new Date(0);
        if (expiry.getTime() - now.getTime() < 5 * 60 * 1000) {
            logger.info(`Refreshing Google token for user ${userId}`);
            await authService.refreshAccessToken(userId, AuthProvider.GOOGLE);
            // Re-fetch token after refresh
            const refreshedToken = await prisma.oAuthToken.findUnique({
                where: { userId_provider: { userId, provider: AuthProvider.GOOGLE } }
            });
            if (!refreshedToken) throw new Error('Failed to refresh token');

            const oauth2Client = new google.auth.OAuth2(
                process.env.GOOGLE_CLIENT_ID,
                process.env.GOOGLE_CLIENT_SECRET
            );
            oauth2Client.setCredentials({ access_token: refreshedToken.accessToken });
            return oauth2Client;
        }

        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET
        );
        oauth2Client.setCredentials({ access_token: token.accessToken });
        return oauth2Client;
    }

    async getPlaylists(userId: string) {
        const auth = await this.getAuthenticatedClient(userId);
        const youtube = google.youtube({ version: 'v3', auth });

        let playlists: any[] = [];
        let nextPageToken: string | undefined = undefined;

        do {
            const response: any = await youtube.playlists.list({
                part: ['snippet', 'contentDetails'],
                mine: true,
                maxResults: 50,
                pageToken: nextPageToken,
            });

            if (response.data.items) {
                playlists = playlists.concat(response.data.items);
            }
            nextPageToken = response.data.nextPageToken || undefined;
        } while (nextPageToken);

        return playlists.map(p => ({
            id: p.id,
            title: p.snippet?.title || 'Untitled',
            thumbnail: p.snippet?.thumbnails?.default?.url,
            count: p.contentDetails?.itemCount || 0,
        }));
    }

    async getPlaylistTracks(userId: string, playlistId: string) {
        const auth = await this.getAuthenticatedClient(userId);
        const youtube = google.youtube({ version: 'v3', auth });

        let tracks: any[] = [];
        let nextPageToken: string | undefined = undefined;

        // Handle "Liked Music" specifically if needed, but often mapped to 'LM' via API if supported.
        // However, 'LM' is not always available via API directly for all users.
        // If playlistId is 'LM', we might need to use `activities` or specific endpoint? 
        // Standard `playlistItems` works for 'LM' only if scope allows and user has it as a proper playlist ID.
        // Often 'LL' or 'LM' works. We'll assume passed ID is correct.

        do {
            try {
                const response: any = await youtube.playlistItems.list({
                    part: ['snippet', 'contentDetails'],
                    playlistId: playlistId,
                    maxResults: 50,
                    pageToken: nextPageToken,
                });

                if (response.data.items) {
                    const fetchedTracks = response.data.items.map((item: any) => {
                        const rawTitle = item.snippet?.title || '';
                        let artist = '';
                        let title = rawTitle;

                        // Try to split "Artist - Title"
                        if (rawTitle.includes(' - ')) {
                            const parts = rawTitle.split(' - ');
                            artist = parts[0].trim();
                            title = parts.slice(1).join(' - ').trim();
                        } else {
                            // Fallback to channel title if no hyphen
                            artist = item.snippet?.videoOwnerChannelTitle || '';
                        }

                        return {
                            id: item.id,
                            title,
                            artist,
                            originalTitle: rawTitle,
                            videoOwner: item.snippet?.videoOwnerChannelTitle,
                            videoId: item.contentDetails?.videoId,
                        };
                    }).filter((t: any) => t.title && t.title !== 'Deleted video');

                    tracks = tracks.concat(fetchedTracks);
                }
                nextPageToken = response.data.nextPageToken || undefined;
            } catch (err) {
                logger.error(err, `Error fetching updated page for playlist ${playlistId}`);
                throw err;
            }
        } while (nextPageToken);

        return tracks;
    }
}

export const youtubeService = new YouTubeService();
