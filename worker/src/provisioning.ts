// There is no long-running process to sleep in on Workers, so provisioning is simulated lazily:
// an instance older than PROVISION_DELAY_MS flips to "running" with a fake IP the next time it is
// read (and on every billing cron tick).

const PROVISION_DELAY_MS = 10_000

const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min

export function fakeIpAddress(): string {
  return `10.${rand(0, 255)}.${rand(0, 255)}.${rand(1, 254)}`
}

/** Builds an AWS EC2-style hostname from the fake IP, e.g. gpu-10-42-201-7.kubex.cloud. */
export function dnsNameForIp(ip: string): string {
  return `gpu-${ip.replaceAll('.', '-')}.kubex.cloud`
}

export async function finishProvisioning(db: D1Database, userId?: number): Promise<void> {
  const cutoff = new Date(Date.now() - PROVISION_DELAY_MS).toISOString()
  const query = userId === undefined
    ? db.prepare("SELECT id FROM instances WHERE status = 'provisioning' AND created_at <= ?").bind(cutoff)
    : db
        .prepare("SELECT id FROM instances WHERE status = 'provisioning' AND created_at <= ? AND user_id = ?")
        .bind(cutoff, userId)
  const { results } = await query.all<{ id: number }>()
  if (results.length === 0) return

  await db.batch(
    results.map(({ id }) => {
      const ip = fakeIpAddress()
      return db
        .prepare("UPDATE instances SET status = 'running', ip_address = ?, dns_name = ? WHERE id = ? AND status = 'provisioning'")
        .bind(ip, dnsNameForIp(ip), id)
    }),
  )
}
