import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { queryKeys } from '../lib/queryKeys'
import { PageHeader } from '../components/PageHeader'
import { CodeIcon } from '../components/icons'
import { useConfirm } from '../lib/useConfirm'
import { useAuth } from '../lib/auth'
import { demoApiKeys } from '../lib/demoData'
import { DemoBanner } from '../components/DemoBanner'
import type { ApiKey, ApiKeyCreated } from '../lib/types'

export function DevelopersPage() {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const confirm = useConfirm()
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [revealedKey, setRevealedKey] = useState<string | null>(null)

  const { data: keyData } = useQuery({
    queryKey: queryKeys.apiKeys,
    queryFn: async () => (await api.get<ApiKey[]>('/api-keys')).data,
    enabled: isAuthenticated,
  })

  const keys = isAuthenticated ? keyData : demoApiKeys

  const createMutation = useMutation({
    mutationFn: async () => (await api.post<ApiKeyCreated>('/api-keys', { name })).data,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.apiKeys })
      setRevealedKey(data.key)
      setShowForm(false)
      setName('')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/api-keys/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.apiKeys }),
  })

  return (
    <div>
      {!isAuthenticated && <DemoBanner />}

      <PageHeader
        icon={<CodeIcon className="h-4 w-4" />}
        title="Developers"
        subtitle="Manage API keys for programmatic access"
        action={
          <button
            onClick={() => (isAuthenticated ? setShowForm((v) => !v) : navigate('/signin'))}
            className="rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800"
          >
            + New API Key
          </button>
        }
      />

      <div className="p-8">
        {revealedKey && (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-5">
            <p className="mb-2 text-sm font-semibold text-amber-900">
              Copy your API key now — it won't be shown again.
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 overflow-x-auto rounded-lg bg-white px-3 py-2 text-xs">
                {revealedKey}
              </code>
              <button
                onClick={() => navigator.clipboard.writeText(revealedKey)}
                className="rounded-lg border border-amber-300 px-3 py-2 text-xs font-medium text-amber-900 hover:bg-amber-100"
              >
                Copy
              </button>
              <button
                onClick={() => setRevealedKey(null)}
                className="rounded-lg border border-amber-300 px-3 py-2 text-xs font-medium text-amber-900 hover:bg-amber-100"
              >
                Done
              </button>
            </div>
          </div>
        )}

        {showForm && (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              createMutation.mutate()
            }}
            className="mb-6 flex items-end gap-3 rounded-xl border border-neutral-200 bg-white p-5"
          >
            <div className="flex-1">
              <label className="mb-1.5 block text-sm font-medium text-neutral-900">
                Key Name
              </label>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. CI pipeline"
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400"
              />
            </div>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white"
            >
              Create
            </button>
          </form>
        )}

        <div className="rounded-xl border border-neutral-200 bg-white">
          {keys && keys.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-100 text-left text-xs text-neutral-400">
                  <th className="px-5 py-3 font-medium">Name</th>
                  <th className="px-5 py-3 font-medium">Last Used</th>
                  <th className="px-5 py-3 font-medium">Created</th>
                  <th className="px-5 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {keys.map((key) => (
                  <tr key={key.id} className="border-b border-neutral-50 last:border-0">
                    <td className="px-5 py-3 font-medium text-neutral-900">{key.name}</td>
                    <td className="px-5 py-3 text-neutral-500">
                      {key.last_used_at
                        ? new Date(key.last_used_at).toLocaleDateString()
                        : 'Never'}
                    </td>
                    <td className="px-5 py-3 text-neutral-500">
                      {new Date(key.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3">
                      <button
                        onClick={async () => {
                          if (!isAuthenticated) return navigate('/signin')
                          const ok = await confirm({
                            title: `Revoke API key "${key.name}"?`,
                            description: 'This cannot be undone.',
                            confirmLabel: 'Revoke',
                          })
                          if (ok) deleteMutation.mutate(key.id)
                        }}
                        className="text-xs font-medium text-red-600 hover:underline"
                      >
                        Revoke
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="p-12 text-center text-sm text-neutral-400">
              No API keys yet. Create one to access the API programmatically.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
