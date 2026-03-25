// Settings store using localStorage (single-user desktop app)
// This module manages persistent settings for the Ferraille Desktop app.

const SETTINGS_KEYS = {
  API_BASE_URL: 'API_BASE_URL',
  THEME: 'APP_THEME',
  LAST_FILTERS: 'LAST_FILTERS',
} as const

export type SettingsKey = (typeof SETTINGS_KEYS)[keyof typeof SETTINGS_KEYS]

export function getSetting(key: SettingsKey): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

export function setSetting(key: SettingsKey, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch (err) {
    console.error('Failed to save setting:', key, err)
  }
}

export function removeSetting(key: SettingsKey): void {
  try {
    localStorage.removeItem(key)
  } catch (err) {
    console.error('Failed to remove setting:', key, err)
  }
}

export function getApiUrl(): string {
  return getSetting(SETTINGS_KEYS.API_BASE_URL) || 'http://localhost:3000'
}

export function setApiUrl(url: string): void {
  setSetting(SETTINGS_KEYS.API_BASE_URL, url)
}

export function isApiConfigured(): boolean {
  const url = getSetting(SETTINGS_KEYS.API_BASE_URL)
  return url !== null && url.trim() !== ''
}

export { SETTINGS_KEYS }
