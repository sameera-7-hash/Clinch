import { lazy, Suspense } from "react"
import { BrowserRouter, Route, Routes } from "react-router-dom"
import { AppLayout } from "@/components/layout/AppLayout"
import { RequireAuth } from "@/components/auth/RequireAuth"
import { SecurityHero } from "@/pages/SecurityHero"

// SecurityHero ("/") stays a static import - it's the page most visitors (and Lighthouse)
// land on first, so it should never wait on a Suspense fallback. Every other route is
// lazy-loaded: none of this code is used on "/", so shipping it in the initial bundle was
// pure dead weight for that load. Pages export named components (not default), so each
// dynamic import is adapted to the { default } shape React.lazy expects.
const About = lazy(() => import("@/pages/About").then((m) => ({ default: m.About })))
const AdaptiveDefense = lazy(() => import("@/pages/AdaptiveDefense").then((m) => ({ default: m.AdaptiveDefense })))
const Analytics = lazy(() => import("@/pages/Analytics").then((m) => ({ default: m.Analytics })))
const BlueTeamAnalysis = lazy(() => import("@/pages/BlueTeamAnalysis").then((m) => ({ default: m.BlueTeamAnalysis })))
const CommandCenter = lazy(() => import("@/pages/CommandCenter").then((m) => ({ default: m.CommandCenter })))
const CommandCenterPreview = lazy(() =>
  import("@/pages/CommandCenterPreview").then((m) => ({ default: m.CommandCenterPreview }))
)
const Dataset = lazy(() => import("@/pages/Dataset").then((m) => ({ default: m.Dataset })))
const RedTeamLab = lazy(() => import("@/pages/RedTeamLab").then((m) => ({ default: m.RedTeamLab })))
const ResetPassword = lazy(() => import("@/pages/ResetPassword").then((m) => ({ default: m.ResetPassword })))
const SignIn = lazy(() => import("@/pages/SignIn").then((m) => ({ default: m.SignIn })))
const Team = lazy(() => import("@/pages/Team").then((m) => ({ default: m.Team })))
const ThreatAnalyzerChat = lazy(() =>
  import("@/pages/ThreatAnalyzerChat").then((m) => ({ default: m.ThreatAnalyzerChat }))
)

export function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={null}>
        <Routes>
          <Route path="/" element={<SecurityHero />} />
          <Route path="/sign-in" element={<SignIn />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/about" element={<About />} />
          <Route path="/preview" element={<CommandCenterPreview />} />
          <Route path="/team" element={<Team />} />
          <Route element={<RequireAuth />}>
            <Route element={<AppLayout />}>
              <Route path="/command-center" element={<CommandCenter />} />
              <Route path="/red-team" element={<RedTeamLab />} />
              <Route path="/blue-team" element={<BlueTeamAnalysis />} />
              <Route path="/adaptive" element={<AdaptiveDefense />} />
              <Route path="/threat-analyzer" element={<ThreatAnalyzerChat />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/dataset" element={<Dataset />} />
            </Route>
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

export default App
