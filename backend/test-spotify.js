require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const SpotifyWebApi = require('spotify-web-api-node');
const p = new PrismaClient();

async function main() {
    const userId = '698f7dee068f2ff1933f708a';

    const token = await p.oAuthToken.findUnique({
        where: { userId_provider: { userId, provider: 'SPOTIFY' } }
    });

    if (!token) {
        console.log('No Spotify token found!');
        return;
    }

    console.log('Spotify token found, accessToken length:', token.accessToken.length);
    console.log('Expires at:', token.expiresAt);

    const client = new SpotifyWebApi({
        clientId: process.env.SPOTIFY_CLIENT_ID,
        clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
        redirectUri: process.env.SPOTIFY_REDIRECT_URI,
    });
    client.setAccessToken(token.accessToken);

    try {
        const me = await client.getMe();
        console.log('Spotify user:', me.body.display_name, me.body.id);

        // Try creating a test playlist with explicit userId
        const playlist = await client.createPlaylist(me.body.id, 'PlaylistBridge Test Explicit', { description: 'Test', public: false });
        console.log('Created playlist:', playlist.body.name, playlist.body.id);
    } catch (err) {
        console.error('Spotify API Error:');
        console.error('  Status:', err.statusCode);
        console.error('  Message:', err.message);
        console.error('  Body:', JSON.stringify(err.body, null, 2));
    }

    await p.$disconnect();
}
main();
