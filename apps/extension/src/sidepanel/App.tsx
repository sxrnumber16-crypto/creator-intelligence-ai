import { useEffect, useState } from 'react';
import { useStore } from '../store';
import { api } from '../lib/api';
import { Sidebar, Header, AuthRequired, BackendDown, type NavId } from '../components/layout';
import { Spinner } from '../components/ui';
import { OverviewPage } from '../pages/Overview';
import { ChannelAnalyticsPage, VideoAnalyticsPage } from '../pages/ChannelAnalytics';
import { SeoIntelligencePage } from '../pages/SeoIntelligence';
import { KeywordExplorerPage } from '../pages/KeywordExplorer';
import { CompetitorsPage } from '../pages/Competitors';
import { ContentStudioPage } from '../pages/ContentStudio';
import { BestTimePage } from '../pages/BestTime';
import { VideoAuditorPage } from '../pages/VideoAuditor';
import { AssistantPage } from '../pages/Assistant';
import { WorkspacePage } from '../pages/Workspace';
import { SettingsPage } from '../pages/Settings';

export function App(): React.JSX.Element {
  const { session, loaded, bootstrap, startSignIn, backendError, retryBackend, activeChannel, refreshChannels } = useApp();
  const [nav, setNav] = useState<NavId>('overview');

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    const handler = (event: Event): void => setNav((event as CustomEvent<NavId>).detail);
    window.addEventListener('cia:navigate', handler);
    return () => window.removeEventListener('cia:navigate', handler);
  }, []);

  if (!loaded) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size={22} />
      </div>
    );
  }

  if (backendError) {
    return <BackendDown message={backendError} retry={retryBackend} />;
  }

  if (!session) {
    return <AuthRequired onSignIn={() => void startSignIn()} busy={false} />;
  }

  const needsChannel = !['seo', 'auditor', 'workspace', 'settings', 'assistant'].includes(nav);

  return (
    <div className="flex min-h-screen">
      <aside className="w-52 shrink-0 border-r border-ink-700 bg-ink-900">
        <div className="flex items-center gap-2 px-4 py-4">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-ink-800 to-brand-600 text-[10px] font-bold text-white">CI</div>
          <span className="text-xs font-semibold text-slate-200">Creator Intelligence</span>
        </div>
        <Sidebar active={nav} onNavigate={setNav} />
      </aside>
      <main className="min-w-0 flex-1">
        {needsChannel && !activeChannel ? (
          <NoChannel onRefresh={() => void refreshChannels()} />
        ) : (
          <PageRouter nav={nav} />
        )}
      </main>
    </div>
  );
}

function NoChannel({ onRefresh }: { onRefresh: () => void }): React.JSX.Element {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-8 text-center">
      <h2 className="text-sm font-semibold text-slate-100">No active channel</h2>
      <p className="muted mt-1 max-w-xs">
        Your Google account is connected but no YouTube channel was found on it, or none is active. If you just connected the
        account, try re-connecting from Settings so the backend can discover the channel.
      </p>
      <button className="btn-secondary mt-4" onClick={onRefresh}>
        Refresh
      </button>
    </div>
  );
}

function PageRouter({ nav }: { nav: NavId }): React.JSX.Element {
  switch (nav) {
    case 'overview':
      return <OverviewPage />;
    case 'channel':
      return <ChannelAnalyticsPage />;
    case 'videos':
      return <VideoAnalyticsPage />;
    case 'seo':
      return <SeoIntelligencePage />;
    case 'keywords':
      return <KeywordExplorerPage />;
    case 'competitors':
      return <CompetitorsPage />;
    case 'studio':
      return <ContentStudioPage />;
    case 'besttime':
      return <BestTimePage />;
    case 'auditor':
      return <VideoAuditorPage />;
    case 'assistant':
      return <AssistantPage />;
    case 'workspace':
      return <WorkspacePage />;
    case 'settings':
      return <SettingsPage />;
    default:
      return <OverviewPage />;
  }
}

function useApp() {
  const store = useStore();
  const [signInBusy, setSignInBusy] = useState(false);
  const [backendError, setBackendError] = useState<string | null>(null);

  return {
    ...store,
    signInBusy,
    backendError,
    async startSignIn() {
      setSignInBusy(true);
      const result = await chrome.runtime.sendMessage({ type: 'auth:start' });
      setSignInBusy(false);
      if (!result?.ok) {
        setBackendError(result?.error?.message ?? 'Google sign-in failed');
        return;
      }
      setBackendError(null);
      await store.bootstrap();
      await store.refreshChannels();
    },
    retryBackend() {
      setBackendError(null);
      void store.bootstrap();
    },
  };
}

void Header;
void api;
