// Fixture data shown on public pages when the visitor isn't signed in.
// Mirrors the shapes in ./types so pages can use it as a drop-in fallback.
import type {
  ApiKey,
  DashboardSummary,
  Instance,
  SshKey,
  Threshold,
  Transaction,
  UsageResponse,
  User,
} from './types'

export const demoDashboardSummary: DashboardSummary = {
  active_instances: 1,
  total_gpus: 0,
  total_storage_gb: 150,
  monthly_cost_cents: 63120,
}

export const demoInstances: Instance[] = [
  {
    id: -1,
    user_id: -1,
    plan_id: -1,
    name: 'Production Server',
    os_image: 'ubuntu2204',
    status: 'running',
    compute_type: 'cpu',
    gpu_model: null,
    location: 'US-East',
    storage_gb: 100,
    rate_running_cents: 85,
    rate_stopped_cents: 0,
    ip_address: null,
    dns_name: null,
    created_at: '2026-08-14T00:00:00Z',
  },
  {
    id: -2,
    user_id: -1,
    plan_id: -1,
    name: 'Staging Environment',
    os_image: 'ubuntu2204',
    status: 'stopped',
    compute_type: 'cpu',
    gpu_model: null,
    location: 'US-East',
    storage_gb: 50,
    rate_running_cents: 0,
    rate_stopped_cents: 0,
    ip_address: null,
    dns_name: null,
    created_at: '2026-08-10T00:00:00Z',
  },
]

export const demoSshKeys: SshKey[] = [
  {
    id: -1,
    name: 'MY_SSH_KEY',
    public_key: 'ssh-ed25519 AAAA...demo',
    created_at: '2026-08-11T00:00:00Z',
  },
  {
    id: -2,
    name: 'API_KEY_PROD',
    public_key: 'ssh-ed25519 AAAA...demo',
    created_at: '2026-08-11T00:00:00Z',
  },
  {
    id: -3,
    name: 'DATABASE_PASSWORD',
    public_key: 'ssh-ed25519 AAAA...demo',
    created_at: '2026-08-11T00:00:00Z',
  },
]

export const demoUser: User = {
  id: -1,
  email: 'demo@kubex.my',
  full_name: 'Demo User',
  balance_cents: 12840,
  alert_threshold_cents: 2500,
  topup_amount_cents: 10000,
  created_at: '2026-08-01T00:00:00Z',
}

export const demoApiKeys: ApiKey[] = [
  {
    id: -1,
    name: 'CI pipeline',
    last_used_at: '2026-08-12T00:00:00Z',
    created_at: '2026-08-01T00:00:00Z',
  },
  {
    id: -2,
    name: 'Local development',
    last_used_at: null,
    created_at: '2026-08-05T00:00:00Z',
  },
]

export const demoBalance = { balance_cents: 12840 }

export const demoThreshold: Threshold = {
  alert_threshold_cents: 2500,
  topup_amount_cents: 10000,
}

export const demoTransactions: Transaction[] = [
  {
    id: -1,
    type: 'auto_topup',
    amount_cents: 10000,
    method: 'Visa •••• 4242',
    status: 'completed',
    created_at: '2026-08-06T00:00:00Z',
  },
  {
    id: -2,
    type: 'deposit',
    amount_cents: 5000,
    method: 'Mastercard •••• 8821',
    status: 'completed',
    created_at: '2026-07-22T00:00:00Z',
  },
  {
    id: -3,
    type: 'auto_topup',
    amount_cents: 10000,
    method: 'Visa •••• 4242',
    status: 'completed',
    created_at: '2026-07-06T00:00:00Z',
  },
  {
    id: -4,
    type: 'deposit',
    amount_cents: 3450,
    method: 'Visa •••• 4242',
    status: 'pending',
    created_at: '2026-06-14T00:00:00Z',
  },
]

export const demoUsage: UsageResponse = {
  month: '2026-08',
  items: [
    {
      instance_id: -1,
      instance_name: 'Production Server',
      status: 'running',
      hours: 288,
      compute_cost_cents: 20400,
      storage_cost_cents: 1200,
      total_cost_cents: 21600,
    },
    {
      instance_id: -2,
      instance_name: 'Staging Environment',
      status: 'stopped',
      hours: 72,
      compute_cost_cents: 6840,
      storage_cost_cents: 600,
      total_cost_cents: 7440,
    },
    {
      instance_id: -3,
      instance_name: 'ML Training Node',
      status: 'running',
      hours: 96,
      compute_cost_cents: 31680,
      storage_cost_cents: 2400,
      total_cost_cents: 34080,
    },
  ],
  total_compute_cents: 58920,
  total_storage_cents: 4200,
  total_cents: 63120,
}
