// End-to-end smoke test of the API.
//   Local:    npm run dev, then `npm run smoke`   (default http://localhost:8787/api; use a fresh local DB)
//   Deployed: BASE=https://<host>/api SKIP_CRON=1 npm run smoke
// A deployed Worker has no cron test endpoint, so SKIP_CRON=1 skips the billing-run assertions.
const BASE = process.env.BASE ?? 'http://localhost:8787/api'
const CRON = process.env.SKIP_CRON !== '1'
let failed = 0

async function call(method, path, { token, body } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: { ...(body ? { 'content-type': 'application/json' } : {}), ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  return { status: res.status, data: text ? JSON.parse(text) : null }
}

function check(name, cond, extra) {
  if (!cond) failed++
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${cond ? '' : '  -> ' + JSON.stringify(extra)}`)
}

const email = `smoke-${Date.now()}@example.com`
const signup = await call('POST', '/auth/signup', { body: { email, password: 'pw12345', full_name: 'Smoke' } })
check('signup 201', signup.status === 201, signup)
const token = signup.data.access_token
const other = (await call('POST', '/auth/signup', { body: { email: 'o' + email, password: 'pw12345', full_name: 'Other' } })).data.access_token

check('login', (await call('POST', '/auth/login', { body: { email, password: 'pw12345' } })).status === 200)
check('login wrong password 401', (await call('POST', '/auth/login', { body: { email, password: 'bad' } })).status === 401)
check('me requires token', (await call('GET', '/auth/me')).status === 401)

const plans = await call('GET', '/plans')
check('plans (public) = 6', plans.status === 200 && plans.data.length === 6, plans)
check('plans?type=gpu = 3', (await call('GET', '/plans?type=gpu')).data.length === 3)
check('plans?type=bad 422', (await call('GET', '/plans?type=bad')).status === 422)
check('os-images = 3', (await call('GET', '/os-images')).data.length === 3)

const cpu = plans.data.find((p) => p.type === 'cpu')
check('deploy with no balance 402', (await call('POST', '/instances', { token, body: { plan_id: cpu.id, name: 'a', os_image: 'x' } })).status === 402)

const dep = await call('POST', '/billing/deposit', { token, body: { amount_cents: 1000, method: 'card' } })
check('deposit 201', dep.status === 201 && dep.data.amount_cents === 1000, dep)
check('balance 1000', (await call('GET', '/billing/balance', { token })).data.balance_cents === 1000)
check('deposit <=0 rejected', (await call('POST', '/billing/deposit', { token, body: { amount_cents: 0 } })).status === 422)

const inst = await call('POST', '/instances', { token, body: { plan_id: cpu.id, name: 'web', os_image: 'Ubuntu 24.04 LTS' } })
check('deploy 201 provisioning', inst.status === 201 && inst.data.status === 'provisioning' && inst.data.ip_address === null, inst)
const id = inst.data.id
check("other user can't see instance (404)", (await call('GET', `/instances/${id}`, { token: other })).status === 404)

await new Promise((r) => setTimeout(r, 11_000))
const after = await call('GET', `/instances/${id}`, { token })
check('provisioned -> running with ip + dns', after.data.status === 'running' && /^10\./.test(after.data.ip_address) && after.data.dns_name.endsWith('.kubex.cloud'), after.data)

check('stop', (await call('POST', `/instances/${id}/stop`, { token })).data.status === 'stopped')
check('start', (await call('POST', `/instances/${id}/start`, { token })).data.status === 'running')
check('list has 1', (await call('GET', '/instances', { token })).data.length === 1)

const thr = await call('PUT', '/billing/threshold', { token, body: { alert_threshold_cents: 500, topup_amount_cents: 200 } })
check('threshold set', thr.data.alert_threshold_cents === 500, thr)

const key = await call('POST', '/api-keys', { token, body: { name: 'ci' } })
check('api key created w/ raw key, no hash', key.status === 201 && key.data.key.startsWith('kubex_') && !('key_hash' in key.data), key)
check('api key list hides key', !('key' in (await call('GET', '/api-keys', { token })).data[0]))
check('api key delete 204', (await call('DELETE', `/api-keys/${key.data.id}`, { token })).status === 204)
check('api key delete again 404', (await call('DELETE', `/api-keys/${key.data.id}`, { token })).status === 404)

const ssh = await call('POST', '/ssh-keys', { token, body: { name: 'laptop', public_key: 'ssh-ed25519 AAAA' } })
check('ssh key created', ssh.status === 201, ssh)
check('ssh key delete 204', (await call('DELETE', `/ssh-keys/${ssh.data.id}`, { token })).status === 204)

const month = new Date().toISOString().slice(0, 7)
let charged = 0
let balance = 1000

if (CRON) {
  // Needs `wrangler dev --test-scheduled`, which `npm run dev` enables.
  const trigger = () => fetch(BASE.replace('/api', '') + '/cdn-cgi/handler/scheduled?cron=0+*+*+*+*')
  check('cron trigger ran', (await trigger()).ok)
  await new Promise((r) => setTimeout(r, 1500))
  const usage = await call('GET', '/usage', { token })
  // cpu plan: running 9c + storage 80GB * 1c = 89c for the hour.
  check('usage has 1 hour = 89c', usage.data.items.length === 1 && usage.data.total_cents === 89, usage.data)
  charged = 89
  balance = 1000 - charged
  // 911 is above the 500 threshold, so no top-up.
  check('balance charged once (911)', (await call('GET', '/billing/balance', { token })).data.balance_cents === balance)

  await trigger()
  await new Promise((r) => setTimeout(r, 1500))
  check('re-running same hour is idempotent', (await call('GET', '/billing/balance', { token })).data.balance_cents === balance)
}

check('invoice for month', (await call('GET', `/invoices?month=${month}`, { token })).data.total_cents === charged)
check('invoice bad month 422', (await call('GET', '/invoices?month=2026-13', { token })).status === 422)

const dash = await call('GET', '/dashboard/summary', { token })
check('dashboard summary', dash.data.active_instances === 1 && dash.data.total_storage_gb === 80 && dash.data.monthly_cost_cents === charged, dash.data)

check('terminate', (await call('DELETE', `/instances/${id}`, { token })).data.status === 'terminated')
check('start terminated -> 400', (await call('POST', `/instances/${id}/start`, { token })).status === 400)
check('tx history has deposit', (await call('GET', '/billing/transactions', { token })).data.length === 1)

console.log(failed ? `\n${failed} FAILED` : '\nALL PASSED')
process.exit(failed ? 1 : 0)
