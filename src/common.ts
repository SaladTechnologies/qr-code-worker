import assert from "assert";

const { IMAGE_GEN_URL, BACKEND, IMAGE_SIZE = "512" } = process.env;

assert(IMAGE_GEN_URL, "IMAGE_GEN_URL is not defined");
assert(BACKEND, "BACKEND is not defined");

const allowedBackends = ["stable-fast-qr-code", "a1111", "sdnext", "comfy", "invoke"];
if (!allowedBackends.includes(BACKEND)) {
  throw new Error(`BACKEND must be one of ${allowedBackends.join(", ")}`);
}

export const backend = BACKEND as "stable-fast-qr-code" | "a1111" | "comfy" | "invoke" | "sdnext"

export const imageGenUrl = IMAGE_GEN_URL;

export const imageSize = parseInt(IMAGE_SIZE);
export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * This is a helper function to pretty print an object,
 * useful for debugging.
 * @param obj The object to pretty print
 * @returns 
 */
export const prettyPrint = (obj: any): void => console.log(JSON.stringify(obj, null, 2));