import { Hono } from 'hono'
import { z } from 'zod'
import { requireUser, validate } from '../http'
import type { AppEnv } from '../types'

export const billing = new Hono<AppEnv>()
billing.use(requireUser)

const depositSchema = z.object({
  amount_cents: z.number().int().positive(),
  method: z.string().nullish(),
})
const thresholdSchema = z.object({
  alert_threshold_cents: z.number().int().min(0),
  topup_amount_cents: z.number().int().min(0),
})

billing.get('/balance', (c) => c.json({ balance_cents: c.get('user').balance_cents }))

billing.post('/deposit', validate('json', depositSchema), async (c) => {
  const user = c.get('user')
  const { amount_cents, method } = c.req.valid('json')

  // One batch = one transaction: the ledger row and the balance change land together.
  const [tx] = await c.env.DB.batch([
    c.env.DB
      .prepare("INSERT INTO transactions (user_id, type, amount_cents, method, status) VALUES (?, 'deposit', ?, ?, 'completed') RETURNING *")
      .bind(user.id, amount_cents, method ?? null),
    c.env.DB.prepare('UPDATE users SET balance_cents = balance_cents + ? WHERE id = ?').bind(amount_cents, user.id),
  ])
  return c.json(tx.results[0], 201)
})

billing.get('/transactions', async (c) => {
  const { results } = await c.env.DB
    .prepare('SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC, id DESC')
    .bind(c.get('user').id)
    .all()
  return c.json(results)
})

billing.get('/threshold', (c) => {
  const { alert_threshold_cents, topup_amount_cents } = c.get('user')
  return c.json({ alert_threshold_cents, topup_amount_cents })
})

billing.put('/threshold', validate('json', thresholdSchema), async (c) => {
  const { alert_threshold_cents, topup_amount_cents } = c.req.valid('json')
  const row = await c.env.DB
    .prepare('UPDATE users SET alert_threshold_cents = ?, topup_amount_cents = ? WHERE id = ? RETURNING alert_threshold_cents, topup_amount_cents')
    .bind(alert_threshold_cents, topup_amount_cents, c.get('user').id)
    .first()
  return c.json(row)
})
