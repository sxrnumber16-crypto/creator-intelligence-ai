import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useStore } from '../store';
import { useAsync } from '../lib/hooks';
import { loadBranding, saveBranding, DEFAULT_BRANDING } from '../branding';
import { Header } from '../components/layout';
import { Card, SectionHeader, Skeleton, ErrorState, Button, Input, Toggle, Badge, Select, SourceNote, NotConfigured } from '../components/ui';
import { downloadFile, formatRelative } from '../lib/format';
import type { AiProviderConfig } from '@shared';

export function SettingsPage(): React.JSX.Element {
  const { settings, updateSettings, session, logout, setUnread } = useStore();
  const [backendUrl, setBackendUrl] = useState(settings.backendUrl);
  const [branding, setBranding] = useState(DEFAULT_BRANDING);
  const [prefs, setPrefs] = useState<{ timezone: string; brandName: string; overlaysEnabled: boolean } | null>(null);
  const [status, setStatus] = useState<{ env?: string; credentials: Record<string, boolean>; quota?: { dataApiUnitsUsed: number; dataApiDailyLimit: number } | null } | null>(null);
  const [notifications, setNotifications] = useState<Record<string, boolean> | null>(null);
  const [savedNote, setSavedNote] = useState('');

  useEffect(() => {
    void (async () => {
      setBranding(await loadBranding());
      try {
        setPrefs(await api.preferences());
        setStatus(await api.systemStatus());
        setNotifications((await api.notifications()).settings);
      } catch {
        /* backend sections render their own errors */
      }
    })();
  }, []);

  return (
    <div className="pb-10">
      <Header title="Settings" subtitle="Connections, AI providers, integrations, branding and data controls." />

      <div className="grid grid-cols-1 gap-4 px-5 py-4 xl:grid-cols-2">
        {/* ------------------------------------------------ account */}
        <Card>
          <SectionHeader title="Account" subtitle={session?.user.email} />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-200">{session?.user.displayName}</p>
              <p className="muted">Signed in via Google OAuth (minimum scopes)</p>
            </div>
            <Button variant="danger" onClick={() => void logout()}>
              Sign out
            </Button>
          </div>
          {prefs && (
            <div className="mt-3">
              <label className="label">Timezone (used by Best Time to Publish)</label>
              <Input
                value={prefs.timezone}
                onChange={(e) => setPrefs({ ...prefs, timezone: e.target.value })}
                onBlur={() => void api.savePreferences({ timezone: prefs.timezone })}
              />
            </div>
          )}
        </Card>

        {/* ------------------------------------------------ backend */}
        <Card>
          <SectionHeader title="Backend connection" subtitle="The extension talks only to your self-hosted backend." />
          <div className="space-y-3">
            <div>
              <label className="label">Backend URL</label>
              <div className="flex gap-2">
                <Input value={backendUrl} onChange={(e) => setBackendUrl(e.target.value)} />
                <Button
                  onClick={() =>
                    void (async () => {
                      await updateSettings({ backendUrl: backendUrl.replace(/\/$/, '') });
                      try {
                        const health = await api.health();
                        setSavedNote(health.services.database ? 'Backend reachable - database OK' : 'Backend reachable - database not OK');
                      } catch (err) {
                        setSavedNote(`Not reachable: ${err instanceof Error ? err.message : 'error'}`);
                      }
                    })()
                  }
                >
                  Test & save
                </Button>
              </div>
              {savedNote && <p className="mt-1 text-[11px] text-slate-500">{savedNote}</p>}
            </div>
            {status && (
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(status.credentials).map(([key, ok]) => (
                  <Badge key={key} tone={ok ? 'good' : 'bad'}>
                    {key}: {ok ? 'configured' : 'missing'}
                  </Badge>
                ))}
              </div>
            )}
            {status?.quota && (
              <p className="muted">
                YouTube Data API quota today: {status.quota.dataApiUnitsUsed}/{status.quota.dataApiDailyLimit} units (resets midnight PT)
              </p>
            )}
          </div>
        </Card>

        {/* ------------------------------------------------ AI providers */}
        <AiProvidersCard />

        {/* ------------------------------------------------ YouTube overlays */}
        <Card>
          <SectionHeader title="YouTube integration" subtitle="On-page overlays are lightweight and can be disabled per feature." />
          <Toggle label="Enable overlays on YouTube" checked={settings.overlaysEnabled} onChange={(v) => void updateSettings({ overlaysEnabled: v })} />
          <Toggle label="Search results badges" checked={settings.searchBadgesEnabled} onChange={(v) => void updateSettings({ searchBadgesEnabled: v })} />
          <Toggle label="Channel page stat card" checked={settings.channelPageCardEnabled} onChange={(v) => void updateSettings({ channelPageCardEnabled: v })} />
        </Card>

        {/* ------------------------------------------------ notifications */}
        <Card>
          <SectionHeader title="Notification types" subtitle="Stored server-side; the badge polls every 15 minutes." />
          {!notifications && <Skeleton rows={3} />}
          {notifications && (
            <div className="space-y-0.5">
              {(
                [
                  ['performance', 'Performance changes'],
                  ['competitorUploads', 'Competitor uploads'],
                  ['growth', 'Unusual growth changes'],
                  ['opportunities', 'Content opportunities'],
                  ['syncFailures', 'Sync failures'],
                ] as const
              ).map(([key, label]) => (
                <Toggle
                  key={key}
                  label={label}
                  checked={notifications[key] ?? true}
                  onChange={(v) => {
                    setNotifications({ ...notifications, [key]: v });
                    void api.notificationSettings({ [key]: v });
                  }}
                />
              ))}
              <Button
                variant="ghost"
                className="!mt-2 !text-xs"
                onClick={() => void api.markRead().then(() => setUnread(0))}
              >
                Mark all as read
              </Button>
            </div>
          )}
        </Card>

        {/* ------------------------------------------------ branding */}
        <Card>
          <SectionHeader title="Branding" subtitle="Product name and identity are configurable." />
          <div className="space-y-3">
            <div>
              <label className="label">Product name</label>
              <Input value={branding.productName} onChange={(e) => setBranding({ ...branding, productName: e.target.value })} />
            </div>
            <div>
              <label className="label">Short name / logo text</label>
              <Input value={branding.shortName} onChange={(e) => setBranding({ ...branding, shortName: e.target.value })} />
            </div>
            <div>
              <label className="label">Tagline</label>
              <Input value={branding.tagline} onChange={(e) => setBranding({ ...branding, tagline: e.target.value })} />
            </div>
            <Button variant="primary" onClick={() => void saveBranding(branding).then(() => setSavedNote('Branding saved'))}>
              Save branding
            </Button>
            {savedNote && <p className="text-[11px] text-slate-500">{savedNote}</p>}
          </div>
        </Card>

        {/* ------------------------------------------------ data controls */}
        <Card>
          <SectionHeader title="Data controls" subtitle="Export or delete everything stored for your account." />
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() =>
                void api
                  .exportAccount()
                  .then((data) => downloadFile('creator-intelligence-export.json', JSON.stringify(data, null, 2)))
                  .catch((err) => setSavedNote(`Export failed: ${err instanceof Error ? err.message : 'error'}`))
              }
            >
              Export all my data (JSON)
            </Button>
            {(
              [
                ['keywords', 'Delete keywords'],
                ['audits', 'Delete audits'],
                ['workspace', 'Delete workspace items'],
                ['conversations', 'Delete AI conversations'],
                ['competitors', 'Delete competitors'],
              ] as const
            ).map(([scope, label]) => (
              <Button
                key={scope}
                variant="danger"
                className="!text-xs"
                onClick={() => {
                  if (window.confirm(`Delete ${scope}? This cannot be undone.`)) {
                    void api.deleteAccountData(scope);
                  }
                }}
              >
                {label}
              </Button>
            ))}
            <Button
              variant="danger"
              onClick={() => {
                if (window.confirm('Delete EVERYTHING including your account, channels and all data? This cannot be undone.')) {
                  void api.deleteAccountData('everything').then(() => logout());
                }
              }}
            >
              Delete entire account
            </Button>
          </div>
        </Card>

        <Card className="xl:col-span-2">
          <SectionHeader title="Data honesty notes" />
          <SourceNote>
            This platform uses only official APIs (YouTube Data v3, YouTube Analytics v2) plus Google OAuth. It never fabricates
            search volumes, never shows competitor private analytics, and clearly separates measured data from AI interpretation.
            Competitor history begins when tracking starts. Quota: {status?.quota ? `${status.quota.dataApiUnitsUsed}/${status.quota.dataApiDailyLimit} units today` : 'see backend status'}.
          </SourceNote>
        </Card>
      </div>
    </div>
  );
}

function AiProvidersCard(): React.JSX.Element {
  const providers = useAsync(async () => api.aiProviders(), []);
  const [kind, setKind] = useState('anthropic');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, string>>({});

  async function add(): Promise<void> {
    setBusy(true);
    setNote(null);
    try {
      await api.saveAiProvider({ kind, apiKey, model: model || defaultModel(kind) });
      setApiKey('');
      setModel('');
      providers.refetch();
    } catch (err) {
      setNote(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <SectionHeader title="AI providers (BYOK)" subtitle="Keys are AES-256-GCM encrypted server-side and never returned to the extension." />
      {providers.loading && <Skeleton rows={2} />}
      {providers.error && <NotConfigured what="AI providers" how={providers.error} />}
      {providers.data && (
        <div className="space-y-2">
          {providers.data.items.map((p: AiProviderConfig) => (
            <div key={p.id} className="rounded-lg border border-ink-700 bg-ink-800/60 px-3 py-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-200">
                    {p.label} {p.isDefault && <Badge tone="brand">default</Badge>}{' '}
                    <Badge tone={p.status === 'ok' ? 'good' : p.status === 'error' ? 'bad' : 'neutral'}>{p.status}</Badge>
                  </p>
                  <p className="text-[10px] text-slate-500">
                    {p.kind} · {p.model} · {p.hasKey ? 'key stored' : 'no key'}
                  </p>
                  {p.lastError && <p className="mt-0.5 text-[10px] text-red-400">{p.lastError}</p>}
                  {testResults[p.id] && <p className="mt-0.5 text-[10px] text-good">test reply: {testResults[p.id]}</p>}
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    variant="ghost"
                    className="!text-[11px]"
                    loading={false}
                    onClick={() =>
                      void api
                        .testAiProvider(p.id)
                        .then((r) => setTestResults((prev) => ({ ...prev, [p.id]: r.reply })))
                        .catch((err) => setTestResults((prev) => ({ ...prev, [p.id]: `failed: ${err instanceof Error ? err.message : 'error'}` })))
                    }
                  >
                    Test
                  </Button>
                  {!p.isDefault && (
                    <Button variant="ghost" className="!text-[11px]" onClick={() => void api.patchAiProvider(p.id, { setDefault: true }).then(providers.refetch)}>
                      Make default
                    </Button>
                  )}
                  <Button variant="ghost" className="!text-[11px] !text-red-400" onClick={() => void api.deleteAiProvider(p.id).then(providers.refetch)}>
                    Remove
                  </Button>
                </div>
              </div>
            </div>
          ))}
          {providers.data.items.length === 0 && (
            <p className="muted">No provider configured. AI features fall back to rule-based summaries until a key is added.</p>
          )}
        </div>
      )}

      <div className="mt-3 space-y-2 border-t border-ink-700 pt-3">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="label">Provider</label>
            <Select
              value={kind}
              onChange={(v) => {
                setKind(v);
                setModel(defaultModel(v));
              }}
              options={[
                { value: 'anthropic', label: 'Anthropic Claude' },
                { value: 'openai', label: 'OpenAI' },
                { value: 'gemini', label: 'Google Gemini' },
              ]}
            />
          </div>
          <div>
            <label className="label">Model</label>
            <Input value={model} onChange={(e) => setModel(e.target.value)} placeholder={defaultModel(kind)} />
          </div>
        </div>
        <div>
          <label className="label">API key</label>
          <Input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="sk-..." />
        </div>
        <Button variant="primary" loading={busy} onClick={() => void add()} disabled={apiKey.length < 10}>
          Add provider
        </Button>
        {note && <ErrorState message={note} />}
        <p className="text-[10px] leading-relaxed text-slate-600">
          Usage is logged (provider, model, task, tokens) and visible via the backend. Keys are encrypted at rest with the
          backend's ENCRYPTION_KEY.
        </p>
      </div>
    </Card>
  );
}

function defaultModel(kind: string): string {
  return kind === 'anthropic' ? 'claude-sonnet-4-20250514' : kind === 'openai' ? 'gpt-4o-mini' : 'gemini-1.5-flash';
}

void formatRelative;
