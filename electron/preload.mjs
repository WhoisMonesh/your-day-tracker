import { contextBridge } from 'electron'

contextBridge.exposeInMainWorld('desktop', {
  ping: () => 'pong'
})
