import { backend, imageGenUrl, sleep } from "./common";



export async function waitForStableFastQRCodeToStart(): Promise<void> {
  const url = new URL("/hc", imageGenUrl);
  const maxRetries = 300;
  let retries = 0;
  while (retries < maxRetries) {
    try {
      const res = await fetch(url.toString());
      if (res.ok) {
        return;
      }
    } catch (e) {
      // Ignore
    }
    retries++;
    await sleep(1000);
  }
  
  throw new Error(`Stable Fast QR Code did not start after ${maxRetries} retries`);
}

export async function waitForServiceToStart() {
  switch (backend) {
    case "stable-fast-qr-code":
      return waitForStableFastQRCodeToStart();
    // case "a1111":
    //   return waitForA1111ToStart();
    default:
      throw new Error(`Unknown backend: ${backend}`);
  }
}