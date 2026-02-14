import SpotifyWebApi from 'spotify-web-api-node';
import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';
import { AuthProvider } from '@prisma/client';
import { authService } from './auth.service';

export class SpotifyService {

    private async getAuthenticatedClient(userId: string) {
        const token = await prisma.oAuthToken.findUnique({
            where: { userId_provider: { userId, provider: AuthProvider.SPOTIFY } }
        });

        if (!token) throw new Error('User not connected to Spotify');

        const spotifyApi = new SpotifyWebApi({
            clientId: process.env.SPOTIFY_CLIENT_ID,
            clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
            redirectUri: process.env.SPOTIFY_REDIRECT_URI,
        });

        spotifyApi.setAccessToken(token.accessToken);
        if (token.refreshToken) {
            spotifyApi.setRefreshToken(token.refreshToken);
        }

        // Check expiry
        const now = new Date();
        if (token.expiresAt && token.expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
            logger.info(`Refreshing Spotify token for user ${userId}`);

            try {
                // Refresh using the SAME instance
                const data = await spotifyApi.refreshAccessToken();
                const newAccessToken = data.body.access_token;
                const newRefreshToken = data.body.refresh_token || token.refreshToken; // Use old if not returned
                const expiresAt = new Date(Date.now() + data.body.expires_in * 1000);

                // Update DB
                await prisma.oAuthToken.update({
                    where: { userId_provider: { userId, provider: AuthProvider.SPOTIFY } },
                    data: {
                        accessToken: newAccessToken,
                        refreshToken: newRefreshToken,
                        expiresAt,
                    }
                });

                // Update current instance
                spotifyApi.setAccessToken(newAccessToken);
                if (newRefreshToken) {
                    spotifyApi.setRefreshToken(newRefreshToken);
                }
            } catch (error: any) {
                logger.error(error, 'Failed to refresh Spotify token');
                throw error;
            }
        }

        return spotifyApi;
    }

    async searchTrack(userId: string, query: string, artist?: string, retryCount: number = 0): Promise<any> {
        const MAX_RETRIES = 3;
        const MAX_RETRY_WAIT = 10; // seconds — never wait longer than this
        const client = await this.getAuthenticatedClient(userId);

        const cleanTitle = (title: string) => {
            return title
                .replace(/\|.*$/g, '')               // Remove everything after |
                .replace(/@\S+/g, '')                 // Remove @mentions
                .replace(/Official\s*(Music\s*)?Video/gi, '')
                .replace(/Official\s*Audio/gi, '')
                .replace(/\(Official\)/gi, '')
                .replace(/\(Lyrics?\)/gi, '')
                .replace(/\(Video\)/gi, '')
                .replace(/\(Audio\)/gi, '')
                .replace(/\[.*?\]/g, '')              // Remove [anything in brackets]
                .replace(/\(.*?\)/g, '')              // Remove (anything in parens)
                .replace(/ft\..*$/gi, '')             // Remove ft. and everything after
                .replace(/feat\..*$/gi, '')           // Remove feat. and everything after
                .replace(/\bMV\b/gi, '')              // Remove standalone "MV"
                .replace(/\bHD\b/gi, '')              // Remove standalone "HD"
                .replace(/\b4K\b/gi, '')              // Remove standalone "4K"
                .replace(/[-–—]\s*Topic$/gi, '')      // Remove "- Topic" (YouTube auto-generated channels)
                .replace(/\s{2,}/g, ' ')              // Collapse multiple spaces
                .trim();
        };

        const cleanedQuery = cleanTitle(query);
        const naturalQuery = `${cleanedQuery} ${artist || ''}`.trim();

        // Used for logging/debugging
        logger.info(`Spotify Search Query: ${naturalQuery}`);

        const strategies = [
            naturalQuery, // Best bet: "Title Artist"
            `track:${cleanedQuery} artist:${artist}`, // Strict
            `track:${cleanedQuery}`, // Title only
        ];

        try {
            for (const q of strategies) {
                if (!q.includes('undefined')) {
                    const result = await client.searchTracks(q, { limit: 1 });
                    if (result.body.tracks?.items.length) {
                        return result.body.tracks.items[0];
                    }
                    // Small delay between strategy attempts to avoid hammering the API
                    await new Promise(res => setTimeout(res, 200));
                }
            }
            return null;
        } catch (error: any) {
            if (error.statusCode === 429) {
                if (retryCount >= MAX_RETRIES) {
                    logger.error(`Rate limited (429) after ${MAX_RETRIES} retries for: ${query}. Giving up.`);
                    return null;
                }
                // Extract retry-after, cap it to a sane value
                const rawRetryAfter = parseInt(error.headers?.['retry-after'] || error.body?.['Retry-After'] || '2', 10);
                const retryAfter = Math.min(isNaN(rawRetryAfter) ? 2 : rawRetryAfter, MAX_RETRY_WAIT);
                logger.warn(`Rate limited (429). Retry ${retryCount + 1}/${MAX_RETRIES}, waiting ${retryAfter}s...`);
                await new Promise(res => setTimeout(res, retryAfter * 1000));
                return this.searchTrack(userId, query, artist, retryCount + 1);
            }
            logger.error(error, `Error searching track: ${query}`);
            return null;
        }
    }

    async createPlaylist(userId: string, name: string, description: string = 'Imported from YouTube Music') {
        const client = await this.getAuthenticatedClient(userId);
        let me;
        try {
            const meRes = await client.getMe();
            me = meRes.body;
        } catch (error: any) {
            logger.error({ error, userId }, 'Spotify getMe failed');
            throw error;
        }

        // Check exist
        let existingPlaylistId = null;
        try {
            let offset = 0;
            let limit = 50;
            while (true) {
                const playlists = await client.getUserPlaylists(me.id, { limit, offset });
                const existing = playlists.body.items.find((p: any) => p.name === name);
                if (existing) {
                    existingPlaylistId = existing.id;
                    break;
                }
                if (!playlists.body.next) break;
                offset += limit;
            }
        } catch (error: any) {
            logger.error({ error, userId }, 'Spotify getUserPlaylists failed (proceeding to create)');
            // Continue? If we can't check, maybe just try create? 
            // Better to fail to avoid duplicates if that's the concern, or just ignore and create.
            // throw error; // SWALLOW ERROR TO UNBLOCK CREATION
        }

        if (existingPlaylistId) {
            logger.info(`Playlist '${name}' already exists for user ${userId}, using it.`);
            return existingPlaylistId;
        }

        logger.info(`Creating playlist '${name}' for Spotify user '${me.id}'`);
        try {
            const playlist = await client.createPlaylist(name, { description: 'Imported Playlist', public: false });
            logger.info(`Playlist created: ${playlist.body.id}`);
            logger.info(`Playlist owner ID: ${playlist.body.owner.id}`);
            logger.info(`Current user ID: ${me.id}`); // 'me' was fetched earlier
            return playlist.body.id;
        } catch (error: any) {
            logger.error({ error, name, userId }, 'Spotify createPlaylist failed');
            throw error;
        }
    }

    async addTracks(userId: string, playlistId: string, trackUris: string[]) {
        const client = await this.getAuthenticatedClient(userId);

        try {
            const me = await client.getMe();
            logger.info(`Adding tracks as user: ${me.body.id} to playlist ${playlistId}`);
        } catch (e) { logger.error(e, 'Failed to getMe in addTracks'); }

        // Spotify limit is 100 tracks per request
        const batchSize = 100;
        for (let i = 0; i < trackUris.length; i += batchSize) {
            const batch = trackUris.slice(i, i + batchSize);
            await client.addTracksToPlaylist(playlistId, batch);
        }
    }
}

export const spotifyService = new SpotifyService();
