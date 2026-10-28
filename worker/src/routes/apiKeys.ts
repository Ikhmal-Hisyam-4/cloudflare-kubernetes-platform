import { Hono } from 'hono'
import { z } from 'zod'
import { httpError, requireUser, validate } from '../http'
import { randomUrlSafe, sha256Hex } from '../security'
import type { AppEnv } from '../types'

export const apiKeys = new Hono<AppEnv>()
apiKeys.use(requireUser)

const createSchema = z.object({ name: z.string().min(1) })

// key_hash is never returned; the raw key is shown once, at creation.
const PUBLIC_COLUMNS = 'id, name, last_used_at, created_at'

apiKeys.get('/', async (c) => {
  const { results } = await c.env.DB
    .prepare(`SELECT ${PUBLIC_COLUMNS} FROM api_keys WHERE user_id = ? ORDER BY created_at DESC, id DESC`)
    .bind(c.get('user').id)
    .all()
  return c.json(results)
})

apiKeys.post('/', validate('json', createSchema), async (c) => {
  const rawKey = `kubex_${randomUrlSafe(32)}`
  const row = await c.env.DB
    .prepare(`INSERT INTO api_keys (user_id, name, key_hash) VALUES (?, ?, ?) RETURNING ${PUBLIC_COLUMNS}`)
    .bind(c.get('user').id, c.req.valid('json').name, await sha256Hex(rawKey))
    .first()
  return c.json({ ...row, key: rawKey }, 201)
})

apiKeys.delete('/:id', async (c) => {
  const res = await c.env.DB
    .prepare('DELETE FROM api_keys WHERE id = ? AND user_id = ?')
    .bind(Number(c.req.param('id')), c.get('user').id)
    .run()
  if (res.meta.changes === 0) throw httpError(404, 'API key not found')
  return c.body(null, 204)
})
