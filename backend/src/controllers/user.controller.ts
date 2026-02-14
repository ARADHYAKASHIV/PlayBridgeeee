import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';

export class UserController {
    async getUser(req: Request, res: Response) {
        try {
            const { userId } = req.params;
            console.log('GetUser Request for userId:', userId);

            // Validate that userId is a valid MongoDB ObjectId (24-char hex string)
            const id = String(userId);
            if (!id || !/^[a-fA-F0-9]{24}$/.test(id)) {
                console.warn('GetUser: Invalid ObjectId format:', userId);
                return res.status(400).json({ error: 'Invalid user ID format' });
            }

            const user = await prisma.user.findUnique({
                where: { id },
                include: { tokens: true }
            });

            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }

            const tokens = user.tokens || [];

            const userData = {
                id: user.id,
                name: user.name,
                email: user.email,
                connected: {
                    google: tokens.some((t: any) => t.provider === 'GOOGLE'),
                    spotify: tokens.some((t: any) => t.provider === 'SPOTIFY'),
                }
            };

            res.json(userData);
        } catch (error: any) {
            console.error('GetUser Error:', error?.message, error?.stack);
            res.status(500).json({ error: error.message || 'Internal Server Error' });
        }
    }
}

export const userController = new UserController();
