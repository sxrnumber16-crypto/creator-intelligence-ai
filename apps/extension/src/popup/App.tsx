import { useEffect, useState } from 'react';
import { useStore } from '../store';
import { api } from '../lib/api';
import { formatCompact, formatRelative } from '../lib/format';
import type { DashboardResponse } from '@shared';

export function PopupApp(): React.JSX.Element {
  const { session, loaded, bootstrap, refreshChannels, activeChannel } = useStore();
  const [signInBusy, setSignInBusy] = useState(false);
  const [dash, setDash] = useState<DashboardResponse | null>(null);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    if (session && activeChannel) {
      void api
        .dashboard(activeChannel.id, 28)
        .then(setDash)
        .catch(() => setDash(null));
    }
  }, [session, activeChannel]);

  async function signIn(): Promise<void> {
    setSignInBusy(true);
    await chrome.runtime.sendMessage({ type: 'auth:start' });
    setSignInBusy(false);
    await bootstrap();
    await refreshChannels();
  }

  function openPanel(): void {
    void chrome.runtime.sendMessage({ type: 'openSidePanel' });
    window.close();
  }

  function openDashboard(): void {
    chrome.tabs.create({ url: chrome.runtime.getURL('src/dashboard/index.html') });
    window.close();
  }

  if (!loaded) {
    return <div className="flex h-64 items-center justify-center text-xs text-slate-500">Loading...</div>;
  }

  return (
    <div className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-ink-800 to-brand-600 text-[10px] font-bold text-white">CI</div>
          <span className="text-xs font-semibold text-slate-200">Creator Intelligence</span>
        </div>
        {session && (
          <button className="btn-ghost !px-2 !py-1 !text-[11px]" onClick={() => void useStore.getState().logout()}>
            Sign out
          </button>
        )}
      </div>

      {!session ? (
        <div className="space-y-3 py-4 text-center">
          <p className="muted">Connect your Google account to unlock channel analytics, SEO tools and the AI assistant.</p>
          <button className="btn-primary w-full" onClick={() => void signIn()} disabled={signInBusy}>
            {signInBusy ? 'Opening sign-in...' : 'Sign in with Google'}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {activeChannel ? (
            <div className="rounded-xl border border-ink-700 bg-ink-850 p-3">
              <p className="truncate text-xs font-medium text-slate-200">{activeChannel.channelTitle}</p>
              {dash ? (
                <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                  <MiniStat label="Subs" value={formatCompact(dash.totals.subscribers)} />
                  <MiniStat label="Views 28d" value={formatCompact(dash.totals.periodViews)} />
                  <MiniStat label="Subs +28d" value={formatCompact(dash.totals.subscribersGained)} />
                </div>
              ) : (
                <p className="mt-2 text-[11px] text-slate-500">Loading channel stats... (run a sync if this stays empty)</p>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-ink-700 bg-ink-850 p-3">
              <p className="text-xs text-slate-300">Signed in, but no active channel found.</p>
              <p className="muted mt-1">Open the dashboard to connect a YouTube channel.</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <button className="btn-primary !text-xs" onClick={openPanel}>
              Open side panel
            </button>
            <button className="btn-secondary !text-xs" onClick={openDashboard}>
              Full dashboard
            </button>
          </div>

          {dash && (
            <div className="rounded-xl border border-ink-700 bg-ink-900 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Top video (28d)</p>
              {dash.topVideos[0] ? (
                <>
                  <p className="mt-1 truncate text-xs text-slate-300">{dash.topVideos[0].title}</p>
                  <p className="muted mt-0.5">
                    {formatCompact(dash.topVideos[0].stats.views)} views · {formatRelative(dash.topVideos[0].publishedAt)}
                  </p>
                </>
              ) : (
                <p className="muted mt-1">No video data yet - sync the channel.</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <div className="rounded-lg bg-ink-800/70 px-2 py-1.5">
      <p className="text-[9px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-xs font-semibold text-slate-100">{value}</p>
    </div>
  );
}
