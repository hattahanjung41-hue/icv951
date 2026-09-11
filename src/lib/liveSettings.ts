import { supabase } from './supabase';
import type { LiveSettingsRow } from './types';

const SETTINGS_ID = 1;

export async function fetchLiveSettings(): Promise<LiveSettingsRow> {
  const { data, error } = await supabase.from('live_settings').select('*').eq('id', SETTINGS_ID).single();
  if (error) throw error;
  return data as LiveSettingsRow;
}

export async function updateLiveSettings(patch: Partial<Omit<LiveSettingsRow, 'id' | 'updated_at'>>) {
  const { error } = await supabase
    .from('live_settings')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', SETTINGS_ID);
  if (error) throw error;
}

/**
 * Called only by /live, via a SECURITY DEFINER RPC — the anon UPDATE policy on live_settings
 * doesn't allow a direct write. expectedNavSeq guards against a stale/delayed call overwriting
 * a newer Admin command: the write only applies if nav_seq on the row still matches.
 */
export async function pushLivePosition(memoryId: string | null, photoIndex: number, expectedNavSeq: number) {
  const { error } = await supabase.rpc('set_live_position', {
    p_memory_id: memoryId,
    p_photo_index: photoIndex,
    p_expected_nav_seq: expectedNavSeq,
  });
  if (error) throw error;
}

export function subscribeToLiveSettings(onChange: (row: LiveSettingsRow) => void) {
  const channel = supabase
    .channel('live-settings-realtime')
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'live_settings', filter: `id=eq.${SETTINGS_ID}` },
      (payload) => onChange(payload.new as LiveSettingsRow)
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
