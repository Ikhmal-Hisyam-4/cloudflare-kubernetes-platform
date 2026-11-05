import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { queryKeys } from '../lib/queryKeys'
import { formatRateCents } from '../lib/money'
import { useAuth } from '../lib/auth'
import { CpuIcon, StarIcon } from './icons'
import type { OsImage, Plan } from '../lib/types'

const HOURS_PER_MONTH = 730

export function DeployWizard({ type }: { type: 'gpu' | 'cpu' }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { isAuthenticated } = useAuth()

  const [step, setStep] = useState(1)
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null)
  const [instanceName, setInstanceName] = useState('')
  const [osImage, setOsImage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const { data: plans } = useQuery({
    queryKey: queryKeys.plans(type),
    queryFn: async () => (await api.get<Plan[]>(`/plans?type=${type}`)).data,
  })

  const { data: osImages } = useQuery({
    queryKey: queryKeys.osImages,
    queryFn: async () => (await api.get<OsImage[]>('/os-images')).data,
  })

  const deployMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPlanId || !osImage) return
      return (
        await api.post('/instances', {
          plan_id: selectedPlanId,
          name: instanceName.trim(),
          os_image: osImage,
        })
      ).data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.instances })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboardSummary })
      navigate('/servers')
    },
    onError: (err: any) => {
      setError(err?.response?.data?.detail ?? 'Deployment failed')
    },
  })

  const selectedPlan = plans?.find((p) => p.id === selectedPlanId)
  const stepLabel = type === 'gpu' ? 'Select GPU' : 'Select CPU Plan'
  const title = type === 'gpu' ? 'GPU Deployment' : 'CPU Deployment'
  const Icon = type === 'gpu' ? StarIcon : CpuIcon

  const runningMonthly = selectedPlan
    ? (selectedPlan.rate_running_cents * HOURS_PER_MONTH) / 100
    : 0
  const stoppedMonthly = selectedPlan
    ? (selectedPlan.rate_stopped_cents * HOURS_PER_MONTH) / 100
    : 0

  return (
    <div>
      <div className="flex items-center justify-between border-b border-neutral-200 bg-white px-8 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-900 text-white">
            <Icon className="h-4 w-4" />
          </div>
          <h1 className="text-base font-semibold text-neutral-900">{title}</h1>
        </div>
        <div className="flex items-center gap-2 text-sm">
          {[
            { n: 1, label: stepLabel },
            { n: 2, label: 'Select Resources' },
            { n: 3, label: 'Select OS' },
          ].map((s, i) => (
            <div key={s.n} className="flex items-center gap-2">
              {i > 0 && <span className="text-neutral-300">›</span>}
              <span
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 font-medium ${
                  step === s.n
                    ? 'bg-neutral-900 text-white'
                    : step > s.n
                      ? 'text-neutral-500'
                      : 'text-neutral-400'
                }`}
              >
                <span
                  className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] ${
                    step === s.n ? 'bg-white text-neutral-900' : 'bg-neutral-200'
                  }`}
                >
                  {s.n}
                </span>
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 p-8 lg:grid-cols-[1fr_380px]">
        <div className="rounded-xl border border-neutral-200 bg-white p-6">
          {step === 1 && (
            <div>
              <h2 className="mb-1 text-base font-semibold text-neutral-900">
                {type === 'gpu' ? 'Select GPU Model' : 'Select CPU Plan'}
              </h2>
              <p className="mb-5 text-sm text-neutral-500">
                Choose the {type === 'gpu' ? 'GPU' : 'CPU plan'} that best fits your workload
                requirements
              </p>
              <div className="space-y-3">
                {plans?.map((plan) => (
                  <button
                    key={plan.id}
                    onClick={() => setSelectedPlanId(plan.id)}
                    className={`flex w-full items-center justify-between rounded-xl border p-4 text-left transition ${
                      selectedPlanId === plan.id
                        ? 'border-emerald-400 bg-emerald-50'
                        : 'border-neutral-200 hover:border-neutral-300'
                    }`}
                  >
                    <div>
                      <p className="font-semibold text-neutral-900">{plan.name}</p>
                      <p className="text-sm text-neutral-500">
                        {type === 'gpu'
                          ? `${plan.gpu_model} · ${plan.vcpu} vCPU · ${plan.ram_gb} GB RAM`
                          : `${plan.vcpu} vCPU · ${plan.ram_gb} GB RAM · ${plan.storage_gb} GB NVMe`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-neutral-900">
                        {formatRateCents(plan.rate_running_cents)}
                        <span className="text-sm font-normal text-neutral-400">/hr</span>
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="mb-1 text-base font-semibold text-neutral-900">Select Resources</h2>
              <p className="mb-5 text-sm text-neutral-500">Name your instance</p>
              <label className="mb-1.5 block text-sm font-medium text-neutral-900">
                Instance Name
              </label>
              <input
                value={instanceName}
                onChange={(e) => setInstanceName(e.target.value)}
                className="w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:border-neutral-400"
              />
              {selectedPlan && (
                <div className="mt-5 flex flex-wrap gap-2">
                  <span className="rounded-full bg-neutral-100 px-3 py-1.5 text-xs font-medium">
                    {selectedPlan.vcpu} vCPU
                  </span>
                  <span className="rounded-full bg-neutral-100 px-3 py-1.5 text-xs font-medium">
                    {selectedPlan.ram_gb} GB RAM
                  </span>
                  <span className="rounded-full bg-neutral-100 px-3 py-1.5 text-xs font-medium">
                    {selectedPlan.storage_gb} GB Storage
                  </span>
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div>
              <h2 className="mb-1 text-base font-semibold text-neutral-900">Select OS</h2>
              <p className="mb-5 text-sm text-neutral-500">Choose an operating system image</p>
              <div className="space-y-2">
                {osImages?.map((img) => (
                  <button
                    key={img.id}
                    onClick={() => setOsImage(img.name)}
                    className={`flex w-full items-center justify-between rounded-lg border p-3 text-left text-sm transition ${
                      osImage === img.name
                        ? 'border-emerald-400 bg-emerald-50'
                        : 'border-neutral-200 hover:border-neutral-300'
                    }`}
                  >
                    {img.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

          <div className="mt-6 flex justify-between">
            <button
              onClick={() => setStep((s) => Math.max(1, s - 1))}
              disabled={step === 1}
              className="rounded-lg border border-neutral-200 px-4 py-2.5 text-sm font-medium text-neutral-700 disabled:opacity-40"
            >
              Back
            </button>
            {step < 3 ? (
              <button
                onClick={() => setStep((s) => s + 1)}
                disabled={(step === 1 && !selectedPlanId) || (step === 2 && !instanceName.trim())}
                className="rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
              >
                Continue
              </button>
            ) : isAuthenticated ? (
              <button
                onClick={() => deployMutation.mutate()}
                disabled={!osImage || deployMutation.isPending}
                className="rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
              >
                {deployMutation.isPending ? 'Deploying…' : 'Deploy Instance'}
              </button>
            ) : (
              <button
                onClick={() => navigate('/signin')}
                className="rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white"
              >
                Sign In to Deploy
              </button>
            )}
          </div>
        </div>

        <div className="h-fit space-y-4">
          {!isAuthenticated && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-semibold text-red-700">⚠ Authentication Required</p>
              <p className="mt-0.5 text-sm text-red-600">
                You must be logged in to deploy a virtual machine.
              </p>
            </div>
          )}
          <div className="rounded-xl border border-neutral-200 bg-white p-6">
            <h2 className="mb-1 text-base font-semibold text-neutral-900">Deployment Summary</h2>
          <p className="mb-5 text-sm text-neutral-500">Review your configuration</p>

          <dl className="space-y-3 text-sm">
            <div className="flex justify-between border-b border-neutral-100 pb-3">
              <dt className="text-neutral-500">Instance Name</dt>
              <dd className="font-medium text-neutral-900">{instanceName.trim() || '—'}</dd>
            </div>
            <div className="flex justify-between border-b border-neutral-100 pb-3">
              <dt className="text-neutral-500">{type === 'gpu' ? 'GPU Model' : 'CPU Plan'}</dt>
              <dd className="font-medium text-neutral-900">{selectedPlan?.name ?? '—'}</dd>
            </div>
            <div className="flex justify-between pb-3">
              <dt className="text-neutral-500">Operating System</dt>
              <dd className="font-medium text-neutral-900">{osImage ?? 'Select an OS image'}</dd>
            </div>
          </dl>

          {selectedPlan && (
            <div className="mt-4 space-y-3 border-t border-neutral-100 pt-4">
              <div className="flex items-center justify-between rounded-lg bg-neutral-50 p-3">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <div>
                    <p className="text-sm font-medium text-neutral-900">Running</p>
                    <p className="text-xs text-neutral-400">Monthly est.</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-neutral-900">
                    {formatRateCents(selectedPlan.rate_running_cents)}/hr
                  </p>
                  <p className="text-xs text-neutral-400">${runningMonthly.toFixed(2)}/mo</p>
                </div>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-neutral-50 p-3">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-neutral-300" />
                  <div>
                    <p className="text-sm font-medium text-neutral-900">Stopped</p>
                    <p className="text-xs text-neutral-400">Monthly est.</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-neutral-900">
                    {formatRateCents(selectedPlan.rate_stopped_cents)}/hr
                  </p>
                  <p className="text-xs text-neutral-400">${stoppedMonthly.toFixed(2)}/mo</p>
                </div>
              </div>
              <p className="text-center text-xs text-neutral-400">
                Billed hourly · Monthly estimates based on 730 hours
              </p>
            </div>
          )}

          {!isAuthenticated && (
            <button
              onClick={() => navigate('/signin')}
              className="mt-5 w-full rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800"
            >
              Sign In to Continue
            </button>
          )}
          </div>
        </div>
      </div>
    </div>
  )
}
