export interface OllamaAPI {
  sendCommand: (text: string) => void;
  onChatReply: (callback: (event: any, data: any) => void) => void;
  sendPrompt: (text: string) => void;
  onPromptReply: (callback: (event: any, data: any) => void) => void;
  stopChat: () => void;
  loadDocument: () => void;
  onDocumentLoaded: (callback: (event: any, data: any) => void) => void;
  serveOllama: () => void;
  onOllamaServe: (callback: (event: any, data: any) => void) => void;
  runOllama: () => void;
  onOllamaRun: (callback: (event: any, data: any) => void) => void;
  getModel: () => void;
  onModelGet: (callback: (event: any, data: any) => void) => void;
  setModel: (model: string) => void;
}

interface Window {
  API: {
    ollama: OllamaAPI
  };
}

