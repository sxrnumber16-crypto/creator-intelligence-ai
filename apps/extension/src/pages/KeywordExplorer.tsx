import { useState } from 'react';
import { api } from '../lib/api';
import { useAsync } from '../lib/hooks';
import { Header } from '../components/layout';
import { Card, SectionHeader, Skeleton, ErrorState, EmptyState, Button, Input, Badge, SourceNote, Stat } from '../components/ui';
import { downloadFile, formatCompact, scoreColor } from '../lib/format';
import type { KeywordAnalysisResponse, KeywordExploreResponse } from '@shared';

export function KeywordExplorerPage(): React.JSX.Element {
  const [seed, setSeed] = useState('');
  const [mode, setMode] = useState<'explore' | 'analyze'>('explore');
  const [explore, setExplore] = useState<KeywordExploreResponse | null>(null);
  const [analysis, setAnalysis] = useState<KeywordAnalysisResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const history = useAsync(async () => api.keywordHistory(), []);
  const saved = useAsync(async () => api.savedKeywords(), []);

  async function run(): Promise<void> {
    setBusy(true);
    setError(null);
    setExplore(null);
    setAnalysis(null);
    try {
      if (mode === 'explore') {
        setExplore(await api.exploreKeywords(seed));
      } else {
        setAnalysis(await api.analyzeKeyword(seed));
      }
      history.refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function save(keyword: string, opportunity: number, cluster?: string, intent?: string): Promise<void> {
    await api.saveKeyword({ keyword, opportunity, cluster, intent });
    saved.refetch();
  }

  function exportCsv(): void {
    const rows: Record<string, unknown>[] = [];
    if (explore) {
      for (const cluster of explore.clusters) {
        for (const k of cluster.keywords) {
          rows.push({
            keyword: k.keyword,
            cluster: cluster.name,
            intent: k.intent,
            opportunity: k.opportunity,
            competitionScore: k.opportunityFactors.competitionScore,
            topMedianViews: k.opportunityFactors.topMedianViews,
            sampleSize: k.opportunityFactors.sampleSize,
            checkedAt: k.checkedAt,
          });
        }
      }
    }
    downloadFile(`keywords-${seed.replace(/\W+/g, '-')}.csv`, rowsToCsv(rows), 'text/csv');
  }

  return (
    <div className="pb-10">
      <Header title="Keyword Explorer" subtitle="Every keyword is verified against live top-10 competition data. No fake search volumes - opportunity is a transparent relative estimate." />

      <div className="space-y-4 px-5 py-4">
        <Card>
          <div className="flex gap-2">
            <Input
              value={seed}
              onChange={(e) => setSeed(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && seed.length >= 3 && void run()}
              placeholder="Enter a seed keyword or topic..."
            />
            <Button variant="primary" loading={busy} onClick={() => void run()} disabled={seed.length < 3}>
              {mode === 'explore' ? 'Explore' : 'Analyze'}
            </Button>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <button className={`badge ${mode === 'explore' ? 'bg-brand-500/15 text-brand-300' : 'bg-ink-700 text-slate-400'}`} onClick={() => setMode('explore')}>
              Discover related keywords
            </button>
            <button className={`badge ${mode === 'analyze' ? 'bg-brand-500/15 text-brand-300' : 'bg-ink-700 text-slate-400'}`} onClick={() => setMode('analyze')}>
              Deep-analyze single keyword
            </button>
            {explore && <Button variant="ghost" className="!ml-auto !text-xs" onClick={exportCsv}>Export CSV</Button>}
          </div>
          {error && <div className="mt-3"><ErrorState message={error} /></div>}
        </Card>

        {busy && <Skeleton rows={6} height="h-14" />}

        {explore && (
          <>
            {explore.clusters.map((cluster) => (
              <Card key={cluster.name}>
                <SectionHeader title={cluster.name} subtitle={`${cluster.keywords.length} keywords`} />
                <div className="space-y-1.5">
                  {cluster.keywords
                    .slice()
                    .sort((a, b) => b.opportunity - a.opportunity)
                    .map((k) => (
                      <KeywordRow
                        key={k.keyword}
                        keyword={k.keyword}
                        intent={k.intent}
                        opportunity={k.opportunity}
                        competition={k.opportunityFactors.competitionScore}
                        topMedianViews={k.opportunityFactors.topMedianViews}
                        sampleSize={k.opportunityFactors.sampleSize}
                        onSave={() => void save(k.keyword, k.opportunity, cluster.name, k.intent)}
                      />
                    ))}
                </div>
              </Card>
            ))}
            <SourceNote>
              <strong className="text-slate-400">Data sources:</strong> {explore.sources.map((s) => s.source).join(' + ')}
              <br />
              {explore.volumeDisclosure}
            </SourceNote>
          </>
        )}

        {analysis && (
          <>
            <Card>
              <SectionHeader
                title={`"${analysis.keyword}"`}
                subtitle={`${analysis.intent} intent (confidence ${(analysis.intentConfidence * 100).toFixed(0)}%)`}
                actions={<Button onClick={() => void save(analysis.keyword, analysis.opportunity)}>Save keyword</Button>}
              />
              <div className="grid grid-cols-3 gap-3">
                <Stat label="Opportunity" value={`${analysis.opportunity}/100`} hint="relative estimate, not search volume" />
                <Stat label="Competition" value={`${analysis.factors.competitionScore}/100`} hint="higher = harder" />
                <Stat label="Top-10 median views" value={formatCompact(analysis.factors.topMedianViews)} hint={`${analysis.factors.sampleSize} videos sampled`} />
              </div>
              <ul className="mt-3 space-y-1">
                {analysis.interpretation.map((line, i) => (
                  <li key={i} className="text-xs text-slate-400">- {line}</li>
                ))}
              </ul>
            </Card>
            <Card>
              <SectionHeader title="Who ranks right now" subtitle="Public data - these are the videos you would compete with." />
              <div className="space-y-1.5">
                {analysis.topCompetingVideos.map((v) => (
                  <a
                    key={v.ytVideoId}
                    href={`https://www.youtube.com/watch?v=${v.ytVideoId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-ink-700/50"
                  >
                    <span className="truncate text-xs text-slate-300">{v.title}</span>
                    <span className="shrink-0 text-[11px] text-slate-500">{formatCompact(v.stats.views)} views</span>
                  </a>
                ))}
              </div>
            </Card>
            <SourceNote>{analysis.volumeDisclosure}</SourceNote>
          </>
        )}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <SectionHeader title="Saved keywords" subtitle={`${saved.data?.items.length ?? 0} saved`} />
            <div className="space-y-1.5">
              {(saved.data?.items ?? []).map((k) => (
                <div key={k.id} className="flex items-center justify-between rounded-lg border border-ink-700 bg-ink-800/60 px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-xs text-slate-200">{k.keyword}</p>
                    <p className="text-[10px] text-slate-500">{k.cluster ?? 'ungrouped'} · {k.intent ?? 'intent n/a'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {k.opportunity != null && <span className={`text-xs font-semibold ${scoreColor(k.opportunity)}`}>{k.opportunity}</span>}
                    <button className="text-xs text-slate-500 hover:text-red-400" onClick={() => void api.deleteKeyword(k.id).then(saved.refetch)}>
                      Remove
                    </button>
                  </div>
                </div>
              ))}
              {(saved.data?.items.length ?? 0) === 0 && <p className="muted">Save keywords from any result to build your database.</p>}
            </div>
          </Card>

          <Card>
            <SectionHeader title="Query history" subtitle="Local audit trail of your keyword research." />
            <div className="space-y-1">
              {(history.data?.items ?? []).map((h) => (
                <button key={h.id} className="flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-left hover:bg-ink-700/50" onClick={() => { setSeed(h.seed); setMode('explore'); }}>
                  <span className="truncate text-xs text-slate-300">{h.seed}</span>
                  <span className="text-[10px] text-slate-600">{new Date(h.createdAt).toLocaleDateString()}</span>
                </button>
              ))}
              {(history.data?.items.length ?? 0) === 0 && <p className="muted">No history yet.</p>}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function KeywordRow(props: {
  keyword: string;
  intent: string;
  opportunity: number;
  competition: number | null;
  topMedianViews: number | null;
  sampleSize: number;
  onSave: () => void;
}): React.JSX.Element {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-ink-700 bg-ink-800/60 px-3 py-2">
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-slate-200">{props.keyword}</p>
        <p className="mt-0.5 text-[10px] text-slate-500">
          {props.intent} · competition {props.competition ?? 'n/a'} · top-10 median views {props.topMedianViews != null ? formatCompact(props.topMedianViews) : 'n/a'} · n={props.sampleSize}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Badge tone={props.opportunity >= 60 ? 'good' : props.opportunity >= 40 ? 'warn' : 'bad'}>{props.opportunity}</Badge>
        <button className="btn-ghost !px-2 !py-1 !text-[11px]" onClick={props.onSave}>
          Save
        </button>
      </div>
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
