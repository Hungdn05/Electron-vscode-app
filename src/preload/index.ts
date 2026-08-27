import { contextBridge } from 'electron'
import { ipcRenderer } from 'electron'

const kltmApi = Object.freeze({
  platform: process.platform,
  projects: Object.freeze({
    list: () => ipcRenderer.invoke('projects:list'),
    chooseLocation: () => ipcRenderer.invoke('projects:choose-location'),
    create: (input: { name: string; locationToken?: string }) =>
      ipcRenderer.invoke('projects:create', input),
    import: () => ipcRenderer.invoke('projects:import'),
    rename: (id: string, name: string) =>
      ipcRenderer.invoke('projects:rename', id, name),
    archive: (id: string) => ipcRenderer.invoke('projects:archive', id),
    getDocument: (id: string) => ipcRenderer.invoke('projects:document', id),
    saveDocument: (id: string, content: string) =>
      ipcRenderer.invoke('projects:save-document', id, content),
  }),
})

contextBridge.exposeInMainWorld('kltm', kltmApi)
