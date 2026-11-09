// Client for the Clinch API (clinch-api/). Requests are same-origin: Vite proxies /api
// in development, so the httpOnly session cookie travels without any CORS setup.
export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response
  try {
    response = await fetch(path, {
      ...options,
      headers: options.body ? { "Content-Type": "application/json" } : undefined,
    })
  } catch {
    throw new ApiError("Could not reach the Clinch API.", 0)
  }
  if (response.status === 204) return undefined as T

  const data = await response.json().catch(() => null)
  if (!response.ok) {
    // FastAPI returns a string for HTTPException and a list for validation errors.
    const detail = typeof data?.detail === "string" ? data.detail : data?.detail?.[0]?.msg
    throw new ApiError(detail ?? "Could not reach the Clinch API.", response.status)
  }
  return data as T
}

export interface AuthUser {
  id: number
  email: string
  name: string | null
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    return await apiRequest<AuthUser>("/api/auth/me")
  } catch {
    return null
  }
}

export function signUp(email: string, password: string, name: string) {
  return apiRequest<AuthUser>("/api/auth/signup", { method: "POST", body: JSON.stringify({ email, password, name }) })
}

export function signIn(email: string, password: string) {
  return apiRequest<AuthUser>("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) })
}

export function signOut() {
  return apiRequest<void>("/api/auth/logout", { method: "POST" })
}

export function requestPasswordReset(email: string) {
  return apiRequest<{ message: string }>("/api/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  })
}

export function resetPassword(token: string, newPassword: string) {
  return apiRequest<{ message: string }>("/api/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ token, new_password: newPassword }),
  })
}
