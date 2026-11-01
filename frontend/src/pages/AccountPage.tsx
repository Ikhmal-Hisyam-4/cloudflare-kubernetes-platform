import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { queryKeys } from '../lib/queryKeys'
import { useAuth } from '../lib/auth'
import { formatCents } from '../lib/money'
import { demoBalance, demoUser } from '../lib/demoData'
import { DemoBanner } from '../components/DemoBanner'

export function AccountPage() {
  const { user: realUser, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: balanceData } = useQuery({
    queryKey: queryKeys.balance,
    queryFn: async () => (await api.get<{ balance_cents: number }>('/billing/balance')).data,
    enabled: isAuthenticated,
  })

  const user = isAuthenticated ? realUser : demoUser
  const balance = isAuthenticated ? balanceData : demoBalance

  const [isEditingName, setIsEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState(user?.full_name ?? '')

  const updateNameMutation = useMutation({
    mutationFn: (full_name: string) => api.put('/auth/me', { full_name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.me })
      setIsEditingName(false)
    },
  })

  function startEditing() {
    if (!isAuthenticated) return navigate('/signin')
    setNameDraft(user?.full_name ?? '')
    setIsEditingName(true)
  }

  function saveName() {
    const trimmed = nameDraft.trim()
    if (trimmed) updateNameMutation.mutate(trimmed)
  }

  return (
    <div>
      {!isAuthenticated && <DemoBanner />}

      <div className="flex items-center justify-between border-b border-neutral-200 bg-white px-8 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 text-sm font-semibold text-neutral-700">
            {user?.full_name?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div>
            <h1 className="text-base font-semibold text-neutral-900">{user?.full_name}</h1>
            <p className="text-sm text-neutral-500">Client · Individual</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right text-sm">
            <p className="text-neutral-500">Current Balance</p>
            <p className="font-bold text-neutral-900">
              {formatCents(balance?.balance_cents ?? 0)}
            </p>
          </div>
          <Link
            to="/billing"
            className="rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800"
          >
            Go to Billing
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 p-8 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <div className="rounded-xl border border-neutral-200 bg-white p-6">
            <h2 className="mb-4 text-base font-semibold text-neutral-900">Personal Details</h2>
            <div className="border-b border-neutral-100 pb-4">
              <p className="mb-1 text-xs text-neutral-400">Full Name</p>
              {isEditingName ? (
                <div className="flex items-center gap-2">
                  <input
                    value={nameDraft}
                    onChange={(e) => setNameDraft(e.target.value)}
                    autoFocus
                    className="w-full max-w-xs rounded-lg border border-neutral-200 px-3 py-1.5 text-sm outline-none focus:border-neutral-400"
                  />
                  <button
                    onClick={saveName}
                    disabled={updateNameMutation.isPending || !nameDraft.trim()}
                    className="text-sm font-medium text-emerald-600 hover:underline disabled:opacity-40"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setIsEditingName(false)}
                    className="text-sm font-medium text-neutral-500 hover:underline"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <p className="font-medium text-neutral-900">{user?.full_name}</p>
                  <button
                    onClick={startEditing}
                    className="text-sm font-medium text-emerald-600 hover:underline"
                  >
                    Edit
                  </button>
                </div>
              )}
              {updateNameMutation.isError && (
                <p className="mt-1 text-xs text-red-600">Failed to update name. Try again.</p>
              )}
            </div>
            <div className="flex items-center justify-between py-4">
              <div>
                <p className="text-xs text-neutral-400">Email Address</p>
                <p className="font-medium text-neutral-900">{user?.email}</p>
              </div>
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                Verified
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-6">
            <h2 className="mb-4 text-base font-semibold text-neutral-900">Account Security</h2>
            <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
              <div>
                <p className="text-sm font-medium text-neutral-900">Password</p>
                <p className="text-xs text-neutral-400">Keep your account secure</p>
              </div>
              <button
                onClick={() => !isAuthenticated && navigate('/signin')}
                className="text-sm font-medium text-emerald-600 hover:underline"
              >
                Change
              </button>
            </div>
            <div className="flex items-center justify-between pt-4">
              <div>
                <p className="text-sm font-medium text-neutral-900">Two-Factor Authentication</p>
                <p className="text-xs text-neutral-400">Not enabled</p>
              </div>
              <button
                onClick={() => !isAuthenticated && navigate('/signin')}
                className="text-sm font-medium text-emerald-600 hover:underline"
              >
                Enable
              </button>
            </div>
          </div>
        </div>

        <div className="h-fit space-y-6">
          <div className="rounded-xl border border-neutral-200 bg-white p-6">
            <h2 className="mb-3 text-base font-semibold text-neutral-900">Quick Actions</h2>
            <div className="space-y-2">
              <Link
                to="/secrets"
                className="block rounded-lg border border-neutral-200 px-4 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
              >
                Go to Secrets
              </Link>
              <Link
                to="/developers"
                className="block rounded-lg border border-neutral-200 px-4 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
              >
                Go to Developers
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
