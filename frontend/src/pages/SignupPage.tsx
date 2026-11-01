import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { LoginIcon } from '../components/icons'

export function SignupPage() {
  const navigate = useNavigate()
  const { login, isAuthenticated } = useAuth()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      const { data } = await api.post('/auth/signup', {
        email,
        password,
        full_name: fullName,
      })
      login(data.access_token)
      navigate('/dashboard')
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'Could not create account')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white shadow-sm">
        <div className="flex items-center gap-3 border-b border-neutral-100 px-8 py-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-900 text-white">
            <LoginIcon className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-neutral-900">Create your account</h1>
            <p className="text-sm text-neutral-500">Get started with Gpu.kubex</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 px-8 py-6">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-900">Full Name</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ikhmal Hisyam"
              className="w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:border-neutral-400"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-900">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ikhmal@example.com"
              className="w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:border-neutral-400"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-900">Password</label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:border-neutral-400"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-neutral-900 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-60"
          >
            {isSubmitting ? 'Creating account…' : 'Sign Up'}
            {!isSubmitting && <span>→</span>}
          </button>

          <p className="text-center text-sm text-neutral-500">
            Already have an account?{' '}
            <Link to="/signin" className="font-medium text-emerald-600 underline">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
