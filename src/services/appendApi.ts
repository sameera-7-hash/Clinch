import { apiRequest } from "@/lib/auth"
import type { AnalyzeResponse } from "@/services/api"

export interface AppendRecord {
  attack_type: string
  fraud_label: number
  event_time: string
  transaction: Record<string, unknown>
  signals: Record<string, number>
  // Null for orchestrator scenarios the Blue Team didn't score.
  analysis: AnalyzeResponse | null
}

export type AppendTaskStatus = "queued" | "running" | "done" | "failed"

export interface StartAppendResponse {
  task_id: number
  status: AppendTaskStatus
  rows_appended: number
  already_appended: boolean
}

export interface AppendTask {
  task_id: number
  run_id: string
  status: AppendTaskStatus
  rows_appended: number
  error: string | null
}

export function startAppend(runId: string, records: AppendRecord[]) {
  return apiRequest<StartAppendResponse>(`/api/append/${encodeURIComponent(runId)}`, {
    method: "POST",
    body: JSON.stringify({ records }),
  })
}

export function getAppendTask(taskId: number) {
  return apiRequest<AppendTask>(`/api/append/tasks/${taskId}`)
}

export interface DatasetRow {
  id: number
  run_id: string
  source: string
  user_id: string | null
  host: string | null
  src_ip: string | null
  event_time: string
  event_text: string
  summary: string | null
  risk_score: number | null
  decision: string | null
  attributes: Record<string, unknown>
  similarity?: number
}

export interface DatasetPage {
  items: DatasetRow[]
  total: number
  page: number
  page_size: number
}

export function listDataset(params: { page: number; pageSize: number; search: string; runId: string }) {
  const query = new URLSearchParams({ page: String(params.page), page_size: String(params.pageSize) })
  if (params.search) query.set("search", params.search)
  if (params.runId) query.set("run_id", params.runId)
  return apiRequest<DatasetPage>(`/api/dataset?${query}`)
}

export function getSimilarRows(rowId: number, k = 5) {
  return apiRequest<{ items: DatasetRow[] }>(`/api/dataset/${rowId}/similar?k=${k}`)
}
