import imageCompression from 'browser-image-compression';

export interface CompressedResult {
  file: File;
  width: number;
  height: number;
}

/**
 * Compresses an image client-side before upload.
 * Strategy: resize to a max dimension of ~1920px, target ~500KB,
 * prefer WEBP, fall back to JPEG when the browser/library can't
 * produce WEBP for a given source (e.g. some HEIC conversions).
 * Small-enough source images are only lightly re-encoded, not
 * forced down to the target size at the cost of visible quality.
 */
export async function compressPhoto(file: File): Promise<CompressedResult> {
  const targetSizeMB = 0.5;
  const maxDimension = 1920;

  // Already small (e.g. a screenshot) — avoid unnecessary degradation,
  // just cap dimensions if it happens to be huge.
  const skipHeavyCompression = file.size <= targetSizeMB * 1024 * 1024;

  let outputType = 'image/webp';
  // Safari/older iOS WebView support for WEBP output can be inconsistent;
  // the library falls back internally, but we also guard the type here.
  try {
    const canvas = document.createElement('canvas');
    if (canvas.toDataURL('image/webp').indexOf('data:image/webp') !== 0) {
      outputType = 'image/jpeg';
    }
  } catch {
    outputType = 'image/jpeg';
  }

  const compressed = await imageCompression(file, {
    maxWidthOrHeight: maxDimension,
    maxSizeMB: skipHeavyCompression ? Math.max(targetSizeMB, file.size / 1024 / 1024) : targetSizeMB,
    useWebWorker: true,
    fileType: outputType,
    initialQuality: 0.82,
    alwaysKeepResolution: false,
  });

  const dimensions = await getImageDimensions(compressed);

  // Normalize the file name/extension to match the actual output type.
  const ext = outputType === 'image/webp' ? 'webp' : 'jpg';
  const renamed = new File([compressed], renameFile(file.name, ext), {
    type: outputType,
  });

  return { file: renamed, width: dimensions.width, height: dimensions.height };
}

function renameFile(originalName: string, ext: string): string {
  const base = originalName.replace(/\.[^/.]+$/, '');
  return `${base || 'photo'}.${ext}`;
}

function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };
    img.src = url;
  });
}

/** Common accepted mobile photo mime types (HEIC/HEIF included where the device provides it). */
export const ACCEPTED_IMAGE_TYPES =
  'image/jpeg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif';
