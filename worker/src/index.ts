import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { runHourlyBilling } from './billing'
import { apiKeys } from './routes/apiKeys'
import { auth } from './routes/auth'
import { billing } from './routes/billing'
import { catalog } from './routes/catalog'
import { dashboard } from './routes/dashboard'
import { instances } from './routes/instances'
import { sshKeys } from './routes/sshKeys'
import { usage } from './routes/usage'
import type { AppEnv, Env } from './types'

const app = new Hono<AppEnv>().basePath('/api')

app.get('/health', (c) => c.json({ status: 'ok' }))
app.route('/auth', auth)
app.route('/', catalog)
app.route('/instances', instances)
app.route('/billing', billing)
app.route('/', usage)
app.route('/dashboard', dashboard)
app.route('/ssh-keys', sshKeys)
app.route('/api-keys', apiKeys)

app.onError((err, c) => {
  if (err instanceof HTTPException) return err.getResponse()
  console.error(err)
  return c.json({ detail: 'Internal server error' }, 500)
})

app.notFound((c) => c.json({ detail: 'Not Found' }, 404))

export default {
  fetch: app.fetch,
  // Cron trigger (see wrangler.jsonc): replaces APScheduler's hourly job.
  async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(runHourlyBilling(env, new Date(controller.scheduledTime).toISOString().slice(0, 13) + ':00:00.000Z'))
  },
} satisfies ExportedHandler<Env>
