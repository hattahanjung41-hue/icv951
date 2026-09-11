import { supabase, PHOTOS_BUCKET } from './supabase';
import type { MemoryPhotoRow, MemoryRow, MemoryWithPhotos } from './types';

function photoUrl(storagePath: string): string {
  const { data } = supabase.storage.from(PHOTOS_BUCKET).getPublicUrl(storagePath);
  return data.publicUrl;
}

/** Cover first, then the rest of the submission in sort order — the sequence /live steps through. */
export function photoUrlsOf(memory: MemoryWithPhotos): string[] {
  const gallery = memory.photos.filter((photo) => photo.url !== memory.coverUrl).map((photo) => photo.url);
  return [memory.coverUrl, ...gallery];
}

function attachUrls(memory: MemoryRow, photos: MemoryPhotoRow[]): MemoryWithPhotos {
  const sorted = [...photos].sort((a, b) => a.sort_order - b.sort_order);
  const withUrls = sorted.map((p) => ({ ...p, url: photoUrl(p.storage_path) }));
  const cover =
    withUrls.find((p) => p.id === memory.cover_photo_id) ?? withUrls.find((p) => p.is_cover) ?? withUrls[0];
  return {
    ...memory,
    photos: withUrls,
    coverUrl: cover?.url ?? '',
  };
}

/** Public: newest-first, visible only. Used by /memories and /live. */
export async function fetchVisibleMemories(): Promise<MemoryWithPhotos[]> {
  const { data: memories, error } = await supabase
    .from('memories')
    .select('*')
    .eq('is_hidden', false)
    .order('created_at', { ascending: false });
  if (error) throw error;
  if (!memories?.length) return [];

  const { data: photos, error: photoErr } = await supabase
    .from('memory_photos')
    .select('*')
    .in(
      'memory_id',
      memories.map((m) => m.id)
    )
    .order('sort_order', { ascending: true });
  if (photoErr) throw photoErr;

  return memories.map((m) => attachUrls(m, (photos ?? []).filter((p) => p.memory_id === m.id)));
}

/** Public: a single memory by id, for the /memories/:id detail page. Respects RLS — a hidden memory resolves to null for guests. */
export async function fetchMemoryById(id: string): Promise<MemoryWithPhotos | null> {
  const { data: memory, error } = await supabase.from('memories').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  if (!memory) return null;

  const { data: photos, error: photoErr } = await supabase
    .from('memory_photos')
    .select('*')
    .eq('memory_id', memory.id)
    .order('sort_order', { ascending: true });
  if (photoErr) throw photoErr;

  return attachUrls(memory, photos ?? []);
}

/** Admin: everything including hidden memories. */
export async function fetchAllMemoriesAdmin(): Promise<MemoryWithPhotos[]> {
  const { data: memories, error } = await supabase
    .from('memories')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  if (!memories?.length) return [];

  const { data: photos, error: photoErr } = await supabase
    .from('memory_photos')
    .select('*')
    .in(
      'memory_id',
      memories.map((m) => m.id)
    )
    .order('sort_order', { ascending: true });
  if (photoErr) throw photoErr;

  return memories.map((m) => attachUrls(m, (photos ?? []).filter((p) => p.memory_id === m.id)));
}

export interface UploadedPhotoInput {
  storagePath: string;
  width: number;
  height: number;
  sortOrder: number;
}

/** Creates one memory row + its photo rows. Photos must already be uploaded to storage. */
export async function createMemory(params: {
  guestName: string | null;
  message: string | null;
  photos: UploadedPhotoInput[];
  coverIndex: number;
}): Promise<string> {
  const { data: memory, error } = await supabase
    .from('memories')
    .insert({
      guest_name: params.guestName,
      message: params.message,
    })
    .select('id')
    .single();
  if (error) throw error;

  const memoryId = memory.id as string;

  const rows = params.photos.map((p, i) => ({
    memory_id: memoryId,
    storage_path: p.storagePath,
    width: p.width,
    height: p.height,
    sort_order: p.sortOrder,
    is_cover: i === params.coverIndex,
  }));

  // Note: the cover photo is derived from memory_photos.is_cover (see attachUrls),
  // not from memories.cover_photo_id — this avoids requiring guests to have UPDATE
  // permission on the memories table after their insert, keeping RLS minimal.
  const { error: photoErr } = await supabase.from('memory_photos').insert(rows);
  if (photoErr) throw photoErr;

  return memoryId;
}

export function subscribeToMemoryChanges(onChange: () => void) {
  const channel = supabase
    .channel('memories-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'memories' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'memory_photos' }, onChange)
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// ---- Admin moderation ----

export async function setMemoryHidden(memoryId: string, hidden: boolean) {
  const { error } = await supabase.from('memories').update({ is_hidden: hidden }).eq('id', memoryId);
  if (error) throw error;
}

export async function deleteMemory(memory: MemoryWithPhotos) {
  const paths = memory.photos.map((p) => p.storage_path);
  if (paths.length) {
    await supabase.storage.from(PHOTOS_BUCKET).remove(paths);
  }
  const { error } = await supabase.from('memories').delete().eq('id', memory.id);
  if (error) throw error;
}

export async function deletePhoto(photo: MemoryPhotoRow) {
  await supabase.storage.from(PHOTOS_BUCKET).remove([photo.storage_path]);
  const { error } = await supabase.from('memory_photos').delete().eq('id', photo.id);
  if (error) throw error;
}
