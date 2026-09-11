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
