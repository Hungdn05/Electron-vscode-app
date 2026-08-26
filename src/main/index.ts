import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  IpcMainInvokeEvent,
} from 'electron'
import type { OpenDialogOptions } from 'electron'
import { join } from 'path'
import { pathToFileURL } from 'url'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { ProjectService } from './services/project-service'

let mainWindow: BrowserWindow | null = null

function isTrustedRendererUrl(navigationUrl: string): boolean {
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    return (
      new URL(navigationUrl).origin ===
      new URL(process.env['ELECTRON_RENDERER_URL']).origin
    )
  }

  return (
    navigationUrl ===
    pathToFileURL(join(__dirname, '../renderer/index.html')).toString()
  )
}

function createWindow(): void {
  const window = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#181818',
    title: 'KLTM Workspace',
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })
  mainWindow = window

  window.on('ready-to-show', () => {
    window.show()
  })

  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  window.webContents.session.setPermissionRequestHandler(
    (_webContents, _permission, callback) => {
      callback(false)
    },
  )

  window.webContents.on('will-navigate', (event, navigationUrl) => {
    if (!isTrustedRendererUrl(navigationUrl)) {
      event.preventDefault()
    }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    window.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    window.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function assertMainRenderer(event: IpcMainInvokeEvent): void {
  if (!mainWindow || event.sender.id !== mainWindow.webContents.id) {
    throw new Error('Project requests are only accepted from the main window.')
  }
}

function registerProjectHandlers(projectService: ProjectService): void {
  const chooseDirectory = async (): Promise<string | null> => {
    const dialogOptions: OpenDialogOptions = {
      properties: ['openDirectory', 'createDirectory'],
      title: 'Choose project location',
    }
    const result = mainWindow
      ? await dialog.showOpenDialog(mainWindow, dialogOptions)
      : await dialog.showOpenDialog(dialogOptions)
    return result.canceled ? null : (result.filePaths[0] ?? null)
  }

  ipcMain.handle('projects:list', (event) => {
    assertMainRenderer(event)
    return projectService.listProjects()
  })
  ipcMain.handle('projects:choose-location', (event) => {
    assertMainRenderer(event)
    return projectService.chooseProjectLocation(chooseDirectory)
  })
  ipcMain.handle('projects:create', (event, input) => {
    assertMainRenderer(event)
    return projectService.createProject(input)
  })
  ipcMain.handle('projects:import', (event) => {
    assertMainRenderer(event)
    return projectService.importProject(chooseDirectory)
  })
  ipcMain.handle('projects:rename', (event, id, name) => {
    assertMainRenderer(event)
    return projectService.renameProject(id, name)
  })
  ipcMain.handle('projects:archive', (event, id) => {
    assertMainRenderer(event)
    return projectService.archiveProject(id)
  })
  ipcMain.handle('projects:document', (event, id) => {
    assertMainRenderer(event)
    return projectService.getDocument(id)
  })
  ipcMain.handle('projects:save-document', (event, id, content) => {
    assertMainRenderer(event)
    return projectService.saveDocument(id, content)
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.enableSandbox()

app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('vn.edu.kltm.workspace')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  registerProjectHandlers(
    new ProjectService({
      userDataPath: app.getPath('userData'),
      documentsPath: app.getPath('documents'),
    }),
  )
  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
