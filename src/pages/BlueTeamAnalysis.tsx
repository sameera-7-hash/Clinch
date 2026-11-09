import { useState } from "react"
import { Activity, AlertTriangle, CheckCircle2, Cpu, Database, Loader2, Network, RefreshCw, ShieldCheck, Sparkles } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { AppendToDatabaseButton } from "@/components/AppendToDatabaseButton"
import { Reveal } from "@/components/motion/Reveal"
import { RadarSweep } from "@/components/motion/RadarSweep"
import { useRedTeamSync } from "@/contexts/redTeamSync"
import { mockDetectionResult, mockTransaction } from "@/mocks/dashboard"
import { analyzeTransaction } from "@/services/api"
import type { DetectionResult, RiskBand } from "@/types/fraud"

const layerIcons = [ShieldCheck, Cpu, Sparkles, Network, Database]

// Full class names are spelled out (not built with string interpolation) so Tailwind's
// static scanner can find each one and generate it - see RedTeamLab.tsx for the same pattern.
const layerBarColors = ["[&>div]:bg-blue-300", "[&>div]:bg-blue-400", "[&>div]:bg-blue-500", "[&>div]:bg-blue-600", "[&>div]:bg-blue-700"]

const decisionStyles: Record<string, string> = {
  ALLOW: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  FLAG: "border-amber-500/40 bg-amber-500/10 text-amber-300",
  CRITICAL_BLOCK: "border-red-500/40 bg-red-500/10 text-red-300",
}

function gaugeColorFor(score: number) {
  return score >= 80 ? "text-red-300" : score >= 50 ? "text-amber-300" : "text-emerald-300"
}

function bandFor(score: number): RiskBand {
  return score >= 80 ? "high" : score >= 50 ? "medium" : "low"
}

export function BlueTeamAnalysis() {
  const { state: syncState } = useRedTeamSync()
  const [demoResult, setDemoResult] = useState<DetectionResult | null>(null)
  const [demoLoading, setDemoLoading] = useState(false)
  const [demoError, setDemoError] = useState("")

  const runDemoAnalysis = async () => {
    setDemoLoading(true)
    setDemoError("")
    try {
      const data = await analyzeTransaction({ transaction: mockTransaction })
      setDemoResult({
        transaction: mockTransaction,
        detectorScores: data.layers.map((layer) => ({ label: layer.label, score: layer.score, band: bandFor(layer.score) })),
        finalRiskScore: data.final_risk_score,
        action: data.decision,
        explanation: data.explanation,
      })
    } catch (err) {
      setDemoError(err instanceof Error ? err.message : "Unable to reach the analysis backend.")
    } finally {
      setDemoLoading(false)
    }
  }

  const syncedAnalyzing = syncState.status === "analyzing" || syncState.status === "generating"
  const synced = syncState.transaction && syncState.analysis

  // Priority: a live Red Team → Blue Team sync, then a manually run demo pass, then static demo data.
  const result: DetectionResult = synced
    ? {
        transaction: syncState.transaction!,
        detectorScores: syncState.analysis!.layers.map((layer) => ({ label: layer.label, score: layer.score, band: bandFor(layer.score) })),
        finalRiskScore: syncState.analysis!.final_risk_score,
        action: syncState.analysis!.decision,
        explanation: syncState.analysis!.explanation,
      }
    : (demoResult ?? mockDetectionResult)

  const sourceBadge = synced
    ? { label: "SYNCED FROM RED TEAM", className: "border-red-500/30 bg-red-500/10 font-mono text-[10px] text-red-300" }
    : demoResult
      ? { label: "LIVE", className: "border-emerald-500/30 bg-emerald-500/10 font-mono text-[10px] text-emerald-300" }
      : { label: "DEMO DATA", className: "border-slate-700 font-mono text-[10px] text-slate-500" }

  const { transaction, detectorScores, finalRiskScore, action, explanation } = result
  const gaugeColor = gaugeColorFor(finalRiskScore)

  return <div className="space-y-8">
    <Reveal><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="font-mono text-[10px] uppercase tracking-[0.22em] text-yellow-300">Detection intelligence / 03</p><h2 className="mt-2 text-4xl tracking-tight text-white">Blue Team Analysis</h2><p className="mt-2 text-sm text-slate-500">Inspect how the defense ensemble reached its verdict on the latest transaction.</p></div><div className="flex items-center gap-3"><Badge variant="outline" className={sourceBadge.className}>{sourceBadge.label}</Badge>{!synced && <Button onClick={runDemoAnalysis} disabled={demoLoading} variant="outline" className="font-mono text-[10px] uppercase tracking-wider">{demoLoading ? <Loader2 className="mr-2 size-3.5 animate-spin" /> : <RefreshCw className="mr-2 size-3.5" />}Run demo analysis</Button>}<AppendToDatabaseButton /></div></div></Reveal>

    {demoError && !synced && <Reveal><div className="flex items-start gap-2.5 border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-xs text-amber-200"><AlertTriangle className="mt-0.5 size-3.5 shrink-0" /><span>Analysis backend unreachable ({demoError}). Showing demo data instead.</span></div></Reveal>}

    {synced && syncedAnalyzing && (
      <Reveal><div className="scan-grid relative flex items-center gap-3 overflow-hidden border border-blue-500/30 bg-blue-500/5 px-4 py-3 text-sm text-blue-200"><div className="scan-beam" /><RadarSweep size={18} className="relative z-10" /><span className="relative z-10">Scanning the transaction generated by Red Team Lab across all detection layers...</span></div></Reveal>
    )}

    <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <Reveal delay={0.1}><Card className="border-blue-500/20 bg-[#0d1520]/85 backdrop-blur-xl shadow-none"><CardHeader className="border-b border-slate-800/80 px-5 py-4"><CardTitle className="text-sm font-medium text-slate-100">Transaction summary</CardTitle></CardHeader><CardContent className="grid grid-cols-2 gap-x-5 gap-y-6 p-5">{[["Transaction ID", transaction.id], ["User ID", transaction.userId], ["Amount", `${transaction.currency} ${transaction.amount.toLocaleString()}`], ["Device", transaction.device], ["Location", transaction.location], ["Velocity", transaction.velocity]].map(([label, value]) => <div key={label}><p className="font-mono text-[10px] uppercase tracking-wider text-slate-600">{label}</p><p className="mt-2 text-sm text-slate-200">{value}</p></div>)}</CardContent></Card></Reveal>
      <Reveal delay={0.18}><Card className="border-slate-800 bg-[#0d1520]/85 backdrop-blur-xl shadow-none"><CardHeader className="border-b border-slate-800/80 px-5 py-4"><CardTitle className="text-sm font-medium text-slate-100">Multi-layer score breakdown</CardTitle></CardHeader><CardContent className="space-y-5 p-5">{detectorScores.map(({ label, score }, index) => { const Icon = layerIcons[index] ?? ShieldCheck; return <div key={label}><div className="mb-2 flex items-center justify-between"><span className="flex items-center gap-2 text-sm text-slate-300"><Icon className="size-4 text-blue-400" />{label}</span><span className="font-mono text-sm text-slate-200">{score}<span className="text-slate-600">/100</span></span></div><Progress value={score} className={`h-1.5 bg-slate-800 ${layerBarColors[index % layerBarColors.length]}`} /></div>})}</CardContent></Card></Reveal>
    </div>
    <section className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
      <Reveal delay={0.24}><Card className="border-slate-800 bg-[#0d1520]/85 backdrop-blur-xl shadow-none"><CardContent className="flex flex-col items-center justify-center p-8"><p className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">Final risk score</p><div className={`relative mt-6 flex size-48 items-center justify-center rounded-full border-14 border-slate-800 ${gaugeColor}`}><div className="absolute -inset-3.5 rounded-full border-14 border-transparent border-t-current border-r-current opacity-80" style={{ transform: `rotate(${finalRiskScore * 2.7 - 45}deg)` }} /><span className="font-mono text-6xl font-semibold">{finalRiskScore}</span></div><Badge variant="outline" className={`mt-6 px-4 py-1.5 font-mono text-xs ${decisionStyles[action]}`}>{action}</Badge><p className="mt-4 flex items-center gap-2 text-xs text-emerald-300"><CheckCircle2 className="size-3.5" />Analysis complete</p></CardContent></Card></Reveal>
      <Reveal delay={0.3}><Card className="border-slate-800 bg-[#0d1520]/85 backdrop-blur-xl shadow-none"><CardHeader className="flex flex-row items-center gap-2 border-b border-slate-800/80 px-5 py-4"><Activity className="size-4 text-blue-400" /><div><CardTitle className="text-sm font-medium text-slate-100">AI Explanation</CardTitle><p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-slate-600">Why this decision is explainable</p></div></CardHeader><CardContent className="p-6"><p className="text-base leading-8 text-slate-300">{explanation}</p><div className="mt-8 grid gap-3 border-t border-slate-800 pt-5 font-mono text-[10px] uppercase tracking-wider text-slate-600 sm:grid-cols-3"><span>{detectorScores.length} layers queried</span><span>0.94 confidence</span><span>14ms response</span></div></CardContent></Card></Reveal>
    </section>
  </div>
}
