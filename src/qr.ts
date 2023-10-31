import QRCodeStyling, { Canvas, DotType } from "qr-code-styling-node";
import nodeCanvas from "canvas";
import { QRParams } from "./types";

const { IMAGE_SIZE = "512" } = process.env;

const imageSize = parseInt(IMAGE_SIZE);

export function rgbToHex(rgb: number[]) {
  return "#" + rgb.map(x => x.toString(16).padStart(2, "0")).join("");
}

const drawerMapping = {
  "RoundedModule": "rounded",
  "SquareModule": "square"
}

export async function generateQRCode(params: QRParams): Promise<Buffer> {
  const qrCode = new QRCodeStyling({
    width: imageSize,
    height: imageSize,
    type: "canvas",
    data: params.data,
    margin: 4,
    qrOptions: {
      errorCorrectionLevel: params.error_correction,
    },
    dotsOptions: {
      color: rgbToHex(params.color_mask_params.front_color),
      type: drawerMapping[params.drawer] as DotType,
    },
    backgroundOptions: {
      color: rgbToHex(params.color_mask_params.back_color),
    },
    nodeCanvas: nodeCanvas as any,
  });

  const buff = await qrCode.getRawData("png");
  if (buff instanceof Buffer) {
    return buff;
  }
  throw new Error("QRCodeStyling.getRawData did not return a buffer");
}