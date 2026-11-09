import { Fragment, useEffect, useRef, useState } from "react"
import { AlertTriangle, ChevronDown, ChevronLeft, ChevronRight, Loader2, Search } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Reveal } from "@/components/motion/Reveal"
import { cn } from "@/lib/utils"
import { getSimilarRows, listDataset, type DatasetPage, type DatasetRow } from "@/services/appendApi"

const PAGE_SIZE = 25
const SEARCH_DEBOUNCE_MS = 300

const decisionStyles: Record<string, string> = {
  ALLOW: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  FLAG: "border-amber-500/40 bg-amber-500/10 text-amber-300",
  CRITICAL_BLOCK: "border-red-500/40 bg-red-500/10 text-red-300",
}

const inputClass = "h-9 rounded-md border border-slate-800 bg-[#0d1520]/85 px-3 text-sm text-slate-200 placeholder:text-slate-600 focus:border-indigo-400/60 focus:outline-none"
const COLUMN_COUNT = 8

function DecisionBadge({ decision }: { decision: string | null }) {
  if (!decision) return <span className="font-mono text-[10px] text-slate-600">NOT SCORED</span>
  return <Badge variant="outline" className={cn("font-mono text-[10px]", decisionStyles[decision])}>{decision}</Badge>
}

function formatTime(value: string) {
  return new Date(value).toLocaleString()
}

function SimilarRows({ rowId }: { rowId: number }) {
  const [rows, setRows] = useState<DatasetRow[] | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    let cancelled = false
    getSimilarRows(rowId)
      .then((result) => { if (!cancelled) setRows(result.items) })
      .catch((err: Error) => { if (!cancelled) setError(err.message) })
    return () => { cancelled = true }
  }, [rowId])

  if (error) return <p className="text-xs text-red-300">{error}</p>
  if (!rows) return <p className="inline-flex items-center gap-2 text-xs text-slate-500"><Loader2 className="size-3.5 animate-spin" />Finding similar rows...</p>
  if (rows.length === 0) return <p className="text-xs text-slate-500">No other rows to compare with yet.</p>

  return (
    <ul className="space-y-2">
      {rows.map((row) => (
        <li key={row.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 border border-slate-800 px-3 py-2 text-xs">
          <span className="font-mono text-[10px] text-indigo-300">{Math.round((row.similarity ?? 0) * 100)}% match</span>
          <span className="font-mono text-[10px] text-slate-400">{row.source}</span>
          <span className="min-w-0 flex-1 text-slate-300">{row.summary}</span>
          <DecisionBadge decision={row.decision} />
        </li>
      ))}
    </ul>
  )
}

export function Dataset() {
  const [searchInput, setSearchInput] = useState("")
  const [runIdInput, setRunIdInput] = useState("")
  const [filters, setFilters] = useState({ search: "", runId: "", page: 1 })
  const [result, setResult] = useState<{ key: string; page: DatasetPage } | null>(null)
  const [failure, setFailure] = useState<{ key: string; message: string } | null>(null)
  const [open, setOpen] = useState<{ id: number; view: "attributes" | "similar" } | null>(null)
  const debounce = useRef<number | undefined>(undefined)

  const requestKey = JSON.stringify(filters)
  const loading = result?.key !== requestKey && failure?.key !== requestKey
  const page = result?.page
  const totalPages = page ? Math.max(1, Math.ceil(page.total / PAGE_SIZE)) : 1

  useEffect(() => {
    let cancelled = false
    listDataset({ page: filters.page, pageSize: PAGE_SIZE, search: filters.search, runId: filters.runId })
      .then((data) => { if (!cancelled) setResult({ key: requestKey, page: data }) })
      .catch((err: Error) => { if (!cancelled) setFailure({ key: requestKey, message: err.message }) })
    return () => { cancelled = true }
  }, [filters, requestKey])

  useEffect(() => () => window.clearTimeout(debounce.current), [])

  const applyFiltersSoon = (search: string, runId: string) => {
    window.clearTimeout(debounce.current)
    debounce.current = window.setTimeout(() => {
      setOpen(null)
      setFilters({ search: search.trim(), runId: runId.trim(), page: 1 })
    }, SEARCH_DEBOUNCE_MS)
  }

  const goToPage = (nextPage: number) => {
    setOpen(null)
    setFilters((current) => ({ ...current, page: nextPage }))
  }

  const toggle = (id: number, view: "attributes" | "similar") => {
    setOpen((current) => (current?.id === id && current.view === view ? null : { id, view }))
  }

  return <div className="space-y-8">
    <Reveal>
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-yellow-300">Threat memory / 07</p>
        <h2 className="mt-2 text-4xl tracking-tight text-white">Dataset</h2>
        <p className="mt-2 text-sm text-slate-500">Every pipeline run appended to PostgreSQL, searchable and comparable by similarity.</p>
      </div>
    </Reveal>

    <Reveal delay={0.08}>
      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-60 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-slate-600" />
          <input aria-label="Search appended rows" value={searchInput} onChange={(event) => { setSearchInput(event.target.value); applyFiltersSoon(event.target.value, runIdInput) }} placeholder="Search summary, user, source..." className={cn(inputClass, "w-full pl-9")} />
        </div>
        <input aria-label="Filter by run ID" value={runIdInput} onChange={(event) => { setRunIdInput(event.target.value); applyFiltersSoon(searchInput, event.target.value) }} placeholder="Filter by run ID" className={cn(inputClass, "w-full font-mono text-xs sm:w-72")} />
      </div>
    </Reveal>

    {failure?.key === requestKey && <div className="flex items-start gap-2.5 border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-xs text-amber-200"><AlertTriangle className="mt-0.5 size-3.5 shrink-0" />{failure.message}</div>}

    <Reveal delay={0.14}>
      <Card className="border-slate-800 bg-[#0d1520]/85 py-0 backdrop-blur-xl shadow-none">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-800 hover:bg-transparent">
                {["Time", "Run ID", "Source", "Entity", "Summary", "Risk", "Decision", ""].map((heading, index) => <TableHead key={index} className="font-mono text-[10px] uppercase tracking-wider text-slate-500">{heading}</TableHead>)}
              </TableRow>
            </TableHeader>
            <TableBody>
              {page?.items.map((row) => (
                <Fragment key={row.id}>
                  <TableRow className="border-slate-800/70 hover:bg-white/[0.02]">
                    <TableCell className="whitespace-nowrap font-mono text-[11px] text-slate-400">{formatTime(row.event_time)}</TableCell>
                    <TableCell className="font-mono text-[11px] text-slate-500" title={row.run_id}>{row.run_id.slice(0, 12)}…</TableCell>
                    <TableCell className="font-mono text-[11px] text-slate-300">{row.source}</TableCell>
                    <TableCell className="text-xs text-slate-300">{row.user_id ?? "-"}<span className="block font-mono text-[10px] text-slate-600">{row.host}</span></TableCell>
                    <TableCell className="min-w-72 whitespace-normal text-xs leading-5 text-slate-300">{row.summary}</TableCell>
                    <TableCell className="font-mono text-xs text-slate-200">{row.risk_score === null ? "-" : row.risk_score.toFixed(1)}</TableCell>
                    <TableCell><DecisionBadge decision={row.decision} /></TableCell>
                    <TableCell className="whitespace-nowrap text-right">
                      <Button variant="ghost" size="sm" onClick={() => toggle(row.id, "similar")} className="font-mono text-[10px] uppercase tracking-wider">Similar</Button>
                      <Button variant="ghost" size="sm" aria-label="Show attributes" aria-expanded={open?.id === row.id && open.view === "attributes"} onClick={() => toggle(row.id, "attributes")}><ChevronDown className={cn("size-3.5 transition-transform", open?.id === row.id && open.view === "attributes" && "rotate-180")} /></Button>
                    </TableCell>
                  </TableRow>
                  {open?.id === row.id && (
                    <TableRow className="border-slate-800/70 hover:bg-transparent">
                      <TableCell colSpan={COLUMN_COUNT} className="whitespace-normal bg-black/20 px-4 py-3">
                        {open.view === "attributes"
                          ? <pre className="max-h-72 overflow-auto font-mono text-[11px] leading-5 text-slate-400">{JSON.stringify(row.attributes, null, 2)}</pre>
                          : <SimilarRows rowId={row.id} />}
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              ))}
              {!loading && page?.items.length === 0 && (
                <TableRow className="hover:bg-transparent"><TableCell colSpan={COLUMN_COUNT} className="py-12 text-center text-sm text-slate-500">No rows yet. Finish a run on Blue Team Analysis, then choose Append to Database.</TableCell></TableRow>
              )}
              {loading && !page && (
                <TableRow className="hover:bg-transparent"><TableCell colSpan={COLUMN_COUNT} className="py-12 text-center text-xs text-slate-500"><Loader2 className="mx-auto size-4 animate-spin" /></TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </Reveal>

    <div className="flex items-center justify-between gap-4">
      <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500">{page ? `${page.total} rows · page ${page.page} of ${totalPages}` : ""}</p>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" disabled={filters.page <= 1} onClick={() => goToPage(filters.page - 1)} aria-label="Previous page"><ChevronLeft className="size-3.5" /></Button>
        <Button variant="outline" size="sm" disabled={filters.page >= totalPages} onClick={() => goToPage(filters.page + 1)} aria-label="Next page"><ChevronRight className="size-3.5" /></Button>
      </div>
    </div>
  </div>
}
