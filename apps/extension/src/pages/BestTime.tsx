import { useState } from 'react';
import { useStore } from '../store';
import { api } from '../lib/api';
import { useAsync } from '../lib/hooks';
import { Header } from '../components/layout';
import { Card, SectionHeader, Skeleton, ErrorState, EmptyState, Select, Badge, SourceNote, Toggle, Button } from '../components/ui';
import { Heatmap } from '../components/charts';
import { formatCompact } from '../lib/format';
import type { BestTimeResponse } from '@shared';

export function BestTimePage(): React.JSX.Element {
  const { activeChannel } = useStore();
  const [format, setFormat] = useState('all');
  const [range, setRange] = useState('90');
  const [timezone, setTimezone] = useState<string>(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');

  const result = useAsync<BestTimeResponse | null>(
    async () => (activeChannel ? api.bestTime(activeChannel.id, { format, range: Number(range), timezone }) : null),
    [activeChannel?.id, format, range, timezone],
  );

  return (
    <div className="pb-10">
      <Header title="Best Time to Publish" subtitle="Publish-time vs first-48h traction, from your authorized analytics. Not a guarantee - methodology is stated below." />
      <div className="space-y-4 px-5 py-4">
        <Card>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={format} onChange={setFormat} options={[{ value: 'all', label: 'All videos' }, { value: 'shorts', label: 'Shorts' }, { value: 'long', label: 'Long-form' }]} />
            <Select value={range} onChange={setRange} options={[{ value: '28', label: '28 days' }, { value: '90', label: '90 days' }, { value: '365', label: '365 days' }]} />
            <Select
              value={timezone}
              onChange={setTimezone}
              options={[Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC', 'UTC', 'America/New_York', 'America/Los_Angeles', 'Europe/London', 'Europe/Berlin', 'Asia/Dhaka', 'Asia/Kolkata', 'Asia/Tokyo']
                .filter((v, i, arr) => arr.indexOf(v) === i)
                .map((tz) => ({ value: tz, label: tz }))}
            />
          </div>
        </Card>

        {result.loading && <Skeleton rows={6} height="h-24" />}
        {result.error && <ErrorState message={result.error} retry={result.refetch} />}

        {result.data && (
          <>
            {result.data.insufficientData ? (
              <EmptyState
                title="Not enough data yet"
                body={result.data.notes[result.data.notes.length - 1] ?? 'Publish more videos in this range and re-run the analysis.'}
              />
            ) : (
              <>
                <Card>
                  <SectionHeader
                    title="Publishing heatmap"
                    subtitle={`Median views in the first 48h per publish slot (${result.data.timezone}). Darker = stronger early traction.`}
                    actions={<Badge tone={result.data.confidence === 'high' ? 'good' : result.data.confidence === 'medium' ? 'warn' : 'bad'}>confidence: {result.data.confidence}</Badge>}
                  />
                  <Heatmap cells={result.data.heatmap} />
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                    <span>Sample: {result.data.sampleSize} videos</span>
                    <span>Format: {result.data.format === 'all' ? 'all' : result.data.format}</span>
                    <span>Range: {result.data.range}d</span>
                  </div>
                </Card>

                <Card>
                  <SectionHeader title="Recommended windows" subtitle="Highest-median slots with at least 2 data points." />
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    {result.data.bestWindows.map((w) => (
                      <div key={w.label} className="flex items-center justify-between rounded-lg border border-ink-700 bg-ink-800/60 px-3 py-2.5">
                        <div>
                          <p className="text-xs font-medium text-slate-200">{w.label}</p>
                          <p className="text-[10px] text-slate-500">
                            median {formatCompact(w.medianFirst48hViews)} views/48h · n={w.sampleSize}
                          </p>
                        </div>
                        <Badge tone={w.confidence === 'high' ? 'good' : w.confidence === 'medium' ? 'warn' : 'bad'}>{w.confidence}</Badge>
                      </div>
                    ))}
                  </div>
                </Card>
              </>
            )}

            <Card>
              <SectionHeader title="Methodology & limitations" />
              <ul className="space-y-1.5">
                {result.data.notes.map((note, i) => (
                  <li key={i} className="text-xs leading-relaxed text-slate-400">- {note}</li>
                ))}
              </ul>
            </Card>
            <SourceNote>
              Built on YouTube Analytics API daily per-video views. Audience-online activity reports (when available in Studio)
              measure presence, not performance - this tool deliberately uses measured early traction instead.
            </SourceNote>
          </>
        )}
      </div>
    </div>
  );
}

void Toggle;
