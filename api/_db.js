import pg from "pg"

const { Pool } = pg

let pool = null
let initPromise = null

const getConnectionString = () => {
  return (
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL_NON_POOLING
  )
}

const getPool = () => {
  if (pool) return pool
  const connectionString = getConnectionString()
  if (!connectionString) {
    throw new Error("Missing database connection string (POSTGRES_URL or DATABASE_URL)")
  }
  pool = new Pool({ connectionString, max: 5 })
  return pool
}

const initDb = async () => {
  if (initPromise) return initPromise
  initPromise = (async () => {
    const p = getPool()
    await p.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`)
    await p.query(`
      CREATE TABLE IF NOT EXISTS deea_messages (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        direction text NOT NULL CHECK (direction IN ('user','admin')),
        mood_label text,
        mood_emoji text,
        message text,
        sent_at timestamptz NOT NULL DEFAULT now()
      );
    `)
    await p.query(`
      CREATE TABLE IF NOT EXISTS deea_settings (
        id int PRIMARY KEY,
        relationship_start_date date,
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `)
    await p.query(`
      INSERT INTO deea_settings (id)
      VALUES (1)
      ON CONFLICT (id) DO NOTHING;
    `)
  })()
  return initPromise
}

export { getPool, initDb }
