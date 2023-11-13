(global as any).self = global;

import { waitForServiceToStart } from "./waiters";
import { submitJob } from "./job-submitters";
import { backend, sleep, imageSize } from "./common";
import { fillQueue, getJob, markJobComplete } from "./queue";
import { GenerationMeta, QRJob } from "./types";
import assert from "assert";

let stayAlive = true;
process.on("SIGINT", () => {
  stayAlive = false;
});

process.on("exit", () => {
  /**
   * This is where to put any cleanup code,
   * or a last chance to fire stats off to wherever they live.
   */
});

const {
  REPORTING_URL,
  REPORTING_API_KEY,
  REPORTING_AUTH_HEADER = "Benchmark-Api-Key",
  BENCHMARK_ID,
  SALAD_MACHINE_ID,
  PUBLIC_DOWNLOAD_URL = "https://salad-benchmark-assets.download"
} = process.env;

assert(REPORTING_URL, "REPORTING_URL is not defined");
assert(REPORTING_API_KEY, "REPORTING_API_KEY is not defined");
assert(REPORTING_AUTH_HEADER, "REPORTING_AUTH_HEADER is not defined");
assert(BENCHMARK_ID, "BENCHMARK_ID is not defined");

const headers = {
  [REPORTING_AUTH_HEADER]: REPORTING_API_KEY,
  "Content-Type": "application/json",
};

const warmupJob: QRJob = {
  id: "warmup",
  batch_size: 1,
  upload_url: [],
  qr_params: {
    color_mask: "SolidFill",
    color_mask_params: {
      front_color: [0, 0, 0],
      back_color: [127, 127, 127],
    },
    data: "warmup job",
    drawer: "RoundedModule",
    error_correction: "M",
  },
  stable_diffusion_params: {
    controlnet_conditioning_scale: 2,
    control_guidance_end: 1,
    control_guidance_start: 0,
    guidance_scale: 4,
    negative_prompt: "",
    num_inference_steps: 15,
    prompt: "Leafy Greens, Pixar style",
  },
};

function replaceHostAndRemoveFirstPathSegment(originalUrl: string, newHost: string): string {
  // Parse the original URL
  const url = new URL(originalUrl);

  // Parse the new host URL
  const newHostUrl = new URL(newHost);

  // Replace the relevant parts
  url.protocol = newHostUrl.protocol;
  url.hostname = newHostUrl.hostname;
  url.port = newHostUrl.port; // You can omit this if the port isn't changing

  // Remove the first segment of the path
  const pathSegments = url.pathname.split('/').filter(Boolean);
  pathSegments.shift(); // Removes the first segment
  url.pathname = '/' + pathSegments.join('/');

  // Return the modified URL as a string
  return url.toString();
}

function getFileExtension(url: string): string {
  // Split the URL to separate the base URL from query parameters
  const baseUrl = url.split('?')[0];

  // Split the base URL by '/' and get the last segment (filename)
  const segments = baseUrl.split('/');
  const filename = segments[segments.length - 1];

  // Split the filename by '.' and get the last segment (extension)
  const extension = filename.split('.').pop();

  return extension || '';
}

/**
 * Uploads an image to s3 using the signed url provided by the job
 * @param image The image to upload as a buffer
 * @param url The signed url to upload the image to
 * 
 * @returns The download url of the uploaded image
 */
async function uploadImage(image: Buffer, url: string): Promise<string> {
  // url is an s3 signed url, so we can just PUT the image to it
  const ext = getFileExtension(url);
  const contentType = ext === "jpg" ? "image/jpeg" : "image/png";
  const res = await fetch(url, {
    method: "PUT",
    body: image,
    headers: {
      "Content-Type": contentType,
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to upload image: ${res.status} ${res.statusText}`);
  }

  // Return the full url, minus the query string
  const privateDownloadURL = url.split("?")[0];
  return replaceHostAndRemoveFirstPathSegment(privateDownloadURL, PUBLIC_DOWNLOAD_URL);
}

/**
 * You can replace this function with your own implementation.
 * Could be submitting stats to a database, or to an api, or just
 * printing to the console.
 * 
 * In this case, we're sending the results to our reporting server.
 */
async function recordResult(params: {
  job: QRJob,
  downloadUrls: string[],
  meta: GenerationMeta
}): Promise<void> {
  const url = new URL("/" + BENCHMARK_ID, REPORTING_URL);
  await fetch(url.toString(), {
    method: "POST",
    body: JSON.stringify({ ...params, imageSize, backend, saladMachineId: SALAD_MACHINE_ID }),
    headers
  });
}


async function recordStat(stat: any): Promise<void> {
  const url = new URL("/" + BENCHMARK_ID + "-stats", REPORTING_URL);
  await fetch(url.toString(), {
    method: "POST",
    body: JSON.stringify(stat),
    headers
  });
}



async function main(): Promise<void> {
  console.log(`Waiting for ${backend} to start...`);
  const start = Date.now();
  await waitForServiceToStart();
  await Promise.all([submitJob(warmupJob, 30), fillQueue()]);
  const bootEnd = Date.now();
  console.log(`Service started in ${(bootEnd - start) / 1000} seconds`);
  recordStat({
    type: "cold-start-from-running",
    time: (bootEnd - start) / 1000,
    backend,
    saladMachineId: SALAD_MACHINE_ID,
  });
  while (stayAlive) {
    const job = await getJob();
    if (job) {
      const { images, meta } = await submitJob(job.job);
      console.log(`Job ${job.job.id} with ${job.job.batch_size} images completed in ${meta.totalTime} seconds`);
      Promise.all(job.job.upload_url.map((url, i) => uploadImage(images[i], url))).then(async (urls) => {
        await recordResult({
          job: job.job,
          downloadUrls: urls,
          meta,
        });
        await markJobComplete(job.messageId);
      })
    } else {
      await sleep(1000);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});