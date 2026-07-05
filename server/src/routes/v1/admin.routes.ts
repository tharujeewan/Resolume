import { Router } from 'express';
import { RoleName } from '@prisma/client';
import {
  getUsers,
  updateUserRole,
  deleteUser,
  getActivityLogs,
  getSettings,
  updateSettings,
} from '../../controllers/admin.controller';
import { auth } from '../../middlewares/auth';

const router = Router();

// Ensure only Super Admins can access admin module
router.use(auth(RoleName.SUPER_ADMIN));

router.get('/users', getUsers);
router.patch('/users/:id/role', updateUserRole);
router.delete('/users/:id', deleteUser);
router.get('/logs', getActivityLogs);
router.get('/settings', getSettings);
router.put('/settings', updateSettings);

export default router;
