import { Text2ImageRequest, Text2ImageResponse, QRJob, GenerationMeta } from "./types";
import { getGPUInfo } from "./system-specs";

import { backend, imageGenUrl } from "./common";

let gpuInfo: { name: string, vram: number } | null = null;
const gpu = async () => {
  if (!gpuInfo) {
    gpuInfo = await getGPUInfo();
  }
  return gpuInfo;
}
// export async function submitA1111Job(job: QRJob): Promise<Buffer> {}

export async function submitStableFastQRJob(job: QRJob): Promise<{ images: Buffer[], meta: GenerationMeta}> {
  const url = new URL("/generate", imageGenUrl);
  const body = {
    url: job.qr_params.data,
    params: job.stable_diffusion_params,
    qr_params: {
      ...job.qr_params,
    },
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

  const img = await res.arrayBuffer();
  const end = Date.now();

  const meta = {
    qrGenTime: parseFloat(res.headers.get("X-QR-Generation-Time") || "0"),
    imageGenTime: parseFloat(res.headers.get("X-Image-Generation-Time") || "0"),
    gpu: gpuInfo.name,
    vram: gpuInfo.vram,
    totalTime: (end - start) / 1000,
  };

  return { images: [Buffer.from(img)], meta };
}

export async function submitJob(job: QRJob): Promise<{ images: Buffer[], meta: GenerationMeta}> {
  switch (backend) {
    case "stable-fast-qr-code":
      return submitStableFastQRJob(job);
    // case "a1111":
    //   return submitA1111Job(job);
    default:
      throw new Error(`Backend ${backend} is not supported`);
  }
}