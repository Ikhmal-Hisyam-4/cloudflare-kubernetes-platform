import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './lib/auth'
import { PublicGuard } from './components/AuthGuard'
import { AppLayout } from './components/AppLayout'
import { LoginPage } from './pages/LoginPage'
import { SignupPage } from './pages/SignupPage'
import { DashboardPage } from './pages/DashboardPage'
import { DeployGpuPage } from './pages/DeployGpuPage'
import { DeployCpuPage } from './pages/DeployCpuPage'
import { ServersPage } from './pages/ServersPage'
import { SecretsPage } from './pages/SecretsPage'
import { DevelopersPage } from './pages/DevelopersPage'
import { AccountPage } from './pages/AccountPage'
import { BillingPage } from './pages/BillingPage'
import { UsagePage } from './pages/UsagePage'
import { InvoicesPage } from './pages/InvoicesPage'

function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* The sign-in form lives at /signin, reached by clicking a "Sign In"
            button. /login is kept as a redirect so old links and browser
            autocomplete land on the public deploy page rather than a bare
            sign-in form. */}
        <Route path="/signin" element={<LoginPage />} />
        <Route path="/login" element={<Navigate to="/deploy/gpu" replace />} />
        <Route path="/signup" element={<SignupPage />} />

        {/* Public preview pages: viewable without signing in, showing demo
            data + a Sign In prompt. Matches design/logout version/*.png. */}
        <Route element={<PublicGuard />}>
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/deploy/gpu" element={<DeployGpuPage />} />
            <Route path="/deploy/cpu" element={<DeployCpuPage />} />
            <Route path="/servers" element={<ServersPage />} />
            <Route path="/secrets" element={<SecretsPage />} />
            <Route path="/billing" element={<BillingPage />} />
            <Route path="/usage" element={<UsagePage />} />
            <Route path="/developers" element={<DevelopersPage />} />
            <Route path="/account" element={<AccountPage />} />
            <Route path="/invoices" element={<InvoicesPage />} />
          </Route>
        </Route>

        <Route path="/" element={<Navigate to="/deploy/gpu" replace />} />
        <Route path="*" element={<Navigate to="/deploy/gpu" replace />} />
      </Routes>
    </AuthProvider>
  )
}

export default App
