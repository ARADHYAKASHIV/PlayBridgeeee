import { google } from 'googleapis';
import SpotifyWebApi from 'spotify-web-api-node';
import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';
import { OAuthToken, AuthProvider } from '@prisma/client';

export class AuthService {
    private _googleClient: any;
    private _spotifyClient: any;

    private get googleClient() {
        if (!this._googleClient) {
            this._googleClient = new google.auth.OAuth2(
                process.env.GOOGLE_CLIENT_ID,
                process.env.GOOGLE_CLIENT_SECRET,
                process.env.GOOGLE_REDIRECT_URI
            );
        }
        return this._googleClient;
    }

    private get spotifyClient() {
        if (!this._spotifyClient) {
            this._spotifyClient = new SpotifyWebApi({
                clientId: process.env.SPOTIFY_CLIENT_ID,
                clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
                redirectUri: process.env.SPOTIFY_REDIRECT_URI,
            });
        }
        return this._spotifyClient;
    }

    getGoogleAuthUrl() {
        return this.googleClient.generateAuthUrl({
            access_type: 'offline', // Critical for refresh token
            scope: [
                'https://www.googleapis.com/auth/youtube.readonly',
                'https://www.googleapis.com/auth/userinfo.profile',
                'https://www.googleapis.com/auth/userinfo.email',
            ],
            prompt: 'consent', // Force consent to ensure refresh token is returned
        });
    }

    getSpotifyAuthUrl(state: string) {
        const scopes = [

            'user-read-email',
            'playlist-read-private',
            'playlist-modify-public',
            'playlist-modify-private',
            'user-library-read',
            'playlist-read-collaborative',
            "user-read-private"
        ];
        return this.spotifyClient.createAuthorizeURL(scopes, state);
    }

    async handleGoogleCallback(code: string) {
        try {
            const { tokens } = await this.googleClient.getToken(code);
            this.googleClient.setCredentials(tokens);

            const oauth2 = google.oauth2({ version: 'v2', auth: this.googleClient });
            const userInfo = await oauth2.userinfo.get();

            const email = userInfo.data.email;
            const name = userInfo.data.name;

            if (!email) throw new Error('No email found in Google profile');

            // upsert user
            const user = await prisma.user.upsert({
                where: { email },
                update: { name },
                create: { email, name },
            });

            // save tokens
            if (tokens.access_token && tokens.expiry_date) {
                await this.saveToken(
                    user.id,
                    AuthProvider.GOOGLE,
                    tokens.access_token,
                    tokens.refresh_token || '', // Sometimes refresh token is not returned if not prompted
                    new Date(tokens.expiry_date)
                );
            }

            return user;
        } catch (error: any) {
            logger.error(error, 'Error in Google Callback');
            throw error;
        }
    }

    async handleSpotifyCallback(code: string, userId: string) {
        try {
            const data = await this.spotifyClient.authorizationCodeGrant(code);
            const { access_token, refresh_token, expires_in } = data.body;

            // We need a userId to link the Spotify account to. 
            // In this flow, User connects Google first (Primary), then connects Spotify.
            // So userId must be provided.

            const expiresAt = new Date(Date.now() + expires_in * 1000);

            await this.saveToken(
                userId,
                AuthProvider.SPOTIFY,
                access_token,
                refresh_token,
                expiresAt
            );

            return true;
        } catch (error: any) {
            // logger.error(error, 'Error in Spotify Callback');
            // Add to top: import fs from 'fs';
            console.error('Service Spotify Callback Error Message:', error.message);
            // try {
            //     // Ugly but works reliably
            //     const fs = require('fs');
            //     fs.appendFileSync('backend_errors_v2.txt', `${new Date().toISOString()} Spotify Callback Error: ${error.message}\n`);
            //     if (error.response) {
            //         fs.appendFileSync('backend_errors_v2.txt', `Data: ${JSON.stringify(error.response.data)}\n`);
            //     }
            // } catch (fsErr) { console.error('FS Error', fsErr); }
            throw error;
        }
    }

    async saveToken(
        userId: string,
        provider: AuthProvider,
        accessToken: string,
        refreshToken: string,
        expiresAt: Date
    ) {
        // If refreshing, we might not get a new refresh token. Only update if provided.
        const data: any = {
            accessToken,
            expiresAt,
        };
        if (refreshToken) {
            data.refreshToken = refreshToken;
        }

        return prisma.oAuthToken.upsert({
            where: {
                userId_provider: {
                    userId,
                    provider,
                },
            },
            update: data,
            create: {
                userId,
                provider,
                accessToken,
                refreshToken: refreshToken || '', // Should be provided on first login
                expiresAt,
            },
        });
    }

    async refreshAccessToken(userId: string, provider: AuthProvider) {
        const tokenRecord = await prisma.oAuthToken.findUnique({
            where: { userId_provider: { userId, provider } },
        });

        if (!tokenRecord || !tokenRecord.refreshToken) {
            throw new Error(`No refresh token found for user ${userId} provider ${provider}`);
        }

        if (provider === AuthProvider.GOOGLE) {
            this.googleClient.setCredentials({
                refresh_token: tokenRecord.refreshToken,
            });
            const { credentials } = await this.googleClient.refreshAccessToken();

            await this.saveToken(
                userId,
                provider,
                credentials.access_token!,
                credentials.refresh_token || '', // Google might return new one
                new Date(credentials.expiry_date!)
            );
            return credentials.access_token;
        } else if (provider === AuthProvider.SPOTIFY) {
            this.spotifyClient.setRefreshToken(tokenRecord.refreshToken);
            const data = await this.spotifyClient.refreshAccessToken();

            const expiresAt = new Date(Date.now() + data.body.expires_in * 1000);
            await this.saveToken(
                userId,
                provider,
                data.body.access_token,
                data.body.refresh_token || '',
                expiresAt
            );
            return data.body.access_token;
        }
    }
    async disconnectProvider(userId: string, provider: AuthProvider) {
        await prisma.oAuthToken.deleteMany({
            where: {
                userId,
                provider
            }
        });
        logger.info(`Disconnected provider ${provider} for user ${userId}`);
        return true;
    }
}

export const authService = new AuthService();
