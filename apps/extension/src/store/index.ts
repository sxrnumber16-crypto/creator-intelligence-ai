import { create } from 'zustand';
import { api, type ChannelRef } from '../lib/api';
import { getSession, getSettings, setSession as persistSession, type Session, type ExtensionSettings } from '../lib/storage';

interface AppState {
  session: Session | null;
  channels: ChannelRef[];
  activeChannel: ChannelRef | null;
  settings: ExtensionSettings;
  loaded: boolean;
  unreadNotifications: number;

  bootstrap: () => Promise<void>;
  refreshChannels: () => Promise<void>;
  setActiveChannel: (id: string) => Promise<void>;
  logout: () => Promise<void>;
  updateSettings: (patch: Partial<ExtensionSettings>) => Promise<void>;
  setUnread: (n: number) => void;
}

export const useStore = create<AppState>((set, get) => ({
  session: null,
  channels: [],
  activeChannel: null,
  settings: {
    backendUrl: 'http://localhost:3000',
    theme: 'dark',
    overlaysEnabled: true,
    searchBadgesEnabled: true,
    channelPageCardEnabled: true,
    notificationsEnabled: true,
  },
  loaded: false,
  unreadNotifications: 0,

  async bootstrap() {
    const [session, settings] = await Promise.all([getSession(), getSettings()]);
    set({ session, settings, loaded: true });
    if (session) {
      await get().refreshChannels();
    }
  },

  async refreshChannels() {
    try {
      const me = await api.me();
      set({ channels: me.channels, activeChannel: me.channels.find((c) => c.isActive) ?? me.channels[0] ?? null });
    } catch {
      // 401 or backend down: keep whatever we had
      set({ channels: [], activeChannel: null });
    }
  },

  async setActiveChannel(id) {
    await api.activateChannel(id);
    set({ activeChannel: get().channels.find((c) => c.id === id) ?? null });
  },

  async logout() {
    try {
      await api.logout();
    } catch {
      /* token may already be invalid */
    }
    await persistSession(null);
    set({ session: null, channels: [], activeChannel: null });
  },

  async updateSettings(patch) {
    const next = await (await import('../lib/storage')).saveSettings(patch);
    set({ settings: next });
  },

  setUnread(n) {
    set({ unreadNotifications: n });
  },
}));
