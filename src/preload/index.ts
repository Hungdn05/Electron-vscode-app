import { contextBridge } from 'electron'

const kltmApi = Object.freeze({
  platform: process.platform,
})

contextBridge.exposeInMainWorld('kltm', kltmApi)
