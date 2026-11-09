import { useCallback, useMemo, useState, type ReactNode } from "react"
import { analyzeTransaction } from "@/services/api"
import type { Transaction } from "@/types/fraud"
import {
  initialSyncState,
  RedTeamSyncContext,
  type RawAttackTransaction,
  type RedTeamAttackResult,
  type RedTeamOrchestratorScenario,
  type RedTeamSyncState,
  type SyncedAttackType,
} from "@/contexts/redTeamSync"

const RED_TEAM_API = import.meta.env.VITE_RED_TEAM_API_BASE_URL || "https://fraudshield-redteam-api.onrender.com"

// "Auto / Orchestrator" is the one attack_type value the API answers differently for -
// instead of {transaction, signals} at the top level, it runs all six agents against
// one synthetic user and returns {mode: "MULTI_AGENT", scenarios: [...]}.
interface RedTeamOrchestratorResponse {
  success: boolean
  attack_type: string
  mode: "MULTI_AGENT"
  scenarios: RedTeamOrchestratorScenario[]
  message: string
  error?: string
}

function isOrchestratorResponse(data: unknown): data is RedTeamOrchestratorResponse {
  return typeof data === "object" && data !== null && Array.isArray((data as { scenarios?: unknown }).scenarios)
}

// The orchestrator hands back six scenarios at once, but every other panel (Command
// Center, Blue Team live sync) is built around analyzing one transaction. Rather than
// rearchitect that around a list, the single most severe scenario - highest fraud
// label, then highest combined signal score - is the one that flows through the
// existing single-transaction pipeline; the full set is kept in state alongside it so
// Red Team Lab can still show the whole campaign.
function pickHeadlineScenario(scenarios: RedTeamOrchestratorScenario[]): RedTeamOrchestratorScenario {
  const signalTotal = (s: RedTeamOrchestratorScenario) =>
    s.signals.amount_deviation + s.signals.device_anomaly + s.signals.location_anomaly + s.signals.time_anomaly + s.signals.velocity

  return scenarios.reduce((best, scenario) => {
    if (scenario.fraud_label !== best.fraud_label) return scenario.fraud_label > best.fraud_label ? scenario : best
    return signalTotal(scenario) > signalTotal(best) ? scenario : best
  })
}

// The Render-hosted Red Team API and the local Blue Team analysis API don't share a
// transaction schema, so the synthetic payload is remapped into the UI's Transaction
// shape here — the one place both panels read from.
function toUiTransaction(raw: RawAttackTransaction, attackType: string): Transaction {
  return {
    id: raw.txn_id ?? `txn_${Date.now().toString(36)}`,
    userId: raw.user_id ?? "unknown_user",
    amount: Number(raw.amount ?? 0),
    currency: "USD",
    device: raw.device_id ?? "Unknown device",
    location: raw.location ?? "Unknown location",
    // The Red Team API doesn't report a velocity metric for synthetic transactions,
    // so this is labeled by scenario rather than presented as a measured value.
    velocity: `Synthetic · ${attackType}`,
    timestamp: raw.timestamp ?? new Date().toISOString(),
  }
}

export function RedTeamSyncProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<RedTeamSyncState>(initialSyncState)

  const runAttack = useCallback(async (attackType: SyncedAttackType) => {
    setState({ ...initialSyncState, status: "generating", attackType })

    let redTeamResult: RedTeamAttackResult
    let orchestratorScenarios: RedTeamOrchestratorScenario[] | null = null
    try {
      const response = await fetch(`${RED_TEAM_API}/red-team/attack`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attack_type: attackType }),
      })
      const data: unknown = await response.json()
      if (!response.ok || !(data as { success?: boolean }).success) {
        throw new Error((data as { error?: string }).error || "Attack generation failed.")
      }

      if (isOrchestratorResponse(data)) {
        orchestratorScenarios = data.scenarios
        const headline = pickHeadlineScenario(data.scenarios)
        redTeamResult = {
          success: true,
          attack_type: headline.attack_type,
          fraud_label: headline.fraud_label,
          transaction: headline.transaction,
          signals: headline.signals,
          message: data.message,
        }
      } else {
        redTeamResult = data as RedTeamAttackResult
      }
    } catch (error) {
      setState((prev) => ({ ...prev, status: "error", error: error instanceof Error ? error.message : "Unable to reach the Red Team API." }))
      return
    }

    const transaction = toUiTransaction(redTeamResult.transaction, attackType)
    setState((prev) => ({ ...prev, status: "analyzing", redTeamResult, orchestratorScenarios, transaction }))

    try {
      const analysis = await analyzeTransaction({ transaction })
      setState((prev) => ({ ...prev, status: "complete", analysis }))
    } catch (error) {
      setState((prev) => ({
        ...prev,
        status: "error",
        error: error instanceof Error ? error.message : "Unable to reach the Blue Team analysis backend.",
      }))
    }
  }, [])

  const reset = useCallback(() => setState(initialSyncState), [])

  const value = useMemo(() => ({ state, runAttack, reset }), [state, runAttack, reset])

  return <RedTeamSyncContext.Provider value={value}>{children}</RedTeamSyncContext.Provider>
}
