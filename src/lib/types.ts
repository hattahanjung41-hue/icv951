export interface MemoryPhotoRow {
  id: string;
  memory_id: string;
  storage_path: string;
  width: number | null;
  height: number | null;
  sort_order: number;
  is_cover: boolean;
  created_at: string;
}

export interface MemoryRow {
  id: string;
  guest_name: string | null;
  message: string | null;
  cover_photo_id: string | null;
  is_hidden: boolean;
  created_at: string;
  updated_at: string;
}

/** A memory with its photos resolved to public URLs, ready for the UI. */
export interface MemoryWithPhotos extends MemoryRow {
  photos: (MemoryPhotoRow & { url: string })[];
  coverUrl: string;
}

export interface LiveSettingsRow {
  id: number;
  display_duration_seconds: number;
  shuffle: boolean;
  auto_loop: boolean;
  interruption_enabled: boolean;
  is_paused: boolean;
  updated_at: string;
}

export interface PendingPhoto {
  /** Local id used only in the browser before upload. */
  localId: string;
  file: File;
  previewUrl: string;
  width?: number;
  height?: number;
}
