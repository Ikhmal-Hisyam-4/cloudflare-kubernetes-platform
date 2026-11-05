export interface User {
  id: number
  email: string
  full_name: string
  balance_cents: number
  alert_threshold_cents: number
  topup_amount_cents: number
  created_at: string
}

export interface Plan {
  id: number
  type: 'gpu' | 'cpu'
  name: string
  gpu_model: string | null
  gpu_count: number
  vcpu: number
  ram_gb: number
  storage_gb: number
  rate_running_cents: number
  rate_stopped_cents: number
}

export interface OsImage {
  id: number
  name: string
}

export type InstanceStatus = 'provisioning' | 'running' | 'stopped' | 'terminated'

export interface Instance {
  id: number
  user_id: number
  plan_id: number
  name: string
  os_image: string
  status: InstanceStatus
  compute_type: 'gpu' | 'cpu'
  gpu_model: string | null
  location: string | null
  storage_gb: number
  rate_running_cents: number
  rate_stopped_cents: number
  ip_address: string | null
  dns_name: string | null
  created_at: string
}

export interface SshKey {
  id: number
  name: string
  public_key: string
  created_at: string
}

export interface ApiKey {
  id: number
  name: string
  last_used_at: string | null
  created_at: string
}

export interface ApiKeyCreated extends ApiKey {
  key: string
}

export interface Transaction {
  id: number
  type: 'deposit' | 'auto_topup'
  amount_cents: number
  method: string | null
  status: string
  created_at: string
}

export interface Threshold {
  alert_threshold_cents: number
  topup_amount_cents: number
}

export interface UsageItem {
  instance_id: number
  instance_name: string
  status: InstanceStatus
  hours: number
  compute_cost_cents: number
  storage_cost_cents: number
  total_cost_cents: number
}

export interface UsageResponse {
  month: string
  items: UsageItem[]
  total_compute_cents: number
  total_storage_cents: number
  total_cents: number
}

export interface DashboardSummary {
  active_instances: number
  total_gpus: number
  total_storage_gb: number
  monthly_cost_cents: number
  hourly_cost_cents: number
}
