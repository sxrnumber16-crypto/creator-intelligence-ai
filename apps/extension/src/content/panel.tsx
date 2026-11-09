/**
 * Watch-page intelligence panel (React, rendered inside a closed shadow DOM host).
 * Dynamically imported by the bootstrap only when the user opens it - YouTube
 * pages pay zero cost until then.
 */

import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../styles/globals.css';
import { api, ApiError } from '../lib/api';
import { formatCompact, formatDate, scoreBg, scoreColor } from '../lib/format';
import type { SeoAuditReport, KeywordExploreResponse } from '@shared';

declare const chrome: any;

const HOST_ID = 'cia-panel-host';

function extractVideoId(): string | null {
  const url = new URL(location.href);
  if (url.pathname.startsWith('/shorts/')) return url.pathname.split('/')[2] ?? null;
  return url.searchParams.get('v');
}

function mount(): void {
  const existing = document.getElementById(HOST_ID);
  if (existing) {
    existing.remove();
    return;
  }
  const host = document.createElement('div');
  host.id = HOST_ID;
  host.style.cssText = 'position:fixed;right:18px;bottom:74px;z-index:2147483001;width:420px;max-height:min(640px,80vh);';
  const shadow = host.attachShadow({ mode: 'open' });

  const styleLink = document.createElement('link');
  styleLink.rel = 'stylesheet';
  styleLink.href = chrome.runtime.getURL('content/panel.css');
  shadow.appendChild(styleLink);

  const container = document.createElement('div');
  container.style.cssText = 'height:100%;overflow:hidden;border-radius:14px;box-shadow:0 8px 40px rgba(0,0,0,.5);';
  shadow.appendChild(container);
  document.documentElement.appendChild(host);

  createRoot(container).render(<Panel onClose={close} />);

  function close(): void {
    host.remove();
    const toggle = document.getElementById('cia-intel-toggle');
    if (toggle) toggle.style.display = '';
  }
}

type Tab = 'overview' | 'seo' | 'keywords';

function Panel({ onClose }: { onClose: () => void }): React.ReactElement {
  const videoId = extractVideoId();
  const [tab, setTab] = useState<Tab>('overview');

  return (
    <div className="card flex flex-col overflow-hidden" style={{ maxHeight: 'inherit' }}>
      <div className="flex items-center justify-between border-b border-ink-700 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold tracking-wider text-brand-400">CREATOR INTELLIGENCE</span>
        </div>
        <button className="btn-ghost !p-1 !text-xs" onClick={onClose} title="Close panel">
          ✕
        </button>
      </div>
      <div className="flex gap-1 border-b border-ink-700 px-3 py-2">
        {(['overview', 'seo', 'keywords'] as Tab[]).map((t) => (
          <button
            key={t}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium ${tab === t ? 'bg-brand-500/15 text-brand-300' : 'text-slate-400 hover:bg-ink-700'}`}
            onClick={() => setTab(t)}
          >
            {t === 'overview' ? 'Overview' : t === 'seo' ? 'SEO audit' : 'Keywords'}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {!videoId ? (
          <p className="muted">Could not detect a video ID on this page.</p>
        ) : tab === 'overview' ? (
          <OverviewTab videoId={videoId} />
        ) : tab === 'seo' ? (
          <SeoTab videoId={videoId} />
        ) : (
          <KeywordsTab videoId={videoId} />
        )}
      </div>
      <div className="border-t border-ink-700 px-4 py-2 text-[11px] text-slate-500">
        Public data via YouTube Data API. Private metrics require your connected channel.
      </div>
    </div>
  );
}

function OverviewTab({ videoId }: { videoId: string }): React.ReactElement {
  const { data, loading, error } = useAsyncData(() => callApi<{ items: PublicVideo[] }>('GET', `/api/youtube/videos?ids=${videoId}`), [videoId]);
  if (loading) return <Skeleton rows={4} />;
  if (error) return <ErrorNote message={error} />;
  const video = data?.items[0];
  if (!video) return <p className="muted">Video stats unavailable (it may be private or the Data API key is missing).</p>;

  const ageDays = Math.max(1, (Date.now() - new Date(video.publishedAt).getTime()) / 86400_000);
  const perDay = video.views != null ? video.views / ageDays : null;
  const likeRate = video.views && video.likes != null ? (video.likes / video.views) * 100 : null;

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-semibold text-slate-100">{video.title}</p>
        <p className="muted mt-0.5">
          {video.channelTitle} · published {formatDate(video.publishedAt as string)}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Stat label="Views" value={formatCompact(video.views)} />
        <Stat label="Views / day" value={perDay != null ? formatCompact(Math.round(perDay)) : '-'} />
        <Stat label="Likes" value={formatCompact(video.likes)} />
        <Stat label="Like rate" value={likeRate != null ? `${likeRate.toFixed(2)}%` : '-'} />
      </div>
      <p className="muted">
        Views/day and like-rate are derived from public statistics - they are indicators, not private analytics. Compare this
        against your own channel in the side panel.
      </p>
    </div>
  );
}

function SeoTab({ videoId }: { videoId: string }): React.ReactElement {
  const { data, loading, error, refetch } = useAsyncData<SeoAuditReport>(() => api.auditVideo(videoId), [videoId]);
  if (loading) return <Skeleton rows={5} />;
  if (error) return <ErrorNote message={error} retry={refetch} />;
  if (!data) return <p className="muted">No audit available.</p>;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className={`badge border ${scoreBg(data.score.overall)} !text-sm !px-3 !py-1`}>{data.score.overall}/100</div>
        <span className="muted">Grade {data.score.grade}</span>
      </div>
      {data.score.components.map((component) => (
        <div key={component.component} className="rounded-lg border border-ink-700 bg-ink-800/60 p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold capitalize text-slate-200">{component.component}</span>
            <span className={`text-xs font-semibold ${scoreColor(component.score)}`}>{component.score}</span>
          </div>
          <ul className="mt-2 space-y-1.5">
            {component.findings.slice(0, 3).map((finding, i) => (
              <li key={i} className="flex gap-2 text-[11px] leading-snug">
                <span>{finding.level === 'good' ? '✓' : finding.level === 'critical' ? '✕' : '!'}</span>
                <span className="text-slate-400">{finding.title}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
      <button className="btn-secondary w-full !text-xs" onClick={() => chrome.runtime.sendMessage({ type: 'openSidePanel' })}>
        Open full audit in side panel
      </button>
    </div>
  );
}

function KeywordsTab({ videoId }: { videoId: string }): React.ReactElement {
  const [result, setResult] = useState<KeywordExploreResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stats = await callApi<{ items: PublicVideo[] }>('GET', `/api/youtube/videos?ids=${videoId}`);
        const title = stats.items[0]?.title ?? '';
        const seed = title.split(/[|\-–:(]/)[0].trim().slice(0, 60) || title.slice(0, 40);
        const explore = await api.exploreKeywords(seed);
        if (!cancelled) setResult(explore);
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : String(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [videoId]);

  if (loading) return <Skeleton rows={5} />;
  if (error) return <ErrorNote message={error} />;
  if (!result) return <p className="muted">No keyword data.</p>;

  const top = result.clusters.flatMap((c) => c.keywords).sort((a, b) => b.opportunity - a.opportunity).slice(0, 8);
  return (
    <div className="space-y-2">
      <p className="muted">
        Opportunity = relative estimate from live competition data (top-10 views, exact-match titles, channel sizes). YouTube
        publishes no official search volumes - we never show fake ones.
      </p>
      {top.map((k) => (
        <div key={k.keyword} className="flex items-center justify-between rounded-lg border border-ink-700 bg-ink-800/60 px-3 py-2">
          <span className="text-xs text-slate-200">{k.keyword}</span>
          <span className={`text-xs font-semibold ${scoreColor(k.opportunity)}`}>{k.opportunity}</span>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared bits
// ---------------------------------------------------------------------------

interface PublicVideo {
  id: string;
  title: string;
  channelTitle: string;
  publishedAt: string;
  views: number | null;
  likes: number | null;
  comments: number | null;
}

async function callApi<T>(method: string, path: string): Promise<T> {
  const response = await chrome.runtime.sendMessage({ type: 'api', payload: { method, path } });
  if (!response?.ok) throw new ApiError(response?.error?.code ?? 'ERROR', response?.error?.message ?? 'Request failed', response?.status ?? 0);
  return response.data as T;
}

function Stat({ label, value }: { label: string; value: string }): React.ReactElement {
  return (
    <div className="rounded-lg border border-ink-700 bg-ink-800/60 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-sm font-semibold text-slate-100">{value}</p>
    </div>
  );
}

function Skeleton({ rows }: { rows: number }): React.ReactElement {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="skeleton h-10 w-full" />
      ))}
    </div>
  );
}

function ErrorNote({ message, retry }: { message: string; retry?: () => void }): React.ReactElement {
  return (
    <div className="rounded-lg border border-bad/30 bg-bad/10 p-3">
      <p className="text-xs text-red-300">{message}</p>
      {retry && (
        <button className="btn-secondary mt-2 !text-xs" onClick={retry}>
          Retry
        </button>
      )}
    </div>
  );
}

function useAsyncData<T>(fn: () => Promise<T>, deps: unknown[]): { data: T | null; loading: boolean; error: string | null; refetch: () => void } {
  const [data, setData] = React.useState<T | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [tick, setTick] = React.useState(0);
  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fn()
      .then((d) => !cancelled && setData(d))
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : String(e)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);
  return { data, loading, error, refetch: () => setTick((t) => t + 1) };
}

mount();
