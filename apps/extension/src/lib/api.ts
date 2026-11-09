/**
 * Extension -> background messaging client.
 *
 * ALL backend requests go through the background service worker:
 * - avoids CORS surprises and keeps session tokens in one place
 * - content scripts never see credentials (security requirement)
 */

export interface ApiEnvelope<T = unknown> {
  ok: boolean;
  data?: T;
  error?: { code: string; message: string; details?: unknown };
  status: number;
}

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function callBackground<T>(type: string, payload?: unknown): Promise<T> {
  const response = (await chrome.runtime.sendMessage({ type, payload })) as ApiEnvelope<T>;
  if (!response) {
    throw new ApiError('NO_RESPONSE', 'Background service worker did not respond. Reload the extension.', 0);
  }
  if (!response.ok) {
    throw new ApiError(response.error?.code ?? 'UNKNOWN', response.error?.message ?? 'Unknown error', response.status);
  }
  return response.data as T;
}

export const api = {
  // system
  health: () => callBackground<{ ok: true; services: Record<string, boolean> }>('api', { method: 'GET', path: '/api/health' }),
  systemStatus: () => callBackground<{ env: string; credentials: Record<string, boolean> }>('api', { method: 'GET', path: '/api/system/status' }),

  // auth
  startGoogleAuth: () => callBackground<{ ok: true }>('auth:start'),
  logout: () => callBackground<{ ok: true }>('auth:logout'),
  me: () => callBackground<{ user: { id: string; email: string; displayName: string; avatarUrl?: string }; channels: ChannelRef[] }>('api', { method: 'GET', path: '/api/auth/me' }),

  // channels
  channels: () => callBackground<{ channels: ChannelRef[] }>('api', { method: 'GET', path: '/api/channels' }),
  activateChannel: (id: string) => callBackground<{ ok: true }>('api', { method: 'POST', path: `/api/channels/${id}/activate` }),
  syncChannel: (id: string) => callBackground<{ ok: true; videos: number; analyticsDays: number }>('api', { method: 'POST', path: `/api/channels/${id}/sync` }),
  dashboard: (id: string, range: number) => callBackground<import('@shared').DashboardResponse>('api', { method: 'GET', path: `/api/channels/${id}/dashboard?range=${range}` }),

  // videos
  videos: (id: string, params: Record<string, string | number>) => {
    const query = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])).toString();
    return callBackground<{ items: import('@shared').VideoRanking[]; total: number; page: number; hasMore: boolean }>('api', {
      method: 'GET',
      path: `/api/channels/${id}/videos?${query}`,
    });
  },
  videoDetail: (id: string, videoId: string) => callBackground<import('@shared').VideoAnalyticsDetail>('api', { method: 'GET', path: `/api/channels/${id}/videos/${videoId}` }),

  // keywords
  exploreKeywords: (seed: string) => callBackground<import('@shared').KeywordExploreResponse>('api', { method: 'POST', path: '/api/keywords/explore', body: { seed } }),
  analyzeKeyword: (keyword: string) => callBackground<import('@shared').KeywordAnalysisResponse>('api', { method: 'POST', path: '/api/keywords/analyze', body: { keyword } }),
  savedKeywords: () => callBackground<{ items: { id: string; keyword: string; opportunity: number | null; cluster: string | null; intent: string | null }[] }>('api', { method: 'GET', path: '/api/keywords/saved' }),
  saveKeyword: (body: Record<string, unknown>) => callBackground<{ id: string }>('api', { method: 'POST', path: '/api/keywords/saved', body }),
  deleteKeyword: (id: string) => callBackground<{ ok: true }>('api', { method: 'DELETE', path: `/api/keywords/saved/${id}` }),
  keywordHistory: () => callBackground<{ items: { id: string; seed: string; createdAt: string }[] }>('api', { method: 'GET', path: '/api/keywords/history' }),

  // seo
  scoreSeo: (body: { title: string; description: string; tags: string[]; keyword?: string; isShort?: boolean }) =>
    callBackground<import('@shared').SeoScoreResult>('api', { method: 'POST', path: '/api/seo/score', body }),
  auditVideo: (videoUrl: string, keyword?: string) =>
    callBackground<import('@shared').SeoAuditReport>('api', { method: 'POST', path: '/api/seo/audit', body: { videoUrl, keyword } }),
  generateTitles: (body: { topic: string; keyword?: string; formats?: string[] }) =>
    callBackground<{ titles: { text: string; style: string; why: string }[]; model: string; note: string }>('api', { method: 'POST', path: '/api/seo/titles', body }),
  generateDescription: (body: { title: string; keyword?: string; videoSummary?: string }) =>
    callBackground<{ raw: unknown; model: string }>('api', { method: 'POST', path: '/api/seo/description', body }),
  generateTags: (body: { title: string; keyword?: string }) =>
    callBackground<{ raw: { tags?: string[]; hashtags?: string[]; gaps?: string[] }; model: string }>('api', { method: 'POST', path: '/api/seo/tags', body }),

  // competitors
  competitors: () => callBackground<{ items: unknown[] }>('api', { method: 'GET', path: '/api/competitors' }),
  searchCompetitors: (query: string) => callBackground<{ results: { ytChannelId: string; title: string; thumbnailUrl?: string; subscribers: number | null; videoCount: number | null; description: string }[] }>('api', { method: 'POST', path: '/api/competitors/search', body: { query } }),
  addCompetitor: (input: string) => callBackground<{ id: string; title: string }>('api', { method: 'POST', path: '/api/competitors', body: { input } }),
  removeCompetitor: (id: string) => callBackground<{ ok: true }>('api', { method: 'DELETE', path: `/api/competitors/${id}` }),
  competitorDetail: (id: string) => callBackground<import('@shared').CompetitorDetail>('api', { method: 'GET', path: `/api/competitors/${id}` }),
  syncCompetitor: (id: string) => callBackground<{ ok: true }>('api', { method: 'POST', path: `/api/competitors/${id}/sync` }),
  compareCompetitors: (competitorIds: string[]) => callBackground<{ rows: import('@shared').ChannelComparisonRow[]; note: string }>('api', { method: 'POST', path: '/api/competitors/compare', body: { competitorIds } }),
  contentGap: (competitorIds: string[]) => callBackground<{ gaps: import('@shared').ContentGapItem[]; note: string }>('api', { method: 'POST', path: '/api/competitors/gap', body: { competitorIds } }),

  // ai
  aiProviders: () => callBackground<{ items: import('@shared').AiProviderConfig[]; supportedKinds: string[]; tasks: string[] }>('api', { method: 'GET', path: '/api/ai/providers' }),
  saveAiProvider: (body: { kind: string; apiKey: string; model: string; label?: string; setDefault?: boolean }) => callBackground<{ id: string }>('api', { method: 'POST', path: '/api/ai/providers', body }),
  patchAiProvider: (id: string, body: Record<string, unknown>) => callBackground<{ ok: true }>('api', { method: 'PATCH', path: `/api/ai/providers/${id}`, body }),
  deleteAiProvider: (id: string) => callBackground<{ ok: true }>('api', { method: 'DELETE', path: `/api/ai/providers/${id}` }),
  testAiProvider: (id: string) => callBackground<{ reply: string }>('api', { method: 'POST', path: `/api/ai/providers/${id}/test` }),
  aiUsage: () => callBackground<{ items: { id: string; provider: string; model: string; task: string; ok: boolean; createdAt: string; error: string | null }[] }>('api', { method: 'GET', path: '/api/ai/usage' }),
  generateIdeas: (body: { type: string; topic?: string; count?: number; channelContext?: string }) =>
    callBackground<{ ideas: import('@shared').AiIdea[]; model: string; isFallback: boolean }>('api', { method: 'POST', path: '/api/ideas', body }),
  generateScript: (body: { brief: string; format: string; durationMinutes?: number; tone?: string; channelContext?: string }) =>
    callBackground<{ script: import('@shared').AiScript; model: string }>('api', { method: 'POST', path: '/api/ai/script', body }),
  generatePlan: (body: { weeks: number; focus?: string; channelContext?: string }) => callBackground<{ plan: unknown; model: string }>('api', { method: 'POST', path: '/api/ai/plan', body }),
  chat: (conversationId: string | undefined, message: string) =>
    callBackground<import('@shared').AiChatResponse>('api', { method: 'POST', path: '/api/ai/chat', body: { conversationId, message } }),
  conversations: () => callBackground<{ items: { id: string; title: string; updatedAt: string; messages: { role: string; content: string }[] }[] }>('api', { method: 'GET', path: '/api/ai/conversations' }),
  deleteConversation: (id: string) => callBackground<{ ok: true }>('api', { method: 'DELETE', path: `/api/ai/conversations/${id}` }),

  // best time
  bestTime: (id: string, params: { format: string; range: number; timezone?: string }) => {
    const query = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])).toString();
    return callBackground<import('@shared').BestTimeResponse>('api', { method: 'GET', path: `/api/channels/${id}/best-time?${query}` });
  },

  // workspace
  workspace: (kind?: string) => callBackground<{ items: import('@shared').WorkspaceItem[] }>('api', { method: 'GET', path: `/api/workspace${kind ? `?kind=${kind}` : ''}` }),
  saveToWorkspace: (kind: string, title: string, payload: unknown) => callBackground<{ id: string }>('api', { method: 'POST', path: '/api/workspace', body: { kind, title, payload } }),
  deleteWorkspaceItem: (id: string) => callBackground<{ ok: true }>('api', { method: 'DELETE', path: `/api/workspace/${id}` }),

  // notifications
  notifications: () => callBackground<{ items: import('@shared').AppNotification[]; unread: number; settings: Record<string, boolean> }>('api', { method: 'GET', path: '/api/notifications' }),
  markRead: (ids?: string[]) => callBackground<{ ok: true }>('api', { method: 'POST', path: '/api/notifications/read', body: { ids } }),
  notificationSettings: (patch: Record<string, boolean>) => callBackground<{ ok: true }>('api', { method: 'PATCH', path: '/api/notifications/settings', body: patch }),

  // preferences
  preferences: () => callBackground<{ timezone: string; theme: string; brandName: string; overlaysEnabled: boolean }>('api', { method: 'GET', path: '/api/preferences' }),
  savePreferences: (patch: Record<string, unknown>) => callBackground<{ ok: true }>('api', { method: 'PATCH', path: '/api/preferences', body: patch }),
  exportAccount: () => callBackground<Record<string, unknown>>('api', { method: 'GET', path: '/api/account/export' }),
  deleteAccountData: (scope: string) => callBackground<{ ok: true }>('api', { method: 'DELETE', path: '/api/account/data', body: { scope } }),
};

export interface ChannelRef {
  id: string;
  channelId: string;
  channelTitle: string;
  thumbnailUrl?: string;
  isActive: boolean;
  scopes: string[];
}
