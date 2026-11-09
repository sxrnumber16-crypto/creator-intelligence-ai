import { useState } from 'react';
import { useStore } from '../store';
import { api } from '../lib/api';
import { useAsync } from '../lib/hooks';
import { Header } from '../components/layout';
import { Card, SectionHeader, Skeleton, ErrorState, Select, EmptyState, Button, Stat } from '../components/ui';
import { DualLineChart, ViewsLineChart } from '../components/charts';
import { formatCompact, formatDate } from '../lib/format';
import type { AnalyticsPoint, VideoAnalyticsDetail, VideoRanking } from '@shared';

export function ChannelAnalyticsPage(): React.JSX.Element {
  const { activeChannel } = useStore();
  const [range, setRange] = useState('90');
  const dashboard = useAsync(async () => (activeChannel ? api.dashboard(activeChannel.id, Number(range)) : null), [activeChannel?.id, range]);

  return (
    <div className="pb-10">
      <Header title="Channel Analytics" subtitle={activeChannel?.channelTitle}>
        <Select
          value={range}
          onChange={setRange}
          options={[
            { value: '28', label: '28 days' },
            { value: '90', label: '90 days' },
            { value: '365', label: '365 days' },
          ]}
        />
      </Header>

      <div className="space-y-4 px-5 py-4">
        {dashboard.loading && <Skeleton rows={5} height="h-24" />}
        {dashboard.error && <ErrorState message={dashboard.error} retry={dashboard.refetch} />}

        {dashboard.data && (
          <>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
              <Stat label="Subscribers gained" value={formatCompact(dashboard.data.totals.subscribersGained)} />
              <Stat label="Subscribers lost" value={formatCompact(dashboard.data.totals.subscribersLost)} />
              <Stat
                label="Net subscribers"
                value={
                  dashboard.data.totals.subscribersGained != null && dashboard.data.totals.subscribersLost != null
                    ? formatCompact(dashboard.data.totals.subscribersGained - dashboard.data.totals.subscribersLost)
                    : '-'
                }
              />
            </div>

            <Card>
              <SectionHeader title="Views vs subscriber gains" subtitle="Both series come from YouTube Analytics API daily reports." />
              {dashboard.data.timeseries.length > 0 ? (
                <DualLineChart
                  data={dashboard.data.timeseries as unknown as Record<string, unknown>[]}
                  series={[
                    { key: 'views', color: '#38BDF8', label: 'Views' },
                    { key: 'subscribersGained', color: '#34D399', label: 'Subs gained' },
                  ]}
                />
              ) : (
                <EmptyState title="No analytics rows" body="Run a channel sync first." />
              )}
            </Card>

            <Card>
              <SectionHeader title="Watch time (minutes/day)" />
              {dashboard.data.timeseries.some((t) => t.watchMinutes != null) ? (
                <ViewsLineChart data={dashboard.data.timeseries as unknown as Record<string, unknown>[]} dataKey="watchMinutes" color="#A855F7" />
              ) : (
                <EmptyState title="Watch time unavailable" body="estimatedMinutesWatched requires the yt-analytics.readonly scope and sufficient channel age." />
              )}
            </Card>

            <Card>
              <SectionHeader title="Growth trend" subtitle="Daily subscriber gains as reported by the Analytics API." />
              <ViewsLineChart
                data={dashboard.data.timeseries as unknown as Record<string, unknown>[]}
                dataKey="subscribersGained"
                color="#34D399"
                height={160}
              />
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

export function VideoAnalyticsPage(): React.JSX.Element {
  const { activeChannel } = useStore();
  const [format, setFormat] = useState('all');
  const [sort, setSort] = useState('recent');
  const [selected, setSelected] = useState<string | null>(null);

  const videos = useAsync(
    async () => (activeChannel ? api.videos(activeChannel.id, { format, sort, page: 1, pageSize: 25 }) : { items: [], total: 0, hasMore: false }),
    [activeChannel?.id, format, sort],
  );
  const detail = useAsync<VideoAnalyticsDetail | null>(
    async () => (activeChannel && selected ? api.videoDetail(activeChannel.id, selected) : null),
    [activeChannel?.id, selected],
  );

  return (
    <div className="pb-10">
      <Header title="Video Analytics" subtitle={activeChannel?.channelTitle}>
        <Select value={format} onChange={setFormat} options={[{ value: 'all', label: 'All formats' }, { value: 'shorts', label: 'Shorts' }, { value: 'long', label: 'Long-form' }]} />
        <Select
          value={sort}
          onChange={setSort}
          options={[
            { value: 'recent', label: 'Newest' },
            { value: 'views', label: 'Most views' },
            { value: 'viewsPerDay', label: 'Views/day' },
            { value: 'engagement', label: 'Engagement' },
          ]}
        />
      </Header>

      <div className="grid grid-cols-1 gap-4 px-5 py-4 xl:grid-cols-5">
        <div className="xl:col-span-2">
          {videos.loading && <Skeleton rows={6} />}
          {videos.error && <ErrorState message={videos.error} retry={videos.refetch} />}
          {videos.data && (
            <div className="space-y-1">
              {videos.data.items.map((v) => (
                <VideoRow key={v.ytVideoId} video={v} active={selected === v.ytVideoId} onClick={() => setSelected(v.ytVideoId)} />
              ))}
              {videos.data.items.length === 0 && <EmptyState title="No videos" body="Sync the channel to import your uploads." />}
            </div>
          )}
        </div>

        <div className="xl:col-span-3">
          {!selected && <EmptyState title="Select a video" body="Pick a video to see retention, traffic sources and per-day analytics." />}
          {selected && detail.loading && <Skeleton rows={6} />}
          {selected && detail.error && <ErrorState message={detail.error} retry={detail.refetch} />}
          {detail.data && <VideoDetail detail={detail.data} />}
        </div>
      </div>
    </div>
  );
}

function VideoRow({ video, active, onClick }: { video: VideoRanking; active: boolean; onClick: () => void }): React.JSX.Element {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors ${
        active ? 'border-brand-500/40 bg-brand-500/10' : 'border-ink-700 bg-ink-850 hover:bg-ink-700/50'
      }`}
    >
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-slate-200">{video.title}</p>
        <p className="mt-0.5 text-[11px] text-slate-500">
          {formatDate(video.publishedAt)} · {video.isShort ? 'Short' : `${Math.round(video.durationSeconds / 60)} min`}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-xs font-semibold text-slate-200">{formatCompact(video.stats.views)}</p>
        <p className="text-[10px] text-slate-500">{formatCompact(video.viewsPerDay)}/day</p>
      </div>
    </button>
  );
}

function VideoDetail({ detail }: { detail: VideoAnalyticsDetail }): React.JSX.Element {
  const retentionAvailable = (detail.retention?.length ?? 0) > 0;
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-100">{detail.video.title}</h3>
        <p className="muted mt-0.5">
          {formatCompact(detail.video.stats.views)} views · {formatCompact(detail.video.stats.likes)} likes ·{' '}
          {formatCompact(detail.video.stats.comments)} comments
        </p>
      </div>

      {detail.dailyViews && detail.dailyViews.length > 0 && (
        <Card>
          <SectionHeader title="Views over time (private analytics)" />
          <ViewsLineChart data={detail.dailyViews as unknown as Record<string, unknown>[]} height={180} />
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <SectionHeader title="Audience retention" subtitle="audienceWatchRatio per elapsed-video ratio, when the metric is available." />
          {retentionAvailable ? (
            <ViewsLineChart data={detail.retention!.map((r) => ({ date: `${r.elapsedSeconds}`, views: Math.round(r.audienceWatchRatio * 100) }))} height={180} color="#34D399" />
          ) : (
            <EmptyState title="Retention unavailable" body={detail.notes.find((n) => n.includes('etention')) ?? 'The Analytics API did not return retention for this video (too new, Shorts feed view, or scope missing).'} />
          )}
        </Card>

        <Card>
          <SectionHeader title="Traffic sources" subtitle="views by insightTrafficSourceType." />
          {(detail.trafficSources?.length ?? 0) > 0 ? (
            <div className="space-y-1.5">
              {detail.trafficSources!.slice(0, 8).map((t) => {
                const total = detail.trafficSources!.reduce((a, b) => a + b.views, 0);
                return (
                  <div key={t.source} className="flex items-center gap-3">
                    <span className="w-28 shrink-0 truncate text-[11px] text-slate-400">{prettySource(t.source)}</span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink-700">
                      <div className="h-full rounded-full bg-brand-500" style={{ width: `${total > 0 ? (t.views / total) * 100 : 0}%` }} />
                    </div>
                    <span className="w-14 shrink-0 text-right text-[11px] text-slate-400">{formatCompact(t.views)}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState title="Traffic sources unavailable" body={detail.notes.find((n) => n.includes('raffic')) ?? 'Requires the Analytics scope.'} />
          )}
        </Card>
      </div>

      {detail.notes.length > 0 && (
        <div className="rounded-lg border border-ink-700 bg-ink-900/60 px-3 py-2 text-[11px] text-slate-500">
          {detail.notes.map((n, i) => (
            <p key={i}>{n}</p>
          ))}
        </div>
      )}
    </div>
  );
}

function prettySource(source: string): string {
  return source
    .replace('YT_', '')
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

void Button;
