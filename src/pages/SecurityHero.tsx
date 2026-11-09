import { Fragment, useEffect, useRef, useState } from "react"
import type { CSSProperties } from "react"
import { Link, useNavigate } from "react-router-dom"
import { motion, useScroll, useSpring, useTransform } from "framer-motion"
import {
  ArrowRight,
  Bot,
  Check,
  ChevronRight,
  Gavel,
  GitBranch,
  MessageSquareText,
  RefreshCw,
  ScanSearch,
  ShieldAlert,
  ShieldCheck,
  ShieldHalf,
  Swords,
  TrendingUp,
  X,
} from "lucide-react"
import { CartesianGrid, Line, LineChart, ResponsiveContainer, XAxis, YAxis } from "recharts"
import { getAnalyticsData } from "@/api/analytics"
import { Badge } from "@/components/ui/badge"
import { Reveal, RevealItem, RevealStagger } from "@/components/motion/Reveal"
import { TypingText } from "@/components/motion/TypingText"
import { getCurrentUser } from "@/lib/auth"
import { REGULATORY_POINTS } from "@/lib/regulatory"

const HERO_HEADLINE = "Stop fraud before it becomes a story."

const signals = [
  { label: "Threat detected", detail: "Credential stuffing pattern", tone: "danger" },
  { label: "IP verified", detail: "Reputation and geo match", tone: "safe" },
  { label: "Login anomaly", detail: "New device fingerprint", tone: "warning" },
]

// The dashboard itself (Command Center, Red/Blue Team) is behind a login, so
// the marketing nav no longer links straight into it - that would just dead-end on a
// sign-in redirect. These point at the live read-only preview, in-page sections, and
// the public story page instead.
const navLinks: Array<{ label: string; href: string } | { label: string; to: string }> = [
  { label: "Product", to: "/preview" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Impact", href: "#impact" },
  { label: "About", to: "/about" },
]

const CONVENTIONAL = [
  "Single ML model",
  "Static thresholds",
  "Blind to zero-day patterns",
  "Black-box risk scores",
  "Manually curated test cases",
]

const CLINCH = [
  "Rules + ML + Anomaly + Graph + RAG fused",
  "Purpose-built novelty testing",
  "Explainable AI reasoning per decision",
  "Autonomous 24/7 adversarial simulation",
  "Continuous self-improvement",
]

const HOW_IT_WORKS = [
  { title: "Red Team generates attack", detail: "A synthetic fraud scenario is created on demand - a real transaction shape, not a toy example.", icon: Swords },
  { title: "Blue Team analyzes", detail: "Five independent signals score it: rules, ML, anomaly detection, graph analysis, and RAG context.", icon: ScanSearch },
  { title: "Risk fusion scores it", detail: "The five layer scores are fused into one final risk score, not a single opaque number.", icon: GitBranch },
  { title: "Action taken", detail: "Allow, hold, or block - with the reasoning behind the decision, not just a verdict.", icon: Gavel },
  { title: "Analyst feedback", detail: "Confirmed fraud and false positives are logged back against the transaction.", icon: MessageSquareText },
  { title: "Adaptive defense retrains", detail: "Missed and borderline cases feed back into the ensemble automatically.", icon: RefreshCw },
]

const TEAM_PREVIEW = [
  { initials: "SM", role: "Dashboard & Integration Lead" },
  { initials: "PR", role: "Red Team Lead" },
  { initials: "SH", role: "Blue Team Lead" },
]

export function SecurityHero() {
  const navigate = useNavigate()
  const [checkingSession, setCheckingSession] = useState(true)
  const [data, setData] = useState<Awaited<ReturnType<typeof getAnalyticsData>> | null>(null)

  const { scrollYProgress } = useScroll()
  const scrollProgress = useSpring(scrollYProgress, { stiffness: 220, damping: 32, restDelta: 0.001 })

  const heroRef = useRef<HTMLElement>(null)
  const { scrollYProgress: heroProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] })
  const heroCardY = useTransform(heroProgress, [0, 1], [0, 90])
  const heroCopyY = useTransform(heroProgress, [0, 1], [0, -50])
  const heroFade = useTransform(heroProgress, [0, 0.7], [1, 0])

  // A logged-in visitor lands on the dashboard, not the pitch page.
  useEffect(() => {
    void getCurrentUser().then((user) => {
      if (user) navigate("/command-center", { replace: true })
      else setCheckingSession(false)
    })
  }, [navigate])

  useEffect(() => { void getAnalyticsData().then(setData) }, [])

  if (checkingSession) {
    return <div className="flex min-h-svh items-center justify-center bg-[#05050a] font-mono text-xs text-slate-500">LOADING...</div>
  }

  const scrollToHowItWorks = () => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })

  return (
    <main className="min-h-svh scroll-smooth overflow-hidden bg-[#05050a] text-white">
      <motion.div
        className="fixed inset-x-0 top-0 z-50 h-[3px] origin-left bg-gradient-to-r from-indigo-400 via-indigo-300 to-white"
        style={{ scaleX: scrollProgress }}
      />
      <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
        <motion.nav
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="flex items-center justify-between gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_20px_50px_-20px_rgba(79,70,229,0.35)] backdrop-blur-xl sm:gap-4 sm:px-6 sm:py-2.5"
        >
          <Link to="/" className="group flex items-center gap-1.5 text-xs font-semibold tracking-tight text-white transition-opacity hover:opacity-80 sm:gap-2.5 sm:text-sm">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-indigo-500 text-white transition-transform duration-300 group-hover:scale-110 sm:size-8"><ShieldCheck className="size-3.5 sm:size-4" /></span>
            <span className="whitespace-nowrap">Clinch</span>
          </Link>
          <div className="hidden items-center gap-1 rounded-full border border-white/5 bg-white/[0.03] p-1 md:flex">
            {navLinks.map((link) => "href" in link ? (
              <a key={link.href} href={link.href} className="rounded-full px-4 py-1.5 text-[13px] font-medium text-white/60 transition-all duration-200 hover:-translate-y-px hover:bg-white/10 hover:text-white">
                {link.label}
              </a>
            ) : (
              <Link key={link.to} to={link.to} className="rounded-full px-4 py-1.5 text-[13px] font-medium text-white/60 transition-all duration-200 hover:-translate-y-px hover:bg-white/10 hover:text-white">
                {link.label}
              </Link>
            ))}
          </div>
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <Link to="/sign-in" className="whitespace-nowrap rounded-full px-2.5 py-1.5 text-xs font-medium text-white/70 transition-colors hover:bg-white/5 hover:text-white sm:px-4 sm:py-2 sm:text-sm">
              Log in
            </Link>
            <Link to="/sign-in?mode=signup" className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-white px-2.5 py-1.5 text-xs font-semibold text-[#0a0a0f] shadow-[0_0_0_rgba(255,255,255,0)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_28px_-10px_rgba(255,255,255,0.35)] sm:px-4 sm:py-2 sm:text-sm">
              Sign up
            </Link>
          </div>
        </motion.nav>

        {/* ==================================================
            HERO
        ================================================== */}
        <section ref={heroRef} id="product" className="security-hero scan-grid relative mt-6 scroll-mt-6 overflow-hidden rounded-[32px] border border-white/10">
          <div className="scan-beam" />
          <div className="relative z-10 grid items-center gap-14 px-6 py-16 lg:grid-cols-[0.85fr_1.15fr] lg:px-14 lg:py-24">
            <motion.div style={{ y: heroCopyY, opacity: heroFade }} className="relative z-10 min-w-0 max-w-xl">
              <Reveal delay={0.05}>
                <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-indigo-200">
                  <span className="size-1.5 rounded-full bg-indigo-300" />
                  Red Team vs. Blue Team, running 24/7
                </span>
              </Reveal>
              <Reveal delay={0.14}>
                {/* The grid-stacks-two-children trick reserves the full headline's final
                    height from first paint: the invisible full-text clone and the
                    in-progress typed text share one grid cell, so the row sizes to the
                    taller (always-complete) clone and nothing shifts as typing fills in. */}
                <h1 className="hero-title grid text-4xl leading-[1.05] text-white sm:text-5xl sm:leading-[1.02] lg:text-6xl xl:text-[3.9rem]">
                  <span aria-hidden="true" className="invisible [grid-area:1/1]">{HERO_HEADLINE}</span>
                  <span className="[grid-area:1/1]">
                    <TypingText text={HERO_HEADLINE} speed={65} startDelay={300} startImmediately />
                  </span>
                </h1>
              </Reveal>
              <Reveal delay={0.22}>
                <p className="mt-7 max-w-lg text-base leading-7 text-indigo-100/70 sm:text-lg">
                  Clinch runs a continuous Red Team vs Blue Team adversarial loop — generating novel fraud patterns, detecting them across five independent signals, and closing detection gaps before real attackers find them.
                </p>
              </Reveal>
              <Reveal delay={0.3}>
                <div className="mt-9 flex flex-wrap items-center gap-4">
                  <Link to="/sign-in" className="group inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-[#0a0a0f] shadow-[0_0_0_rgba(255,255,255,0)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_32px_-12px_rgba(255,255,255,0.4)]">
                    Login to Dashboard <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </Link>
                  <button type="button" onClick={scrollToHowItWorks} className="group inline-flex items-center gap-1.5 rounded-full border border-white/15 px-5 py-3 text-sm font-medium text-white/80 transition-all duration-300 hover:-translate-y-0.5 hover:border-indigo-400/40 hover:bg-white/5 hover:text-white">
                    See How It Works
                  </button>
                </div>
              </Reveal>
              <Reveal delay={0.36}>
                <p className="mt-6 text-sm text-indigo-100/45">Built for security teams</p>
              </Reveal>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              style={{ y: heroCardY }}
              className="relative z-10 mx-auto w-full min-w-0 max-w-155"
            >
              <span className="absolute -top-4 left-6 z-20 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-[#0a0a12] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-indigo-200 shadow-lg">
                <ShieldHalf className="size-3" /> Live feed
              </span>
              <div className="dashboard-card rounded-2xl border border-white/15 bg-black/25 p-4 shadow-2xl shadow-indigo-950/30 backdrop-blur-[20px] sm:p-6">
                <div className="flex items-center justify-between border-b border-white/10 pb-5">
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-white/45">Live risk monitor</p>
                    <p className="mt-1 text-sm font-medium text-white">Transaction intelligence</p>
                  </div>
                  <div className="scan-status text-xs font-medium text-white/80">
                    <span className="status-scanning">Scanning...</span>
                    <span className="status-threat">Threat detected</span>
                    <span className="status-verified">Verified</span>
                  </div>
                </div>

                <div className="mt-6">
                  <div className="mb-2 flex items-end justify-between">
                    <span className="text-xs text-white/50">Network scan</span>
                    <span className="text-xs font-medium text-white/70">Live</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/10"><div className="scan-progress h-full rounded-full bg-white" /></div>
                </div>

                <div className="mt-8 grid grid-cols-2 gap-4 border-b border-white/10 pb-6">
                  <div><p className="text-xs text-white/45">Current risk</p><p role="img" className="risk-score mt-2 text-4xl font-semibold tracking-tight text-white" aria-label="Current risk score" /></div>
                  <div><p className="text-xs text-white/45">Signals resolved</p><p className="mt-2 text-4xl font-semibold tracking-tight text-white">24<span className="text-lg text-white/40">/28</span></p></div>
                </div>

                <div className="mt-5 space-y-2.5">
                  {signals.map(({ label, detail, tone }, index) => (
                      <div key={label} className="hero-reveal flex items-center justify-between gap-4 rounded-xl bg-white/6 px-4 py-3 [--delay:var(--signal-delay)]" style={{ "--signal-delay": `${580 + index * 100}ms` } as CSSProperties}>
                      <div className="flex min-w-0 items-center gap-3"><span className={`signal-dot signal-${tone} size-2 shrink-0 rounded-full`} /><div className="min-w-0"><p className="truncate text-sm font-medium text-white/90">{label}</p><p className="truncate text-xs text-white/40">{detail}</p></div></div>
                      <span className={`signal-badge signal-${tone} shrink-0 rounded-full border px-2 py-1 text-[10px] font-medium uppercase tracking-wider`}>{tone === "safe" ? <Check className="size-3" /> : tone}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ==================================================
            THE PROBLEM
        ================================================== */}
        <section className="py-16">
          <RevealStagger className="grid gap-4 sm:grid-cols-3">
            <RevealItem>
              <div className="h-full rounded-2xl border border-red-500/20 bg-white/[0.02] px-6 py-6 text-center transition-all duration-300 hover:-translate-y-1 hover:border-red-500/40">
                <p className="text-4xl font-semibold tracking-tight text-red-300">79%</p>
                <p className="mt-2 text-sm text-slate-400">of firms reported fraud attempts in 2024</p>
              </div>
            </RevealItem>
            <RevealItem>
              <div className="h-full rounded-2xl border border-red-500/20 bg-white/[0.02] px-6 py-6 text-center transition-all duration-300 hover:-translate-y-1 hover:border-red-500/40">
                <p className="text-4xl font-semibold tracking-tight text-red-300">$40B+</p>
                <p className="mt-2 text-sm text-slate-400">in projected global fraud losses by 2027</p>
              </div>
            </RevealItem>
            <RevealItem>
              <div className="h-full rounded-2xl border border-red-500/20 bg-white/[0.02] px-6 py-6 text-center transition-all duration-300 hover:-translate-y-1 hover:border-red-500/40">
                <ShieldAlert className="mx-auto size-6 text-red-300" />
                <p className="mt-3 text-sm font-semibold text-white">Static systems can't adapt</p>
                <p className="mt-1 text-sm text-slate-400">Rule-based thresholds miss novel, evolving attack patterns.</p>
              </div>
            </RevealItem>
          </RevealStagger>
        </section>

        {/* ==================================================
            WHAT MAKES US DIFFERENT
        ================================================== */}
        <section className="py-16">
          <Reveal>
            <div className="mb-8 text-center">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-indigo-300">Detection vs. Defense</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">What Makes Clinch Different</h2>
            </div>
          </Reveal>
          <RevealStagger className="grid gap-4 md:grid-cols-2">
            <RevealItem>
              <div className="h-full overflow-hidden rounded-2xl border border-red-500/15 bg-white/[0.01]">
                <div className="border-b border-white/10 px-5 py-4"><p className="text-sm font-medium text-red-300/70">Conventional Systems</p></div>
                <div className="space-y-3 p-5">
                  {CONVENTIONAL.map((item) => (
                    <div key={item} className="flex items-start gap-2.5 text-sm text-slate-500">
                      <X className="mt-0.5 size-4 shrink-0 text-red-400/40" /> {item}
                    </div>
                  ))}
                </div>
              </div>
            </RevealItem>
            <RevealItem>
              <div className="h-full overflow-hidden rounded-2xl border border-blue-500/40 bg-[#0d1520] shadow-[0_0_50px_-24px_rgba(59,130,246,0.5)]">
                <div className="border-b border-white/10 px-5 py-4"><p className="text-sm font-medium text-blue-300">Clinch</p></div>
                <div className="space-y-3 p-5">
                  {CLINCH.map((item) => (
                    <div key={item} className="flex items-start gap-2.5 text-sm text-white">
                      <Check className="mt-0.5 size-4 shrink-0 text-blue-400" /> {item}
                    </div>
                  ))}
                </div>
              </div>
            </RevealItem>
          </RevealStagger>
        </section>

        {/* ==================================================
            QUANTIFIED IMPACT
        ================================================== */}
        <div id="impact" className="scroll-mt-24 py-16">
          <Reveal>
            <div className="overflow-hidden rounded-[28px] border border-emerald-500/20 bg-gradient-to-br from-emerald-500/8 via-[#0d1520] to-[#0d1520]">
              <div className="grid gap-8 p-8 lg:grid-cols-[0.9fr_1.1fr] lg:p-12">
                <div className="min-w-0">
                  <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-emerald-300">Quantified Impact</p>
                  {data ? (
                    <div className="mt-4 flex flex-wrap items-end gap-3">
                      <span className="text-6xl font-semibold tracking-tight text-white sm:text-7xl">+{data.adaptiveImprovement}%</span>
                      <span className="mb-2 flex items-center gap-1 text-sm font-medium text-emerald-400"><TrendingUp className="size-4" /> detection lift</span>
                    </div>
                  ) : (
                    <div className="mt-4 h-16 w-48 animate-pulse rounded-xl bg-slate-800/50" />
                  )}
                  <p className="mt-3 max-w-sm text-sm text-slate-400">Detection rate improvement measured across a full adaptive defense cycle - missed attacks retrain the ensemble automatically.</p>
                  <div className="mt-6 flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="border-red-500/40 bg-red-500/10 text-red-300">Missed</Badge>
                    <ArrowRight className="size-4 text-slate-600" />
                    <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-300">Detected</Badge>
                    <span className="ml-2 text-xs text-slate-500">Before adaptive defense → after adaptive defense</span>
                  </div>
                </div>
                <div className="h-48 w-full min-w-0 sm:h-56">
                  {data && (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={data.detectionTrend} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                        <CartesianGrid stroke="var(--color-slate-800)" vertical={false} />
                        <XAxis
                          dataKey="label"
                          tickFormatter={(value: string) => value.replace("Cycle ", "")}
                          tick={{ fill: "var(--color-slate-500)", fontSize: 10 }}
                          axisLine={{ stroke: "var(--color-slate-800)" }}
                          tickLine={false}
                          interval={1}
                        />
                        <YAxis
                          domain={[60, 100]}
                          unit="%"
                          tick={{ fill: "var(--color-slate-500)", fontSize: 10 }}
                          axisLine={{ stroke: "var(--color-slate-800)" }}
                          tickLine={false}
                          width={40}
                        />
                        <Line type="monotone" dataKey="beforeAdaptive" stroke="var(--color-red-400)" strokeWidth={2} strokeDasharray="6 4" dot={false} isAnimationActive={false} />
                        <Line type="monotone" dataKey="afterAdaptive" stroke="var(--color-emerald-400)" strokeWidth={2.5} dot={false} isAnimationActive={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </div>
          </Reveal>
        </div>

        {/* ==================================================
            HOW IT WORKS
        ================================================== */}
        <section id="how-it-works" className="scroll-mt-24 py-16">
          <Reveal>
            <div className="mb-10 text-center">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-indigo-300">How It Works</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">One closed loop, six steps</h2>
            </div>
          </Reveal>
          <RevealStagger className="flex flex-col gap-10 md:flex-row md:items-start md:gap-2">
            {HOW_IT_WORKS.map(({ title, detail, icon: Icon }, index) => (
              <Fragment key={title}>
                <RevealItem className="flex flex-1 flex-col items-center text-center">
                  <div className="relative flex size-16 shrink-0 items-center justify-center rounded-full border border-indigo-400/25 bg-gradient-to-b from-indigo-500/15 to-transparent shadow-[0_0_24px_-6px_rgba(99,102,241,0.5)] transition-transform duration-300 hover:scale-110">
                    <Icon className="size-6 text-indigo-300" />
                    <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full border border-white/15 bg-[#0a0a12] font-mono text-[9px] font-semibold text-white/50">
                      {index + 1}
                    </span>
                  </div>
                  <h3 className="mt-4 text-sm font-semibold text-white">{title}</h3>
                  <p className="mt-2 max-w-[12rem] text-xs leading-relaxed text-white/50">{detail}</p>
                </RevealItem>
                {index < HOW_IT_WORKS.length - 1 && (
                  <div className="hidden shrink-0 items-center pt-8 md:flex">
                    <ChevronRight className="size-4 text-white/20" />
                  </div>
                )}
              </Fragment>
            ))}
          </RevealStagger>
        </section>

        {/* ==================================================
            REGULATORY & PRIVACY READINESS
        ================================================== */}
        <section className="py-16">
          <Reveal>
            <div className="mb-8 text-center">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-emerald-300">Built for Real-World Deployment</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">Regulatory &amp; Privacy Readiness</h2>
            </div>
          </Reveal>
          <RevealStagger className="grid gap-4 sm:grid-cols-2">
            {REGULATORY_POINTS.map(({ icon: Icon, text }) => (
              <RevealItem key={text}>
                <div className="flex h-full items-start gap-3 rounded-2xl border border-emerald-500/15 bg-white/[0.02] p-4">
                  <Icon className="mt-0.5 size-4 shrink-0 text-emerald-400" />
                  <p className="text-sm text-slate-300">{text}</p>
                </div>
              </RevealItem>
            ))}
          </RevealStagger>
        </section>

        {/* ==================================================
            BUSINESS CASE
        ================================================== */}
        <section className="py-16">
          <Reveal>
            <div className="flex flex-col items-start gap-6 rounded-[28px] border border-amber-500/15 bg-gradient-to-br from-amber-500/8 via-white/[0.02] to-transparent p-8 sm:flex-row sm:items-center sm:justify-between sm:p-10">
              <div className="max-w-xl">
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-amber-300">Business Case</p>
                <p className="mt-3 text-lg leading-relaxed text-white">Blocking legitimate transactions costs banks customer trust and revenue just as much as missed fraud does. Clinch is tuned to catch fraud without creating friction that drives customers away.</p>
              </div>
              <div className="shrink-0 rounded-2xl border border-amber-500/20 bg-[#0d1520] px-6 py-5 text-center">
                <p className="text-3xl font-semibold text-amber-300">{data ? `${data.falsePositiveRate}%` : "—"}</p>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-slate-500">False Positive Rate</p>
              </div>
            </div>
          </Reveal>
        </section>

        {/* ==================================================
            TEAM PREVIEW
        ================================================== */}
        <section className="pb-16">
          <Reveal>
            <Link to="/team" className="group flex flex-col items-center gap-6 rounded-[28px] border border-white/10 bg-white/[0.02] p-8 transition-colors hover:border-white/20 sm:flex-row sm:justify-between">
              <div className="flex items-center gap-5">
                {TEAM_PREVIEW.map(({ initials, role }) => (
                  <div key={initials + role} className="flex items-center gap-2">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-indigo-400/30 bg-indigo-500/10 text-sm font-semibold text-indigo-300">{initials}</span>
                    <span className="hidden text-xs text-slate-400 sm:inline">{role}</span>
                  </div>
                ))}
              </div>
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-300 group-hover:text-indigo-200">
                Meet the team <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          </Reveal>
        </section>

        {/* ==================================================
            FOOTER CTA
        ================================================== */}
        <section className="border-t border-white/5 py-16 text-center">
          <Reveal>
            <div className="mx-auto flex size-12 items-center justify-center rounded-full border border-indigo-400/30 bg-indigo-500/10 text-indigo-300"><Bot className="size-5" /></div>
            <h2 className="mx-auto mt-5 max-w-xl text-2xl font-semibold tracking-tight text-white sm:text-3xl">It doesn't just detect. It attacks itself to get better.</h2>
            <div className="mt-8">
              <Link to="/sign-in" className="group inline-flex items-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-semibold text-[#0a0a0f] transition-transform hover:-translate-y-0.5">
                Login to Dashboard <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </Reveal>
        </section>
      </div>
    </main>
  )
}
