import fs from "fs";
import os from "os";
import path from "path";
import { exec, ChildProcess } from "child_process";
import { logInfo, logErr } from "../logger.js";
import { isDev } from '../../util.js';
import { app } from 'electron';

// Define serve types
export const OllamaServeType = {
    SYSTEM: "system",
    PACKAGED: "packaged",
} as const;

export type OllamaServeType = typeof OllamaServeType[keyof typeof OllamaServeType];

interface OllamaModule {
    Ollama: new (opts: { host: string }) => OllamaInstance;
}

interface OllamaInstance {
    pull(options: { model: string; stream: boolean }): AsyncIterable<any>;
    generate(options: { model: string; prompt: string; system?: string; suffix?: string; stream?: boolean; format?: string }): Promise<any> | AsyncIterable<any>;
    chat(options: { model: string; messages?: any[]; stream?: boolean; format?: string }): Promise<any> | AsyncIterable<any>;
    abort(): void;
}

type Message = {
    role: string;
    content: string;
    images?: string[];
    format?: string;
};

const imgSystem: Message = {
    role: "system",
    content: `
        You are a vision assistant. Look at the photo and identify the main objects you see.

        Instructions:
        1. Always respond with a single JSON object.
        2. The object must have exactly one key: "description".
        3. Do NOT include the question, any extra text, or explanations.
        4. Example of valid response:
        {
            "description": "A Siamese cat sitting on a wooden table outdoors."
        }`,
}


const promptSystem: string = 'You are a helpful AI assistant that good at telling joke';

export class OllamaOrchestrator {
    private static instance: OllamaOrchestrator | null = null;
    private childProcess: ChildProcess | null = null;
    private messages: Message[] = [imgSystem];
    private host = "http://127.0.0.1:11434";
    private ollama: OllamaInstance;

    private constructor(ollamaModule: OllamaModule) {
        this.ollama = new ollamaModule.Ollama({ host: this.host });
    }

    static async getOllama(): Promise<OllamaOrchestrator> {
        if (!this.instance) {
            const ollamaModule = (await import("ollama")) as unknown as OllamaModule;
            this.instance = new OllamaOrchestrator(ollamaModule);
        }
        return this.instance;
    }

    async serve(): Promise<OllamaServeType> {
        try {
            await this.ping();
            return OllamaServeType.SYSTEM;
        } catch (err) {
            logInfo(`Ollama is not running: ${err}`);
        }

        try {
            await this.execServe("ollama");
            return OllamaServeType.SYSTEM;
        } catch (err) {
            logInfo(`Ollama is not installed on the system: ${err}`);
        }
        logInfo("HereXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX")
        logInfo(process.platform)
        let exe = "";
        let appDataPath = "";
        switch (process.platform) {
            case "win32":
                exe = "ollama.exe";
                appDataPath = path.join(os.homedir(), "AppData", "Local", "aiapp");
                logInfo('app data path: ' + appDataPath)
                break;
            case "darwin":
                exe = "ollama-darwin";
                appDataPath = path.join(os.homedir(), "Library", "Application Support", "aiapp");
                break;
            case "linux":
                exe = "ollama-linux";
                appDataPath = path.join(os.homedir(), ".config", "aiapp");
                break;
            default:
                logErr(`unsupported platform: ${process.platform}`);
                throw new Error(`Unsupported platform: ${process.platform}`);
        }
        logInfo("-------------------------------------------------------")
        logInfo(app.getAppPath())
        const pathToBinary = isDev() ? path.join(app.getAppPath(), "src", "electron", "service", "ollama", "runners", exe) : path.join(__dirname, "runners", exe);
        logInfo("path to binary: " + pathToBinary)

        try {
            await this.execServe(pathToBinary, appDataPath);
            return OllamaServeType.PACKAGED;
        } catch (err) {
            logErr(`Failed to start Ollama: ${err}`);
            throw new Error(`Failed to start Ollama: ${err}`);
        }
    }

    private async execServe(pathToBinary: string, appDataDirectory?: string): Promise<void> {
        return new Promise((resolve, reject) => {
            if (appDataDirectory && !fs.existsSync(appDataDirectory)) {
                fs.mkdirSync(appDataDirectory, { recursive: true });
            }
            const env = { ...process.env, OLLAMA_MODELS: appDataDirectory };
            this.childProcess = exec(pathToBinary + " serve", { env }, (err, stdout, stderr) => {
                if (err) reject(`exec error: ${err}`);
                else if (stderr) reject(`ollama stderr: ${stderr}`);
                else reject(`ollama stdout: ${stdout}`);
            });

            this.waitForPing()
                .then(resolve)
                .catch((pingError) => {
                    if (this.childProcess && !this.childProcess.killed) this.childProcess.kill();
                    reject(pingError);
                });
        });
    }

    async pull(model: string, fn: (part: any) => void) {
        logInfo("pulling model: " + model);
        const stream = await this.ollama.pull({ model, stream: true });
        for await (const part of stream) fn(part);
    }

    async run(model: string, fn: (loaded: any) => void) {
        try {
            await this.pull(model, fn);
        } catch (err: any) {
            logErr("failed to pull before run: " + err);
            if (!err.message.includes("pull model manifest")) throw err;
            logInfo("aiapp is running offline, failed to pull");
        }
        const loaded = await this.ollama.chat({ model });
        fn(loaded);
    }

    stop() {
        if (!this.childProcess) return;

        if (os.platform() === "win32") {
            exec(`taskkill /pid ${this.childProcess.pid} /f /t`, (err) => {
                if (err) logErr(`Failed to kill process ${this.childProcess?.pid}: ${err}`);
            });
        } else this.childProcess.kill();

        this.childProcess = null;
    }

    async ping(): Promise<boolean> {
        const response = await fetch(this.host, { method: "GET", cache: "no-store" });
        if (response.status !== 200) throw new Error(`failed to ping ollama server: ${response.status}`);
        logInfo("ollama server is running");
        return true;
    }

    async waitForPing(delay = 1000, retries = 5): Promise<void> {
        for (let i = 0; i < retries; i++) {
            try {
                await this.ping();
                return;
            } catch (err) {
                logInfo("waiting for ollama server...");
                logInfo(err as string);
                await new Promise((resolve) => setTimeout(resolve, delay));
            }
        }
        logErr("max retries reached. Ollama server didn't respond.");
        throw new Error("Max retries reached. Ollama server didn't respond.");
    }

    async sendCommand(model: string, images: string[], fn: (part: any) => void) {

        this.messages.push({
            role: "user",
            content: "What is in the picture",
            images: images || [],
            format: "json",
        });

        const assistant: Message = {
            role: "assistant",
            content: `
                You are a vision assistant. Look at the photo and identify the main objects you see.

                Instructions:
                1. Always respond with a single JSON object.
                2. The object must have exactly one key: "description".
                3. Do NOT include the question, any extra text, or explanations.
                4. Example of valid response:
                {
                    "description": "A Siamese cat sitting on a wooden table outdoors."
                }`,
        };

        try {
            const stream = await this.ollama.chat({ model, messages: this.messages, stream: true, format: "json" });
            for await (const part of stream) {
                assistant.content += part.message.content;
                fn(part);
            }
        } catch (error: any) {
            if (!(error instanceof Error && error.name === "AbortError")) throw error;
        }

        this.messages.push(assistant);
    }

    async sendPrompt(model: string, prompt: string, fn: (part: any) => void) {
        try {
            const stream = await this.ollama.generate({ model, prompt, system: promptSystem, stream: true, format: "json" });
            for await (const part of stream) {
                fn(part);
            }
        } catch (error: any) {
            if (!(error instanceof Error && error.name === "AbortError")) throw error;
        }
    }

    abortRequest() {
        this.ollama.abort();
    }
}

// Export wrapper functions
export async function run(model: string, fn: (loaded: any) => void) {
    const ollama = await OllamaOrchestrator.getOllama();
    return ollama.run(model, fn);
}

export async function chat(model: string, images: string[], fn: (part: any) => void) {
    const ollama = await OllamaOrchestrator.getOllama();
    return ollama.sendCommand(model, images, fn);
}

export async function generatePrompt(model: string, prompt: string, fn: (part: any) => void) {
    const ollama = await OllamaOrchestrator.getOllama();
    return ollama.sendPrompt(model, prompt, fn);
}

export async function abort() {
    const ollama = await OllamaOrchestrator.getOllama();
    return ollama.abortRequest();
}

export async function stop() {
    const ollama = await OllamaOrchestrator.getOllama();
    return ollama.stop();
}

export async function serve(): Promise<OllamaServeType> {
    const ollama = await OllamaOrchestrator.getOllama();
    return ollama.serve();
}
