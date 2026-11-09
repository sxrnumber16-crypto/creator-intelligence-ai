/** Typed chrome.storage.local wrapper with defaults. */

export interface ExtensionSettings {
  backendUrl: string;
  theme: 'dark' | 'light';
  overlaysEnabled: boolean;
  searchBadgesEnabled: boolean;
  channelPageCardEnabled: boolean;
  notificationsEnabled: boolean;
  branding?: { productName: string; shortName: string; tagline: string };
}

const DEFAULTS: ExtensionSettings = {
  backendUrl: 'http://localhost:3000',
  theme: 'dark',
  overlaysEnabled: true,
  searchBadgesEnabled: true,
  channelPageCardEnabled: true,
  notificationsEnabled: true,
};

export async function getSettings(): Promise<ExtensionSettings> {
  const stored = await chrome.storage.local.get('settings');
  return { ...DEFAULTS, ...((stored.settings as Partial<ExtensionSettings>) ?? {}) };
}

export async function saveSettings(patch: Partial<ExtensionSettings>): Promise<ExtensionSettings> {
  const current = await getSettings();
  const next = { ...current, ...patch };
  await chrome.storage.local.set({ settings: next });
  return next;
}

export interface Session {
  accessToken: string;
  expiresAt: number;
  user: { id: string; email: string; displayName: string; avatarUrl?: string };
}

export async function getSession(): Promise<Session | null> {
  const stored = await chrome.storage.local.get('session');
  const session = stored.session as Session | undefined;
  if (!session) return null;
  return session;
}

export async function setSession(session: Session | null): Promise<void> {
  if (session) await chrome.storage.local.set({ session });
  else await chrome.storage.local.remove('session');
}

/** Local UI state (selected channel, date range) - syncs across extension pages. */
export async function getUiState<T>(key: string, fallback: T): Promise<T> {
  const stored = await chrome.storage.local.get(key);
  return (stored[key] as T) ?? fallback;
}

export async function setUiState(key: string, value: unknown): Promise<void> {
  await chrome.storage.local.set({ [key]: value });
}
