import type { ComponentType } from 'react'
import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { queryKeys } from '../lib/queryKeys'
import { useAuth } from '../lib/auth'
import { formatCents } from '../lib/money'
import { useConfirm } from '../lib/useConfirm'
import { demoBalance, demoDashboardSummary, demoInstances } from '../lib/demoData'
import { DemoBanner } from '../components/DemoBanner'
import { CpuIcon, DatabaseIcon, DollarIcon, ServerIcon, StarIcon } from '../components/icons'
import type { DashboardSummary, Instance, Plan } from '../lib/types'

function StatCell({
  to,
  label,
  value,
  Icon,
}: {
  to?: string
  label: string
  value: string
  Icon: ComponentType<{ className?: string }>
}) {
  const className = `px-5 py-4 ${to ? 'transition hover:bg-neutral-50' : ''}`
  const content = (
    <>
      <div className="flex items-center gap-2 text-neutral-500">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-neutral-100">
          <Icon className="h-3.5 w-3.5" />
        </span>
        <p className="text-sm">{label}</p>
      </div>
      <p className="mt-3 text-2xl font-bold text-neutral-900">{value}</p>
    </>
  )
  return to ? (
    <Link to={to} className={className}>
      {content}
    </Link>
  ) : (
    <div className={className}>{content}</div>
  )
}

function ServerRow({ instance, plan }: { instance: Instance; plan?: Plan }) {
  const queryClient = useQueryClient()
  const confirm = useConfirm()
  const { isAuthenticated } = useAuth()

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: queryKeys.instances })
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboardSummary })
  }

  const startMutation = useMutation({
    mutationFn: () => api.post(`/instances/${instance.id}/start`),
    onSuccess: invalidate,
  })
  const stopMutation = useMutation({
    mutationFn: () => api.post(`/instances/${instance.id}/stop`),
    onSuccess: invalidate,
  })

  async function handleStop() {
    const ok = await confirm({
      title: `Stop "${instance.name}"?`,
      description: 'The server will stop and be billed at the lower stopped rate.',
      confirmLabel: 'Stop',
    })
    if (ok) stopMutation.mutate()
  }

  const running = instance.status === 'running'
  const rate = running ? instance.rate_running_cents : instance.rate_stopped_cents
  const specs = [
    instance.compute_type === 'gpu' ? instance.gpu_model : null,
    plan ? `${plan.vcpu} vCPU` : null,
    plan ? `${plan.ram_gb} GB` : null,
    `${instance.storage_gb} GB`,
  ]
    .filter(Boolean)
    .join(' · ')

  const Icon = instance.compute_type === 'gpu' ? StarIcon : CpuIcon
  const canAct = isAuthenticated && (running || instance.status === 'stopped')

  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-4 border-t border-neutral-100 px-5 py-3 md:grid-cols-[2fr_2fr_1fr_1fr_72px]">
      <div className="flex min-w-0 items-center gap-3">
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
            instance.compute_type === 'gpu' ? 'bg-orange-50 text-orange-500' : 'bg-blue-50 text-blue-500'
          }`}
        >
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold text-neutral-900">{instance.name}</p>
            <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-neutral-500">
              {instance.compute_type}
            </span>
          </div>
          <p className="truncate text-xs text-neutral-400">{specs}</p>
        </div>
      </div>

      <div className="hidden min-w-0 md:block">
        <p className="truncate font-mono text-xs text-neutral-900">{instance.ip_address ?? '—'}</p>
        <p className="truncate text-xs text-neutral-400">{instance.location ?? ''}</p>
      </div>

      <p className="hidden text-sm font-semibold text-neutral-900 md:block">
        {formatCents(rate)}
        <span className="font-normal text-neutral-400">/hr</span>
      </p>

      <span
        className={`flex items-center gap-1.5 text-xs font-medium ${
          running
            ? 'text-emerald-600'
            : instance.status === 'provisioning'
              ? 'text-amber-500'
              : 'text-neutral-400'
        }`}
      >
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            running
              ? 'bg-emerald-500'
              : instance.status === 'provisioning'
                ? 'bg-amber-400'
                : 'bg-neutral-300'
          }`}
        />
        {instance.status[0].toUpperCase() + instance.status.slice(1)}
      </span>

      <div className="hidden justify-end md:flex">
        {canAct &&
          (running ? (
            <button
              onClick={handleStop}
              disabled={stopMutation.isPending}
              className="rounded-md border border-neutral-200 px-2.5 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-40"
            >
              Stop
            </button>
          ) : (
            <button
              onClick={() => startMutation.mutate()}
              disabled={startMutation.isPending}
              className="rounded-md border border-neutral-200 px-2.5 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-40"
            >
              Start
            </button>
          ))}
      </div>
    </div>
  )
}

export function DashboardPage() {
  const { user, isAuthenticated } = useAuth()

  const { data: summary } = useQuery({
    queryKey: queryKeys.dashboardSummary,
    queryFn: async () => (await api.get<DashboardSummary>('/dashboard/summary')).data,
    enabled: isAuthenticated,
  })

  const { data: balanceData } = useQuery({
    queryKey: queryKeys.balance,
    queryFn: async () => (await api.get<{ balance_cents: number }>('/billing/balance')).data,
    enabled: isAuthenticated,
  })

  const { data: instances } = useQuery({
    queryKey: queryKeys.instances,
    queryFn: async () => (await api.get<Instance[]>('/instances')).data,
    enabled: isAuthenticated,
  })

  const { data: plans } = useQuery({
    queryKey: queryKeys.plans(),
    queryFn: async () => (await api.get<Plan[]>('/plans')).data,
  })

  const display = isAuthenticated ? summary : demoDashboardSummary
  const balanceCents = isAuthenticated ? (balanceData?.balance_cents ?? 0) : demoBalance.balance_cents

  const live = useMemo(
    () => (isAuthenticated ? instances : demoInstances)?.filter((i) => i.status !== 'terminated') ?? [],
    [isAuthenticated, instances],
  )
  const recentServers = useMemo(
    () =>
      [...live]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5),
    [live],
  )

  const runningCount = live.filter((i) => i.status === 'running').length
  // Server-side total: compute plus storage, the same amount the billing job charges.
  const ratePerHourCents = display?.hourly_cost_cents ?? 0
  const runwayDays = ratePerHourCents > 0 ? balanceCents / ratePerHourCents / 24 : null

  const firstName = user?.full_name?.split(' ')[0]

  return (
    <div>
      {!isAuthenticated && <DemoBanner />}

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 bg-white px-8 py-5">
        <div>
          <h1 className="text-xl font-bold text-neutral-900">
            {isAuthenticated ? `Welcome back, ${firstName}` : 'Dashboard'}
          </h1>
          <p className="text-sm text-neutral-500">
            {runningCount} {runningCount === 1 ? 'server' : 'servers'} running ·{' '}
            {formatCents(ratePerHourCents)}/hr
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/deploy/cpu"
            className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
          >
            <CpuIcon className="h-4 w-4" />
            Deploy CPU
          </Link>
          <Link
            to="/deploy/gpu"
            className="flex items-center gap-2 rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800"
          >
            <StarIcon className="h-4 w-4" />
            Deploy GPU
          </Link>
        </div>
      </div>

      <div className="space-y-4 p-8">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[340px_1fr]">
          <div className="rounded-xl bg-neutral-900 p-5 text-white">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium text-neutral-400">Balance</p>
                <p className="mt-1 text-3xl font-bold tracking-tight">{formatCents(balanceCents)}</p>
              </div>
              <Link
                to="/billing"
                className="rounded-lg bg-white px-3.5 py-2 text-sm font-semibold text-neutral-900 hover:bg-neutral-100"
              >
                Add Funds
              </Link>
            </div>
            <p className="mt-4 text-xs text-neutral-400">
              {formatCents(ratePerHourCents)}/hr
              {runwayDays !== null && (
                <>
                  {' · '}
                  <span
                    className={`font-semibold ${runwayDays < 3 ? 'text-red-400' : 'text-emerald-400'}`}
                  >
                    ~{Math.floor(runwayDays)} {Math.floor(runwayDays) === 1 ? 'day' : 'days'} left
                  </span>
                </>
              )}
            </p>
          </div>

          <div className="grid grid-cols-2 divide-neutral-100 overflow-hidden rounded-xl border border-neutral-200 bg-white lg:grid-cols-4 lg:divide-x">
            <StatCell
              to="/servers"
              label="Instances"
              value={String(display?.active_instances ?? 0)}
              Icon={ServerIcon}
            />
            <StatCell
              label="GPUs"
              value={String(display?.total_gpus ?? 0)}
              Icon={StarIcon}
            />
            <StatCell
              label="Storage"
              value={`${display?.total_storage_gb ?? 0} GB`}
              Icon={DatabaseIcon}
            />
            <StatCell
              label="Spent this month"
              value={formatCents(display?.monthly_cost_cents ?? 0)}
              Icon={DollarIcon}
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
          <div className="flex items-center justify-between px-5 py-4">
            <p className="text-sm font-semibold text-neutral-900">Recent servers</p>
            <Link to="/servers" className="text-sm text-neutral-500 hover:text-neutral-900">
              View all →
            </Link>
          </div>

          {recentServers.length > 0 ? (
            <>
              <div className="hidden grid-cols-[2fr_2fr_1fr_1fr_72px] gap-4 border-t border-neutral-100 bg-neutral-50 px-5 py-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-400 md:grid">
                <span>Server</span>
                <span>Address</span>
                <span>Rate</span>
                <span>Status</span>
                <span />
              </div>
              {recentServers.map((i) => (
                <ServerRow key={i.id} instance={i} plan={plans?.find((p) => p.id === i.plan_id)} />
              ))}
            </>
          ) : (
            <div className="border-t border-neutral-100 py-10 text-center">
              <p className="text-sm text-neutral-500">No servers yet.</p>
              <div className="mt-3 flex justify-center gap-2">
                <Link
                  to="/deploy/gpu"
                  className="rounded-lg bg-neutral-900 px-3 py-2 text-xs font-semibold text-white hover:bg-neutral-800"
                >
                  Deploy GPU
                </Link>
                <Link
                  to="/deploy/cpu"
                  className="rounded-lg border border-neutral-200 px-3 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
                >
                  Deploy CPU
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
