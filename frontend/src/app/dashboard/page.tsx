'use client';

import { useEffect, useState } from 'react';
import NavBar from '@/components/NavBar';
import api from '@/lib/api';
import TransferProgress from '@/components/TransferProgress';
import { ArrowRight, Music, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export default function Dashboard() {
    console.log('Dashboard rendered');
    const [userId, setUserId] = useState<string | null>(null);
    const [playlists, setPlaylists] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [spotifyConnected, setSpotifyConnected] = useState(false);
    const [selectedPlaylist, setSelectedPlaylist] = useState<string | null>(null);
    const [activeTransferId, setActiveTransferId] = useState<string | null>(null);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const storedUserId = params.get('userId') || localStorage.getItem('pb_userId');

        // Show status messages from redirects
        const status = params.get('status');
        const error = params.get('error');
        if (status === 'spotify_connected') {
            // Spotify just connected, will be picked up by fetchUserStatus below
        }
        if (error === 'spotify_failed') {
            alert('Failed to connect Spotify. Please try again.');
        }

        if (storedUserId) {
            setUserId(storedUserId);
            localStorage.setItem('pb_userId', storedUserId);
            fetchUserStatus(storedUserId);
        } else {
            setLoading(false);
        }
    }, []);

    const fetchUserStatus = async (uid: string) => {
        try {
            // Check connection status
            const userRes = await api.get(`/users/${uid}`);
            setSpotifyConnected(userRes.data.connected?.spotify || false);

            // Fetch playlists if Google is connected
            if (userRes.data.connected?.google) {
                const res = await api.get(`/transfers/youtube/playlists?userId=${uid}`);
                setPlaylists(res.data);
            }
        } catch (error) {
            console.error('Failed to load dashboard data', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSpotifyConnect = () => {
        if (!userId) return;
        window.location.href = `${API_URL}/auth/spotify?userId=${userId}`;
    };

    const handleDisconnect = async (provider: 'GOOGLE' | 'SPOTIFY') => {
        if (!userId) return;
        if (!confirm(`Are you sure you want to disconnect ${provider === 'GOOGLE' ? 'YouTube Music' : 'Spotify'}?`)) return;

        try {
            await api.post('/auth/disconnect', { userId, provider });
            // Refresh status
            fetchUserStatus(userId);
            if (provider === 'GOOGLE') {
                // If disconnecting Google (Primary), maybe redirect to home?
                // Or just clear playlists.
                setPlaylists([]);
                // Optionally logout?
                // localStorage.removeItem('pb_userId');
                // window.location.href = '/';
            }
        } catch (error) {
            console.error('Failed to disconnect', error);
            alert('Failed to disconnect');
        }
    };

    const startTransfer = async () => {
        if (!selectedPlaylist || !userId) return;

        const playlist = playlists.find(p => p.id === selectedPlaylist);
        if (!playlist) return;

        try {
            const res = await api.post('/transfers/start', {
                userId,
                sourcePlaylistId: playlist.id,
                sourcePlaylistName: playlist.title
            });
            setActiveTransferId(res.data.id);
        } catch (error) {
            console.error('Failed to start transfer', error);
            alert('Failed to start transfer. Check console.');
        }
    };

    if (!userId) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
                <div className="bg-white p-8 rounded-xl shadow-lg text-center">
                    <h2 className="text-xl font-bold mb-4">Access Denied</h2>
                    <p className="text-gray-500 mb-6">Please log in from the home page first.</p>
                    <a href="/" className="text-blue-600 hover:underline">Go Home</a>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <NavBar />

            <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Your Dashboard</h1>
                    <p className="text-gray-500 mt-2">Select a YouTube playlist to transfer to Spotify.</p>
                </div>

                {/* Connection Status */}
                <div className="flex flex-wrap gap-4 mb-8">
                    {/* YouTube Status */}
                    <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-lg">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <span className="text-sm font-medium text-green-700">YouTube Connected</span>
                        <button
                            onClick={() => handleDisconnect('GOOGLE')}
                            className="ml-2 text-xs text-red-500 hover:text-red-700 underline"
                        >
                            Disconnect
                        </button>
                    </div>

                    {/* Spotify Status */}
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${spotifyConnected
                        ? 'bg-green-50 border-green-200'
                        : 'bg-orange-50 border-orange-200'
                        }`}>
                        {spotifyConnected ? (
                            <>
                                <CheckCircle className="w-5 h-5 text-green-600" />
                                <span className="text-sm font-medium text-green-700">Spotify Connected</span>
                                <button
                                    onClick={() => handleDisconnect('SPOTIFY')}
                                    className="ml-2 text-xs text-red-500 hover:text-red-700 underline"
                                >
                                    Disconnect
                                </button>
                            </>
                        ) : (
                            <>
                                <AlertCircle className="w-5 h-5 text-orange-500" />
                                <span className="text-sm font-medium text-orange-700">Spotify Not Connected</span>
                            </>
                        )}
                    </div>
                </div>

                {/* Spotify Connect Prompt */}
                {!spotifyConnected && !loading && (
                    <div className="mb-8 p-6 bg-white border-2 border-dashed border-orange-300 rounded-xl text-center">
                        <h3 className="text-lg font-semibold text-gray-800 mb-2">Connect Spotify to Start Transfers</h3>
                        <p className="text-gray-500 mb-4">You need to connect your Spotify account before you can transfer playlists.</p>
                        <button
                            onClick={handleSpotifyConnect}
                            className="inline-flex items-center gap-3 px-6 py-3 bg-[#1DB954] hover:bg-[#1ed760] text-white rounded-lg shadow-sm transition-all font-medium"
                        >
                            <img src="https://storage.googleapis.com/pr-newsroom-wp/1/2018/11/Spotify_Logo_RGB_White.png" alt="Spotify" className="w-6 h-6 object-contain" />
                            Connect Spotify
                        </button>
                    </div>
                )}

                {activeTransferId ? (
                    <div className="text-center py-10">
                        <h2 className="text-2xl font-bold mb-4">Transferring Playlist...</h2>
                        <TransferProgress
                            transferId={activeTransferId}
                            onComplete={() => alert('Transfer Completed!')}
                        />
                        <button
                            onClick={() => setActiveTransferId(null)}
                            className="mt-8 text-sm text-gray-500 hover:text-gray-900 underline"
                        >
                            Start Another Transfer
                        </button>
                    </div>
                ) : (
                    <>
                        {loading ? (
                            <div className="flex items-center justify-center gap-3 py-20 text-gray-400">
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Loading playlists...
                            </div>
                        ) : (
                            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                                {playlists.map((playlist) => (
                                    <div
                                        key={playlist.id}
                                        onClick={() => setSelectedPlaylist(playlist.id)}
                                        className={`
                                    cursor-pointer group relative bg-white p-6 rounded-xl border-2 transition-all hover:shadow-md
                                    ${selectedPlaylist === playlist.id ? 'border-blue-600 ring-4 ring-blue-50' : 'border-gray-100 hover:border-blue-300'}
                                `}
                                    >
                                        <div className="flex items-start justify-between mb-4">
                                            <div className={`p-3 rounded-lg ${selectedPlaylist === playlist.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                                                <Music className="w-6 h-6" />
                                            </div>
                                            <span className="text-xs font-medium text-gray-400 bg-gray-50 px-2 py-1 rounded-full">
                                                {playlist.count} tracks
                                            </span>
                                        </div>
                                        <h3 className="font-semibold text-gray-900 truncate" title={playlist.title}>{playlist.title}</h3>
                                        <p className="text-sm text-gray-500 mt-1">YouTube Music</p>

                                        {selectedPlaylist === playlist.id && (
                                            <div className="absolute bottom-4 right-4">
                                                <CheckCircle className="w-6 h-6 text-blue-600" />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 shadow-lg flex justify-center">
                            <button
                                disabled={!selectedPlaylist || !spotifyConnected}
                                onClick={startTransfer}
                                className={`
                            flex items-center gap-2 px-8 py-3 rounded-full font-bold text-lg shadow-lg transition-all
                            ${selectedPlaylist && spotifyConnected
                                        ? 'bg-linear-to-r from-blue-600 to-purple-600 text-white hover:scale-105 active:scale-95'
                                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'}
                        `}
                                title={!spotifyConnected ? 'Connect Spotify first' : !selectedPlaylist ? 'Select a playlist' : ''}
                            >
                                {!spotifyConnected ? 'Connect Spotify First' : 'Start Transfer'} <ArrowRight className="w-5 h-5" />
                            </button>
                        </div>
                    </>
                )}
            </main>
        </div>
    );
}
