import { useState } from 'react';
import { api } from '../lib/api';
import { useStore } from '../store';
import { Header } from '../components/layout';
import { Card, SectionHeader, Skeleton, EmptyState, Button, Input, TextArea, Badge, CopyButton, Select } from '../components/ui';
import { downloadFile } from '../lib/format';
import type { AiIdea, AiScript } from '@shared';

export function ContentStudioPage(): React.JSX.Element {
  const [tab, setTab] = useState<'ideas' | 'script' | 'plan'>('ideas');
  const tabs = [
    { id: 'ideas', label: 'Idea generator' },
    { id: 'script', label: 'Script writer' },
    { id: 'plan', label: 'Content planner' },
  ] as const;

  return (
    <div className="pb-10">
      <Header title="AI Content Studio" subtitle="Channel-aware generation. Ideas and scripts are grounded in your synced performance data when it exists." />
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
        {tab === 'ideas' && <IdeasPanel />}
        {tab === 'script' && <ScriptPanel />}
        {tab === 'plan' && <PlanPanel />}
      </div>
    </div>
  );
}

async function buildChannelContext(): Promise<string> {
  // Pull light context from the active channel's synced data for grounded generation
  try {
    const state = await chrome.storage.local.get('ciaActiveChannelName');
    void state;
    const { channels } = await api.channels();
    const active = channels.find((c) => c.isActive);
    if (!active) return '';
    const dashboard = await api.dashboard(active.id, 28);
    const lines = [
      `Channel: ${dashboard.channel.title}`,
      dashboard.totals.subscribers != null ? `Subscribers: ${dashboard.totals.subscribers}` : '',
      dashboard.totals.periodViews != null ? `Views last 28d: ${dashboard.totals.periodViews}` : '',
      ...dashboard.topVideos.slice(0, 4).map((v) => `Top video: "${v.title}" (${v.stats.views ?? '?'} views, ${v.isShort ? 'short' : 'long'})`),
      ...dashboard.insights.nextContent.slice(0, 2).map((n) => `AI suggestion: ${n}`),
    ].filter(Boolean);
    return lines.join('\n');
  } catch {
    return '';
  }
}

function IdeasPanel(): React.JSX.Element {
  const [type, setType] = useState('longform');
  const [topic, setTopic] = useState('');
  const [count, setCount] = useState('5');
  const [ideas, setIdeas] = useState<AiIdea[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useContext, setUseContext] = useState(true);
  const [model, setModel] = useState('');

  async function generate(): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      const channelContext = useContext ? await buildChannelContext() : undefined;
      const result = await api.generateIdeas({ type, topic: topic || undefined, count: Number(count), channelContext });
      setIdeas(result.ideas);
      setModel(`${result.model}${result.isFallback ? ' (server default key)' : ''}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Card>
        <SectionHeader title="Configuration" />
        <div className="space-y-3">
          <div>
            <label className="label">Idea type</label>
            <Select
              value={type}
              onChange={setType}
              options={[
                { value: 'longform', label: 'Long-form' },
                { value: 'shorts', label: 'Shorts' },
                { value: 'viral', label: 'Viral angles' },
                { value: 'educational', label: 'Educational' },
                { value: 'entertainment', label: 'Entertainment' },
                { value: 'series', label: 'Series concepts' },
                { value: 'trending', label: 'Trending topics' },
              ]}
            />
          </div>
          <div>
            <label className="label">Topic focus (optional)</label>
            <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. budget home studio setup" />
          </div>
          <div>
            <label className="label">How many</label>
            <Select value={count} onChange={setCount} options={[{ value: '3', label: '3' }, { value: '5', label: '5' }, { value: '8', label: '8' }]} />
          </div>
          <label className="flex items-center gap-2 text-xs text-slate-400">
            <input type="checkbox" checked={useContext} onChange={(e) => setUseContext(e.target.checked)} />
            Ground in my channel data (last 28 days)
          </label>
          <Button variant="primary" loading={busy} onClick={() => void generate()}>
            Generate ideas
          </Button>
          {error && <p className="text-xs text-red-300">{error}</p>}
        </div>
      </Card>

      <div className="space-y-3 lg:col-span-2">
        {busy && <Skeleton rows={5} height="h-24" />}
        {!busy && ideas.length === 0 && <EmptyState title="No ideas yet" body="Configure and generate. Channel-aware mode feeds your real top performers into the prompt." />}
        {ideas.map((idea, i) => (
          <Card key={i}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Badge tone={idea.format === 'shorts' ? 'brand' : 'neutral'}>{idea.format}</Badge>
                  {idea.keywords.slice(0, 3).map((k) => (
                    <Badge key={k}>{k}</Badge>
                  ))}
                </div>
                <p className="mt-1.5 text-sm font-semibold text-slate-100">{idea.title}</p>
                <p className="muted mt-0.5">{idea.angle}</p>
                <p className="mt-1.5 text-xs italic text-brand-300">Hook: {idea.hook}</p>
                <p className="mt-1 text-xs text-slate-400">{idea.why}</p>
              </div>
              <CopyButton text={`${idea.title}\n\nAngle: ${idea.angle}\nHook: ${idea.hook}\nWhy: ${idea.why}`} />
            </div>
          </Card>
        ))}
        {ideas.length > 0 && (
          <div className="flex items-center justify-between">
            <Button variant="ghost" className="!text-xs" onClick={() => downloadFile('ideas.json', JSON.stringify(ideas, null, 2))}>
              Export JSON
            </Button>
            {model && <span className="text-[10px] text-slate-600">model: {model}</span>}
          </div>
        )}
      </div>
    </div>
  );
}

function ScriptPanel(): React.JSX.Element {
  const { activeChannel } = useStore();
  const [brief, setBrief] = useState('');
  const [format, setFormat] = useState('longform');
  const [duration, setDuration] = useState('10');
  const [tone, setTone] = useState('');
  const [script, setScript] = useState<AiScript | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate(): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      const channelContext = activeChannel ? `Active channel: ${activeChannel.channelTitle}` : undefined;
      const result = await api.generateScript({ brief, format, durationMinutes: Number(duration), tone: tone || undefined, channelContext });
      setScript(result.script);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Card>
        <SectionHeader title="Script brief" />
        <div className="space-y-3">
          <div>
            <label className="label">What should the video be about?</label>
            <TextArea value={brief} onChange={(e) => setBrief(e.target.value)} placeholder="Describe the goal, key points, and audience" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label">Format</label>
              <Select value={format} onChange={setFormat} options={[{ value: 'longform', label: 'Long-form' }, { value: 'shorts', label: 'Shorts' }]} />
            </div>
            <div>
              <label className="label">Minutes</label>
              <Select value={duration} onChange={setDuration} options={['1', '3', '5', '8', '10', '15', '20'].map((v) => ({ value: v, label: v }))} />
            </div>
          </div>
          <div>
            <label className="label">Tone (optional)</label>
            <Input value={tone} onChange={(e) => setTone(e.target.value)} placeholder="e.g. energetic, calm, documentary" />
          </div>
          <Button variant="primary" loading={busy} onClick={() => void generate()} disabled={brief.length < 5}>
            Write script
          </Button>
          {error && <p className="text-xs text-red-300">{error}</p>}
        </div>
      </Card>

      <div className="lg:col-span-2">
        {busy && <Skeleton rows={8} />}
        {!busy && !script && <EmptyState title="No script yet" body="Write a brief and generate a structured, timestamped script." />}
        {script && (
          <Card>
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-100">{script.title}</p>
                <p className="muted mt-0.5">Hook: {script.hook}</p>
              </div>
              <div className="flex gap-1.5">
                <CopyButton text={script.sections.map((s) => `${s.timestamp} ${s.heading}\n${s.script}`).join('\n\n')} label="Copy script" />
                <Button variant="ghost" className="!text-[11px]" onClick={() => downloadFile('script.json', JSON.stringify(script, null, 2))}>
                  Export
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              {script.sections.map((section, i) => (
                <div key={i} className="rounded-lg border border-ink-700 bg-ink-800/60 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-brand-300">
                    {section.timestamp} - {section.heading}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-slate-300">{section.script}</p>
                </div>
              ))}
            </div>
            {script.cta && (
              <div className="mt-3 rounded-lg border border-brand-500/30 bg-brand-500/10 p-3">
                <p className="text-[10px] font-semibold uppercase text-brand-300">CTA</p>
                <p className="mt-1 text-xs text-slate-300">{script.cta}</p>
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}

function PlanPanel(): React.JSX.Element {
  const [weeks, setWeeks] = useState('2');
  const [focus, setFocus] = useState('');
  const [plan, setPlan] = useState<{ weeks?: { week: number; theme: string; videos: { day: string; format: string; workingTitle: string; goal: string; keyword: string }[] }[]; strategyNotes?: string[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate(): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      const channelContext = await buildChannelContext();
      const result = await api.generatePlan({ weeks: Number(weeks), focus: focus || undefined, channelContext });
      setPlan(result.plan as typeof plan);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Card>
        <SectionHeader title="Planning parameters" />
        <div className="space-y-3">
          <div>
            <label className="label">Horizon</label>
            <Select value={weeks} onChange={setWeeks} options={[{ value: '1', label: '1 week' }, { value: '2', label: '2 weeks' }, { value: '4', label: '4 weeks' }]} />
          </div>
          <div>
            <label className="label">Focus / goal (optional)</label>
            <Input value={focus} onChange={(e) => setFocus(e.target.value)} placeholder="e.g. grow Shorts, launch a series" />
          </div>
          <Button variant="primary" loading={busy} onClick={() => void generate()}>
            Build plan
          </Button>
          {error && <p className="text-xs text-red-300">{error}</p>}
        </div>
      </Card>

      <div className="space-y-3 lg:col-span-2">
        {busy && <Skeleton rows={6} />}
        {!busy && !plan && <EmptyState title="No plan yet" body="Generate a publishing calendar grounded in your recent performance." />}
        {plan?.weeks?.map((week) => (
          <Card key={week.week}>
            <SectionHeader title={`Week ${week.week}: ${week.theme}`} />
            <div className="space-y-1.5">
              {week.videos.map((video, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg border border-ink-700 bg-ink-800/60 px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-slate-200">{video.workingTitle}</p>
                    <p className="text-[10px] text-slate-500">
                      {video.day} · {video.format} · keyword: {video.keyword || 'n/a'} · {video.goal}
                    </p>
                  </div>
                  <Badge tone={video.format === 'shorts' ? 'brand' : 'neutral'}>{video.format}</Badge>
                </div>
              ))}
            </div>
          </Card>
        ))}
        {plan?.strategyNotes && (
          <Card>
            <SectionHeader title="Strategy notes" />
            <ul className="space-y-1">
              {plan.strategyNotes.map((note, i) => (
                <li key={i} className="text-xs text-slate-400">- {note}</li>
              ))}
            </ul>
          </Card>
        )}
        {plan && (
          <Button variant="ghost" className="!text-xs" onClick={() => downloadFile('content-plan.json', JSON.stringify(plan, null, 2))}>
            Export plan JSON
          </Button>
        )}
      </div>
    </div>
  );
}
