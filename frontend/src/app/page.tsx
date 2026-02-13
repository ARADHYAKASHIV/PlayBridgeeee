import NavBar from '@/components/NavBar';
import AuthButtons from '@/components/AuthButtons';
import { ArrowRight, CheckCircle2 } from 'lucide-react';

export default function Home() {
    return (
        <div className="min-h-screen bg-gray-50">
            <NavBar />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
                <div className="text-center space-y-8">
                    <h1 className="text-5xl font-extrabold text-gray-900 tracking-tight sm:text-6xl">
                        Move your music <br />
                        <span className="text-transparent bg-clip-text bg-linear-to-r from-red-500 to-green-500">
                            from YouTube to Spotify
                        </span>
                    </h1>

                    <p className="max-w-2xl mx-auto text-xl text-gray-500">
                        PlaylistBridge transfers your playlists and liked songs instantly.
                        No manual searching. Secure. Fast. Correct metadata matching.
                    </p>

                    <AuthButtons />

                    <div className="grid md:grid-cols-3 gap-8 mt-20 text-left">
                        {[
                            { title: 'Secure Login', desc: 'OAuth 2.0 implementation ensures your credentials stay safe.' },
                            { title: 'Smart Matching', desc: 'Fuzzy search algorithm finds the best match for every track.' },
                            { title: 'Fast Transfer', desc: 'Process hundreds of tracks in minutes with real-time progress.' }
                        ].map((feature, i) => (
                            <div key={i} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                                    <CheckCircle2 className="w-6 h-6 text-blue-600" />
                                </div>
                                <h3 className="font-semibold text-gray-900 text-lg">{feature.title}</h3>
                                <p className="text-gray-500 mt-2">{feature.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </main>
        </div>
    );
}
