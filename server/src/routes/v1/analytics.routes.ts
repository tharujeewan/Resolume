import { Router } from 'express';
import { RoleName } from '@prisma/client';
import { getDashboardStats, getUploadsOverTime } from '../../controllers/analytics.controller';
import { auth } from '../../middlewares/auth';

const router = Router();

// Protect to Organizers & Admins
router.use(auth(RoleName.ORGANIZER, RoleName.SUPER_ADMIN));

router.get('/dashboard', getDashboardStats);
router.get('/uploads-trend', getUploadsOverTime);

export default router;
