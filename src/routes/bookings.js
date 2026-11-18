import { Router } from 'express'
import { createBookingSchema, bookingQuerySchema } from '#src/schemas/bookingSchemas.js'
import { createBooking, cancelBooking, getBookingById, listBookingsForEvent } from '#src/services/bookingService.js'
import { getEventById } from '#src/services/eventService.js'
import { NotFoundError } from '#src/utils/errors.js'

export const bookingsRouter = Router()

// POST /events/:id/bookings
export const eventBookingsRouter = Router({ mergeParams: true })

eventBookingsRouter.post('/', async (req, res) => {
  const eventId = parseInt(req.params.id, 10)
  if (isNaN(eventId)) throw new NotFoundError('Event not found')

  const data = createBookingSchema.parse(req.body)

  const booking = await createBooking({
    eventId,
    customerId: data.customer_id,
    quantity: data.quantity
  })

  res.status(201).location(`/bookings/${booking.id}`).json(booking)
})

eventBookingsRouter.get('/', async (req, res) => {
  const eventId = parseInt(req.params.id, 10)
  if (isNaN(eventId)) throw new NotFoundError('Event not found')

  const event = await getEventById(eventId)
  if (!event) throw new NotFoundError('Event not found')

  const { after, limit } = bookingQuerySchema.parse(req.query)
  const result = await listBookingsForEvent(eventId, { after, limit })
  res.json(result)
})

// Routes for /bookings/:id
bookingsRouter.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10)
  if (isNaN(id)) throw new NotFoundError('Booking not found')

  const booking = await getBookingById(id)
  if (!booking) throw new NotFoundError('Booking not found')

  res.json(booking)
})

bookingsRouter.post('/:id/cancel', async (req, res) => {
  const id = parseInt(req.params.id, 10)
  if (isNaN(id)) throw new NotFoundError('Booking not found')

  await cancelBooking(id)
  res.status(204).end()
})
