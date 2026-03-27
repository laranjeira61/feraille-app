import { app, BrowserWindow, ipcMain, dialog, shell, Menu, Notification } from 'electron'
import { join } from 'path'
import { writeFile } from 'fs/promises'
import { checkForUpdates } from './updater'

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

let mainWindow: BrowserWindow | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 1000,
    minHeight: 600,
    title: 'TicketPro',
    backgroundColor: '#f0f2f5',
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    show: false,
  })

  // Load app
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(join(__dirname, '../dist/index.html'))
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // Build application menu
  buildMenu()

  // Check for updates after 3 seconds
  setTimeout(() => {
    if (!isDev) {
      checkForUpdates(mainWindow!)
    }
  }, 3000)
}

function buildMenu() {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'Fichier',
      submenu: [
        { label: 'Quitter', accelerator: 'CmdOrCtrl+Q', click: () => app.quit() },
      ],
    },
    {
      label: 'Édition',
      submenu: [
        { role: 'undo', label: 'Annuler' },
        { role: 'redo', label: 'Rétablir' },
        { type: 'separator' },
        { role: 'cut', label: 'Couper' },
        { role: 'copy', label: 'Copier' },
        { role: 'paste', label: 'Coller' },
        { role: 'selectAll', label: 'Tout sélectionner' },
      ],
    },
    {
      label: 'Affichage',
      submenu: [
        { role: 'reload', label: 'Recharger' },
        { role: 'toggleDevTools', label: 'Outils de développement' },
        { type: 'separator' },
        { role: 'resetZoom', label: 'Zoom par défaut' },
        { role: 'zoomIn', label: 'Zoom avant' },
        { role: 'zoomOut', label: 'Zoom arrière' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Plein écran' },
      ],
    },
    {
      label: 'Aide',
      submenu: [
        {
          label: 'À propos',
          click: () => {
            dialog.showMessageBox(mainWindow!, {
              type: 'info',
              title: 'À propos de TicketPro',
              message: 'TicketPro',
              detail: `Version: ${app.getVersion()}\nApplication de gestion des fiches pour ferrailleur.\n\n© 2024 - Tous droits réservés`,
              buttons: ['OK'],
            })
          },
        },
      ],
    },
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

// IPC: Save PDF to disk via dialog
ipcMain.handle('save-pdf', async (_event, buffer: ArrayBuffer, defaultName: string) => {
  if (!mainWindow) return { success: false, error: 'No window' }

  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Enregistrer le PDF',
    defaultPath: defaultName,
    filters: [{ name: 'PDF Files', extensions: ['pdf'] }],
  })

  if (canceled || !filePath) {
    return { success: false, canceled: true }
  }

  try {
    await writeFile(filePath, Buffer.from(buffer))
    // Open the saved file
    await shell.openPath(filePath)
    return { success: true, filePath }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    return { success: false, error: message }
  }
})

// IPC: Open URL in default browser
ipcMain.handle('open-external', async (_event, url: string) => {
  await shell.openExternal(url)
})

// IPC: Get app version
ipcMain.handle('get-version', () => {
  return app.getVersion()
})

// IPC: Install update
ipcMain.on('install-update', () => {
  const { autoUpdater } = require('electron-updater')
  autoUpdater.quitAndInstall()
})

// IPC: Show update notification
ipcMain.handle('show-update-notification', (_event, type: 'available' | 'downloaded') => {
  if (Notification.isSupported()) {
    const notification = new Notification({
      title: 'TicketPro',
      body: type === 'available'
        ? 'Une mise à jour est disponible. Téléchargement en cours...'
        : 'Mise à jour prête. Redémarrez l\'application pour l\'installer.',
    })
    notification.show()
  }
})

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

export { mainWindow }
