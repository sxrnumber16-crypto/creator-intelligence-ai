import { useState } from 'react';
import { api } from '../lib/api';
import { useAsync } from '../lib/hooks';
import { Header } from '../components/layout';
import { Card, SectionHeader, Skeleton, ErrorState, EmptyState, Button, Badge, Input } from '../components/ui';
import { downloadFile, formatRelative } from '../lib/format';

const KIND_LABELS: Record<string, string> = {
  keyword: 'Keyword',
  keyword_list: 'Keyword list',
  competitor: 'Competitor',
  idea: 'Idea set',
  script: 'Script',
  seo_audit: 'SEO audit',
  report: 'Report',
};

export function WorkspacePage(): React.JSX.Element {
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState<string>('');
  const workspace = useAsync(async () => api.workspace(kind || undefined), [kind]);
  const audits = useAsync(async () => apiSeoAudits(), []);

  const items = (workspace.data?.items ?? []).filter((i) => (query ? i.title.toLowerCase().includes(query.toLowerCase()) : true));

  return (
    <div className="pb-10">
      <Header title="Saved Workspace" subtitle="Everything you save - keywords, ideas, scripts, audits, reports - searchable and exportable." />

      <div className="space-y-4 px-5 py-4">
        <Card>
          <div className="flex flex-wrap items-center gap-2">
            <Input className="min-w-[200px] flex-1" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search saved items..." />
            <select className="input !w-auto cursor-pointer" value={kind} onChange={(e) => setKind(e.target.value)}>
              <option value="">All types</option>
              {Object.entries(KIND_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <Button
              variant="ghost"
              className="!text-xs"
              onClick={() =>
                downloadFile(
                  'workspace-export.json',
                  JSON.stringify({ exportedAt: new Date().toISOString(), items }, null, 2),
                )
              }
            >
              Export all (JSON)
            </Button>
            <Button
              variant="ghost"
              className="!text-xs"
              onClick={() =>
                downloadFile(
                  'workspace-export.csv',
                  ['kind,title,createdAt', ...items.map((i) => `"${i.kind}","${i.title.replace(/"/g, '""')}","${i.createdAt}"`)].join('\n'),
                  'text/csv',
                )
              }
            >
              Export all (CSV)
            </Button>
          </div>
        </Card>

        {workspace.loading && <Skeleton rows={5} />}
        {workspace.error && <ErrorState message={workspace.error} retry={workspace.refetch} />}

        {items.length === 0 && !workspace.loading && (
          <EmptyState title="Nothing saved yet" body="Save keywords from the Keyword Explorer, ideas from the Content Studio, and audits from the Video Auditor." />
        )}

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {items.map((item) => (
            <Card key={item.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge tone="brand">{KIND_LABELS[item.kind] ?? item.kind}</Badge>
                    <span className="text-[10px] text-slate-600">{formatRelative(item.createdAt)}</span>
                  </div>
                  <p className="mt-1.5 truncate text-xs font-medium text-slate-200">{item.title}</p>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <Button variant="ghost" className="!text-[11px]" onClick={() => downloadFile(`${item.kind}-${item.id}.json`, JSON.stringify(item.payload, null, 2))}>
                    Export
                  </Button>
                  <Button variant="ghost" className="!text-[11px] !text-red-400" onClick={() => void api.deleteWorkspaceItem(item.id).then(workspace.refetch)}>
                    Delete
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <Card>
          <SectionHeader title="SEO audit history" subtitle={`${audits.data?.items.length ?? 0} audits stored`} />
          <div className="space-y-1">
            {(audits.data?.items ?? []).map((audit) => (
              <div key={audit.id} className="flex items-center justify-between rounded-lg border border-ink-700 bg-ink-800/60 px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-xs text-slate-200">{audit.videoTitle}</p>
                  <p className="text-[10px] text-slate-500">{formatRelative(audit.createdAt)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={audit.overall >= 70 ? 'good' : audit.overall >= 50 ? 'warn' : 'bad'}>{audit.overall}/100</Badge>
                  <Button
                    variant="ghost"
                    className="!text-[11px]"
                    onClick={() =>
                      void (async () => {
                        const full = await callAudit(audit.id);
                        downloadFile(`audit-${audit.ytVideoId}.json`, JSON.stringify(full, null, 2));
                      })()
                    }
                  >
                    Export
                  </Button>
                </div>
              </div>
            ))}
            {(audits.data?.items.length ?? 0) === 0 && <p className="muted">Run an audit in the Video Auditor.</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}

async function apiSeoAudits(): Promise<{ items: { id: string; ytVideoId: string; videoTitle: string; overall: number; createdAt: string }[] }> {
  return callApi('GET', '/api/seo/audits');
}

async function callAudit(id: string): Promise<unknown> {
  return callApi('GET', `/api/seo/audits/${id}`);
}

async function callApi<T>(method: string, path: string): Promise<T> {
  const response = await chrome.runtime.sendMessage({ type: 'api', payload: { method, path } });
  if (!response?.ok) throw new Error(response?.error?.message ?? 'Request failed');
  return response.data as T;
}
