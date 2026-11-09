import { useState } from 'react';
import { api } from '../lib/api';
import { useAsync } from '../lib/hooks';
import { Header } from '../components/layout';
import { Card, SectionHeader, Skeleton, ErrorState, EmptyState, Button, Input, Badge, SourceNote, Stat } from '../components/ui';
import { downloadFile, formatCompact, formatDate } from '../lib/format';
import type { ChannelComparisonRow, CompetitorDetail, ContentGapItem } from '@shared';

interface TrackedRow {
  id: string;
  title: string;
  thumbnailUrl?: string;
  stats: { subscribers: number | null; totalViews: number | null; videoCount: number | null };
  derived: { uploadsPerWeek: number | null; medianRecentViews: number | null; shortsSharePct: number | null; firstTrackedAt: string };
  lastSyncAt: string | null;
}

export function CompetitorsPage(): React.JSX.Element {
  const [tab, setTab] = useState<'tracked' | 'compare' | 'gap'>('tracked');
  const list = useAsync(async () => api.competitors(), []);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<{ ytChannelId: string; title: string; thumbnailUrl?: string; subscribers: number | null; videoCount: number | null }[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<CompetitorDetail | null>(null);
  const [compareRows, setCompareRows] = useState<ChannelComparisonRow[] | null>(null);
  const [gaps, setGaps] = useState<ContentGapItem[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tracked = (list.data?.items ?? []) as TrackedRow[];

  async function doSearch(): Promise<void> {
    setSearching(true);
    setError(null);
    try {
      const result = await api.searchCompetitors(search);
      setResults(result.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSearching(false);
    }
  }

  async function add(input: string): Promise<void> {
    setBusy(true);
    try {
      await api.addCompetitor(input);
      setResults([]);
      setSearch('');
      list.refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function openDetail(id: string): Promise<void> {
    setSelected(null);
    const detail = await api.competitorDetail(id);
    setSelected(detail);
  }

  async function runCompare(): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      const result = await api.compareCompetitors(tracked.map((t) => t.id));
      setCompareRows(result.rows);
      setGaps(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function runGap(): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      const result = await api.contentGap(tracked.map((t) => t.id));
      setGaps(result.gaps);
      setCompareRows(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="pb-10">
      <Header title="Competitor Intelligence" subtitle="Public data only. History starts when tracking begins - we never fabricate past performance." />
      <div className="px-5 py-4">
        <div className="mb-4 flex gap-1 rounded-xl border border-ink-700 bg-ink-900 p-1">
          {(['tracked', 'compare', 'gap'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium ${tab === t ? 'bg-brand-500/15 text-brand-300' : 'text-slate-400 hover:text-slate-200'}`}
            >
              {t === 'tracked' ? `Tracked (${tracked.length})` : t === 'compare' ? 'Compare channels' : 'Content gaps'}
            </button>
          ))}
        </div>

        {error && <div className="mb-3"><ErrorState message={error} /></div>}

        {tab === 'tracked' && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
            <div className="space-y-3 lg:col-span-2">
              <Card>
                <SectionHeader title="Add a competitor" subtitle="Search by name, or paste a channel URL / @handle." />
                <div className="flex gap-2">
                  <Input value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && search.length >= 2 && void doSearch()} placeholder="Search channels or paste URL" />
                  <Button variant="primary" loading={searching} onClick={() => void doSearch()} disabled={search.length < 2}>
                    Find
                  </Button>
                </div>
                <div className="mt-3 space-y-1.5">
                  {results.map((r) => (
                    <div key={r.ytChannelId} className="flex items-center justify-between rounded-lg border border-ink-700 bg-ink-800/60 px-3 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-xs text-slate-200">{r.title}</p>
                        <p className="text-[10px] text-slate-500">
                          {r.subscribers != null ? `${formatCompact(r.subscribers)} subs` : 'subs hidden'} · {r.videoCount ?? '?'} videos
                        </p>
                      </div>
                      <Button variant="ghost" className="!text-[11px]" loading={busy} onClick={() => void add(r.ytChannelId)}>
                        Track
                      </Button>
                    </div>
                  ))}
                </div>
              </Card>

              {list.loading && <Skeleton rows={4} />}
              {list.error && <ErrorState message={list.error} retry={list.refetch} />}
              {tracked.map((t) => (
                <Card key={t.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-100">{t.title}</p>
                      <p className="muted mt-0.5">
                        {t.stats.subscribers != null ? `${formatCompact(t.stats.subscribers)} subs` : 'subs hidden'} ·{' '}
                        {t.derived.uploadsPerWeek != null ? `${t.derived.uploadsPerWeek}/wk` : 'cadence n/a'} ·{' '}
                        {t.derived.shortsSharePct != null ? `${t.derived.shortsSharePct}% shorts` : ''}
                      </p>
                      <p className="mt-0.5 text-[10px] text-slate-600">tracked since {formatDate(t.derived.firstTrackedAt)}</p>
                    </div>
                    <div className="flex shrink-0 flex-col gap-1.5">
                      <Button variant="ghost" className="!text-[11px]" onClick={() => void openDetail(t.id)}>
                        Open
                      </Button>
                      <Button
                        variant="ghost"
                        className="!text-[11px] !text-red-400"
                        onClick={() => void api.removeCompetitor(t.id).then(list.refetch)}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
              {!list.loading && tracked.length === 0 && (
                <EmptyState title="No competitors tracked" body="Track 2-5 channels in your niche to unlock comparisons and gap analysis." />
              )}
            </div>

            <div className="lg:col-span-3">
              {selected ? (
                <CompetitorDetailView detail={selected} onSync={() => void api.syncCompetitor(selected.id).then(() => openDetail(selected.id))} />
              ) : (
                <EmptyState title="Select a competitor" body="Open a tracked channel to see recent uploads, top videos, patterns and snapshot history." />
              )}
            </div>
          </div>
        )}

        {tab === 'compare' && (
          <div className="space-y-4">
            <Card>
              <SectionHeader title="Channel comparison" subtitle="Your channel vs tracked competitors. Public stats + your own synced snapshot." actions={<Button variant="primary" loading={busy} onClick={() => void runCompare()} disabled={tracked.length === 0}>Compare all</Button>} />
              {compareRows && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-ink-700 text-[10px] uppercase tracking-wide text-slate-500">
                        <th className="py-2 pr-3">Channel</th>
                        <th className="py-2 pr-3">Subs</th>
                        <th className="py-2 pr-3">Median recent views</th>
                        <th className="py-2 pr-3">Uploads/wk</th>
                        <th className="py-2 pr-3">Shorts %</th>
                        <th className="py-2 pr-3">Views gained (tracked period)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {compareRows.map((row) => (
                        <tr key={row.channelId} className="border-b border-ink-800">
                          <td className="py-2 pr-3 font-medium text-slate-200">
                            {row.title} {row.isOwner && <Badge tone="brand">you</Badge>}
                          </td>
                          <td className="py-2 pr-3">{formatCompact(row.subscribers)}</td>
                          <td className="py-2 pr-3">{formatCompact(row.medianRecentViews)}</td>
                          <td className="py-2 pr-3">{row.uploadsPerWeek ?? '-'}</td>
                          <td className="py-2 pr-3">{row.shortsSharePct != null ? `${row.shortsSharePct}%` : '-'}</td>
                          <td className="py-2 pr-3">{formatCompact(row.periodViewsGained)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {!compareRows && <EmptyState title="No comparison yet" body="Track competitors, then run the comparison." />}
              {compareRows && (
                <div className="mt-3">
                  <Button variant="ghost" className="!text-xs" onClick={() => downloadFile('channel-comparison.csv', rowsToCsv(compareRows as unknown as Record<string, unknown>[]), 'text/csv')}>
                    Export CSV
                  </Button>
                </div>
              )}
              <div className="mt-3">
                <SourceNote>Subscriber counts for competitors are only shown when publicly available. "Views gained" uses snapshots collected since tracking started.</SourceNote>
              </div>
            </Card>
          </div>
        )}

        {tab === 'gap' && (
          <div className="space-y-4">
            <Card>
              <SectionHeader
                title="Content gap analysis"
                subtitle="Topics your competitors cover repeatedly that do not appear in your recent titles."
                actions={<Button variant="primary" loading={busy} onClick={() => void runGap()} disabled={tracked.length === 0}>Find gaps</Button>}
              />
              {gaps && gaps.length === 0 && <EmptyState title="No clear gaps" body="Either your topics already cover the competition, or tracked competitors do not have enough videos yet. Track more channels or sync again." />}
              {gaps && gaps.length > 0 && (
                <div className="space-y-2">
                  {gaps.map((gap) => (
                    <div key={gap.topic} className="rounded-lg border border-ink-700 bg-ink-800/60 p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-slate-100">{gap.topic}</p>
                        <div className="flex items-center gap-2">
                          <Badge>{gap.competitorCoverage} channels</Badge>
                          <Badge tone="brand">{formatCompact(gap.signal)} combined views</Badge>
                        </div>
                      </div>
                      <div className="mt-2 space-y-1">
                        {gap.exampleVideos.map((example) => (
                          <a key={example.videoId} href={`https://www.youtube.com/watch?v=${example.videoId}`} target="_blank" rel="noreferrer" className="block truncate text-[11px] text-slate-400 hover:text-brand-300">
                            "{example.title}" - {example.channelTitle} - {formatCompact(example.views)} views
                          </a>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {gaps && (
                <div className="mt-3">
                  <SourceNote>
                    Gap detection is title-token based over each competitor's recent uploads. It is a starting point for topic
                    research, not a definitive topic model. Public views only.
                  </SourceNote>
                </div>
              )}
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

function CompetitorDetailView({ detail, onSync }: { detail: CompetitorDetail; onSync: () => void }): React.JSX.Element {
  return (
    <div className="space-y-4">
      <Card>
        <SectionHeader title={detail.title} subtitle={`Tracking since ${formatDate(detail.derived.firstTrackedAt)}`} actions={<Button variant="ghost" className="!text-xs" onClick={onSync}>Sync now</Button>} />
        <div className="grid grid-cols-3 gap-3">
          <Stat label="Subscribers" value={detail.stats.subscribers != null ? formatCompact(detail.stats.subscribers) : 'hidden'} />
          <Stat label="Total views" value={formatCompact(detail.stats.totalViews)} />
          <Stat label="Videos" value={formatCompact(detail.stats.videoCount)} />
        </div>
        {(detail.titlePatterns.length > 0 || detail.formatPatterns.length > 0) && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {detail.titlePatterns.map((p) => (
              <Badge key={p} tone="warn">
                {p}
              </Badge>
            ))}
            {detail.formatPatterns.map((p) => (
              <Badge key={p}>{p}</Badge>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <SectionHeader title="Top recent videos" subtitle="By views/day since publish (public data)." />
        <div className="space-y-1.5">
          {detail.topVideos.slice(0, 8).map((v) => (
            <a key={v.ytVideoId} href={`https://www.youtube.com/watch?v=${v.ytVideoId}`} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-ink-700/50">
              <span className="truncate text-xs text-slate-300">{v.title}</span>
              <span className="shrink-0 text-[11px] text-slate-500">
                {formatCompact(v.stats.views)} views · {formatCompact(v.viewsPerDay)}/day
              </span>
            </a>
          ))}
        </div>
      </Card>

      {detail.snapshotHistory.length > 1 && (
        <Card>
          <SectionHeader title="Snapshot history" subtitle="Collected by this app since tracking started." />
          <div className="space-y-1">
            {detail.snapshotHistory.slice(-8).map((s) => (
              <div key={s.capturedAt} className="flex justify-between rounded-lg px-3 py-1.5 text-[11px] text-slate-400">
                <span>{formatDate(s.capturedAt)}</span>
                <span>
                  {s.subscribers != null ? `${formatCompact(s.subscribers)} subs` : 'subs hidden'} · {formatCompact(s.totalViews)} views
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function rowsToCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown): string => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(','), ...rows.map((r) => headers.map((h) => escape(r[h])).join(','))].join('\n');
}
