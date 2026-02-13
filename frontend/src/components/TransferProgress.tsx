'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

interface TransferProgressProps {
    transferId: string;
    onComplete: () => void;
}

export default function TransferProgress({ transferId, onComplete }: TransferProgressProps) {
    const [status, setStatus] = useState<any>(null);
    const [polling, setPolling] = useState(true);

    useEffect(() => {
        if (!polling) return;

        const interval = setInterval(async () => {
            try {
                const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/transfers/${transferId}`);
                setStatus(res.data);

                if (res.data.status === 'COMPLETED' || res.data.status === 'FAILED') {
                    setPolling(false);
                    if (res.data.status === 'COMPLETED') onComplete();
                }
            } catch (error) {
                console.error('Polling error', error);
            }
        }, 2000);

        return () => clearInterval(interval);
    }, [polling, transferId, onComplete]);

    if (!status) return <div className="text-gray-500">Initializing transfer...</div>;

    const percentage = status.totalTracks > 0
        ? Math.round((status.processedTracks / status.totalTracks) * 100)
        : 0;

    return (
        <div className="w-full max-w-md mx-auto bg-white p-6 rounded-xl shadow-lg border border-gray-100 mt-6">
            <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                {status.status === 'IN_PROGRESS' && <Loader2 className="animate-spin text-blue-600" />}
                {status.status === 'COMPLETED' && <CheckCircle className="text-green-600" />}
                {status.status === 'FAILED' && <XCircle className="text-red-600" />}
                Status: {status.status.replace('_', ' ')}
            </h3>

            <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
                <div
                    className={`bg-blue-600 h-2.5 rounded-full transition-all duration-500`}
                    style={{ width: `${percentage}%` }}
                ></div>
            </div>

            <div className="flex justify-between text-sm text-gray-600">
                <span>{percentage}% Complete</span>
                <span>{status.processedTracks} / {status.totalTracks} Tracks</span>
            </div>

            {status.failedCount > 0 && (
                <div className="mt-4 p-3 bg-red-50 text-red-700 text-sm rounded-md">
                    {status.failedCount} tracks failed to match.
                </div>
            )}
        </div>
    );
}
