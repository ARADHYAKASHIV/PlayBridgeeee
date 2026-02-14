import { Router } from 'express';
import { userController } from '../controllers/user.controller';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.get('/:userId', asyncHandler((req: any, res: any) => userController.getUser(req, res)));

export default router;
