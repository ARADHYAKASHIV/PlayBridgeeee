import { prisma } from '../utils/prisma';
import { youtubeService } from './youtube.service';
import { spotifyService } from './spotify.service';
import { logger } from '../utils/logger';
import { TransferStatus } from '@prisma/client';

export class TransferService {

    async createTransfer(userId: string, sourcePlaylistId: string, sourcePlaylistName: string) {
        return prisma.transferLog.create({
            data: {
                userId,
                status: TransferStatus.PENDING,
                totalTracks: 0,
                processedTracks: 0,
                failedCount: 0,
            }
        });
    }

    // This method should be called asynchronously, perhaps by a queue in production.
    // For local/simple app, we can call it without awaiting in the controller.
    async startTransfer(transferId: string, sourcePlaylistId: string, sourcePlaylistName: string) {
        const transfer = await prisma.transferLog.findUnique({ where: { id: transferId } });
        if (!transfer) return;

        await prisma.transferLog.update({
            where: { id: transferId },
            data: { status: TransferStatus.IN_PROGRESS }
        });

        try {
            // 1. Fetch tracks from YouTube
            logger.info(`Fetching tracks for playlist ${sourcePlaylistId} (Transfer ${transferId})`);
            const tracks = await youtubeService.getPlaylistTracks(transfer.userId, sourcePlaylistId);

            await prisma.transferLog.update({
                where: { id: transferId },
                data: { totalTracks: tracks.length }
            });

            // 2. Create Spotify Playlist
            const spotifyPlaylistId = await spotifyService.createPlaylist(
                transfer.userId,
                sourcePlaylistName,
                `Imported from YouTube Music (Transfer ${transferId})`
            );

            // 3. Process Tracks
            const trackUris: string[] = [];
            let processed = 0;
            let failed = 0;

            for (const track of tracks) {
                await new Promise(res => setTimeout(res, 800)); // Rate limit protection — Spotify dev-mode is strict
                try {
                    // Clean title: Remove "(Official Video)", "ft.", etc? 
                    // Simple search first.

                    let spotifyTrack = await spotifyService.searchTrack(
                        transfer.userId,
                        track.title,
                        track.artist
                    );

                    if (spotifyTrack) {
                        trackUris.push(spotifyTrack.uri);
                    } else {
                        failed++;
                        await prisma.failedTrack.create({
                            data: {
                                transferId,
                                title: track.title || 'Unknown',
                                artist: track.artist || 'Unknown',
                                errorReason: 'No match found in Spotify',
                            }
                        });
                    }
                } catch (err: any) {
                    failed++;
                    logger.error(`Error processing track ${track.title}`, err);
                    await prisma.failedTrack.create({
                        data: {
                            transferId,
                            title: track.title || 'Unknown',
                            artist: track.artist || 'Unknown',
                            errorReason: err.message || 'Processing Error',
                        }
                    });
                }

                processed++;
                // Update progress occasionally
                if (processed % 5 === 0) {
                    await prisma.transferLog.update({
                        where: { id: transferId },
                        data: { processedTracks: processed, failedCount: failed }
                    });
                }
            }

            // 4. Add tracks to Spotify
            logger.info(`Total tracks fetched from YouTube: ${tracks.length}`);
            logger.info(`Total matched URIs: ${trackUris.length}`);

            if (trackUris.length > 0) {
                await spotifyService.addTracks(transfer.userId, spotifyPlaylistId, trackUris);
            }

            // 5. Complete
            await prisma.transferLog.update({
                where: { id: transferId },
                data: {
                    status: TransferStatus.COMPLETED,
                    processedTracks: processed,
                    failedCount: failed
                }
            });

            logger.info(`Transfer ${transferId} completed.`);

        } catch (error: any) {
            logger.error({ err: error, message: error?.message, statusCode: error?.statusCode, body: error?.body }, `Transfer ${transferId} failed critical`);
            await prisma.transferLog.update({
                where: { id: transferId },
                data: {
                    status: TransferStatus.FAILED,
                    // Store error summary somewhere? FailedTrack generic entry maybe.
                }
            });
        }
    }

    async getTransferStatus(transferId: string) {
        return prisma.transferLog.findUnique({
            where: { id: transferId },
            include: { failedTracks: true }
        });
    }
}

export const transferService = new TransferService();
