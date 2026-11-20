import 'dotenv/config'
import { pool } from '#src/db.js'

async function seed () {
  console.log('Seeding database...')

  try {
    // Clean existing data
    await pool.query('TRUNCATE bookings, customers, events RESTART IDENTITY CASCADE')

    // Create customer
    const customers = await pool.query(`
      INSERT INTO customers (full_name, email) VALUES 
      ('Alice Dupont', 'alice@example.com'),
      ('Bob Martin', 'bob@example.com')
      RETURNING id
    `)

    // Create event
    const events = await pool.query(`
      INSERT INTO events (name, venue, starts_at, capacity, seats_remaining) VALUES 
      ('Tech Conference 2026', 'Yaounde Expo', '2026-06-15T09:00:00Z', 100, 100),
      ('Solo Concert', 'Eden cinema', '2026-07-20T20:00:00Z', 1, 1)
      RETURNING id
    `)

    // Create a booking
    await pool.query(
      `
      INSERT INTO bookings (event_id, customer_id, quantity) VALUES 
      ($1, $2, 2)
    `,
      [events.rows[0].id, customers.rows[0].id]
    )

    // Update seats_remaining for the booking
    await pool.query('UPDATE events SET seats_remaining = 98 WHERE id = $1', [events.rows[0].id])

    console.log('Database seeded successfully!')
  } catch (err) {
    console.error('Seeding failed:', err)
  } finally {
    await pool.end()
  }
}

seed()
