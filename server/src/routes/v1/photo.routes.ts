import { Router } from 'express';
import { RoleName } from '@prisma/client';
import {
  uploadPhoto,
  getPhotos,
  updatePhotoStatus,
  bulkUpdatePhotoStatus,
} from '../../controllers/photo.controller';
import { auth } from '../../middlewares/auth';
import { upload } from '../../middlewares/upload';

const router = Router();

// Guest photo upload (Public endpoint)
router.post('/upload', upload.single('image'), uploadPhoto);

// Moderation / Fetching photos (Organizer & Admin)
router.use(auth(RoleName.ORGANIZER, RoleName.SUPER_ADMIN));

router.get('/', getPhotos);
router.patch('/:id/status', updatePhotoStatus);
router.post('/bulk-status', bulkUpdatePhotoStatus);

export default router;
