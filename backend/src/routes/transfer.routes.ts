import { Router } from 'express';
import { transferController } from '../controllers/transfer.controller';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.get('/history', asyncHandler((req: any, res: any) => transferController.getHistory(req, res)));
router.get('/youtube/playlists', asyncHandler((req: any, res: any) => transferController.getYouTubePlaylists(req, res)));
router.post('/start', asyncHandler((req: any, res: any) => transferController.startTransfer(req, res)));
router.get('/:id', asyncHandler((req: any, res: any) => transferController.getStatus(req, res))); // Must be AFTER specific routes

export default router;
