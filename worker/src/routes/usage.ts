import { Hono } from 'hono'
import { z } from 'zod'
import { currentMonth, summarize, usageForMonth } from '../aggregation'
import { requireUser, validate } from '../http'
import type { AppEnv } from '../types'

export const usage = new Hono<AppEnv>()
// Mounted at the API root, so scope the guard to our own paths.
usage.use('/usage', requireUser)
usage.use('/invoices', requireUser)

const invoiceQuery = z.object({ month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'must be YYYY-MM') })

usage.get('/usage', async (c) => {
  const month = currentMonth()
  return c.json(summarize(month, await usageForMonth(c.env.DB, c.get('user').id, month)))
})

usage.get('/invoices', validate('query', invoiceQuery), async (c) => {
  const { month } = c.req.valid('query')
  return c.json(summarize(month, await usageForMonth(c.env.DB, c.get('user').id, month)))
})
