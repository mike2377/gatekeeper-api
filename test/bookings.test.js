import { test, before, beforeEach, after } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import { createApp } from '#src/app.js'
import { initTestDb, resetTestDb, closeTestDb } from './setup.js'
import { pool } from '#src/db.js'

const app = createApp()

before(async () => {
  await initTestDb()
})
beforeEach(async () => {
  await resetTestDb()
})
after(async () => {
  await closeTestDb()
})

// Helper to create an event and a customer
async function setupEventAndCustomer (capacity = 10) {
  const eventRes = await request(app).post('/events').send({
    name: 'Test Event',
    venue: 'Paris',
    starts_at: '2026-12-01T20:00:00Z',
    capacity
  })
  const customerRes = await pool.query("INSERT INTO customers (full_name, email) VALUES ('Alice', 'alice@test.com') RETURNING id")
  return { eventId: eventRes.body.id, customerId: customerRes.rows[0].id }
}

test('POST /events/:id/bookings creates a booking and decrements seats', async () => {
  const { eventId, customerId } = await setupEventAndCustomer(10)

  const res = await request(app).post(`/events/${eventId}/bookings`).send({ customer_id: customerId, quantity: 2 })
  assert.equal(res.status, 201)
  assert.equal(res.body.quantity, 2)

  const checkEvent = await request(app).get(`/events/${eventId}`)
  assert.equal(checkEvent.body.seats_remaining, 8)
})

test('Rollback: unknown customer triggers rollback, seats remain unchanged', async () => {
  // create a real event with 10 seats
  const eventRes = await request(app).post('/events').send({
    name: 'Rollback Event', venue: 'Paris', starts_at: '2026-12-01T20:00:00Z', capacity: 10
  })
  const eventId = eventRes.body.id

  // try to book with an unknown customer_id (9999)
  const res = await request(app).post(`/events/${eventId}/bookings`).send({
    customer_id: 9999, 
    quantity: 2
  })

  // asert it fails with 400 Bad Request
  assert.equal(res.status, 400)
  assert.equal(res.body.message, 'Unknown customer')

  // proove the ROLLBACK: seats_remaining must still be 10 (not 8)
  const checkEvent = await request(app).get(`/events/${eventId}`)
  assert.equal(checkEvent.body.seats_remaining, 10)
})

test('POST /bookings/:id/cancel cancels and restores seats', async () => {
  const { eventId, customerId } = await setupEventAndCustomer(5)
  const bookingRes = await request(app).post(`/events/${eventId}/bookings`).send({ customer_id: customerId, quantity: 2 })
  const bookingId = bookingRes.body.id

  const res = await request(app).post(`/bookings/${bookingId}/cancel`)
  assert.equal(res.status, 204)

  const checkEvent = await request(app).get(`/events/${eventId}`)
  // Back to 5
  assert.equal(checkEvent.body.seats_remaining, 5)
})

test('POST /bookings/:id/cancel returns 409 if already cancelled', async () => {
  const { eventId, customerId } = await setupEventAndCustomer(5)
  const bookingRes = await request(app).post(`/events/${eventId}/bookings`).send({ customer_id: customerId, quantity: 1 })
  const bookingId = bookingRes.body.id

  await request(app).post(`/bookings/${bookingId}/cancel`)
  const res = await request(app).post(`/bookings/${bookingId}/cancel`)

  assert.equal(res.status, 409)
})
