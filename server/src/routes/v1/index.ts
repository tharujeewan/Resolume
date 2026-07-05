import { Router } from 'express';
import authRoutes from './auth.routes';
import eventRoutes from './event.routes';
import photoRoutes from './photo.routes';
import adminRoutes from './admin.routes';
import analyticsRoutes from './analytics.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/events', eventRoutes);
router.use('/photos', photoRoutes);
router.use('/admin', adminRoutes);
router.use('/analytics', analyticsRoutes);

export default router;
