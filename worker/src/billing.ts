/**
 * Hourly billing job (runs from the cron trigger in wrangler.jsonc).
 *
 * Charges every non-terminated instance for one hour of compute + storage, then settles each
 * affected user's balance (auto top-up / stop-on-zero).
 *
 * Idempotent and crash-safe: usage_records has UNIQUE (instance_id, hour) and rows are inserted
 * with INSERT OR IGNORE, so an hour is recorded once. A record is deducted from the balance exactly
 * once because settlement only picks up rows with settled = 0 and flips them in the same D1 batch
 * (a single transaction) as the balance change. If a run dies between the two steps, the next run
 * settles the leftovers.
 */

import { finishProvisioning } from './provisioning'

type BillableInstance = {
  id: number
  status: string
  storage_gb: number
  rate_running_cents: number
  rate_stopped_cents: number
}

export function currentHour(now = new Date()): string {
  const d = new Date(now)
  d.setUTCMinutes(0, 0, 0)
  return d.toISOString()
}

export async function recordUsageForHour(db: D1Database, hour: string, storageRateCents: number) {
  const { results } = await db
    .prepare("SELECT id, status, storage_gb, rate_running_cents, rate_stopped_cents FROM instances WHERE status != 'terminated'")
    .all<BillableInstance>()
  if (results.length === 0) return

  await db.batch(
    results.map((inst) => {
      const compute = inst.status === 'running' ? inst.rate_running_cents : inst.rate_stopped_cents
      const storage = inst.storage_gb * storageRateCents
      return db
        .prepare('INSERT OR IGNORE INTO usage_records (instance_id, hour, compute_cost_cents, storage_cost_cents) VALUES (?, ?, ?, ?)')
        .bind(inst.id, hour, compute, storage)
    }),
  )
}

/** Deduct unsettled charges, then apply auto top-up / stop instances as needed. */
export async function settleUsers(db: D1Database) {
  const { results } = await db
    .prepare(
      `SELECT DISTINCT i.user_id FROM usage_records u
         JOIN instances i ON i.id = u.instance_id
        WHERE u.settled = 0`,
    )
    .all<{ user_id: number }>()

  // Auto top-up fires when the balance falls below the user's alert threshold.
  // A threshold of 0 means the feature is off.
  const needsTopup = 'alert_threshold_cents > 0 AND topup_amount_cents > 0 AND balance_cents < alert_threshold_cents'

  for (const { user_id } of results) {
    await db.batch([
      db
        .prepare(
          `UPDATE users SET balance_cents = balance_cents - (
             SELECT COALESCE(SUM(u.compute_cost_cents + u.storage_cost_cents), 0)
               FROM usage_records u JOIN instances i ON i.id = u.instance_id
              WHERE i.user_id = users.id AND u.settled = 0)
           WHERE id = ?`,
        )
        .bind(user_id),
      db
        .prepare('UPDATE usage_records SET settled = 1 WHERE settled = 0 AND instance_id IN (SELECT id FROM instances WHERE user_id = ?)')
        .bind(user_id),
      // Order matters: the ledger row is inserted before the balance is topped up, so both see the same condition.
      db
        .prepare(
          `INSERT INTO transactions (user_id, type, amount_cents, method, status)
           SELECT id, 'auto_topup', topup_amount_cents, 'auto', 'completed' FROM users
            WHERE id = ? AND ${needsTopup}`,
        )
        .bind(user_id),
      db.prepare(`UPDATE users SET balance_cents = balance_cents + topup_amount_cents WHERE id = ? AND ${needsTopup}`).bind(user_id),
      // Out of money: stop everything still running.
      db
        .prepare("UPDATE instances SET status = 'stopped' WHERE user_id = ? AND status = 'running' AND (SELECT balance_cents FROM users WHERE id = ?) <= 0")
        .bind(user_id, user_id),
    ])
  }
}

export async function runHourlyBilling(
  env: { DB: D1Database; STORAGE_RATE_PER_GB_HOUR_CENTS: string },
  hour = currentHour(),
) {
  await finishProvisioning(env.DB)
  await recordUsageForHour(env.DB, hour, Number(env.STORAGE_RATE_PER_GB_HOUR_CENTS))
  await settleUsers(env.DB)
}
