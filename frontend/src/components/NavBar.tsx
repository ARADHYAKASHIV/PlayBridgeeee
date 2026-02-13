'use client';

import Link from 'next/link';
import { Music2 } from 'lucide-react';

export default function NavBar() {
    console.log('NavBar rendered');
    return (
        <nav className="border-b border-gray-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16 items-center">
                    <Link href="/" className="flex items-center gap-2">
                        <Music2 className="h-8 w-8 text-primary-600" />
                        <span className="text-xl font-bold bg-linear-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                            PlaylistBridge
                        </span>
                    </Link>
                    <div className="flex gap-4">
                        <Link href="/" className="text-gray-600 hover:text-gray-900 font-medium">
                            Home
                        </Link>
                        <button
                            onClick={() => {
                                localStorage.removeItem('pb_userId');
                                window.location.href = '/';
                            }}
                            className="text-gray-600 hover:text-red-600 font-medium cursor-pointer"
                        >
                            Log Out
                        </button>
                    </div>
                </div>
            </div>
        </nav>
    );
}
