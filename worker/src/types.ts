export type Env = {
  DB: D1Database
  ASSETS: Fetcher
  JWT_SECRET: string
  JWT_EXPIRE_MINUTES: string
  STORAGE_RATE_PER_GB_HOUR_CENTS: string
}

export type User = {
  id: number
  email: string
  password_hash: string
  full_name: string
  balance_cents: number
  alert_threshold_cents: number
  topup_amount_cents: number
  created_at: string
}

export type AppEnv = {
  Bindings: Env
  Variables: { user: User }
}
