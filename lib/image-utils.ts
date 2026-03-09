const ALLOWED_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
]);

export async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("Unable to read image file."));
        return;
      }
      resolve(reader.result);
    };
    reader.onerror = () => reject(new Error("Failed to read image file."));
    reader.readAsDataURL(file);
  });
}

export function normalizePuterMimeType(mimeType: string): string {
  if (!mimeType) {
    return "image/jpeg";
  }

  const normalized = mimeType.toLowerCase() === "image/jpg" ? "image/jpeg" : mimeType.toLowerCase();
  return ALLOWED_MIME_TYPES.has(normalized) ? normalized : "image/jpeg";
}

export async function fileToPuterPayload(file: File): Promise<{
  base64: string;
  dataUrl: string;
  mimeType: string;
}> {
  const dataUrl = await fileToDataUrl(file);
  const [header, base64 = ""] = dataUrl.split(",");

  if (!header || !base64) {
    throw new Error("Invalid image format. Please upload a PNG, JPG, or WEBP file.");
  }

  const mimeMatch = header.match(/^data:(.*?);base64$/i);
  const mimeType = normalizePuterMimeType(mimeMatch?.[1] ?? file.type);

  return { base64, dataUrl, mimeType };
}
