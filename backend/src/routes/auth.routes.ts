import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.get('/google', asyncHandler((req: any, res: any) => authController.loginGoogle(req, res)));
router.get('/google/callback', asyncHandler((req: any, res: any) => authController.googleCallback(req, res)));

router.get('/spotify', asyncHandler((req: any, res: any) => authController.connectSpotify(req, res)));
router.get('/spotify/callback', asyncHandler((req: any, res: any) => authController.spotifyCallback(req, res)));
router.post('/disconnect', asyncHandler((req: any, res: any) => authController.disconnect(req, res)));

export default router;
