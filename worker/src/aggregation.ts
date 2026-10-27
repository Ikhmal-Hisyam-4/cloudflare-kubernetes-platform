/** Aggregations over usage_records. There is no separate invoices table. */

export type UsageItem = {
  instance_id: number
  instance_name: string
  status: string
  hours: number
  compute_cost_cents: number
  storage_cost_cents: number
  total_cost_cents: number
}

/** `month` is YYYY-MM. Returns [start, end) as ISO UTC strings. */
export function monthBounds(month: string): [string, string] {
  const [year, mon] = month.split('-').map(Number)
  return [new Date(Date.UTC(year, mon - 1, 1)).toISOString(), new Date(Date.UTC(year, mon, 1)).toISOString()]
}

export const currentMonth = () => new Date().toISOString().slice(0, 7)

export async function usageForMonth(db: D1Database, userId: number, month: string): Promise<UsageItem[]> {
  const [start, end] = monthBounds(month)
  const { results } = await db
    .prepare(
      `SELECT i.id, i.name, i.status,
              COUNT(u.id) AS hours,
              COALESCE(SUM(u.compute_cost_cents), 0) AS compute,
              COALESCE(SUM(u.storage_cost_cents), 0) AS storage
         FROM instances i
         JOIN usage_records u ON u.instance_id = i.id
        WHERE i.user_id = ? AND u.hour >= ? AND u.hour < ?
        GROUP BY i.id, i.name, i.status
        ORDER BY i.id`,
    )
    .bind(userId, start, end)
    .all<{ id: number; name: string; status: string; hours: number; compute: number; storage: number }>()

  return results.map((r) => ({
    instance_id: r.id,
    instance_name: r.name,
    status: r.status,
    hours: r.hours,
    compute_cost_cents: r.compute,
    storage_cost_cents: r.storage,
    total_cost_cents: r.compute + r.storage,
  }))
}

export function summarize(month: string, items: UsageItem[]) {
  const sum = (pick: (i: UsageItem) => number) => items.reduce((acc, i) => acc + pick(i), 0)
  return {
    month,
    items,
    total_compute_cents: sum((i) => i.compute_cost_cents),
    total_storage_cents: sum((i) => i.storage_cost_cents),
    total_cents: sum((i) => i.total_cost_cents),
  }
}
