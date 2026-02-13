import { Router } from 'express';
import { authController } from '../controllers/auth.controller';

const router = Router();

router.get('/google', (req, res) => authController.loginGoogle(req, res));
router.get('/google/callback', (req, res) => authController.googleCallback(req, res));

router.get('/spotify', (req, res) => authController.connectSpotify(req, res));
router.get('/spotify/callback', (req, res) => authController.spotifyCallback(req, res));
router.post('/disconnect', (req, res) => authController.disconnect(req, res));

export default router;
// Force recompile
