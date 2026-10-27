import { Hono } from 'hono'
import { z } from 'zod'
import { httpError, requireUser, validate } from '../http'
import { finishProvisioning } from '../provisioning'
import type { AppEnv, User } from '../types'

export const instances = new Hono<AppEnv>()
instances.use(requireUser)

// Simulated datacenter regions, assigned randomly at deploy time (frozen, like the rate).
const LOCATIONS = [
  'us-east-1 (Virginia)',
  'us-west-2 (Oregon)',
  'eu-central-1 (Frankfurt)',
  'ap-southeast-1 (Singapore)',
]

const createSchema = z.object({
  plan_id: z.number().int(),
  name: z.string().min(1),
  os_image: z.string().min(1),
})

type Plan = {
  id: number
  type: string
  gpu_model: string | null
  storage_gb: number
  rate_running_cents: number
  rate_stopped_cents: number
}

async function getOwned(db: D1Database, id: number, user: User) {
  const row = await db.prepare('SELECT * FROM instances WHERE id = ? AND user_id = ?').bind(id, user.id).first()
  if (!row) throw httpError(404, 'Instance not found')
  return row
}

const parseId = (raw: string) => {
  const id = Number(raw)
  if (!Number.isInteger(id)) throw httpError(422, 'id: must be an integer')
  return id
}

instances.get('/', async (c) => {
  const user = c.get('user')
  await finishProvisioning(c.env.DB, user.id)
  const { results } = await c.env.DB
    .prepare('SELECT * FROM instances WHERE user_id = ? ORDER BY created_at DESC, id DESC')
    .bind(user.id)
    .all()
  return c.json(results)
})

instances.post('/', validate('json', createSchema), async (c) => {
  const user = c.get('user')
  const payload = c.req.valid('json')

  const plan = await c.env.DB.prepare('SELECT * FROM plans WHERE id = ?').bind(payload.plan_id).first<Plan>()
  if (!plan) throw httpError(404, 'Plan not found')

  // Never trust client prices: check balance against the plan's server-side rate.
  if (user.balance_cents < plan.rate_running_cents) throw httpError(402, 'Insufficient balance')

  const location = LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)]
  const instance = await c.env.DB
    .prepare(
      `INSERT INTO instances
         (user_id, plan_id, name, os_image, status, compute_type, gpu_model, location,
          storage_gb, rate_running_cents, rate_stopped_cents)
       VALUES (?, ?, ?, ?, 'provisioning', ?, ?, ?, ?, ?, ?)
       RETURNING *`,
    )
    // Rates are frozen at deploy time from the plan, not from the client.
    .bind(
      user.id, plan.id, payload.name, payload.os_image, plan.type, plan.gpu_model, location,
      plan.storage_gb, plan.rate_running_cents, plan.rate_stopped_cents,
    )
    .first()
  return c.json(instance, 201)
})

instances.get('/:id', async (c) => {
  const user = c.get('user')
  await finishProvisioning(c.env.DB, user.id)
  return c.json(await getOwned(c.env.DB, parseId(c.req.param('id')), user))
})

async function setStatus(c: { env: AppEnv['Bindings']; get: (k: 'user') => User; req: { param: (k: string) => string } }, status: string) {
  const id = parseId(c.req.param('id'))
  const instance = (await getOwned(c.env.DB, id, c.get('user'))) as { status: string }
  if (instance.status === 'terminated') throw httpError(400, 'Instance is terminated')
  return c.env.DB.prepare('UPDATE instances SET status = ? WHERE id = ? RETURNING *').bind(status, id).first()
}

instances.post('/:id/start', async (c) => c.json(await setStatus(c, 'running')))
instances.post('/:id/stop', async (c) => c.json(await setStatus(c, 'stopped')))

instances.delete('/:id', async (c) => {
  const id = parseId(c.req.param('id'))
  await getOwned(c.env.DB, id, c.get('user'))
  // Never hard-delete: usage_records references it.
  const row = await c.env.DB.prepare("UPDATE instances SET status = 'terminated' WHERE id = ? RETURNING *").bind(id).first()
  return c.json(row)
})
