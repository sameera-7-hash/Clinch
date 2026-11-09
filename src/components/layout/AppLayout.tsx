import { useEffect, useState } from "react"
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom"
import { AnimatePresence, motion } from "framer-motion"
import { Activity, Bot, Crosshair, Database, LogOut, MessageSquareText, Radar, ShieldCheck, TerminalSquare, TrendingUp } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { CyberGrid } from "@/components/motion/CyberGrid"
import { RedTeamSyncProvider } from "@/contexts/RedTeamSyncContext"
import { signOut } from "@/lib/auth"
import { cn } from "@/lib/utils"

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]
const pad = (n: number) => n.toString().padStart(2, "0")

function useUtcClock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [])
  const date = `${MONTHS[now.getUTCMonth()]} ${pad(now.getUTCDate())}, ${now.getUTCFullYear()}`
  const time = `${pad(now.getUTCHours())}:${pad(now.getUTCMinutes())}:${pad(now.getUTCSeconds())}`
  return `${date} // ${time} UTC`
}

const navigation = [
  { label: "Command Center", to: "/command-center", icon: Radar },
  { label: "Red Team Lab", to: "/red-team", icon: Crosshair },
  { label: "Blue Team Analysis", to: "/blue-team", icon: ShieldCheck },
  { label: "Adaptive Defense", to: "/adaptive", icon: Activity },
  { label: "Threat Analyzer", to: "/threat-analyzer", icon: MessageSquareText },
  { label: "Analytics", to: "/analytics", icon: TrendingUp },
  { label: "Dataset", to: "/dataset", icon: Database },
]

function Navigation({ compact = false }: { compact?: boolean }) {
  return <nav className={compact ? "flex shrink-0 gap-1" : "space-y-1"}>
  {navigation.map(({ label, to, icon: Icon }) => <NavLink key={to} to={to} end={to === "/command-center"} className={({ isActive }) => cn(compact ? "flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-2 font-mono text-[10px] uppercase tracking-wider transition-colors" : "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all", isActive ? compact ? "bg-indigo-500/15 text-indigo-300" : "bg-gradient-to-r from-indigo-500/15 via-indigo-500/8 to-transparent text-white shadow-[inset_0_0_0_1px_rgba(129,140,248,0.22)]" : compact ? "text-slate-500 hover:text-slate-300" : "text-slate-500 hover:bg-white/5 hover:text-slate-200")}>{({ isActive }) => <>{!compact && <span className={cn("absolute inset-y-1.5 left-0 w-0.5 rounded-full transition-colors", isActive ? "bg-indigo-400" : "bg-transparent")} />}<Icon className={cn(compact ? "size-3.5" : "size-4", "transition-colors", isActive ? "text-indigo-300" : compact ? "text-slate-600" : "text-slate-600 group-hover:text-slate-300")} /><span>{label}</span>{!compact && label === "Command Center" && <span className="ml-auto flex size-1.5 rounded-full bg-emerald-400 status-pulse text-emerald-400" />}</>}</NavLink>)}
  </nav>
}

export function AppLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const activePage = navigation.find(({ to }) => to === location.pathname)?.label ?? "Command Center"
  const clock = useUtcClock()

  const handleLogout = async () => {
    await signOut().catch(() => undefined)
    navigate("/", { replace: true })
  }

  return <RedTeamSyncProvider><div className="dashboard-shell min-h-svh bg-[#0a0a0f] text-[#e4e4e7]">
    <CyberGrid className="cyber-grid-bg" />
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col overflow-hidden border-r border-white/10 bg-[#111118] lg:flex">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 bg-gradient-to-b from-indigo-500/10 via-transparent to-transparent" />
      <Link to="/command-center" className="group flex h-20 items-center gap-3 px-6 transition-colors hover:bg-white/5">
        <div className="flex size-9 items-center justify-center rounded-xl border border-indigo-400/30 bg-gradient-to-br from-indigo-500/25 to-indigo-500/5 text-indigo-300 shadow-[0_0_20px_-6px_rgba(129,140,248,0.55)] transition-colors group-hover:border-indigo-400/60 group-hover:bg-indigo-500/20">
          <TerminalSquare className="size-5" />
        </div>
        <div>
          <p className="font-mono text-sm font-bold tracking-[0.18em] text-white">CLINCH</p>
          <p className="font-mono text-[10px] uppercase tracking-[0.26em] text-zinc-500">AI DEFENSE GRID</p>
        </div>
      </Link>
      <Separator className="bg-slate-800/80" />
      <div className="flex flex-1 flex-col px-4 py-6">
        <p className="mb-3 px-3 font-mono text-[10px] uppercase tracking-[0.2em] text-slate-600">Operations</p>
        <Navigation />
        <div className="my-4 h-px bg-white/5" />
        <button
          type="button"
          onClick={() => void handleLogout()}
          title="Log out"
          className="flex size-8 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-red-500/10 hover:text-red-400"
        >
          <LogOut className="size-4" />
        </button>
      </div>
      <div className="mt-auto p-4">
        <div className="rounded-2xl bg-gradient-to-br from-indigo-500/25 via-white/5 to-transparent p-px">
          <div className="rounded-[15px] bg-[#15151c] p-4">
            <div className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.15em] text-emerald-400"><span className="flex size-1.5 rounded-full bg-emerald-400 status-pulse text-emerald-400" /><Bot className="size-3.5" /> System online</div>
            <p className="font-mono text-[11px] leading-relaxed text-zinc-500">Autonomous agents are monitoring live simulation traffic.</p>
          </div>
        </div>
      </div>
    </aside>
    <main className="lg:pl-64">
      <header className="sticky top-4 z-10 mx-4 mt-4 flex flex-col items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-4 shadow-[0_20px_50px_-24px_rgba(79,70,229,0.4)] backdrop-blur-xl sm:mx-6 sm:min-h-20 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5 lg:mx-10 lg:px-8">
        <div><p className="font-mono text-[10px] uppercase tracking-[0.22em] text-indigo-300">SOC / SIMULATION MODE</p><h1 className="mt-1 text-2xl tracking-tight text-white">{activePage}</h1></div>
        <div className="flex items-center gap-3 font-mono text-[11px] text-zinc-500">
          <span className="hidden sm:inline tabular-nums">{clock}</span>
          <span className="flex items-center gap-2.5 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-3 py-1.5 text-emerald-400"><span className="flex size-2 shrink-0 rounded-full bg-emerald-400 status-pulse text-emerald-400" /><span className="whitespace-nowrap">All systems nominal</span></span>
        </div>
      </header>
      <div className="mt-3 flex items-center gap-2 px-4 lg:hidden">
        <div
          className="min-w-0 flex-1 overflow-x-auto rounded-full border border-white/10 bg-white/[0.04] px-1.5 py-1 backdrop-blur-xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{ maskImage: "linear-gradient(to right, transparent, black 16px, black calc(100% - 16px), transparent)", WebkitMaskImage: "linear-gradient(to right, transparent, black 16px, black calc(100% - 16px), transparent)" }}
        >
          <Navigation compact />
        </div>
        <button
          type="button"
          onClick={() => void handleLogout()}
          title="Log out"
          className="flex size-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-slate-500 transition-colors hover:text-red-400"
        >
          <LogOut className="size-4" />
        </button>
      </div>
      <div className="mx-auto max-w-360 overflow-hidden p-5 lg:p-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </div>
    </main>
  </div></RedTeamSyncProvider>
}
