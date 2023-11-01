import { backend, imageGenUrl, sleep } from "./common";
import { ServerStatus } from "./types";

const { STARTUP_CHECK_INTERVAL = "1000", STARTUP_CHECK_MAX_TRIES = "300" } = process.env;

const startupCheckInterval = parseInt(STARTUP_CHECK_INTERVAL);
const startupCheckMaxTries = parseInt(STARTUP_CHECK_MAX_TRIES);

export async function waitForStableFastQRCodeToStart(): Promise<void> {
  const url = new URL("/hc", imageGenUrl);
  let retries = 0;
  while (retries < startupCheckMaxTries) {
    try {
      const res = await fetch(url.toString());
      if (res.ok) {
        return;
      }
    } catch (e) {
      // Ignore
    }
    retries++;
    await sleep(startupCheckInterval);
  }
  
  throw new Error(`Stable Fast QR Code did not start after ${(startupCheckInterval / 1000) * startupCheckMaxTries} seconds`);
}

/**
 * Uses the status endpoint to get the status of the SDNext server.
 * @returns The status of the SDNext server
 */
async function getSDNextServerStatus(): Promise<ServerStatus> {
  const url = new URL("/sdapi/v1/system-info/status?state=true&memory=true&full=true&refresh=true", imageGenUrl);
  const response = await fetch(url.toString());
  const json = await response.json();
  return json as ServerStatus;
}

/**
 * Uses the log endpoint to get the last 5 lines of the SDNext server logs.
 * This is used to determine when the model has finished loading.
 * @returns The last 5 lines of the SDNext server logs
 */
async function getSDNextLogs(): Promise<string[]> {
  const url = new URL("/sdapi/v1/log?lines=5&clear=true", imageGenUrl);
  const response = await fetch(url.toString());
  const json = await response.json();
  return json as string[];
}


export async function waitForSDNextToStart(): Promise<void> {
  let retries = 0;
  /**
   * Wait for the server to start
   */
  while (retries < startupCheckMaxTries) {
    try {
      await getSDNextServerStatus();
      console.log("SDNext server started")
      break;
    } catch (e) {
      // Ignore
    }
    retries++;
    await sleep(startupCheckInterval);
  }

  /**
   * Wait for the model to load
   */
  while (retries < startupCheckMaxTries) {
    try {
      const logs = await getSDNextLogs();
      if (logs.some((line) => line.includes("Startup time:"))) {
        console.log("SDNext model loaded");
        return;
      }
    } catch (e) {
      // Ignore
    }
    retries++;
    await sleep(startupCheckInterval);
  }

  throw new Error(`SDNext did not start after ${(startupCheckInterval / 1000) * startupCheckMaxTries} seconds`);
}

async function pingA1111(): Promise<void> {
  const url = new URL("/internal/ping", imageGenUrl);
  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`Failed to ping A1111: ${await res.text()}`);
  }
}

async function waitForA1111ToStart(): Promise<void> {
  let retries = 0;
  while (retries < startupCheckMaxTries) {
    try {
      await pingA1111();
      console.log("A1111 started");
      return;
    } catch (e) {
      // Ignore
    }
    retries++;
    await sleep(startupCheckInterval);
  }

  throw new Error(`A1111 did not start after ${(startupCheckInterval / 1000) * startupCheckMaxTries} seconds`);
}

async function pingComfyUI(): Promise<void> {
  const res = await fetch(imageGenUrl);
  if (!res.ok) {
    throw new Error(`Failed to ping Comfy UI: ${await res.text()}`);
  }
}

async function waitForComfyUIToStart(): Promise<void> {
  let retries = 0;
  while (retries < startupCheckMaxTries) {
    try {
      await pingComfyUI();
      console.log("Comfy UI started");
      return;
    } catch (e) {
      // Ignore
    }
    retries++;
    await sleep(startupCheckInterval);
  }

  throw new Error(`Comfy UI did not start after ${(startupCheckInterval / 1000) * startupCheckMaxTries} seconds`);
}


export async function waitForServiceToStart() {
  switch (backend) {
    case "stable-fast-qr-code":
      return waitForStableFastQRCodeToStart();
    case "sdnext":
      return waitForSDNextToStart();
    case "a1111":
      return waitForA1111ToStart();
    case "comfy":
      return waitForComfyUIToStart();
    default:
      throw new Error(`Unknown backend: ${backend}`);
  }
}