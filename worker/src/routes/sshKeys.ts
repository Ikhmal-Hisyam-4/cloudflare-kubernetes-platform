import { Hono } from 'hono'
import { z } from 'zod'
import { httpError, requireUser, validate } from '../http'
import type { AppEnv } from '../types'

export const sshKeys = new Hono<AppEnv>()
sshKeys.use(requireUser)

const createSchema = z.object({ name: z.string().min(1), public_key: z.string().min(1) })

sshKeys.get('/', async (c) => {
  const { results } = await c.env.DB
    .prepare('SELECT * FROM ssh_keys WHERE user_id = ? ORDER BY created_at DESC, id DESC')
    .bind(c.get('user').id)
    .all()
  return c.json(results)
})

sshKeys.post('/', validate('json', createSchema), async (c) => {
  const { name, public_key } = c.req.valid('json')
  const row = await c.env.DB
    .prepare('INSERT INTO ssh_keys (user_id, name, public_key) VALUES (?, ?, ?) RETURNING *')
    .bind(c.get('user').id, name, public_key)
    .first()
  return c.json(row, 201)
})

sshKeys.delete('/:id', async (c) => {
  const res = await c.env.DB
    .prepare('DELETE FROM ssh_keys WHERE id = ? AND user_id = ?')
    .bind(Number(c.req.param('id')), c.get('user').id)
    .run()
  if (res.meta.changes === 0) throw httpError(404, 'SSH key not found')
  return c.body(null, 204)
})
