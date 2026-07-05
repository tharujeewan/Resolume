import { Router } from 'express';
import { RoleName } from '@prisma/client';
import {
  createEvent,
  getEvents,
  getEventById,
  getEventBySlug,
  updateEvent,
  deleteEvent,
  downloadQR,
} from '../../controllers/event.controller';
import { auth } from '../../middlewares/auth';
import { validate } from '../../middlewares/validate';
import {
  createEventSchema,
  updateEventSchema,
  getEventByIdSchema,
  getEventBySlugSchema,
} from '../../schemas/event.schema';

const router = Router();

// Public route to fetch event by slug (for Guest Upload)
router.get('/slug/:slug', validate(getEventBySlugSchema), getEventBySlug);

// Protected routes (Organizer & Super Admin)
router.use(auth(RoleName.ORGANIZER, RoleName.SUPER_ADMIN));

router.post('/', validate(createEventSchema), createEvent);
router.get('/', getEvents);
router.get('/:id', validate(getEventByIdSchema), getEventById);
router.put('/:id', validate(updateEventSchema), updateEvent);
router.delete('/:id', validate(getEventByIdSchema), deleteEvent);
router.get('/:id/qr', validate(getEventByIdSchema), downloadQR);

export default router;
