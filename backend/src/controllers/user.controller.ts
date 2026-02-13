import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';

export class UserController {
    async getUser(req: Request, res: Response) {
        try {
            const { userId } = req.params;
            console.log('GetUser Request for userId:', userId);

            const user = await prisma.user.findUnique({
                where: { id: userId as string },
                include: { tokens: true }
            });

            if (!user) return res.status(404).json({ error: 'User not found' });

            const userData = {
                id: user.id,
                name: user.name,
                email: user.email,
                connected: {
                    google: user.tokens.some((t: any) => t.provider === 'GOOGLE'),
                    spotify: user.tokens.some((t: any) => t.provider === 'SPOTIFY'),
                }
            };

            res.json(userData);
        } catch (error: any) {
            console.error('GetUser Error:', error);
            // try {
            //     const fs = require('fs');
            //     fs.appendFileSync('backend_errors_v2.txt', `${new Date().toISOString()} GetUser Error: ${error.message}\n`);
            // } catch (fsErr) { console.error('FS Error', fsErr); }
            res.status(500).json({ error: error.message || 'Internal Server Error' });
        }
    }
}

export const userController = new UserController();
