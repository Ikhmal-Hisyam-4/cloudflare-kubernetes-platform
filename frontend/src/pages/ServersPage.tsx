import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { queryKeys } from '../lib/queryKeys'
import { formatRateCents } from '../lib/money'
import { useAuth } from '../lib/auth'
import { demoDashboardSummary, demoInstances } from '../lib/demoData'
import { DemoBanner } from '../components/DemoBanner'
import { ServerIcon, SearchIcon, GridIcon, ListIcon, ChevronDownIcon, ActivityIcon, SortIcon } from '../components/icons'
import { useConfirm } from '../lib/useConfirm'
import type { DashboardSummary, Instance, InstanceStatus } from '../lib/types'

const statusColors: Record<string, string> = {
  running: 'text-emerald-600',
  stopped: 'text-neutral-400',
  provisioning: 'text-amber-500',
  terminated: 'text-red-400',
}

const statusDot: Record<string, string> = {
  running: 'bg-emerald-500',
  stopped: 'bg-neutral-300',
  provisioning: 'bg-amber-400',
  terminated: 'bg-red-300',
}

const STATUS_OPTIONS: { label: string; value: InstanceStatus | 'all' }[] = [
  { label: 'All Status', value: 'all' },
  { label: 'Running', value: 'running' },
  { label: 'Stopped', value: 'stopped' },
  { label: 'Provisioning', value: 'provisioning' },
]

const COMPUTE_OPTIONS: { label: string; value: 'all' | 'gpu' | 'cpu' }[] = [
  { label: 'All Compute', value: 'all' },
  { label: 'GPU', value: 'gpu' },
  { label: 'CPU', value: 'cpu' },
]

const SORT_OPTIONS: { label: string; value: 'newest' | 'oldest' | 'name' }[] = [
  { label: 'Created (Newest)', value: 'newest' },
  { label: 'Created (Oldest)', value: 'oldest' },
  { label: 'Name (A-Z)', value: 'name' },
]

function Dropdown<T extends string>({
  icon,
  value,
  options,
  onChange,
}: {
  icon: React.ReactNode
  value: T
  options: { label: string; value: T }[]
  onChange: (v: T) => void
}) {
  const current = options.find((o) => o.value === value)
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="peer appearance-none rounded-lg border border-neutral-200 bg-white py-2 pl-9 pr-8 text-sm font-medium text-neutral-700 outline-none focus:border-neutral-400"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400">
        {icon}
      </span>
      <ChevronDownIcon className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
      <span className="sr-only">{current?.label}</span>
    </div>
  )
}

function InstanceCard({ instance }: { instance: Instance }) {
  const queryClient = useQueryClient()
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()

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
  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/instances/${instance.id}`),
    onSuccess: invalidate,
  })

  const confirm = useConfirm()

  async function handleDelete() {
    const ok = await confirm({
      title: `Terminate "${instance.name}"?`,
      description: 'This cannot be undone.',
      confirmLabel: 'Terminate',
    })
    if (ok) deleteMutation.mutate()
  }

  const rate =
    instance.status === 'running' ? instance.rate_running_cents : instance.rate_stopped_cents

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5">
      <div className="mb-3 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-100 text-sm font-semibold text-neutral-700">
            {instance.name[0]?.toUpperCase()}
          </span>
          <div>
            <p className="font-semibold text-neutral-900">{instance.name}</p>
            <p className="text-xs text-neutral-400">{instance.os_image}</p>
          </div>
        </div>
        <span
          className={`flex items-center gap-1.5 text-xs font-medium ${statusColors[instance.status]}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${statusDot[instance.status]}`} />
          {instance.status[0].toUpperCase() + instance.status.slice(1)}
        </span>
      </div>

      <p className="mb-1 text-sm text-neutral-500">
        {instance.storage_gb} GB storage
        {instance.ip_address && ` · ${instance.ip_address}`}
      </p>
      {instance.dns_name && <p className="mb-1 truncate text-xs text-neutral-400">{instance.dns_name}</p>}
      {(instance.gpu_model || instance.location) && (
        <p className="mb-3 text-xs text-neutral-400">
          {[instance.gpu_model, instance.location].filter(Boolean).join(' · ')}
        </p>
      )}

      <div className="flex items-center justify-between border-t border-neutral-100 pt-3">
        <p className="text-sm font-semibold text-neutral-900">{formatRateCents(rate)}/hr</p>
        {isAuthenticated ? (
          <div className="flex gap-2">
            {instance.status === 'stopped' && (
              <button
                onClick={() => startMutation.mutate()}
                disabled={startMutation.isPending}
                className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
              >
                Start
              </button>
            )}
            {instance.status === 'running' && (
              <button
                onClick={() => stopMutation.mutate()}
                disabled={stopMutation.isPending}
                className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
              >
                Stop
              </button>
            )}
            {instance.status !== 'terminated' && (
              <button
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
              >
                Delete
              </button>
            )}
          </div>
        ) : (
          <button
            onClick={() => navigate('/signin')}
            className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-400"
          >
            Sign in to manage
          </button>
        )}
      </div>
    </div>
  )
}

function InstanceRow({ instance }: { instance: Instance }) {
  const queryClient = useQueryClient()
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()

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
  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/instances/${instance.id}`),
    onSuccess: invalidate,
  })

  const confirm = useConfirm()

  async function handleDelete() {
    const ok = await confirm({
      title: `Terminate "${instance.name}"?`,
      description: 'This cannot be undone.',
      confirmLabel: 'Terminate',
    })
    if (ok) deleteMutation.mutate()
  }

  const rate =
    instance.status === 'running' ? instance.rate_running_cents : instance.rate_stopped_cents

  return (
    <div className="flex items-center justify-between gap-4 border-b border-neutral-100 px-5 py-3 last:border-b-0">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-sm font-semibold text-neutral-700">
          {instance.name[0]?.toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="truncate font-semibold text-neutral-900">{instance.name}</p>
          <p className="truncate text-xs text-neutral-400">
            {instance.os_image}
            {instance.ip_address && ` · ${instance.ip_address}`}
            {instance.location && ` · ${instance.location}`}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-6">
        <span
          className={`flex items-center gap-1.5 text-xs font-medium ${statusColors[instance.status]}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${statusDot[instance.status]}`} />
          {instance.status[0].toUpperCase() + instance.status.slice(1)}
        </span>
        <p className="w-20 text-right text-sm font-semibold text-neutral-900">
          {formatRateCents(rate)}/hr
        </p>
        {isAuthenticated ? (
          <div className="flex gap-2">
            {instance.status === 'stopped' && (
              <button
                onClick={() => startMutation.mutate()}
                disabled={startMutation.isPending}
                className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
              >
                Start
              </button>
            )}
            {instance.status === 'running' && (
              <button
                onClick={() => stopMutation.mutate()}
                disabled={stopMutation.isPending}
                className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
              >
                Stop
              </button>
            )}
            {instance.status !== 'terminated' && (
              <button
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
              >
                Delete
              </button>
            )}
          </div>
        ) : (
          <button
            onClick={() => navigate('/signin')}
            className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-400"
          >
            Sign in to manage
          </button>
        )}
      </div>
    </div>
  )
}

export function ServersPage() {
  const { isAuthenticated } = useAuth()
  const [search, setSearch] = useState('')
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [statusFilter, setStatusFilter] = useState<InstanceStatus | 'all'>('all')
  const [computeFilter, setComputeFilter] = useState<'all' | 'gpu' | 'cpu'>('all')
  const [sort, setSort] = useState<'newest' | 'oldest' | 'name'>('newest')

  const { data: instances } = useQuery({
    queryKey: queryKeys.instances,
    queryFn: async () => (await api.get<Instance[]>('/instances')).data,
    enabled: isAuthenticated,
    refetchInterval: (query) => {
      const data = query.state.data as Instance[] | undefined
      const hasProvisioning = data?.some((i) => i.status === 'provisioning')
      return hasProvisioning ? 2000 : false
    },
  })

  // Server-side total (compute + storage), the same amount the billing job charges and the Dashboard shows.
  const { data: summary } = useQuery({
    queryKey: queryKeys.dashboardSummary,
    queryFn: async () => (await api.get<DashboardSummary>('/dashboard/summary')).data,
    enabled: isAuthenticated,
  })

  const visible = (isAuthenticated ? instances : demoInstances)?.filter(
    (i) => i.status !== 'terminated',
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    let result =
      visible?.filter((i) => {
        const matchesSearch =
          !q ||
          i.name.toLowerCase().includes(q) ||
          i.ip_address?.toLowerCase().includes(q) ||
          i.location?.toLowerCase().includes(q) ||
          i.gpu_model?.toLowerCase().includes(q)
        const matchesStatus = statusFilter === 'all' || i.status === statusFilter
        const matchesCompute = computeFilter === 'all' || i.compute_type === computeFilter
        return matchesSearch && matchesStatus && matchesCompute
      }) ?? []

    result = [...result].sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name)
      const diff = new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      return sort === 'newest' ? diff : -diff
    })

    return result
  }, [visible, search, statusFilter, computeFilter, sort])

  const running = visible?.filter((i) => i.status === 'running').length ?? 0
  const stopped = visible?.filter((i) => i.status === 'stopped').length ?? 0
  const totalCostPerHour =
    ((isAuthenticated ? summary : demoDashboardSummary)?.hourly_cost_cents ?? 0) / 100

  return (
    <div>
      {!isAuthenticated && <DemoBanner />}

      <div className="flex items-center justify-between border-b border-neutral-200 bg-white px-8 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-900 text-white">
            <ServerIcon className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-neutral-900">My Servers</h1>
            <p className="text-sm text-neutral-500">Manage and monitor your virtual machines</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right text-sm">
            <p className="text-neutral-500">Total Instances</p>
            <p className="text-lg font-bold text-neutral-900">{visible?.length ?? 0}</p>
          </div>
          <Link
            to="/deploy/gpu"
            className="flex items-center gap-2 rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800"
          >
            <ServerIcon className="h-4 w-4" />
            Deploy New
          </Link>
        </div>
      </div>

      <div className="p-8">
        <div className="mb-6 grid grid-cols-2 gap-4 rounded-xl border border-neutral-200 bg-white p-5 sm:grid-cols-4">
          <div>
            <p className="text-sm text-neutral-500">Total Servers</p>
            <p className="text-xl font-bold text-neutral-900">{visible?.length ?? 0}</p>
          </div>
          <div>
            <p className="text-sm text-neutral-500">Running</p>
            <p className="text-xl font-bold text-neutral-900">{running}</p>
          </div>
          <div>
            <p className="text-sm text-neutral-500">Stopped</p>
            <p className="text-xl font-bold text-neutral-900">{stopped}</p>
          </div>
          <div>
            <p className="text-sm text-neutral-500">Total Cost/hr</p>
            <p className="text-xl font-bold text-neutral-900">${totalCostPerHour.toFixed(3)}</p>
          </div>
        </div>

        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search servers by name, IP, location, GPU model..."
              className="w-full rounded-lg border border-neutral-200 py-2.5 pl-9 pr-4 text-sm outline-none focus:border-neutral-400"
            />
          </div>
          <div className="flex shrink-0 items-center gap-1 rounded-lg border border-neutral-200 bg-white p-1">
            <button
              onClick={() => setView('grid')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition ${
                view === 'grid' ? 'bg-neutral-900 text-white' : 'text-neutral-500 hover:bg-neutral-50'
              }`}
            >
              <GridIcon className="h-3.5 w-3.5" />
              Grid
            </button>
            <button
              onClick={() => setView('list')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition ${
                view === 'list' ? 'bg-neutral-900 text-white' : 'text-neutral-500 hover:bg-neutral-50'
              }`}
            >
              <ListIcon className="h-3.5 w-3.5" />
              List
            </button>
          </div>
        </div>

        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <Dropdown
              icon={<ActivityIcon className="h-3.5 w-3.5" />}
              value={statusFilter}
              options={STATUS_OPTIONS}
              onChange={setStatusFilter}
            />
            <Dropdown
              icon={<ServerIcon className="h-3.5 w-3.5" />}
              value={computeFilter}
              options={COMPUTE_OPTIONS}
              onChange={setComputeFilter}
            />
            <Dropdown
              icon={<SortIcon className="h-3.5 w-3.5" />}
              value={sort}
              options={SORT_OPTIONS}
              onChange={setSort}
            />
          </div>
          <p className="text-sm text-neutral-400">{filtered.length} results</p>
        </div>

        {filtered.length > 0 ? (
          view === 'grid' ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filtered.map((instance) => (
                <InstanceCard key={instance.id} instance={instance} />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-neutral-200 bg-white">
              {filtered.map((instance) => (
                <InstanceRow key={instance.id} instance={instance} />
              ))}
            </div>
          )
        ) : (
          <div className="flex flex-col items-center rounded-xl border border-neutral-200 bg-white p-16 text-center">
            <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 text-neutral-300">
              <ServerIcon className="h-6 w-6" />
            </span>
            <p className="mb-1 text-base font-semibold text-neutral-900">
              {visible?.length ? 'No servers found' : 'No servers deployed yet'}
            </p>
            <p className="mb-5 text-sm text-neutral-500">
              {visible?.length
                ? 'Try adjusting your search or filters.'
                : 'Get started by deploying your first virtual machine to see it here.'}
            </p>
            {!visible?.length && (
              <Link
                to="/deploy/gpu"
                className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                Deploy Server
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
