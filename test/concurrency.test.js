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

test('Concurrency: 2 simultaneous bookings for the last seat', async () => {
  // create an event with only 1 seat
  const eventRes = await request(app).post('/events').send({
    name: 'Solo Concert',
    venue: 'Paris',
    starts_at: '2026-12-01T20:00:00Z',
    capacity: 1
  })
  const eventId = eventRes.body.id

  // create 2 customers directly in the database
  const customerQuery = await pool.query(
    `INSERT INTO customers (full_name, email) VALUES 
     ('Alice', 'alice@test.com'), 
     ('Bob', 'bob@test.com') 
     RETURNING id`
  )
  const customer1 = customerQuery.rows[0].id
  const customer2 = customerQuery.rows[1].id

  // 2 requests simultaneously using Promise.all
  const [res1, res2] = await Promise.all([
    request(app).post(`/events/${eventId}/bookings`).send({ customer_id: customer1, quantity: 1 }),
    request(app).post(`/events/${eventId}/bookings`).send({ customer_id: customer2, quantity: 1 })
  ])

  // assert that exactly one request succeeded (201) and the other failed (409)
  const statuses = [res1.status, res2.status].sort()
  assert.deepEqual(statuses, [201, 409])

  // verify that remaining seats are exactly 0 (not negative)
  const checkEvent = await request(app).get(`/events/${eventId}`)
  assert.equal(checkEvent.body.seats_remaining, 0)
})
