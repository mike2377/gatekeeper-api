import { z } from 'zod'

export const createBookingSchema = z.object({
  customer_id: z.number().int().positive(),
  quantity: z.number().int().min(1).max(10)
})

export const bookingQuerySchema = z.object({
  after: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20)
})
