import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { useStore } from '../store';
import { api } from '../lib/api';

export const NAV_SECTIONS = [
  { id: 'overview', label: 'Overview' },
  { id: 'channel', label: 'Channel Analytics' },
  { id: 'videos', label: 'Video Analytics' },
  { id: 'seo', label: 'SEO Intelligence' },
  { id: 'keywords', label: 'Keyword Explorer' },
  { id: 'competitors', label: 'Competitor Intelligence' },
  { id: 'studio', label: 'AI Content Studio' },
  { id: 'besttime', label: 'Best Time to Publish' },
  { id: 'auditor', label: 'Video Auditor' },
  { id: 'assistant', label: 'AI Assistant' },
  { id: 'workspace', label: 'Saved Workspace' },
  { id: 'settings', label: 'Settings' },
] as const;

export type NavId = (typeof NAV_SECTIONS)[number]['id'];

export function Sidebar({ active, onNavigate, compact = false }: { active: NavId; onNavigate: (id: NavId) => void; compact?: boolean }): ReactNode {
  const { unreadNotifications } = useStore();
  return (
    <nav className={`flex flex-col gap-0.5 ${compact ? '' : 'px-3 py-4'}`}>
      {!compact && (
        <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-widest text-slate-600">Workspace</p>
      )}
      {NAV_SECTIONS.map((section) => {
        const isActive = section.id === active;
        return (
          <button
            key={section.id}
            onClick={() => onNavigate(section.id)}
            className={`flex items-center justify-between rounded-lg px-3 py-2 text-left text-[13px] transition-colors ${
              isActive ? 'bg-brand-500/15 font-medium text-brand-300' : 'text-slate-400 hover:bg-ink-700/60 hover:text-slate-200'
            }`}
          >
            <span>{section.label}</span>
            {section.id === 'settings' && unreadNotifications > 0 && (
              <span className="badge bg-brand-500/20 text-brand-300">{unreadNotifications}</span>
            )}
          </button>
        );
      })}
    </nav>
  );
}

export function Header({ title, subtitle, children }: { title: string; subtitle?: string; children?: ReactNode }): ReactNode {
  return (
    <header className="sticky top-0 z-10 border-b border-ink-700 bg-ink-950/90 px-5 py-3 backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-sm font-semibold text-slate-100">{title}</h1>
          {subtitle && <p className="truncate text-[11px] text-slate-500">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2">
          <ChannelSwitcher />
          <NotificationBell />
          {children}
        </div>
      </div>
    </header>
  );
}

function ChannelSwitcher(): ReactNode {
  const { channels, activeChannel, setActiveChannel } = useStore();
  if (channels.length === 0) return null;
  return (
    <select
      className="input !w-auto max-w-[180px] cursor-pointer !py-1.5 !text-xs"
      value={activeChannel?.id ?? ''}
      onChange={(e) => void setActiveChannel(e.target.value)}
      title="Active channel"
    >
      {channels.map((c) => (
        <option key={c.id} value={c.id}>
          {c.channelTitle}
        </option>
      ))}
    </select>
  );
}

function NotificationBell(): ReactNode {
  const { unreadNotifications, setUnread } = useStore();
  useEffect(() => {
    void (async () => {
      try {
        const result = await api.notifications();
        setUnread(result.unread);
      } catch {
        /* ignore */
      }
    })();
  }, [setUnread]);

  return (
    <button
      className="btn-ghost relative !p-2"
      title={unreadNotifications > 0 ? `${unreadNotifications} unread notifications` : 'Notifications'}
      onClick={() => void (async () => {
        if (unreadNotifications > 0) {
          await api.markRead().catch(() => undefined);
          setUnread(0);
        }
        window.dispatchEvent(new CustomEvent('cia:navigate', { detail: 'settings' }));
      })()}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
      {unreadNotifications > 0 && <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-brand-400" />}
    </button>
  );
}

export function AuthRequired({ onSignIn, busy }: { onSignIn: () => void; busy?: boolean }): ReactNode {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-8 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-ink-800 to-brand-600 text-xl font-bold text-white">
        CI
      </div>
      <h2 className="text-base font-semibold text-slate-100">Sign in to continue</h2>
      <p className="muted mt-1 max-w-xs">
        Connect your Google account to load your channel analytics, SEO tools and AI workspace. Minimum scopes: YouTube read-only
        + Analytics read-only.
      </p>
      <button className="btn-primary mt-5" onClick={onSignIn} disabled={busy}>
        {busy ? 'Opening Google sign-in...' : 'Sign in with Google'}
      </button>
    </div>
  );
}

export function BackendDown({ message, retry }: { message: string; retry: () => void }): ReactNode {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-8 text-center">
      <h2 className="text-base font-semibold text-slate-100">Backend not reachable</h2>
      <p className="muted mt-1 max-w-sm break-words">{message}</p>
      <button className="btn-secondary mt-4" onClick={retry}>
        Retry connection
      </button>
    </div>
  );
}
