import { useEffect, useState, type FormEvent, type ReactNode } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { motion } from "framer-motion"
import { AlertTriangle, ArrowLeft, Check, Eye, EyeOff, Fingerprint, KeyRound, Loader2, Lock, Mail, ShieldCheck, Sparkles, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { getCurrentUser, requestPasswordReset, signIn, signUp } from "@/lib/auth"
import { CyberGrid } from "@/components/motion/CyberGrid"

const highlights = [
  { label: "Real-time signal fusion", detail: "40+ risk signals scored in under 200ms" },
  { label: "Adaptive defense loop", detail: "Missed attacks retrain the ensemble automatically" },
  { label: "Zero standing trust", detail: "Every session is continuously re-verified" },
]

const trustBadges = [
  { icon: ShieldCheck, label: "SOC 2 Type II" },
  { icon: Lock, label: "256-bit encryption" },
  { icon: KeyRound, label: "SSO / MFA ready" },
]

// The label doubles as the placeholder: it rests inline where placeholder text
// normally sits, then rises into a small caption above the field the moment the
// user focuses in or has typed something, so it never collides with their input.
// The field itself lifts slightly while focused so the active row reads clearly.
export function FloatingField({
  id,
  label,
  icon: Icon,
  type = "text",
  value,
  onChange,
  required,
  minLength,
  rightSlot,
}: {
  id: string
  label: string
  icon: LucideIcon
  type?: string
  value: string
  onChange: (value: string) => void
  required?: boolean
  minLength?: number
  rightSlot?: ReactNode
}) {
  const [focused, setFocused] = useState(false)
  const risen = focused || value.length > 0

  return (
    <div className="relative">
      <label
        htmlFor={id}
        className={cn(
          "pointer-events-none absolute z-10 font-medium text-white/25 transition-all duration-200 ease-out",
          risen
            ? "left-0 -top-5.5 text-[10px] uppercase tracking-wider text-indigo-300"
            : "left-10 top-1/2 -translate-y-1/2 text-sm normal-case tracking-normal text-white/25",
        )}
      >
        {label}
      </label>
      <div
        className={cn(
          "flex items-center gap-2.5 rounded-xl border bg-white/[0.03] px-3.5 py-2.5 transition-all duration-200",
          focused ? "-translate-y-0.5 border-indigo-400/60 shadow-[0_10px_28px_-16px_rgba(99,102,241,0.5)]" : "border-white/10",
        )}
      >
        <Icon className="size-4 shrink-0 text-white/30" />
        <input
          id={id}
          type={type}
          required={required}
          minLength={minLength}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="w-full bg-transparent text-sm text-white focus:outline-none"
        />
        {rightSlot}
      </div>
    </div>
  )
}

export function SignIn() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">(searchParams.get("mode") === "signup" ? "signup" : "signin")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [checkingSession, setCheckingSession] = useState(true)

  // An already-signed-in visitor landing here directly moves on to the dashboard.
  useEffect(() => {
    void getCurrentUser().then((user) => {
      if (user) navigate("/command-center")
      else setCheckingSession(false)
    })
  }, [navigate])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")
    setNotice("")
    setSubmitting(true)

    try {
      if (mode === "forgot") {
        const { message } = await requestPasswordReset(email)
        setNotice(message)
        return
      }
      if (mode === "signup") await signUp(email, password, name)
      else await signIn(email, password)
      navigate("/command-center")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reach the Clinch API.")
    } finally {
      setSubmitting(false)
    }
  }

  if (checkingSession) {
    return (
      <main className="flex min-h-svh items-center justify-center bg-[#05050a] font-mono text-xs text-slate-500">
        VERIFYING SESSION...
      </main>
    )
  }

  return (
    <main className="grid min-h-svh bg-[#05050a] text-white lg:grid-cols-[1.05fr_1fr]">
      <div className="security-hero scan-grid relative hidden flex-col justify-between overflow-hidden p-10 lg:flex xl:p-14">
        <div className="scan-beam" />
        <Link to="/" className="relative z-10 flex items-center gap-2.5 text-sm font-semibold tracking-tight text-white">
          <span className="flex size-8 items-center justify-center rounded-full bg-white text-[#312e81]"><ShieldCheck className="size-4" /></span>
          Clinch
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 max-w-md"
        >
          <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-indigo-200">
            <Sparkles className="size-3.5" /> Built for security teams
          </span>
          <h1 className="hero-title text-5xl leading-[1.05] text-white xl:text-6xl">
            Access built for the team that <span className="text-amber-300">never sleeps.</span>
          </h1>
          <div className="mt-10 space-y-5">
            {highlights.map(({ label, detail }, index) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.45, delay: 0.25 + index * 0.1, ease: [0.16, 1, 0.3, 1] }}
                className="flex items-start gap-3"
              >
                <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-300"><Check className="size-3.5" /></span>
                <div>
                  <p className="text-sm font-medium text-white">{label}</p>
                  <p className="mt-0.5 text-xs text-indigo-100/50">{detail}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <p className="relative z-10 text-xs text-indigo-100/40">Trusted signal, clear decisions, fewer false positives.</p>
      </div>

      <div className="relative flex flex-col justify-center overflow-hidden px-6 py-12 sm:px-12 lg:px-16 xl:px-20">
        <CyberGrid className="pointer-events-none absolute inset-0 z-0 h-full w-full opacity-[0.07]" />
        <div className="pointer-events-none absolute -right-32 top-1/3 z-0 size-96 rounded-full bg-indigo-500/10 blur-3xl" />

        <Link to="/" className="relative z-10 mb-10 inline-flex w-fit items-center gap-2 text-xs font-medium text-white/40 transition-colors hover:text-white/70 lg:hidden">
          <ArrowLeft className="size-3.5" /> Back to Clinch
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 mx-auto w-full max-w-sm rounded-3xl border border-white/10 bg-white/[0.02] p-7 shadow-[0_30px_80px_-30px_rgba(79,70,229,0.35)] backdrop-blur-xl sm:p-8"
        >
          <div className="mb-8 flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] p-1">
            <button
              type="button"
              onClick={() => { setMode("signin"); setError(""); setNotice("") }}
              className={cn("flex-1 rounded-full px-4 py-2 text-sm font-medium transition-colors", mode === "signin" ? "bg-white text-[#0a0a0f]" : "text-white/50 hover:text-white")}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => { setMode("signup"); setError(""); setNotice("") }}
              className={cn("flex-1 rounded-full px-4 py-2 text-sm font-medium transition-colors", mode === "signup" ? "bg-white text-[#0a0a0f]" : "text-white/50 hover:text-white")}
            >
              Create account
            </button>
          </div>

          <h2 className="hero-title text-4xl text-white">{mode === "signin" ? "Welcome back." : mode === "signup" ? "Get started." : "Reset access."}</h2>
          <p className="mt-2 text-sm text-white/45">
            {mode === "signin" ? "Sign in to your security console." : mode === "signup" ? "Set up access to the defense grid." : "We'll email you a link to choose a new password."}
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-8">
            {mode === "signup" && (
              <FloatingField id="name" label="Full name" icon={Fingerprint} value={name} onChange={setName} required />
            )}
            <FloatingField id="email" label="Work email" icon={Mail} type="email" value={email} onChange={setEmail} required />
            {mode !== "forgot" && (
              <div className="relative">
                {mode === "signin" && (
                  <button type="button" onClick={() => { setMode("forgot"); setError(""); setNotice("") }} className="absolute -top-5.5 right-0 z-10 text-[10px] font-medium text-indigo-300 hover:text-indigo-200">Forgot password?</button>
                )}
                <FloatingField
                  id="password"
                  label="Password"
                  icon={Lock}
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={setPassword}
                  required
                  minLength={mode === "signup" ? 8 : undefined}
                  rightSlot={
                    <button type="button" onClick={() => setShowPassword((v) => !v)} className="shrink-0 text-white/30 transition-colors hover:text-white/60" aria-label={showPassword ? "Hide password" : "Show password"}>
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  }
                />
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-xs text-red-300">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            {notice && (
              <div className="flex items-start gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2.5 text-xs text-emerald-300">
                <Check className="mt-0.5 size-3.5 shrink-0" />
                <span>{notice}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-[#0a0a0f] shadow-[0_10px_30px_-12px_rgba(255,255,255,0.3)] transition-all hover:-translate-y-0.5 hover:shadow-[0_14px_36px_-12px_rgba(255,255,255,0.4)] disabled:pointer-events-none disabled:opacity-60"
            >
              {submitting && <Loader2 className="size-4 animate-spin" />}
              {submitting ? "Verifying..." : mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Send reset link"}
            </button>
          </form>

          <p className="mt-8 text-center text-xs text-white/35">
            {mode === "signin" ? "New to Clinch? " : "Already have an account? "}
            <button type="button" onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(""); setNotice("") }} className="font-medium text-indigo-300 hover:text-indigo-200">
              {mode === "signin" ? "Create an account" : "Sign in"}
            </button>
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 mx-auto mt-8 flex w-full max-w-sm flex-wrap items-center justify-center gap-x-6 gap-y-2"
        >
          {trustBadges.map(({ icon: Icon, label }) => (
            <span key={label} className="inline-flex items-center gap-1.5 text-xs text-white/30">
              <Icon className="size-3.5" /> {label}
            </span>
          ))}
        </motion.div>
      </div>
    </main>
  )
}
