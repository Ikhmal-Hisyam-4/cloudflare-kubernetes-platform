import { Hono } from 'hono'
import { currentMonth, monthBounds } from '../aggregation'
import { HOURS_PER_MONTH } from '../billing'
import { requireUser } from '../http'
import type { AppEnv } from '../types'

export const dashboard = new Hono<AppEnv>()
dashboard.use(requireUser)

dashboard.get('/summary', async (c) => {
  const userId = c.get('user').id
  const [start, end] = monthBounds(currentMonth())

  // Totals are aggregated in SQL, never summed from a paginated list in the client.
  const [active, cost, hourly] = await c.env.DB.batch<Record<string, number>>([
    c.env.DB
      .prepare(
        `SELECT COUNT(i.id) AS active_instances,
                COALESCE(SUM(i.storage_gb), 0) AS total_storage_gb,
                COALESCE(SUM(p.gpu_count), 0) AS total_gpus
           FROM instances i JOIN plans p ON p.id = i.plan_id
          WHERE i.user_id = ? AND i.status IN ('provisioning', 'running', 'stopped')`,
      )
      .bind(userId),
    c.env.DB
      .prepare(
        `SELECT COALESCE(SUM(u.compute_cost_cents + u.storage_cost_cents), 0) AS monthly_cost_cents
           FROM usage_records u JOIN instances i ON i.id = u.instance_id
          WHERE i.user_id = ? AND u.hour >= ? AND u.hour < ?`,
      )
      .bind(userId, start, end),
    // What the next billing hour will charge: compute (running or stopped rate) plus storage,
    // using the same per-instance rounding as billing.ts (storageCentsPerHour).
    c.env.DB
      .prepare(
        `SELECT COALESCE(SUM(CASE WHEN status = 'running' THEN rate_running_cents ELSE rate_stopped_cents END
                             + CAST((storage_gb * ? * 2 + ?) / (2 * ?) AS INTEGER)), 0) AS hourly_cost_cents
           FROM instances WHERE user_id = ? AND status != 'terminated'`,
      )
      .bind(Number(c.env.STORAGE_RATE_PER_GB_MONTH_CENTS), HOURS_PER_MONTH, HOURS_PER_MONTH, userId),
  ])

  return c.json({ ...active.results[0], ...cost.results[0], ...hourly.results[0] })
})
