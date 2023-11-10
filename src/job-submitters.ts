import { Text2ImageRequest, Text2ImageResponse, QRJob, GenerationMeta } from "./types";
import { getGPUInfo } from "./system-specs";
import { generateQRCode } from "./qr";
import { imageSize } from "./common";
import { backend, imageGenUrl } from "./common";
import comfyWorkflow from "./comfy-workflow.json";
import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";
import { Blob } from "buffer";
import { promisify } from "util";

const readFile = promisify(fs.readFile);

let gpuInfo: { name: string, vram: number } | null = null;
const gpu = async () => {
  if (!gpuInfo) {
    gpuInfo = await getGPUInfo();
  }
  return gpuInfo;
}

export async function submitStableFastQRJob(job: QRJob): Promise<{ images: Buffer[], meta: GenerationMeta }> {
  const url = new URL("/generate", imageGenUrl);
  const body = {
    url: job.qr_params.data,
    params: job.stable_diffusion_params,
    qr_params: {
      ...job.qr_params,
    },
    batch_size: job.batch_size,
    safety_checker: false
  } as any;

  delete body.qr_params.data;

  const gpuInfo = await gpu();

  const start = Date.now();
  const res = await fetch(url.toString(), {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to generate QR code: ${await res.text()}`);
  }

  const images: Buffer[] = []
  if (job.batch_size === 1) {
    images[0] = Buffer.from(await res.arrayBuffer());
  } else {
    const json = await res.json();
    for (const image of json.images) {
      images.push(Buffer.from(image, "base64"));
    }
  }

  const end = Date.now();

  const meta = {
    qrGenTime: parseFloat(res.headers.get("X-QR-Generation-Time") || "0"),
    imageGenTime: parseFloat(res.headers.get("X-Image-Generation-Time") || "0"),
    gpu: gpuInfo.name,
    vram: gpuInfo.vram,
    totalTime: (end - start) / 1000,
  };

  return { images, meta };
}


let controlModel: string;
const getControlModel = async () => {
  if (!controlModel) {
    const url = new URL("/controlnet/model_list?update=false", imageGenUrl);
    const res = await fetch(url.toString());
    const json = await res.json();
    controlModel = json.model_list[0];
  }
  return controlModel;
}

export async function submitA1111Job(job: QRJob): Promise<{ images: Buffer[], meta: GenerationMeta }> {
  const url = new URL("/sdapi/v1/txt2img", imageGenUrl);
  const start = Date.now();
  const qrCode = (await generateQRCode(job.qr_params)).toString("base64");
  const qrGenTime = Date.now() - start;
  const body = {
    prompt: job.stable_diffusion_params.prompt,
    negative_prompt: job.stable_diffusion_params.negative_prompt,
    cfg_scale: job.stable_diffusion_params.guidance_scale,
    width: imageSize,
    height: imageSize,
    steps: job.stable_diffusion_params.num_inference_steps,
    sampler_name: "Euler a",
    save_images: false,
    send_images: true,
    batch_size: job.batch_size,
    control_units: [
      {
        model: await getControlModel(),
        weight: job.stable_diffusion_params.controlnet_conditioning_scale,
        guidance_start: job.stable_diffusion_params.control_guidance_start,
        guidance_end: job.stable_diffusion_params.control_guidance_end,
        input_image: qrCode,
        resize_mode: 0,
        control_mode: 0
      }
    ]
  } as Text2ImageRequest;

  const gpuInfo = await gpu();

  const genStart = Date.now();
  const res = await fetch(url.toString(), {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to generate QR code: ${await res.text()}`);
  }

  const json = await res.json() as Text2ImageResponse;
  const images = json.images.map((img: string) => Buffer.from(img, "base64"));
  const end = Date.now();

  const meta = {
    qrGenTime: qrGenTime / 1000,
    imageGenTime: (end - genStart) / 1000,
    gpu: gpuInfo.name,
    vram: gpuInfo.vram,
    totalTime: (end - start) / 1000,
  };

  return { images, meta };
}

function waitForFiles(directory: string, batchSize: number = 1): Promise<Buffer[]> {
  return new Promise((resolve, reject) => {
    const buffers: Buffer[] = [];
    const watchedFiles = new Set();

    const watcher = fs.watch(directory, async (eventType, filename) => {
      if (eventType === 'rename' && !watchedFiles.has(filename)) {
        try {
          const filePath = `${directory}/${filename}`;
          // Check if the file exists and is not a directory
          if (fs.existsSync(filePath) && !fs.lstatSync(filePath).isDirectory()) {
            watchedFiles.add(filename);
            const data = await readFile(filePath);
            buffers.push(data);
            if (buffers.length === batchSize) {
              watcher.close();
              resolve(buffers);
            }
          }
        } catch (error) {
          watcher.close();
          reject(error);
        }
      }
    });

    watcher.on('error', error => {
      watcher.close();
      reject(error);
    });
  });
}

async function submitComfyUIJob(job: QRJob): Promise<{ images: Buffer[], meta: GenerationMeta }> {
  const submitURL = new URL("/prompt", imageGenUrl);
  const start = Date.now();
  const qrCode = await generateQRCode(job.qr_params);
  const qrBlob = new Blob([qrCode], { type: "image/png" });
  const imageId = randomUUID();

  // Upload the image to /upload/image/ as a form upload, where the image is "image"
  const uploadURL = new URL("/upload/image", imageGenUrl);
  const formData = new FormData();
  formData.append("image", qrBlob as any, `${imageId}.png`);
  const uploadRes = await fetch(uploadURL.toString(), {
    method: "POST",
    body: formData,
    // headers: {
    //   "Content-Type": "multipart/form-data",
    // }
  });
  if (!uploadRes.ok) {
    throw new Error(`Failed to upload image: ${await uploadRes.text()}`);
  }
  const { name } = await uploadRes.json();
  const qrGenTime = Date.now() - start;

  const gpu = await getGPUInfo();

  const prompt = { ...comfyWorkflow };
  prompt["3"].inputs.steps = job.stable_diffusion_params.num_inference_steps;
  prompt["3"].inputs.cfg = job.stable_diffusion_params.guidance_scale;
  prompt["5"].inputs.width = imageSize;
  prompt["5"].inputs.height = imageSize;
  prompt["5"].inputs.batch_size = job.batch_size;
  prompt["6"].inputs.text = job.stable_diffusion_params.prompt;
  prompt["7"].inputs.text = job.stable_diffusion_params.negative_prompt;
  prompt["12"].inputs.strength = job.stable_diffusion_params.controlnet_conditioning_scale;
  prompt["12"].inputs.start_percent = job.stable_diffusion_params.control_guidance_start;
  prompt["12"].inputs.end_percent = job.stable_diffusion_params.control_guidance_end;
  prompt["14"].inputs.image = name;

  const genStart = Date.now();
  const res = await fetch(submitURL.toString(), {
    method: "POST",
    body: JSON.stringify({ prompt }),
    headers: {
      "Content-Type": "application/json",
    },
  });

  const images = await waitForFiles("/opt/ComfyUI/output", job.batch_size);
  const end = Date.now();

  const meta = {
    qrGenTime: qrGenTime / 1000,
    imageGenTime: (end - genStart) / 1000,
    gpu: gpu.name,
    vram: gpu.vram,
    totalTime: (end - start) / 1000,
  };

  return { images, meta };
}

export async function submitJob(job: QRJob): Promise<{ images: Buffer[], meta: GenerationMeta }> {
  switch (backend) {
    case "stable-fast-qr-code":
      return submitStableFastQRJob(job);
    case "sdnext":
      return submitA1111Job(job);
    case "a1111":
      return submitA1111Job(job);
    case "comfy":
      return submitComfyUIJob(job);

    default:
      throw new Error(`Backend ${backend} is not supported`);
  }
}