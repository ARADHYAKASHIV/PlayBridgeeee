import { Router } from 'express';
import { transferController } from '../controllers/transfer.controller';

const router = Router();

router.get('/history', (req, res) => transferController.getHistory(req, res));
router.get('/youtube/playlists', (req, res) => transferController.getYouTubePlaylists(req, res)); // Helper to get source playlists
router.post('/start', (req, res) => transferController.startTransfer(req, res));
router.get('/:id', (req, res) => transferController.getStatus(req, res)); // Must be AFTER specific routes

export default router;
