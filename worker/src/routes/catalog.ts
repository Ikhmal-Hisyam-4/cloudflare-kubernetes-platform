import { Hono } from 'hono'
import type { AppEnv } from '../types'

// Public deploy-page catalog: same for every visitor, so intentionally not behind requireUser.
export const catalog = new Hono<AppEnv>()

catalog.get('/plans', async (c) => {
  const type = c.req.query('type')
  if (type !== undefined && type !== 'gpu' && type !== 'cpu') {
    return c.json({ detail: 'type: must be "gpu" or "cpu"' }, 422)
  }
  const stmt = type
    ? c.env.DB.prepare('SELECT * FROM plans WHERE type = ? ORDER BY id').bind(type)
    : c.env.DB.prepare('SELECT * FROM plans ORDER BY id')
  const { results } = await stmt.all()
  return c.json(results)
})

catalog.get('/os-images', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM os_images ORDER BY id').all()
  return c.json(results)
})
