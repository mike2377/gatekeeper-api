import { Router } from 'express'
import { z } from 'zod'
import { createEventSchema, eventQuerySchema } from '#src/schemas/eventSchemas.js'
import { createEvent, getEventById, listEvents } from '#src/services/eventService.js'
import { NotFoundError } from '#src/utils/errors.js'

export const eventsRouter = Router()

eventsRouter.post('/', async (req, res) => {
  const data = createEventSchema.parse(req.body)

  const event = await createEvent({
    name: data.name,
    venue: data.venue,
    startsAt: data.starts_at,
    capacity: data.capacity
  })

  res.status(201).json(event)
})

eventsRouter.get('/', async (req, res) => {
  const { after, limit } = eventQuerySchema.parse(req.query)
  const result = await listEvents({ after, limit })
  res.json(result)
})

eventsRouter.get('/:id', async (req, res) => {
  const id = z.coerce.number().int().positive().parse(req.params.id)

  const event = await getEventById(id)

  if (!event) {
    throw new NotFoundError('Event not found')
  }

  res.json(event)
})
