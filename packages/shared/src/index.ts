/**
 * Creator Intelligence AI - Shared API contract types.
 * Used by both the Chrome extension and the backend so the two can never drift.
 */

// ---------------------------------------------------------------------------
// Common
// ---------------------------------------------------------------------------

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
}

export type DateRange = 7 | 28 | 90 | 365;

export type VideoFormat = 'all' | 'shorts' | 'long';

export interface DataSourceInfo {
  source: string;
  freshness: string;
  confidence: 'high' | 'medium' | 'low' | 'estimate';
  notes?: string;
}

// ---------------------------------------------------------------------------
// Auth & users
// ---------------------------------------------------------------------------

export interface SessionUser {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
}

export interface SessionTokens {
  accessToken: string;
  expiresIn: number;
  user: SessionUser;
}

export interface ChannelConnection {
  id: string;
  googleAccountId: string;
  channelId: string;
  channelTitle: string;
  thumbnailUrl?: string;
  isActive: boolean;
  connectedAt: string;
  scopes: string[];
}

// ---------------------------------------------------------------------------
// Channels & videos
// ---------------------------------------------------------------------------

export interface ChannelSnapshotStats {
  subscribers: number | null;
  totalViews: number | null;
  videoCount: number | null;
  capturedAt: string;
}

export interface ChannelSummary {
  id: string;
  ytChannelId: string;
  title: string;
  thumbnailUrl?: string;
  country?: string | null;
  customUrl?: string | null;
  stats: {
    subscribers: number | null;
    totalViews: number | null;
    videoCount: number | null;
  };
  isOwner: boolean;
}

export interface VideoSummary {
  id: string;
  ytVideoId: string;
  channelId: string;
  title: string;
  description: string;
  thumbnailUrl?: string;
  publishedAt: string;
  durationSeconds: number;
  isShort: boolean;
  tags: string[];
  stats: {
    views: number | null;
    likes: number | null;
    comments: number | null;
  };
}

export interface VideoRanking extends VideoSummary {
  viewsPerDay: number;
  engagementRate: number | null;
}

export interface DashboardResponse {
  channel: ChannelSummary;
  range: DateRange;
  totals: {
    subscribers: number | null;
    totalViews: number | null;
    totalVideos: number | null;
    periodViews: number | null;
    periodWatchMinutes: number | null;
    subscribersGained: number | null;
    subscribersLost: number | null;
    averageViewDurationSeconds: number | null;
  };
  deltas: {
    viewsChangePct: number | null;
    subscribersChange: number | null;
  };
  timeseries: {
    date: string;
    views: number | null;
    watchMinutes: number | null;
    subscribersGained: number | null;
  }[];
  topVideos: VideoRanking[];
  underperformingVideos: VideoRanking[];
  recentUploads: VideoSummary[];
  insights: InsightsSummary;
  sources: DataSourceInfo[];
}

export interface InsightsSummary {
  source: 'ai' | 'rules';
  whatWorks: string[];
  declining: string[];
  bestVideos: string[];
  nextContent: string[];
  watchMetrics: string[];
  generatedAt: string;
  model?: string;
}

// ---------------------------------------------------------------------------
// Analytics
// ---------------------------------------------------------------------------

export interface AnalyticsPoint {
  date: string;
  views?: number | null;
  watchMinutes?: number | null;
  subscribersGained?: number | null;
  subscribersLost?: number | null;
  likes?: number | null;
  comments?: number | null;
  averageViewDurationSeconds?: number | null;
  impressions?: number | null;
  ctr?: number | null;
}

export interface VideoAnalyticsDetail {
  video: VideoSummary;
  retention?: { elapsedSeconds: number; audienceWatchRatio: number }[];
  trafficSources?: { source: string; views: number }[];
  dailyViews?: AnalyticsPoint[];
  notes: string[];
}

export interface ComparisonRow {
  label: string;
  metrics: Record<string, number | null>;
}

// ---------------------------------------------------------------------------
// SEO
// ---------------------------------------------------------------------------

export type SeoFindingLevel = 'good' | 'warning' | 'critical' | 'info';

export interface SeoFinding {
  component: string;
  level: SeoFindingLevel;
  title: string;
  detail: string;
  recommendation?: string;
  expectedBenefit?: string;
  confidence: 'high' | 'medium' | 'low';
}

export interface SeoComponentScore {
  component: string;
  score: number; // 0-100
  weight: number;
  explanation: string;
  findings: SeoFinding[];
}

export interface SeoScoreResult {
  overall: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  components: SeoComponentScore[];
  summary: string;
  methodology: string;
}

export interface SeoAuditReport {
  video: VideoSummary;
  channelTitle?: string;
  score: SeoScoreResult;
  engagement: {
    views: number | null;
    likes: number | null;
    comments: number | null;
    likeRate: number | null;
    commentRate: number | null;
    benchmarkNote: string;
  };
  notAnalyzed: string[];
  recommendations: SeoFinding[];
  generatedAt: string;
}

// ---------------------------------------------------------------------------
// Keywords
// ---------------------------------------------------------------------------

export type SearchIntent = 'informational' | 'educational' | 'entertainment' | 'commercial' | 'navigational';

export interface KeywordCandidate {
  keyword: string;
  cluster: string;
  intent: SearchIntent;
  intentConfidence: number;
  opportunity: number; // 0-100 relative estimate, NOT search volume
  opportunityFactors: {
    competitionScore: number | null; // 0-100, lower = less contested
    topMedianViews: number | null;
    exactMatchTitleRatio: number | null;
    freshness: number | null; // 0-100
    sampleSize: number;
  };
  sources: string[];
  checkedAt: string;
}

export interface KeywordCluster {
  name: string;
  keywords: KeywordCandidate[];
}

export interface KeywordExploreResponse {
  seed: string;
  clusters: KeywordCluster[];
  methodology: string;
  volumeDisclosure: string;
  sources: DataSourceInfo[];
}

export interface KeywordAnalysisResponse {
  keyword: string;
  intent: SearchIntent;
  intentConfidence: number;
  opportunity: number;
  factors: KeywordCandidate['opportunityFactors'];
  topCompetingVideos: VideoSummary[];
  interpretation: string[];
  volumeDisclosure: string;
  sources: DataSourceInfo[];
}

// ---------------------------------------------------------------------------
// Competitors
// ---------------------------------------------------------------------------

export interface CompetitorGroup {
  id: string;
  name: string;
}

export interface TrackedCompetitor {
  id: string;
  ytChannelId: string;
  title: string;
  thumbnailUrl?: string;
  groupId?: string | null;
  stats: {
    subscribers: number | null;
    totalViews: number | null;
    videoCount: number | null;
  };
  derived: {
    uploadsPerWeek: number | null;
    medianRecentViews: number | null;
    medianDurationSeconds: number | null;
    shortsSharePct: number | null;
    firstTrackedAt: string;
  };
}

export interface CompetitorSnapshotPoint {
  capturedAt: string;
  subscribers: number | null;
  totalViews: number | null;
  videoCount: number | null;
}

export interface CompetitorDetail extends TrackedCompetitor {
  recentVideos: VideoRanking[];
  snapshotHistory: CompetitorSnapshotPoint[];
  topVideos: VideoRanking[];
  titlePatterns: string[];
  formatPatterns: string[];
}

export interface ChannelComparisonRow {
  channelId: string;
  title: string;
  isOwner: boolean;
  subscribers: number | null;
  totalViews: number | null;
  uploadsPerWeek: number | null;
  medianRecentViews: number | null;
  shortsSharePct: number | null;
  periodViewsGained: number | null;
}

export interface ContentGapItem {
  topic: string;
  competitorCoverage: number;
  ownerCovers: boolean;
  signal: number; // total views across competitor videos on the topic
  exampleVideos: { title: string; videoId: string; channelTitle: string; views: number }[];
}

// ---------------------------------------------------------------------------
// AI
// ---------------------------------------------------------------------------

export type AiTask =
  | 'content_generation'
  | 'seo_analysis'
  | 'competitor_analysis'
  | 'analytics_interpretation'
  | 'script_writing'
  | 'assistant';

export type AiProviderKind = 'anthropic' | 'openai' | 'gemini';

export interface AiProviderConfig {
  id: string;
  kind: AiProviderKind;
  label: string;
  hasKey: boolean;
  isDefault: boolean;
  model: string;
  status: 'unverified' | 'ok' | 'error';
  lastError?: string | null;
  taskRouting?: Partial<Record<AiTask, string>>;
  usageLimits?: { dailyRequests: number | null };
}

export interface AiIdeaRequest {
  type: 'viral' | 'shorts' | 'longform' | 'educational' | 'entertainment' | 'series' | 'trending';
  topic?: string;
  count?: number;
}

export interface AiIdea {
  title: string;
  format: 'shorts' | 'longform';
  angle: string;
  hook: string;
  why: string;
  keywords: string[];
}

export interface AiScriptRequest {
  brief: string;
  format: 'shorts' | 'longform';
  durationMinutes?: number;
  tone?: string;
}

export interface AiScript {
  title: string;
  hook: string;
  sections: { timestamp: string; heading: string; script: string }[];
  cta: string;
  descriptionDraft: string;
  tags: string[];
}

export interface AiChatMessage {
  role: 'user' | 'assistant';
  content: string;
  createdAt?: string;
}

export interface AiChatResponse {
  conversationId: string;
  message: AiChatMessage;
  dataReferences: string[];
}

export interface AiUsageRecord {
  id: string;
  provider: AiProviderKind;
  model: string;
  task: string;
  promptTokens: number | null;
  completionTokens: number | null;
  ok: boolean;
  latencyMs: number | null;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Best time to publish
// ---------------------------------------------------------------------------

export interface BestTimeResponse {
  timezone: string;
  format: VideoFormat;
  range: DateRange;
  heatmap: { weekday: number; hour: number; medianFirst48hViews: number | null; sampleSize: number }[];
  bestWindows: { label: string; weekday: number; startHour: number; medianFirst48hViews: number; sampleSize: number; confidence: 'low' | 'medium' | 'high' }[];
  sampleSize: number;
  confidence: 'low' | 'medium' | 'high';
  methodology: string;
  insufficientData?: boolean;
  notes: string[];
}

// ---------------------------------------------------------------------------
// Workspace & notifications
// ---------------------------------------------------------------------------

export type WorkspaceKind =
  | 'keyword'
  | 'keyword_list'
  | 'competitor'
  | 'idea'
  | 'script'
  | 'seo_audit'
  | 'report';

export interface WorkspaceItem {
  id: string;
  kind: WorkspaceKind;
  title: string;
  payload: unknown;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  type: 'performance' | 'competitor_upload' | 'competitor_signal' | 'growth' | 'opportunity' | 'schedule' | 'sync_failure';
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationSettings {
  performance: boolean;
  competitorUploads: boolean;
  growth: boolean;
  opportunities: boolean;
  syncFailures: boolean;
  quietHours?: { start: number; end: number } | null;
}

// ---------------------------------------------------------------------------
// System
// ---------------------------------------------------------------------------

export interface SystemHealth {
  ok: true;
  version: string;
  uptimeSeconds: number;
  services: { database: boolean; redis: boolean; youtube: boolean; ai: boolean };
}

export interface QuotaStatus {
  date: string;
  dataApiUnitsUsed: number;
  dataApiDailyLimit: number;
  analyticsApiUnitsUsed: number;
  analyticsDailyLimit: number;
}
