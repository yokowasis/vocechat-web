/**
 * Normalizes image orientation based on EXIF metadata.
 * Many mobile phone cameras save images in raw landscape sensor orientation
 * and rely on EXIF orientation tags. This utility uses createImageBitmap
 * with imageOrientation: "from-image" to produce an image file whose pixels
 * are physically in the correct orientation (portrait or landscape).
 */
export const normalizeImageOrientation = async (file: File): Promise<File> => {
  if (
    !file.type.startsWith("image/") ||
    file.type === "image/gif" ||
    file.type === "image/svg+xml"
  ) {
    return file;
  }

  try {
    if (typeof createImageBitmap === "undefined") {
      return file;
    }

    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;

    ctx.drawImage(bitmap, 0, 0);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, file.type || "image/jpeg", 0.95)
    );
    if (!blob) return file;

    return new File([blob], file.name, { type: file.type || "image/jpeg" });
  } catch (err) {
    console.warn("normalizeImageOrientation failed, returning original file:", err);
    return file;
  }
};
