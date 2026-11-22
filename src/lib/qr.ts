import QRCode from "qrcode";
import { createToken } from "@/lib/utils";

export function generateQrToken() {
  return createToken(32);
}

export async function qrToDataUrl(value: string) {
  return QRCode.toDataURL(value, { width: 320, margin: 1 });
}
