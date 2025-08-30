import { sendPrompt } from "./ollamaApi";

const { contextBridge, ipcRenderer } = require("electron");

// Expose the API to the renderer process
contextBridge.exposeInMainWorld("API", {
  ollama: {
    sendCommand: (text: string) => ipcRenderer.send("chat:send", text),
    onChatReply: (callback: (event: any, data: any) => void) => {
      ipcRenderer.on("chat:reply", (event: any, data: any) => callback(event, data));
    },
    sendPrompt: (text: string) => ipcRenderer.send("prompt:send", text),
    onPromptReply: (callback: (event: any, data: any) => void) => {
      ipcRenderer.on("prompt:reply", (event: any, data: any) => callback(event, data));
    },
    stopChat: () => ipcRenderer.send("chat:stop"),
    loadDocument: () => ipcRenderer.send("doc:load"),
    onDocumentLoaded: (callback: (event: any, data: any) => void) => {
      ipcRenderer.on("doc:load", (event: any, data: any) => callback(event, data));
    },
    serveOllama: () => ipcRenderer.send("ollama:serve"),
    onOllamaServe: (callback: (event: any, data: any) => void) => {
      ipcRenderer.on("ollama:serve", (event: any, data: any) => callback(event, data));
    },
    runOllama: () => ipcRenderer.send("ollama:run"),
    onOllamaRun: (callback: (event: any, data: any) => void) => {
      ipcRenderer.on("ollama:run", (event: any, data: any) => callback(event, data));
    },
    getModel: () => ipcRenderer.send("model:get"),
    onModelGet: (callback: (event: any, data: any) => void) => {
      ipcRenderer.on("model:get", (event: any, data: any) => callback(event, data));
    },
    setModel: (model: string) => ipcRenderer.send("model:set", model),
  },
  db: {
    user: {
      getAllUser: async () => ipcRenderer.invoke("user:getAll"),
      addUser: async (name: string, email: string, age: number) => ipcRenderer.invoke("user:add", name, email, age),
    }
  }
});
