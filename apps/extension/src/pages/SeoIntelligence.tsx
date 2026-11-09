import { useState } from 'react';
import { useStore } from '../store';
import { api } from '../lib/api';
import { useAsync, useCopy } from '../lib/hooks';
import { Header } from '../components/layout';
import { Card, SectionHeader, Skeleton, ErrorState, EmptyState, Button, Input, Badge, ProgressRing, SourceNote, CopyButton, Stat, NotConfigured } from '../components/ui';
import { downloadFile, scoreBg, scoreColor } from '../lib/format';
import type { SeoAuditReport, SeoScoreResult } from '@shared';

export function SeoIntelligencePage(): React.JSX.Element {
  const [tab, setTab] = useState<'score' | 'titles' | 'description' | 'tags'>('score');
  const tabs = [
    { id: 'score', label: 'Score analyzer' },
    { id: 'titles', label: 'Title optimizer' },
    { id: 'description', label: 'Description' },
    { id: 'tags', label: 'Tag intelligence' },
  ] as const;

  return (
    <div className="pb-10">
      <Header title="SEO Intelligence" subtitle="Transparent metadata scoring + AI-assisted optimization. Scores measure metadata quality, never promised rankings." />
      <div className="px-5 py-4">
        <div className="mb-4 flex gap-1 rounded-xl border border-ink-700 bg-ink-900 p-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium ${tab === t.id ? 'bg-brand-500/15 text-brand-300' : 'text-slate-400 hover:text-slate-200'}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'score' && <ScoreAnalyzer />}
        {tab === 'titles' && <TitleOptimizer />}
        {tab === 'description' && <DescriptionOptimizer />}
        {tab === 'tags' && <TagIntelligence />}
      </div>
    </div>
  );
}

function ScoreAnalyzer(): React.JSX.Element {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [keyword, setKeyword] = useState('');
  const [result, setResult] = useState<SeoScoreResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function analyze(): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      setResult(await api.scoreSeo({ title, description, tags: tags.split(',').map((t) => t.trim()).filter(Boolean), keyword: keyword || undefined }));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card>
        <SectionHeader title="Paste your metadata" subtitle="Runs the transparent rule-based rubric instantly - no API quota, no AI needed." />
        <div className="space-y-3">
          <div>
            <label className="label">Target keyword (optional)</label>
            <Input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="e.g. notion tutorial" />
          </div>
          <div>
            <label className="label">Title</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Video title" />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input min-h-[140px]" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Video description" />
          </div>
          <div>
            <label className="label">Tags (comma separated)</label>
            <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="tag one, tag two" />
          </div>
          <Button variant="primary" loading={busy} onClick={() => void analyze()} disabled={title.length < 3}>
            Analyze metadata
          </Button>
          {error && <ErrorState message={error} />}
        </div>
      </Card>

      <div>
        {result ? <ScoreReport result={result} /> : <EmptyState title="No analysis yet" body="Paste metadata and run the analyzer. Every score component and its weight is explained in the report." />}
      </div>
    </div>
  );
}

export function ScoreReport({ result }: { result: SeoScoreResult }): React.JSX.Element {
  return (
    <div className="space-y-3">
      <Card className="flex items-center gap-5">
        <ProgressRing score={result.overall} />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-100">Grade {result.grade}</p>
          <p className="muted mt-0.5">{result.summary}</p>
        </div>
      </Card>
      {result.components.map((component) => (
        <Card key={component.component}>
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold capitalize text-slate-200">{component.component}</p>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold ${scoreColor(component.score)}`}>{component.score}/100</span>
              <Badge>weight {component.weight}</Badge>
            </div>
          </div>
          <p className="muted mt-1">{component.explanation}</p>
          <ul className="mt-2 space-y-2">
            {component.findings.map((finding, i) => (
              <li key={i} className={`rounded-lg border px-3 py-2 ${scoreBg(finding.level === 'good' ? 90 : finding.level === 'warning' ? 60 : 30)}`}>
                <p className="text-xs font-medium text-slate-200">{finding.title}</p>
                <p className="mt-0.5 text-[11px] text-slate-400">{finding.detail}</p>
                {finding.recommendation && <p className="mt-1 text-[11px] text-brand-300">→ {finding.recommendation}</p>}
                {finding.expectedBenefit && <p className="text-[10px] text-slate-500">Expected benefit: {finding.expectedBenefit}</p>}
                <p className="mt-0.5 text-[10px] text-slate-600">confidence: {finding.confidence}</p>
              </li>
            ))}
          </ul>
        </Card>
      ))}
      <SourceNote>{result.methodology}</SourceNote>
    </div>
  );
}

function TitleOptimizer(): React.JSX.Element {
  const [topic, setTopic] = useState('');
  const [keyword, setKeyword] = useState('');
  const [titles, setTitles] = useState<{ text: string; style: string; why: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState('');

  async function generate(): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      const result = await api.generateTitles({ topic, keyword: keyword || undefined });
      setTitles(result.titles);
      setNote(result.note);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card>
        <SectionHeader title="AI title generator" subtitle="SEO, curiosity and clarity variants. Compare side by side, copy the winner." />
        <div className="space-y-3">
          <div>
            <label className="label">Video topic</label>
            <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. building a morning routine that sticks" />
          </div>
          <div>
            <label className="label">Main keyword (optional)</label>
            <Input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="e.g. morning routine" />
          </div>
          <Button variant="primary" loading={busy} onClick={() => void generate()} disabled={topic.length < 3}>
            Generate titles
          </Button>
          {error && <NotConfigured what="AI generation" how={error} />}
          {note && <SourceNote>{note}</SourceNote>}
        </div>
      </Card>

      <div className="space-y-2">
        {busy && <Skeleton rows={4} />}
        {titles.map((t, i) => (
          <Card key={i} className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Badge tone="brand">{t.style}</Badge>
                <span className="text-[10px] text-slate-500">{t.text.length} chars</span>
              </div>
              <p className="mt-1.5 text-sm text-slate-100">{t.text}</p>
              <p className="muted mt-0.5">{t.why}</p>
            </div>
            <CopyButton text={t.text} />
          </Card>
        ))}
      </div>
    </div>
  );
}

function DescriptionOptimizer(): React.JSX.Element {
  const [title, setTitle] = useState('');
  const [keyword, setKeyword] = useState('');
  const [summary, setSummary] = useState('');
  const [raw, setRaw] = useState<{ description?: string; tags?: string[]; hashtags?: string[]; pinnedComment?: string; titles?: unknown } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, copy] = useCopy();

  async function generate(): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      const result = await api.generateDescription({ title, keyword: keyword || undefined, videoSummary: summary || undefined });
      setRaw(result.raw as typeof raw);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card>
        <SectionHeader title="AI description generator" subtitle="Keyword-aware structure: summary, chapters, links, CTA, hashtags." />
        <div className="space-y-3">
          <div>
            <label className="label">Video title</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <label className="label">Main keyword (optional)</label>
            <Input value={keyword} onChange={(e) => setKeyword(e.target.value)} />
          </div>
          <div>
            <label className="label">What is the video about? (optional)</label>
            <textarea className="input min-h-[90px]" value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="2-3 sentences about the content" />
          </div>
          <Button variant="primary" loading={busy} onClick={() => void generate()} disabled={title.length < 3}>
            Generate description
          </Button>
          {error && <NotConfigured what="AI generation" how={error} />}
        </div>
      </Card>

      <Card>
        <SectionHeader title="Result" actions={raw?.description ? <Button variant="ghost" className="!text-xs" onClick={() => copy(raw.description!)}>{copied ? 'Copied' : 'Copy'}</Button> : undefined} />
        {busy && <Skeleton rows={5} />}
        {!busy && !raw && <EmptyState title="Nothing generated yet" body="Fill in the title and generate. Results are editable - copy into YouTube Studio." />}
        {raw?.description && <p className="whitespace-pre-wrap text-xs leading-relaxed text-slate-300">{raw.description}</p>}
        {raw?.hashtags && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {raw.hashtags.map((h) => (
              <Badge key={h} tone="brand">
                {h}
              </Badge>
            ))}
          </div>
        )}
        {raw?.pinnedComment && (
          <div className="mt-3 rounded-lg border border-ink-700 bg-ink-800/60 p-3">
            <p className="text-[10px] font-semibold uppercase text-slate-500">Pinned comment suggestion</p>
            <p className="mt-1 text-xs text-slate-300">{raw.pinnedComment}</p>
          </div>
        )}
      </Card>
    </div>
  );
}

function TagIntelligence(): React.JSX.Element {
  const [title, setTitle] = useState('');
  const [keyword, setKeyword] = useState('');
  const [raw, setRaw] = useState<{ tags?: string[]; hashtags?: string[]; gaps?: string[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate(): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      const result = await api.generateTags({ title, keyword: keyword || undefined });
      setRaw(result.raw);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  function exportCsv(): void {
    if (!raw?.tags) return;
    downloadFile(
      'tags.csv',
      ['tag', ...raw.tags].join('\n'),
      'text/csv',
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card>
        <SectionHeader title="Tag intelligence" subtitle="Suggested tags + metadata gap detection. Competitor tags that are hidden by YouTube are never guessed." />
        <div className="space-y-3">
          <div>
            <label className="label">Video title</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <label className="label">Main keyword (optional)</label>
            <Input value={keyword} onChange={(e) => setKeyword(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <Button variant="primary" loading={busy} onClick={() => void generate()} disabled={title.length < 3}>
              Generate tags
            </Button>
            {raw?.tags && <Button onClick={exportCsv}>Export CSV</Button>}
          </div>
          {error && <NotConfigured what="AI generation" how={error} />}
        </div>
      </Card>

      <Card>
        <SectionHeader title="Suggestions" actions={raw?.tags ? <CopyButton text={raw.tags.join(', ')} label="Copy all" /> : undefined} />
        {busy && <Skeleton rows={4} />}
        {!busy && !raw && <EmptyState title="No tags yet" body="Generate tag suggestions from a title." />}
        {raw?.tags && (
          <div className="flex flex-wrap gap-1.5">
            {raw.tags.map((t) => (
              <span key={t} className="badge bg-ink-700 text-slate-300">
                {t}
              </span>
            ))}
          </div>
        )}
        {raw?.gaps && raw.gaps.length > 0 && (
          <div className="mt-3">
            <p className="text-[10px] font-semibold uppercase text-slate-500">Metadata gaps noticed</p>
            <ul className="mt-1 space-y-1">
              {raw.gaps.map((g, i) => (
                <li key={i} className="text-xs text-slate-400">
                  - {g}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>
    </div>
  );
}

void Stat;
