import axios from 'axios'

// ─── Types ────────────────────────────────────────────────────────────────────

export type StatutFiche = 'EN_ATTENTE' | 'TRAITEE' | 'A_REVOIR'
export type SourceFiche = 'TABLETTE' | 'BUREAU'

export interface Fiche {
  id: number
  date: string
  employe_id: number
  employe_nom: string
  client: string
  notes_dessin: string | null  // base64 data URL
  notes_texte: string | null
  statut: StatutFiche
  commentaire_secretaire: string | null
  source: SourceFiche
  created_at: string
}

export interface Employe {
  id: number
  nom: string
  actif: boolean
  created_at: string
}

export interface FicheFilters {
  date_debut?: string
  date_fin?: string
  statut?: StatutFiche | ''
  client?: string
  employe_id?: number | ''
}

export interface ExportPdfParams {
  mode: 'single' | 'month' | 'range'
  ids?: number[]
  month?: string   // YYYY-MM
  date_debut?: string
  date_fin?: string
}

// ─── API URL Management ───────────────────────────────────────────────────────

const DEFAULT_API_URL = 'http://localhost:3000'
const API_URL_KEY = 'API_BASE_URL'

export function getApiUrl(): string {
  return localStorage.getItem(API_URL_KEY) || DEFAULT_API_URL
}

export function setApiUrl(url: string): void {
  localStorage.setItem(API_URL_KEY, url)
  apiClient.defaults.baseURL = url
}

// ─── Axios instance ───────────────────────────────────────────────────────────

const apiClient = axios.create({
  baseURL: getApiUrl(),
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Update baseURL dynamically when API URL changes
apiClient.interceptors.request.use((config) => {
  const url = getApiUrl()
  // Ensure URL has a protocol prefix
  config.baseURL = url.startsWith('http') ? url : `http://${url}`
  return config
})

// ─── API functions ────────────────────────────────────────────────────────────

export async function getFiches(filters: FicheFilters = {}): Promise<Fiche[]> {
  const params: Record<string, string | number> = {}

  if (filters.date_debut) params.date_debut = filters.date_debut
  if (filters.date_fin) params.date_fin = filters.date_fin
  if (filters.statut) params.statut = filters.statut
  if (filters.client) params.client = filters.client
  if (filters.employe_id) params.employe_id = filters.employe_id

  const response = await apiClient.get<Fiche[]>('/api/fiches', { params })
  return response.data
}

export async function getFiche(id: number): Promise<Fiche> {
  const response = await apiClient.get<Fiche>(`/api/fiches/${id}`)
  return response.data
}

export async function updateFiche(
  id: number,
  data: { statut?: StatutFiche; commentaire_secretaire?: string }
): Promise<void> {
  await apiClient.put(`/api/fiches/${id}`, data)
}

export async function getEmployes(): Promise<Employe[]> {
  const response = await apiClient.get<Employe[]>('/api/employes')
  return response.data
}

export async function createEmploye(nom: string): Promise<Employe> {
  const response = await apiClient.post<Employe>('/api/employes', { nom })
  return response.data
}

export async function updateEmploye(
  id: number,
  data: { nom?: string; actif?: boolean }
): Promise<void> {
  await apiClient.put(`/api/employes/${id}`, data)
}

export async function deleteEmploye(id: number): Promise<void> {
  await apiClient.delete(`/api/employes/${id}`)
}

export async function deleteFiche(id: number): Promise<void> {
  await apiClient.delete(`/api/fiches/${id}`)
}

export async function exportPdf(params: ExportPdfParams): Promise<ArrayBuffer> {
  const queryParams: Record<string, string> = { mode: params.mode }

  if (params.ids && params.ids.length > 0) {
    queryParams.ids = params.ids.join(',')
  }
  if (params.month) queryParams.month = params.month
  if (params.date_debut) queryParams.date_debut = params.date_debut
  if (params.date_fin) queryParams.date_fin = params.date_fin

  const response = await apiClient.get('/api/export/pdf', {
    params: queryParams,
    responseType: 'arraybuffer',
    timeout: 60000,
  })

  return response.data as ArrayBuffer
}

export async function getSetting(key: string): Promise<string | null> {
  try {
    const response = await apiClient.get<{ key: string; value: string }>(`/api/settings/${key}`)
    return response.data.value
  } catch {
    return null
  }
}

export async function setSetting(key: string, value: string): Promise<void> {
  await apiClient.put(`/api/settings/${key}`, { value })
}

export default apiClient
