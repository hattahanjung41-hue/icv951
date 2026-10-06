import imageCompression from 'browser-image-compression';

export interface CompressedResult {
  file: File;
  width: number;
  height: number;
}

/**
 * Prepares an image client-side before upload.
 * Strategy: resize to a max dimension of ~1920px and re-encode once at high
 * quality — no small file-size target, so photos keep their detail.
 * Prefers WEBP, falls back to JPEG when the browser/library can't
 * produce WEBP for a given source (e.g. some HEIC conversions).
 */
export async function compressPhoto(file: File): Promise<CompressedResult> {
  const maxDimension = 1920;
  // Not a quality target: only a safety ceiling just under the storage bucket's
  // 5 MB per-object limit (supabase/storage.sql), so an upload can never be rejected.
  const safetyCeilingMB = 4.5;

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
    maxSizeMB: safetyCeilingMB,
    useWebWorker: true,
    fileType: outputType,
    initialQuality: 0.92,
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
