import { Router } from 'express';
import { userController } from '../controllers/user.controller';

const router = Router();

router.get('/:userId', (req, res) => userController.getUser(req, res));

export default router;
