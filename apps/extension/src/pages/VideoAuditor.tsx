import { useState } from 'react';
import { api } from '../lib/api';
import { useStore } from '../store';
import { useAsync } from '../lib/hooks';
import { Header } from '../components/layout';
import { Card, SectionHeader, Skeleton, ErrorState, EmptyState, Button, Input, Badge, ProgressRing, SourceNote } from '../components/ui';
import { downloadFile, formatDate, formatCompact } from '../lib/format';
import type { SeoAuditReport } from '@shared';

export function VideoAuditorPage(): React.JSX.Element {
  const { activeChannel } = useStore();
  const [input, setInput] = useState('');
  const [keyword, setKeyword] = useState('');
  const [report, setReport] = useState<SeoAuditReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const myVideos = useAsync(async () => (activeChannel ? api.videos(activeChannel.id, { page: 1, pageSize: 12, sort: 'recent' }) : { items: [], total: 0, hasMore: false }), [activeChannel?.id]);

  async function audit(target: string): Promise<void> {
    setBusy(true);
    setError(null);
    setReport(null);
    try {
      setReport(await api.auditVideo(target, keyword || undefined));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="pb-10">
      <Header title="Video Auditor" subtitle="Full audit of any public YouTube video: metadata rubric + public engagement benchmarks + AI recommendations when configured." />

      <div className="space-y-4 px-5 py-4">
        <Card>
          <div className="flex flex-wrap gap-2">
            <Input
              className="min-w-[240px] flex-1"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Paste a YouTube URL or video ID"
            />
            <Input className="w-44" value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="Target keyword (optional)" />
            <Button variant="primary" loading={busy} onClick={() => void audit(input)} disabled={input.length < 5}>
              Run audit
            </Button>
          </div>
          {myVideos.data && myVideos.data.items.length > 0 && (
            <div className="mt-3">
              <p className="label">Or pick one of your synced videos:</p>
              <div className="flex flex-wrap gap-1.5">
                {myVideos.data.items.slice(0, 10).map((v) => (
                  <button key={v.ytVideoId} className="badge bg-ink-700 text-slate-300 hover:bg-ink-600" onClick={() => { setInput(`https://www.youtube.com/watch?v=${v.ytVideoId}`); void audit(`https://www.youtube.com/watch?v=${v.ytVideoId}`); }}>
                    {v.title.length > 40 ? `${v.title.slice(0, 40)}...` : v.title}
                  </button>
                ))}
              </div>
            </div>
          )}
          {error && <div className="mt-3"><ErrorState message={error} /></div>}
        </Card>

        {busy && <Skeleton rows={6} height="h-20" />}

        {report && (
          <>
            <Card className="flex flex-wrap items-center gap-5">
              <ProgressRing score={report.score.overall} size={84} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-100">{report.video.title}</p>
                <p className="muted mt-0.5">
                  {report.channelTitle} · published {formatDate(report.video.publishedAt)} ·{' '}
                  {report.video.isShort ? 'Short' : `${Math.round(report.video.durationSeconds / 60)} min`}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Badge>{formatCompact(report.engagement.views)} views</Badge>
                  <Badge>like rate {report.engagement.likeRate ?? '-'}%</Badge>
                  <Badge>comment rate {report.engagement.commentRate ?? '-'}%</Badge>
                  <Badge tone="brand">grade {report.score.grade}</Badge>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  className="!text-xs"
                  onClick={() => downloadFile(`seo-audit-${report.video.ytVideoId}.json`, JSON.stringify(report, null, 2))}
                >
                  Export JSON
                </Button>
                <Button
                  variant="ghost"
                  className="!text-xs"
                  onClick={() => {
                    const rows = report.score.components.map((c) => ({
                      component: c.component,
                      score: c.score,
                      weight: c.weight,
                      findings: c.findings.map((f) => `[${f.level}] ${f.title}: ${f.detail}`).join(' | '),
                    }));
                    const header = 'component,score,weight,findings';
                    const csv = [header, ...rows.map((r) => `${r.component},${r.score},${r.weight},"${r.findings.replace(/"/g, '""')}"`)].join('\n');
                    downloadFile(`seo-audit-${report.video.ytVideoId}.csv`, csv, 'text/csv');
                  }}
                >
                  Export CSV
                </Button>
              </div>
            </Card>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {report.score.components.map((component) => (
                <Card key={component.component}>
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold capitalize text-slate-200">{component.component}</p>
                    <span className="text-xs font-bold text-slate-300">{component.score}/100</span>
                  </div>
                  <ul className="mt-2 space-y-2">
                    {component.findings.map((finding, i) => (
                      <li key={i} className="text-[11px] leading-relaxed">
                        <span className={finding.level === 'good' ? 'text-good' : finding.level === 'critical' ? 'text-bad' : 'text-warn'}>
                          {finding.level === 'good' ? 'PASS' : finding.level === 'critical' ? 'FIX' : 'IMPROVE'}
                        </span>{' '}
                        <span className="text-slate-300">{finding.title}</span>
                        <span className="block text-slate-500">{finding.detail}</span>
                        {finding.recommendation && <span className="block text-brand-300">→ {finding.recommendation}</span>}
                      </li>
                    ))}
                  </ul>
                </Card>
              ))}
            </div>

            <Card>
              <SectionHeader title="Engagement benchmark" subtitle={report.engagement.benchmarkNote} />
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <Metric label="Views" value={formatCompact(report.engagement.views)} />
                <Metric label="Likes" value={formatCompact(report.engagement.likes)} />
                <Metric label="Comments" value={formatCompact(report.engagement.comments)} />
                <Metric label="Like rate" value={report.engagement.likeRate != null ? `${report.engagement.likeRate}%` : '-'} />
              </div>
            </Card>

            <Card>
              <SectionHeader title="Could not be analyzed" subtitle="We state limits instead of guessing." />
              <ul className="space-y-1">
                {report.notAnalyzed.map((item, i) => (
                  <li key={i} className="text-xs text-slate-500">- {item}</li>
                ))}
              </ul>
            </Card>

            <SourceNote>
              Audits are saved to your workspace automatically. The score measures metadata quality only - no one can guarantee
              search rankings.
            </SourceNote>
          </>
        )}

        {!busy && !report && !error && (
          <EmptyState title="No audit yet" body="Paste a video URL above. Your own synced videos can be audited with one click." />
        )}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <div className="rounded-lg border border-ink-700 bg-ink-800/60 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-sm font-semibold text-slate-100">{value}</p>
    </div>
  );
}
