import { z } from 'zod'

export const createEventSchema = z.object({
  name: z.string().min(1).max(150),
  venue: z.string().min(1).max(150),
  starts_at: z.string().datetime(),
  capacity: z.number().int().min(0)
})

export const eventQuerySchema = z.object({
  after: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20)
})
