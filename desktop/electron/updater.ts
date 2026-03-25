import { BrowserWindow } from 'electron'
import { autoUpdater } from 'electron-updater'

export function checkForUpdates(win: BrowserWindow) {
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('checking-for-update', () => {
    console.log('[Updater] Checking for updates...')
  })

  autoUpdater.on('update-available', (info) => {
    console.log('[Updater] Update available:', info.version)
    win.webContents.send('update-available', info)
  })

  autoUpdater.on('update-not-available', (info) => {
    console.log('[Updater] No update available. Current version:', info.version)
  })

  autoUpdater.on('download-progress', (progressObj) => {
    const logMessage = `[Updater] Download speed: ${progressObj.bytesPerSecond} - Downloaded ${progressObj.percent.toFixed(0)}%`
    console.log(logMessage)
    win.webContents.send('update-download-progress', progressObj.percent)
  })

  autoUpdater.on('update-downloaded', (info) => {
    console.log('[Updater] Update downloaded:', info.version)
    win.webContents.send('update-downloaded', info)
  })

  autoUpdater.on('error', (err) => {
    console.error('[Updater] Error:', err.message)
  })

  try {
    autoUpdater.checkForUpdatesAndNotify()
  } catch (err) {
    console.error('[Updater] checkForUpdatesAndNotify error:', err)
  }
}
