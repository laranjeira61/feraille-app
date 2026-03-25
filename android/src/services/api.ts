import axios, { AxiosInstance } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Employe {
  id: number;
  nom: string;
}

export interface FicheData {
  employe_id: number;
  employe_nom: string;
  client: string;
  /** Base64 PNG data URI of the drawing canvas */
  notes_dessin: string;
  source: string;
}

// ─── AsyncStorage key ────────────────────────────────────────────────────────

export const API_URL_KEY = 'API_BASE_URL';

// ─── Axios instance factory ──────────────────────────────────────────────────

let _client: AxiosInstance | null = null;

/**
 * Reads the stored API base URL and returns a fresh axios instance.
 * Always rebuilds from AsyncStorage so settings changes take effect immediately.
 */
export async function getClient(): Promise<AxiosInstance> {
  const baseURL = (await AsyncStorage.getItem(API_URL_KEY)) ?? '';
  _client = axios.create({
    baseURL: baseURL.trim(),
    timeout: 10_000,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  });
  return _client;
}

// ─── API calls ───────────────────────────────────────────────────────────────

/**
 * Fetches the list of employees from GET /api/employes
 */
export async function getEmployes(): Promise<Employe[]> {
  const client = await getClient();
  const response = await client.get<Employe[]>('/api/employes');
  return response.data;
}

/**
 * Sends a new fiche to POST /api/fiches
 */
export async function createFiche(data: FicheData): Promise<void> {
  const client = await getClient();
  await client.post('/api/fiches', data);
}

/**
 * Checks API version from GET /api/version
 * Returns the version string or throws on error.
 */
export async function checkVersion(): Promise<string> {
  const client = await getClient();
  const response = await client.get<{ version: string }>('/api/version');
  return response.data.version;
}

/**
 * Returns the currently stored API base URL, or empty string if not set.
 */
export async function getApiUrl(): Promise<string> {
  return (await AsyncStorage.getItem(API_URL_KEY)) ?? '';
}

/**
 * Saves a new API base URL to AsyncStorage.
 */
export async function saveApiUrl(url: string): Promise<void> {
  await AsyncStorage.setItem(API_URL_KEY, url.trim());
}
