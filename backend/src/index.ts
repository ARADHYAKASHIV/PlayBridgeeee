import 'dotenv/config';

import authRoutes from './routes/auth.routes';
import transferRoutes from './routes/transfer.routes';
import userRoutes from './routes/user.routes';
import cookieParser from 'cookie-parser';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { logger } from './utils/logger';

const app = express();
const PORT = process.env.PORT || 3001;

process.on('uncaughtException', (err: Error) => {
    console.error('UNCAUGHT EXCEPTION:', err);
    // Keep running if possible, or allow exit (depending on severity)
    // process.exit(1); 
});

process.on('unhandledRejection', (reason: any) => {
    console.error('UNHANDLED REJECTION:', reason);
});

app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// Basic health check
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/transfers', transferRoutes);
app.use('/api/users', userRoutes);

// Global Error Handler (placeholder for now)
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    logger.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
});

app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
});
