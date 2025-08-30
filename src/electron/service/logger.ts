import path from "path";
import os from "os";
import winston, { Logger as WinstonLogger } from "winston";

class Logger {
  private static instance: Logger | null = null;
  public logger: WinstonLogger;

  private constructor() {
    const logPath = path.join(os.homedir(), ".aiapp", "service.log");

    this.logger = winston.createLogger({
      format: winston.format.simple(),
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({
          filename: logPath,
          maxsize: 1_000_000, // 1 MB
          maxFiles: 1,
        }),
      ],
    });
  }

  public static getLogger(): Logger {
    if (!this.instance) {
      this.instance = new Logger();
    }
    return this.instance;
  }
}

export function logInfo(msg: string): void {
  console.log(msg);
  Logger.getLogger().logger.info(msg);
}

export function logErr(msg: string): void {
  console.log(msg);
  Logger.getLogger().logger.error(msg);
}
