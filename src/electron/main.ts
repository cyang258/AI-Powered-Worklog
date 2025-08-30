import { isDev } from "./util.js";
import {
  app,
  dialog,
  BrowserWindow,
  session,
  ipcMain,
  autoUpdater,
} from "electron";
// import os from "os";
import path from "path";
// import { fileURLToPath } from "url";
import winston from "winston";
import {
  getModel,
  setModel,
  sendCommand,
  sendPrompt,
  stopChat,
  serveOllama,
  stopOllama,
  loadDocument,
  runOllamaModel,
} from "./ollamaApi.js";
import { getPreloadPath } from "./pathResolver.js";
import { initDB } from "./database/db.js";
import { 
  getAllUsers,
  addUser  
} from "./databaseApi.js";

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// Global debug flag
declare global {
  var _debug: boolean;
}
global._debug = false;

// const appVersion = app.getVersion();
// const osType = os.type(); // e.g., 'Darwin', 'Windows_NT'
// const osArch = os.arch(); // e.g., 'x64', 'ia32'
const updateURL = "/";

// Winston logger
const logger = winston.createLogger({
  format: winston.format.simple(),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({
      filename: path.join(app.getPath("home"), ".aiapp", "app.log"),
      maxsize: 1_000_000, // 1 MB
      maxFiles: 1,
    }),
  ],
});

// // Handle creating/removing shortcuts on Windows when installing/uninstalling
// const squirrelStartup = await import("electron-squirrel-startup");
// if (squirrelStartup.default) {
//   app.quit();
// }

const createWindow = (): void => {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: getPreloadPath(),
      contextIsolation: true,
    },
    autoHideMenuBar: true,
  });

  if (isDev()) {
    mainWindow.loadURL("http://localhost:5123");
  } else {
    mainWindow.loadFile(path.join(app.getAppPath(), "/dist-react/index.html"));
  }

  if (!app.isPackaged) {
    global._debug = true;
    mainWindow.webContents.openDevTools();
  }
};

app.on("ready", () => {
  // IPC event handlers
  ipcMain.on("model:set", setModel);
  ipcMain.on("model:get", getModel);
  ipcMain.on("chat:send", sendCommand);
  ipcMain.on("prompt:send", sendPrompt);
  ipcMain.on("chat:stop", stopChat);
  ipcMain.on("doc:load", loadDocument);
  ipcMain.on("ollama:serve", serveOllama);
  ipcMain.on("ollama:run", runOllamaModel);
  ipcMain.on("ollama:stop", stopOllama);
  ipcMain.handle("user:getAll", async () => {
    const { success, content } = await getAllUsers();
    return content;
  });
  ipcMain.handle("user:add", async () => addUser);

  if (app.isPackaged) {
    // macOS: move to Applications folder if needed
    if (process.platform === "darwin" && !app.isInApplicationsFolder()) {
      const chosen = dialog.showMessageBoxSync({
        type: "question",
        buttons: ["Move to Applications", "Do Not Move"],
        message:
          "Would you like to move this AI app to the Applications folder?",
        defaultId: 0,
        cancelId: 1,
      });

      if (chosen === 0) {
        try {
          app.moveToApplicationsFolder();
        } catch (err: any) {
          dialog.showErrorBox(
            "Unable to move to Applications folder",
            err.message
          );
        }
      }
    }

    // Auto-update (Windows)
    if (process.platform === "win32") {
      autoUpdater.setFeedURL({ url: updateURL });
      autoUpdater.checkForUpdates();
      setInterval(() => autoUpdater.checkForUpdates(), 3_600_000); // 1 hour

      autoUpdater.on("update-available", () => logger.info("Update available"));
      autoUpdater.on("update-downloaded", () =>
        logger.info("Update downloaded")
      );
      autoUpdater.on("error", (err) =>
        logger.error("Error in auto-updater: ", err)
      );
    }
  }
  // Init DB
  initDB();
  createWindow();

  // Content Security Policy
  const csp = isDev()
    ? "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline';"
    : "default-src 'self'; script-src 'self'; style-src 'self';";

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        "Content-Security-Policy": [csp],
      },
    });
  });
});

app.on("window-all-closed", () => {
  stopOllama();
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
