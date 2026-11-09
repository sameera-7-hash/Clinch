import { useEffect, useRef, useState } from "react"
import { AlertTriangle, CheckCircle2, Database, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRedTeamSync, type RedTeamSyncState } from "@/contexts/redTeamSync"
import { getAppendTask, startAppend, type AppendRecord } from "@/services/appendApi"

const POLL_INTERVAL_MS = 2000

type Progress =
  | { phase: "idle" }
  | { phase: "queued" | "running" }
  | { phase: "done"; rows: number }
  | { phase: "already"; rows: number }
  | { phase: "failed"; error: string }

// Orchestrator runs have six scenarios, but only the headline one reaches the Blue Team,
// so the other five go in with no analysis rather than a made-up score.
function buildRecords(state: RedTeamSyncState): AppendRecord[] {
  const { redTeamResult, orchestratorScenarios, transaction, analysis } = state
  if (!redTeamResult || !transaction || !analysis) return []

  return (orchestratorScenarios ?? [redTeamResult]).map((scenario) => {
    const isHeadline = scenario.transaction === redTeamResult.transaction
    return {
      attack_type: scenario.attack_type,
      fraud_label: scenario.fraud_label,
      event_time: transaction.timestamp,
      transaction: isHeadline ? { ...scenario.transaction, txn_id: transaction.id } : { ...scenario.transaction },
      signals: { ...scenario.signals },
      analysis: isHeadline ? analysis : null,
    }
  })
}

// Runs have no server-side id, so one is derived from the run itself: the same run
// always gets the same id, which is what lets the API refuse a second append.
async function deriveRunId(records: AppendRecord[]) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(records)))
  const hex = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("")
  return `run_${hex.slice(0, 32)}`
}

function AppendControl({ state }: { state: RedTeamSyncState }) {
  const [progress, setProgress] = useState<Progress>({ phase: "idle" })
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  const busy = progress.phase === "queued" || progress.phase === "running"
  const finished = progress.phase === "done" || progress.phase === "already"
  const runComplete = state.status === "complete" && state.analysis !== null

  const pollUntilFinished = async (taskId: number) => {
    while (mounted.current) {
      await new Promise((resolve) => window.setTimeout(resolve, POLL_INTERVAL_MS))
      if (!mounted.current) return
      const task = await getAppendTask(taskId)
      if (!mounted.current) return
      if (task.status === "done") return setProgress({ phase: "done", rows: task.rows_appended })
      if (task.status === "failed") return setProgress({ phase: "failed", error: task.error ?? "The append failed." })
      setProgress({ phase: task.status })
    }
  }

  const handleAppend = async () => {
    setProgress({ phase: "queued" })
    try {
      const records = buildRecords(state)
      const started = await startAppend(await deriveRunId(records), records)
      if (!mounted.current) return
      if (started.already_appended) return setProgress({ phase: "already", rows: started.rows_appended })
      await pollUntilFinished(started.task_id)
    } catch (error) {
      if (mounted.current) {
        setProgress({ phase: "failed", error: error instanceof Error ? error.message : "The append failed." })
      }
    }
  }

  return (
    <>
      {busy && <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-blue-300"><Loader2 className="size-3.5 animate-spin" />{progress.phase}</span>}
      {progress.phase === "done" && <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-emerald-300"><CheckCircle2 className="size-3.5" />✓ {progress.rows} rows appended</span>}
      {progress.phase === "already" && <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-amber-300"><CheckCircle2 className="size-3.5" />Already appended ({progress.rows} rows)</span>}
      {progress.phase === "failed" && <span className="inline-flex max-w-xs items-start gap-1.5 text-xs text-red-300"><AlertTriangle className="mt-0.5 size-3.5 shrink-0" />{progress.error}</span>}
      <Button onClick={() => void handleAppend()} disabled={!runComplete || busy || finished} variant="outline" className="font-mono text-[10px] uppercase tracking-wider">
        <Database className="mr-2 size-3.5" />Append to Database
      </Button>
    </>
  )
}

export function AppendToDatabaseButton() {
  const { state } = useRedTeamSync()
  // Keyed by run, so each new run starts from a fresh, enabled button.
  return <AppendControl key={state.transaction ? `${state.transaction.id}:${state.transaction.timestamp}` : "no-run"} state={state} />
}
