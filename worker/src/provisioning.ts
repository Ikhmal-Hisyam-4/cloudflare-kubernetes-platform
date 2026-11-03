// There is no long-running process to sleep in on Workers, so provisioning is simulated lazily:
// an instance older than PROVISION_DELAY_MS flips to "running" with a fake IP the next time it is
// read (and on every billing cron tick).

const PROVISION_DELAY_MS = 10_000

const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min

export function fakeIpAddress(): string {
  return `10.${rand(0, 255)}.${rand(0, 255)}.${rand(1, 254)}`
}

const REGION_SHORT: Record<string, string> = { 'ap-southeast-1': 'sg', 'ap-southeast-5': 'my' }

/** Builds a short hostname from the fake IP and region, e.g. vm-10-42-201-7.sg.kubex.cloud (same for CPU and GPU). */
export function dnsNameForIp(ip: string, location: string | null): string {
  const region = REGION_SHORT[location?.split(' ')[0] ?? ''] ?? 'sg'
  return `vm-${ip.replaceAll('.', '-')}.${region}.kubex.cloud`
}

export async function finishProvisioning(db: D1Database, userId?: number): Promise<void> {
  const cutoff = new Date(Date.now() - PROVISION_DELAY_MS).toISOString()
  const query = userId === undefined
    ? db.prepare("SELECT id, location FROM instances WHERE status = 'provisioning' AND created_at <= ?").bind(cutoff)
    : db
        .prepare("SELECT id, location FROM instances WHERE status = 'provisioning' AND created_at <= ? AND user_id = ?")
        .bind(cutoff, userId)
  const { results } = await query.all<{ id: number; location: string | null }>()
  if (results.length === 0) return

  await db.batch(
    results.map(({ id, location }) => {
      const ip = fakeIpAddress()
      return db
        .prepare("UPDATE instances SET status = 'running', ip_address = ?, dns_name = ? WHERE id = ? AND status = 'provisioning'")
        .bind(ip, dnsNameForIp(ip, location), id)
    }),
  )
}
