import { supabase } from './supabase';
import type { Session } from '@supabase/supabase-js';

export async function signInAdmin(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.session;
}

export async function signOutAdmin() {
  await supabase.auth.signOut();
}

export async function getSession(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export function onAuthStateChange(cb: (session: Session | null) => void) {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => cb(session));
  return () => data.subscription.unsubscribe();
}

/** True only for a signed-in user whose id is in the `admins` allow-list (checked via RLS, not just "has a session"). */
export async function isCurrentUserAdmin(): Promise<boolean> {
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user.id;
  if (!userId) return false;
  const { data: row } = await supabase.from('admins').select('user_id').eq('user_id', userId).maybeSingle();
  return Boolean(row);
}
