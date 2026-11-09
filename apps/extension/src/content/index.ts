/**
 * Content-script bootstrap (bundled as IIFE, tiny, no framework).
 *
 * Responsibilities:
 * - Detect page type across YouTube's SPA navigation (yt-navigate-finish + URL check)
 * - Search results: lightweight inline badges (public stats via backend cache)
 * - Watch page: a toggle button that lazy-imports the React intelligence panel
 * - Channel page: compact public-stats card
 * - Studio: button that opens the side panel
 *
 * Performance rules: no MutationObserver loops, one badge pass per navigation,
 * all data fetched through the background worker (content scripts hold no tokens).
 */

const HOST_ID = 'cia-intel-host';
const BUTTON_ID = 'cia-intel-toggle';
let lastUrl = '';
let badgesApplied = false;

init();

function init() {
  if (document.getElementById(HOST_ID)) return;
  const host = document.createElement('div');
  host.id = HOST_ID;
  document.documentElement.appendChild(host);

  // YouTube SPA navigation event (public document event) + URL fallback poll
  window.addEventListener('yt-navigate-finish', () => void route());
  setInterval(() => {
    if (location.href !== lastUrl) void route();
  }, 1500);

  void route();
  chrome.storage.local.get(['settings'], ({ settings }: { settings?: { overlaysEnabled?: boolean } }) => {
    if (settings?.overlaysEnabled === false) {
      host.remove();
    }
  });
}

async function route(): Promise<void> {
  lastUrl = location.href;
  badgesApplied = false;
  const path = location.pathname;

  if (path === '/watch' || path.startsWith('/shorts/')) {
    mountWatchButton();
  } else if (path === '/results') {
    await applySearchBadges();
  } else if (isChannelPage()) {
    await applyChannelCard();
  } else if (path.startsWith('/studio')) {
    mountStudioButton();
  }
}

function isChannelPage(): boolean {
  // /@handle, /channel/UC..., /c/name, /user/name (not /watch etc.)
  return /^\/(@|channel\/|c\/|user\/)/.test(location.pathname) && !location.pathname.includes('/video');
}

// ---------------------------------------------------------------------------
// Watch / Shorts: toggle button + lazy panel
// ---------------------------------------------------------------------------

function mountWatchButton(): void {
  if (document.getElementById(BUTTON_ID)) return;
  const button = document.createElement('button');
  button.id = BUTTON_ID;
  button.textContent = 'CI';
  button.title = 'Creator Intelligence: analyze this video';
  button.style.cssText = [
    'position:fixed', 'right:18px', 'bottom:18px', 'z-index:2147483000',
    'width:44px', 'height:44px', 'border-radius:12px', 'border:1px solid #2A3450',
    'background:linear-gradient(160deg,#0E121B,#0284C7)', 'color:#fff',
    'font:600 13px Inter,system-ui,sans-serif', 'cursor:pointer',
    'box-shadow:0 4px 16px rgba(0,0,0,.45)',
  ].join(';');
  button.addEventListener('click', () => {
    void loadPanel();
    button.style.display = 'none';
  });
  document.documentElement.appendChild(button);
}

async function loadPanel(): Promise<void> {
  const url = chrome.runtime.getURL('src/content/panel.js');
  try {
    await import(/* webpackIgnore: true */ url);
  } catch (err) {
    console.error('[CIA] failed to load panel', err);
  }
}

// ---------------------------------------------------------------------------
// Search results: public-stats badges (one batched call)
// ---------------------------------------------------------------------------

async function applySearchBadges(): Promise<void> {
  const enabled = (await chrome.storage.local.get(['settings'])).settings?.searchBadgesEnabled;
  if (enabled === false) return;
  if (badgesApplied) return;
  badgesApplied = true;

  await sleep(800); // let initial results render
  collectSearchVideoIds();
  observeSearchResults();

  function observeSearchResults() {
    // Single-purpose observer, disconnects after results stabilize (max 8s)
    const observer = new MutationObserver(() => {
      if (!badgesApplied || document.querySelectorAll('ytd-video-renderer').length > document.querySelectorAll('[data-cia-badge]').length) {
        collectSearchVideoIds();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => observer.disconnect(), 8000);
  }

  function collectSearchVideoIds() {
    const renderers = [...document.querySelectorAll('ytd-video-renderer')] as HTMLElement[];
    const ids: string[] = [];
    for (const el of renderers) {
      if (el.querySelector('[data-cia-badge]')) continue;
      const link = el.querySelector<HTMLAnchorElement>('a#video-title, a#thumbnail');
      const videoId = link?.href ? extractVideoIdFromUrl(link.href) : null;
      if (videoId) {
        ids.push(videoId);
        el.dataset.ciaPending = '1';
      }
    }
    if (ids.length > 0) void fetchAndRenderBadges(ids);
  }
}

async function fetchAndRenderBadges(videoIds: string[]): Promise<void> {
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'api',
      payload: { method: 'GET', path: `/api/youtube/videos?ids=${videoIds.join(',')}` },
    });
    if (!response?.ok) return;
    const items = (response.data as { items: Record<string, unknown>[] }).items;
    const byId = new Map(items.map((i) => [i.id as string, i]));

    for (const el of [...document.querySelectorAll('ytd-video-renderer')] as HTMLElement[]) {
      if (el.dataset.ciaBadge === '1' || el.dataset.ciaPending !== '1') continue;
      const link = el.querySelector<HTMLAnchorElement>('a#video-title, a#thumbnail');
      const videoId = link?.href ? extractVideoIdFromUrl(link.href) : null;
      const item = videoId ? byId.get(videoId) : null;
      el.dataset.ciaBadge = '1';
      delete el.dataset.ciaPending;
      if (!item) continue;

      const meta = el.querySelector('#metadata-line, ytd-video-meta-block');
      if (!meta) continue;
      const badge = document.createElement('div');
      badge.style.cssText = 'display:flex;gap:8px;margin-top:2px;font:500 11px Inter,system-ui,sans-serif;color:#7DD3FC;';
      const views = item.views as number | null;
      const likes = item.likes as number | null;
      const ageDays = item.publishedAt ? (Date.now() - new Date(item.publishedAt as string).getTime()) / 86400_000 : null;
      const perDay = views && ageDays ? views / Math.max(ageDays, 1) : null;
      badge.innerHTML = [
        views != null ? `<span title="Public views">Views ${formatCompact(views)}</span>` : '',
        perDay != null ? `<span title="Views per day since publish">${formatCompact(Math.round(perDay))}/day</span>` : '',
        likes != null && views ? `<span title="Like rate (public)">Like ${(100 * (likes / views)).toFixed(1)}%</span>` : '',
      ]
        .filter(Boolean)
        .join('');
      meta.appendChild(badge);
    }
  } catch {
    /* badges are optional */
  }
}

// ---------------------------------------------------------------------------
// Channel page: compact public card
// ---------------------------------------------------------------------------

async function applyChannelCard(): Promise<void> {
  const enabled = (await chrome.storage.local.get(['settings'])).settings?.channelPageCardEnabled;
  if (enabled === false) return;

  const handle = location.pathname.split('/').filter(Boolean)[0];
  if (!handle) return;
  await sleep(1200);

  try {
    const param = handle.startsWith('@') ? `handle=${encodeURIComponent(handle)}` : /^UC[\w-]{22}$/.test(handle) ? `id=${handle}` : null;
    if (!param) return;
    const response = await chrome.runtime.sendMessage({
      type: 'api',
      payload: { method: 'GET', path: `/api/youtube/channel?${param}` },
    });
    if (!response?.ok) return;
    const channel = (response.data as { items: Record<string, unknown>[] }).items[0];
    if (!channel || document.getElementById('cia-channel-card')) return;

    const anchor = document.querySelector('#page-header ytd-channel-header-renderer, ytd-c4-tabbed-header-renderer');
    if (!anchor?.parentNode) return;

    const card = document.createElement('div');
    card.id = 'cia-channel-card';
    card.style.cssText = [
      'display:flex', 'align-items:center', 'gap:14px', 'margin:8px 0', 'padding:10px 14px',
      'border:1px solid #2A3450', 'border-radius:12px', 'background:#121724', 'color:#E2E8F0',
      'font:12px Inter,system-ui,sans-serif',
    ].join(';');
    const subs = channel.subscribers as number | null;
    const views = channel.totalViews as number | null;
    const videos = channel.videoCount as number | null;
    card.innerHTML = `
      <strong style="color:#7DD3FC;font-size:12px;letter-spacing:.4px;">CREATOR INTELLIGENCE</strong>
      <span>${subs != null ? formatCompact(subs) + ' subs' : 'subs hidden'}</span>
      <span>${views != null ? formatCompact(views) + ' total views' : ''}</span>
      <span>${videos != null ? formatCompact(videos) + ' videos' : ''}</span>
      <span style="color:#64748B;">Public data only</span>
    `;
    anchor.parentNode.insertBefore(card, anchor.nextSibling);
  } catch {
    /* optional */
  }
}

// ---------------------------------------------------------------------------
// Studio: open side panel button
// ---------------------------------------------------------------------------

function mountStudioButton(): void {
  if (document.getElementById('cia-studio-btn')) return;
  const button = document.createElement('button');
  button.id = 'cia-studio-btn';
  button.textContent = 'Open Creator Intelligence';
  button.style.cssText = [
    'position:fixed', 'right:18px', 'bottom:18px', 'z-index:2147483000',
    'padding:10px 16px', 'border-radius:10px', 'border:1px solid #2A3450',
    'background:#0E121B', 'color:#7DD3FC', 'font:600 12px Inter,system-ui,sans-serif',
    'cursor:pointer', 'box-shadow:0 4px 16px rgba(0,0,0,.4)',
  ].join(';');
  button.addEventListener('click', () => chrome.runtime.sendMessage({ type: 'openSidePanel' }));
  document.documentElement.appendChild(button);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractVideoIdFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url, location.origin);
    if (parsed.pathname === '/watch') return parsed.searchParams.get('v');
    const shorts = /\/(shorts|live|embed)\/([\w-]{11})/.exec(parsed.pathname);
    if (shorts) return shorts[2];
    if (parsed.hostname === 'youtu.be') return parsed.pathname.slice(1, 12);
  } catch {
    /* ignore */
  }
  return null;
}

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
