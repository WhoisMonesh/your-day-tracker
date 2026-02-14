import { app, BrowserWindow } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const createWindow = () => {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })
  if (typeof win.removeMenu === 'function') {
    win.removeMenu()
  } else {
    win.setMenu(null)
  }
  const devUrl = process.env.VITE_DEV_SERVER_URL
  if (devUrl) {
    win.loadURL(devUrl).catch(() => {
      win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
    })
  } else {
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }
  win.webContents.on('did-fail-load', () => {
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  })
}

app.whenReady().then(() => {
  app.setAppUserModelId('com.yourdaytracker.app')
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
