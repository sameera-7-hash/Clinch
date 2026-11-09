import { useState, type FormEvent } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { AlertTriangle, ArrowLeft, Check, Loader2, Lock } from "lucide-react"
import { CyberGrid } from "@/components/motion/CyberGrid"
import { resetPassword } from "@/lib/auth"
import { FloatingField } from "@/pages/SignIn"

export function ResetPassword() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get("token") ?? ""
  const [password, setPassword] = useState("")
  const [confirmation, setConfirmation] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(token ? "" : "This reset link is invalid or has expired.")
  const [notice, setNotice] = useState("")

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")
    if (password !== confirmation) return setError("The two passwords don't match.")

    setSubmitting(true)
    try {
      const { message } = await resetPassword(token, password)
      setNotice(message)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reset your password.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="relative flex min-h-svh flex-col justify-center overflow-hidden bg-[#05050a] px-6 py-12 text-white">
      <CyberGrid className="pointer-events-none absolute inset-0 z-0 h-full w-full opacity-[0.07]" />
      <div className="relative z-10 mx-auto w-full max-w-sm rounded-3xl border border-white/10 bg-white/[0.02] p-7 shadow-[0_30px_80px_-30px_rgba(79,70,229,0.35)] backdrop-blur-xl sm:p-8">
        <h1 className="hero-title text-4xl text-white">Choose a new password.</h1>
        <p className="mt-2 text-sm text-white/45">Signing in again will be required on every device.</p>

        {notice ? (
          <div className="mt-8 flex items-start gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2.5 text-xs text-emerald-300">
            <Check className="mt-0.5 size-3.5 shrink-0" />
            <span>{notice}</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 space-y-8">
            <FloatingField id="new-password" label="New password" icon={Lock} type="password" value={password} onChange={setPassword} required minLength={8} />
            <FloatingField id="confirm-password" label="Confirm password" icon={Lock} type="password" value={confirmation} onChange={setConfirmation} required minLength={8} />

            {error && (
              <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-xs text-red-300">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button type="submit" disabled={submitting || !token} className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-[#0a0a0f] transition-all hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-60">
              {submitting && <Loader2 className="size-4 animate-spin" />}
              {submitting ? "Updating..." : "Update password"}
            </button>
          </form>
        )}

        <Link to="/sign-in" className="mt-8 inline-flex items-center gap-2 text-xs font-medium text-indigo-300 hover:text-indigo-200">
          <ArrowLeft className="size-3.5" /> Back to sign in
        </Link>
      </div>
    </main>
  )
}
