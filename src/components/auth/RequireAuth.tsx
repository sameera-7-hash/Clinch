import { useEffect, useState } from "react"
import { Navigate, Outlet, useLocation } from "react-router-dom"
import { getCurrentUser } from "@/lib/auth"

// Gates the real dashboard (Command Center, Red/Blue Team, etc.) behind a login session.
// Without this, anyone could type the URL directly and land on the live app with no
// account - the sign-in flow would just be theater.
export function RequireAuth() {
  const location = useLocation()
  const [status, setStatus] = useState<"checking" | "authed" | "anon">("checking")

  useEffect(() => {
    void getCurrentUser().then((user) => setStatus(user ? "authed" : "anon"))
  }, [])

  if (status === "checking") {
    return (
      <div className="flex min-h-svh items-center justify-center bg-[#0a0a0f] font-mono text-xs text-slate-500">
        VERIFYING SESSION...
      </div>
    )
  }

  if (status === "anon") {
    return <Navigate to="/sign-in" state={{ from: location }} replace />
  }

  return <Outlet />
}
