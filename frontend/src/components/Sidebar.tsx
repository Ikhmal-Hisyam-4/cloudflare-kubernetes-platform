import { useState, type ComponentType } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import {
  CardIcon,
  ChartIcon,
  ChevronDownIcon,
  CodeIcon,
  CpuIcon,
  DocumentIcon,
  GridIcon,
  LockIcon,
  ServerIcon,
  SettingsIcon,
  SignOutIcon,
  StarIcon,
  UserIcon,
} from './icons'

type NavLinkItem = { to: string; label: string; Icon: ComponentType<{ className?: string }> }

const deploymentLinks: NavLinkItem[] = [
  { to: '/deploy/gpu', label: 'Deploy GPU', Icon: StarIcon },
  { to: '/deploy/cpu', label: 'Deploy CPU', Icon: CpuIcon },
]

const managementLinks: NavLinkItem[] = [
  { to: '/dashboard', label: 'Dashboard', Icon: GridIcon },
  { to: '/servers', label: 'My Servers', Icon: ServerIcon },
  { to: '/secrets', label: 'Secrets', Icon: LockIcon },
  { to: '/account', label: 'Personal Details', Icon: UserIcon },
  { to: '/developers', label: 'Developers', Icon: CodeIcon },
]

const billingLinks: NavLinkItem[] = [
  { to: '/billing', label: 'Billing', Icon: CardIcon },
  { to: '/usage', label: 'Usage', Icon: ChartIcon },
  { to: '/invoices', label: 'Monthly Invoice', Icon: DocumentIcon },
]

function NavSection({ title, links }: { title?: string; links: NavLinkItem[] }) {
  const [expanded, setExpanded] = useState(true)

  return (
    <div className="mb-6">
      {title && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="mb-2 flex w-full items-center gap-2 rounded-lg px-3 py-1 text-xs font-semibold tracking-wide text-neutral-900 uppercase hover:bg-neutral-100"
        >
          <span className="flex-1 text-left">{title}</span>
          <ChevronDownIcon
            className={`h-3.5 w-3.5 shrink-0 transition-transform ${expanded ? '' : '-rotate-90'}`}
          />
        </button>
      )}
      {expanded && (
        <nav className="flex flex-col gap-0.5">
          {links.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-neutral-900 text-white'
                    : 'text-neutral-700 hover:bg-neutral-100'
                }`
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>
      )}
    </div>
  )
}

export function Sidebar() {
  const { user, isAuthenticated, logout } = useAuth()
  const navigate = useNavigate()

  return (
    <aside className="flex h-screen w-[280px] flex-col justify-between border-r border-neutral-200 bg-white px-4 py-5">
      <div>
        <div className="mb-8 flex items-center justify-between px-1">
          <span className="text-lg font-bold">
            <span className="text-emerald-600">Gpu</span>
            <span className="text-neutral-900">.kubex</span>
          </span>
        </div>

        <NavSection title="Deployment" links={deploymentLinks} />
        <NavSection title="Management" links={managementLinks} />
        <NavSection title="Billing" links={billingLinks} />
      </div>

      {isAuthenticated ? (
        <div className="flex items-center justify-between gap-2 rounded-full border border-neutral-200 py-1.5 pl-1.5 pr-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-xs font-semibold text-white">
              {user?.full_name?.[0]?.toUpperCase() ?? '?'}
            </span>
            <span className="truncate text-sm text-neutral-600">{user?.email}</span>
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
            <button
              onClick={() => navigate('/account')}
              aria-label="Settings"
              title="Settings"
              className="flex h-7 w-7 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
            >
              <SettingsIcon className="h-4 w-4" />
            </button>
            <button
              onClick={logout}
              aria-label="Sign out"
              title="Sign out"
              className="flex h-7 w-7 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
            >
              <SignOutIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-neutral-200 p-4 text-center">
          <span className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-neutral-100 text-neutral-400">
            <UserIcon className="h-5 w-5" />
          </span>
          <p className="text-sm font-semibold text-neutral-900">Welcome to Kubex</p>
          <p className="mb-3 text-xs text-neutral-500">Sign in to get started</p>
          <button
            onClick={() => navigate('/signin')}
            className="w-full rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800"
          >
            Sign In
          </button>
        </div>
      )}
    </aside>
  )
}
