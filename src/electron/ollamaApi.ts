// api.ts
import { Worker } from "worker_threads";
import { dialog } from "electron";
import type { IpcMainEvent } from "electron";
import path from "path";
import { promises as fs } from "fs";
import { abort, run, chat, stop, serve, generatePrompt } from "./service/ollama/ollama.js";

// Optional: typing for worker messages
interface WorkerMessage {
  success: boolean;
  embeddings?: any;
  content?: string;
}

let model = "llava";
// @ts-ignore: unused variable
let loadingDoc = false;

function debugLog(msg: string) {
  if (global._debug) {
    console.log(msg);
  }
}

// --------------------
// Model handling
// --------------------
export async function setModel(_event: IpcMainEvent,msg: string) {
  model = msg;
}

export async function getModel(event: IpcMainEvent) {
  event.reply("model:get", { success: true, content: model });
}

// --------------------
// Ollama model
// --------------------
export async function runOllamaModel(event: IpcMainEvent) {
  try {
    await run(model, (json: any) => {
      if (json.status) {
        if (json.status.includes("pulling")) {
          const percent = Math.round((json.completed / json.total) * 100);
          const content = isNaN(percent)
            ? "Downloading AI model..."
            : `Downloading AI model... ${percent}%`;
          event.reply("ollama:run", { success: true, content });
          return;
        }
        if (json.status.includes("verifying")) {
          event.reply("ollama:run", {
            success: true,
            content: "Verifying AI model...",
          });
          return;
        }
      }
      if (json.done) {
        event.reply("ollama:run", { success: true, content: json });
        return;
      }
      event.reply("ollama:run", { success: true, content: "Initializing..." });
    });
  } catch (err: any) {
    console.error(err);
    event.reply("ollama:run", { success: false, content: err.message });
  }
}

// --------------------
// Chat
// --------------------
export async function sendCommand(event: IpcMainEvent, images: string[]) {
  const base64 = await convertImageToBase64(images[0]);
  if (base64) {
    try {
      debugLog("Sending image prompt to Ollama...");
      await chat(model, [base64], (json: any) => {
        event.reply("chat:reply", { success: true, content: json });
      });
    } catch (err: any) {
      console.error(err);
      event.reply("chat:reply", { success: false, content: err.message });
    }
  }
}

export async function sendPrompt(event: IpcMainEvent, prompt: string) {
    try {
      debugLog("Sending prompt to Ollama...");
      await generatePrompt(model, prompt, (json: any) => {
        event.reply("prompt:reply", { success: true, content: json });
      });
    } catch (err: any) {
      console.error(err);
      event.reply("prompt:reply", { success: false, content: err.message });
    }
}

export async function stopChat() {
  await abort();
}

// --------------------
// Document loading
// --------------------
export async function loadDocument(event: IpcMainEvent) {
  loadingDoc = true;
  try {
    const filePath = await selectDocumentFile();
    debugLog(`Loading file: ${filePath}`);
    processDocument(filePath, event);
  } catch (err: any) {
    handleDocumentLoadError(err, event);
  }
}

async function selectDocumentFile(): Promise<string> {
  const options = {
    properties: ["openFile"] as Array<
      | "openFile"
      | "openDirectory"
      | "multiSelections"
      | "showHiddenFiles"
      | "createDirectory"
      | "promptToCreate"
      | "noResolveAliases"
      | "treatPackageAsDirectory"
      | "dontAddToRecent"
    >,
    filters: [
      {
        name: "Text Files",
        extensions: [
          "docx",
          "md",
          "odt",
          "pdf",
          "txt",
          "html",
          "htm",
          "png",
          "jpg",
        ],
      },
    ],
  };

  const result = await dialog.showOpenDialog(options);
  if (result.canceled || result.filePaths.length === 0) {
    throw new Error("No file selected");
  }
  return result.filePaths[0];
}

async function convertImageToBase64(filePath: string): Promise<string | false> {
  try {
    await fs.access(filePath);
    const data = await fs.readFile(filePath);
    return data.toString("base64");
  } catch (err) {
    console.error("Error:", err);
    return false;
  }
}

function processDocument(filePath: string, event: IpcMainEvent) {
  const worker = new Worker(path.join(__dirname, "./src/electron/service/worker.js"));
  worker.postMessage(filePath);

  worker.on("message", async (e: WorkerMessage) => {
    if (e.success) {
      debugLog("Storing embeddings...");
    //   await store(e.embeddings); // You need to import or define `store` somewhere
      debugLog("Embeddings stored");
      event.reply("doc:load", {
        success: true,
        content: path.basename(filePath),
      });
      loadingDoc = false;
    } else {
      event.reply("doc:load", { success: false, content: e.content });
      loadingDoc = false;
    }
  });

  worker.on("error", (err) => handleDocumentLoadError(err, event));
}

function handleDocumentLoadError(err: any, event: IpcMainEvent) {
  loadingDoc = false;
  console.error("Error:", err);
  event.reply("doc:load", { success: false, content: err.message });
}

// --------------------
// Ollama server
// --------------------
export async function serveOllama(event: IpcMainEvent) {
  try {
    const serveType = await serve();
    event.reply("ollama:serve", { success: true, content: serveType });
  } catch (err: any) {
    event.reply("ollama:serve", { success: false, content: err.message });
  }
}

export function stopOllama() {
  console.log('stop ollama server')
  stop();
}
