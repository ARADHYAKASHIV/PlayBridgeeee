'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';

function AuthButtonsContent() {
    const searchParams = useSearchParams();
    const [userId, setUserId] = useState<string | null>(null);

    // Naive auth check: if userId is in URL, store to local storage and use it.
    // In production, use a real auth cookie/session check endpoint.
    // For this tool, we rely on the redirect behavior of backend:
    // /api/auth/google/callback -> redirects to /dashboard?userId=...
    useEffect(() => {
        const idFromUrl = searchParams.get('userId');
        if (idFromUrl) {
            localStorage.setItem('pb_userId', idFromUrl);
            setUserId(idFromUrl);
        } else {
            const stored = localStorage.getItem('pb_userId');
            if (stored) setUserId(stored);
        }
    }, [searchParams]);

    const handleGoogleLogin = () => {
        window.location.href = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/auth/google`;
    };

    const handleSpotifyLogin = () => {
        if (!userId) return alert('Please connect YouTube Music (Google) first to establish identity.');
        window.location.href = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/auth/spotify?userId=${userId}`;
    };

    return (
        <div className="flex flex-col gap-4 max-w-sm mx-auto mt-10">
            {userId ? (
                <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-green-700 font-medium">Google Connected!</p>
                    <p className="text-xs text-gray-500 mt-1">ID: {userId.slice(0, 8)}...</p>
                </div>
            ) : (
                <button
                    onClick={handleGoogleLogin}
                    className="flex items-center justify-center gap-3 px-6 py-3 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 transition-all font-medium text-gray-700"
                >
                    <img src="https://www.gstatic.com/youtube/img/branding/favicon/favicon_144x144.png" alt="YT" className="w-6 h-6" />
                    Connect YouTube Music
                </button>
            )}

            {userId && (
                <button
                    onClick={handleSpotifyLogin}
                    className="flex items-center justify-center gap-3 px-6 py-3 bg-[#1DB954] hover:bg-[#1ed760] text-white rounded-lg shadow-sm transition-all font-medium"
                >
                    <img src="https://storage.googleapis.com/pr-newsroom-wp/1/2018/11/Spotify_Logo_RGB_White.png" alt="Spotify" className="w-6 h-6 object-contain" />
                    Connect Spotify
                </button>
            )}

            {userId && (
                <Link
                    href="/dashboard"
                    className="mt-4 text-center text-blue-600 hover:text-blue-800 underline"
                >
                    Go to Dashboard
                </Link>
            )}
        </div>
    );
}

export default function AuthButtons() {
    return (
        <Suspense fallback={<div className="text-center mt-10">Loading auth...</div>}>
            <AuthButtonsContent />
        </Suspense>
    );
}
