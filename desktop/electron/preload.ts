import { contextBridge, ipcRenderer } from 'electron'

export interface ElectronAPI {
  savePdf: (buffer: ArrayBuffer, defaultName: string) => Promise<{ success: boolean; canceled?: boolean; filePath?: string; error?: string }>
  openExternal: (url: string) => Promise<void>
  getVersion: () => Promise<string>
  onUpdateAvailable: (cb: () => void) => void
  onUpdateDownloaded: (cb: () => void) => void
  installUpdate: () => void
  removeUpdateListeners: () => void
}

contextBridge.exposeInMainWorld('electronAPI', {
  savePdf: (buffer: ArrayBuffer, defaultName: string) =>
    ipcRenderer.invoke('save-pdf', buffer, defaultName),

  openExternal: (url: string) =>
    ipcRenderer.invoke('open-external', url),

  getVersion: () =>
    ipcRenderer.invoke('get-version'),

  onUpdateAvailable: (cb: () => void) => {
    ipcRenderer.on('update-available', cb)
  },

  onUpdateDownloaded: (cb: () => void) => {
    ipcRenderer.on('update-downloaded', cb)
  },

  installUpdate: () => {
    ipcRenderer.send('install-update')
  },

  removeUpdateListeners: () => {
    ipcRenderer.removeAllListeners('update-available')
    ipcRenderer.removeAllListeners('update-downloaded')
  },
} as ElectronAPI)
