import { Request, Response } from 'express';
import { transferService } from '../services/transfer.service';
import { youtubeService } from '../services/youtube.service';
import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';

export class TransferController {

    // GET /api/transfers/history?userId=...
    async getHistory(req: Request, res: Response) {
        const { userId } = req.query;
        if (!userId || typeof userId !== 'string') {
            return res.status(400).json({ error: 'userId required' });
        }
        const history = await prisma.transferLog.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            include: { failedTracks: true } // Optional: might be heavy
        });
        res.json(history);
    }

    // GET /api/transfers/:id
    async getStatus(req: Request, res: Response) {
        const { id } = req.params;
        const transfer = await transferService.getTransferStatus(id as string);
        if (!transfer) return res.status(404).json({ error: 'Transfer not found' });
        res.json(transfer);
    }

    // POST /api/transfers/start
    // Body: { userId, sourcePlaylistId, sourcePlaylistName }
    async startTransfer(req: Request, res: Response) {
        const { userId, sourcePlaylistId, sourcePlaylistName } = req.body;

        if (!userId || !sourcePlaylistId) {
            return res.status(400).json({ error: 'userId and sourcePlaylistId required' });
        }

        try {
            const transfer = await transferService.createTransfer(userId, sourcePlaylistId, sourcePlaylistName || 'Untitled Playlist');

            // Start async process (fire and forget)
            transferService.startTransfer(transfer.id, sourcePlaylistId, sourcePlaylistName || 'Untitled Playlist').catch((err: any) => {
                logger.error(err, `Async transfer failed to start for ${transfer.id}`);
            });

            res.json(transfer); // Return initial Pending status
        } catch (error: any) {
            console.error('Start Transfer Error:', error); // Ensure we see this
            logger.error(error);
            res.status(500).json({ error: 'Failed to start transfer' });
        }
    }

    // GET /api/transfers/youtube/playlists?userId=...
    async getYouTubePlaylists(req: Request, res: Response) {
        const { userId } = req.query;
        if (!userId || typeof userId !== 'string') {
            return res.status(400).json({ error: 'userId required' });
        }
        try {
            const playlists = await youtubeService.getPlaylists(userId);
            res.json(playlists);
        } catch (error: any) {
            logger.error(error, 'Failed to fetch YouTube playlists');
            if (error.message?.includes('not connected')) {
                return res.status(401).json({ error: error.message });
            }
            res.status(500).json({ error: 'Failed to fetch playlists' });
        }
    }
}

export const transferController = new TransferController();
