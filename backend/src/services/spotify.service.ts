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

    async searchTrack(userId: string, query: string, artist?: string) {
        const client = await this.getAuthenticatedClient(userId);

        const cleanTitle = (title: string) => {
            return title
                .replace(/\(Official Video\)/gi, '')
                .replace(/\(Official Audio\)/gi, '')
                .replace(/\(Video\)/gi, '')
                .replace(/\(Lyrics\)/gi, '')
                .replace(/\[.*?\]/g, '') // Remove [Official Video] etc
                .replace(/\(.*?\) /g, '') // Remove (feat. X) if needed, but risky
                .replace(/ft\..*/gi, '')
                .replace(/feat\..*/gi, '')
                .trim();
        };

        const cleanedQuery = cleanTitle(query);
        const strategies = [
            `track:${cleanedQuery} artist:${artist}`, // Strict with cleaned
            `track:${cleanedQuery}`, // Title only cleaned
            `track:${query} artist:${artist}`, // Original strict
            `track:${query}`, // Original relaxed
        ];

        try {
            for (const q of strategies) {
                if (!q.includes('undefined')) {
                    const result = await client.searchTracks(q, { limit: 1 });
                    if (result.body.tracks?.items.length) {
                        return result.body.tracks.items[0];
                    }
                }
            }
            return null;
        } catch (error: any) {
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
            return playlist.body.id;
        } catch (error: any) {
            logger.error({ error, name, userId }, 'Spotify createPlaylist failed');
            throw error;
        }
    }

    async addTracks(userId: string, playlistId: string, trackUris: string[]) {
        const client = await this.getAuthenticatedClient(userId);
        // Spotify limit is 100 tracks per request
        const batchSize = 100;
        for (let i = 0; i < trackUris.length; i += batchSize) {
            const batch = trackUris.slice(i, i + batchSize);
            await client.addTracksToPlaylist(playlistId, batch);
        }
    }
}

export const spotifyService = new SpotifyService();
