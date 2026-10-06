import type { MemoryPhotoRow, MemoryWithPhotos } from './types';

type PhotoLike = Pick<MemoryPhotoRow, 'width' | 'height'> & { url: string };

/** Picks the matching gala lower-third frame for a photo's real orientation. */
export function lowerThirdSrc(photo: Pick<MemoryPhotoRow, 'width' | 'height'> | undefined): string {
  const isLandscape = photo?.width && photo?.height ? photo.width >= photo.height : false;
  return isLandscape ? '/assets/lower third landscape.png' : '/assets/lower third portait.png';
}

/** `<guest>-<id8>.png`, or `<guest>-<id8>-<n>.png` when a photo number is given. Always .png: it's a canvas composite. */
export function downloadFilename(memory: MemoryWithPhotos, photoNumber?: number): string {
  const namePart =
    (memory.guest_name || 'memory')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'memory';
  const suffix = photoNumber ? `-${photoNumber}` : '';
  return `${namePart}-${memory.id.slice(0, 8)}${suffix}.png`;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`failed to load ${src}`));
    img.src = src;
  });
}

/** Renders the photo with its lower-third frame burned in, matching the on-screen object-fit:contain/bottom layout. */
async function compositeWithFrame(photo: PhotoLike): Promise<Blob> {
  const response = await fetch(photo.url);
  const blob = await response.blob();
  const photoUrl = URL.createObjectURL(blob);
  try {
    const [img, frame] = await Promise.all([loadImage(photoUrl), loadImage(lowerThirdSrc(photo))]);
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canvas 2d context unavailable');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const scale = Math.min(canvas.width / frame.naturalWidth, canvas.height / frame.naturalHeight);
    const drawWidth = frame.naturalWidth * scale;
    const drawHeight = frame.naturalHeight * scale;
    const dx = (canvas.width - drawWidth) / 2;
    const dy = canvas.height - drawHeight;
    ctx.drawImage(frame, dx, dy, drawWidth, drawHeight);

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((result) => (result ? resolve(result) : reject(new Error('canvas toBlob failed'))), 'image/png');
    });
  } finally {
    URL.revokeObjectURL(photoUrl);
  }
}

/** Forces a real download (not just opening the image) of the framed composite, even though the storage URL is cross-origin. */
export async function downloadPhotoWithFrame(photo: PhotoLike, filename: string) {
  try {
    const blob = await compositeWithFrame(photo);
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(blobUrl);
  } catch {
    // Fall back to just opening the raw photo — the user can still save it manually from there.
    window.open(photo.url, '_blank', 'noopener');
  }
}
