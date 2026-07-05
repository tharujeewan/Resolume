import { z } from 'zod';
import { EventStatus } from '@prisma/client';

export const createEventSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    slug: z.string().min(2, 'Slug must be at least 2 characters').regex(/^[a-z0-9-]+$/, 'Slug must be alphanumeric lowercase and dashes only'),
    description: z.string().optional(),
    date: z.string().transform((val) => new Date(val)),
    venue: z.string().optional(),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    theme: z.string().default('dark'),
    background: z.string().optional(),
    maxUploadLimit: z.number().int().positive().default(200),
  }),
});

export const updateEventSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid Event ID'),
  }),
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').optional(),
    slug: z.string().min(2, 'Slug must be at least 2 characters').regex(/^[a-z0-9-]+$/, 'Slug must be alphanumeric lowercase and dashes only').optional(),
    description: z.string().optional(),
    date: z.string().transform((val) => new Date(val)).optional(),
    venue: z.string().optional(),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    status: z.nativeEnum(EventStatus).optional(),
    theme: z.string().optional(),
    background: z.string().optional(),
    maxUploadLimit: z.number().int().positive().optional(),
  }),
});

export const getEventByIdSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid Event ID'),
  }),
});

export const getEventBySlugSchema = z.object({
  params: z.object({
    slug: z.string(),
  }),
});
