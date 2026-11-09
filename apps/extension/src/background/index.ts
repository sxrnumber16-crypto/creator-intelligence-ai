/**
 * MV3 background service worker.
 *
 * Responsibilities:
 * - Single proxy for ALL backend API calls (session token never leaves here)
 * - Google OAuth via chrome.identity.launchWebAuthFlow -> backend one-time code
 * - Access-token refresh with 401 retry
 * - Unread-notification badge
 * - Alarms: periodic notification polling
 */

import { getSettings, getSession, setSession, type Session } from '../lib/storage';

interface ApiEnvelope {
  ok: boolean;
  data?: unknown;
  error?: { code: string; message: string; details?: unknown };
  status: number;
}

const OFFSCREEN_LOG = false;

// ---------------------------------------------------------------------------
// Backend fetch with auth + refresh
// ---------------------------------------------------------------------------

async function backendFetch(path: string, init: RequestInit = {}, retry = true): Promise<Response> {
  const settings = await getSettings();
  const base = settings.backendUrl.replace(/\/$/, '');
  const session = await getSession();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string> | undefined),
  };
  if (session?.accessToken) headers.Authorization = `Bearer ${session.accessToken}`;

  const response = await fetch(`${base}${path}`, { ...init, headers });

  if (response.status === 401 && retry && session) {
    const refreshed = await tryRefresh(base, session);
    if (refreshed) return backendFetch(path, init, false);
  }
  return response;
}

async function tryRefresh(base: string, session: Session): Promise<boolean> {
  try {
    const response = await fetch(`${base}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.accessToken}`,
      },
    });
    if (!response.ok) {
      await setSession(null);
      return false;
    }
    const data = (await response.json()) as { accessToken: string; expiresIn: number };
    await setSession({ ...session, accessToken: data.accessToken, expiresAt: Date.now() + data.expiresIn * 1000 });
    return true;
  } catch {
    return false;
  }
}

async function handleApi(method: string, path: string, body?: unknown): Promise<ApiEnvelope> {
  try {
    const response = await backendFetch(path, {
      method,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    if (!response.ok) {
      const err = data.error as { code?: string; message?: string } | undefined;
      await updateBadge();
      return {
        ok: false,
        status: response.status,
        error: {
          code: err?.code ?? 'HTTP_ERROR',
          message: err?.message ?? `Request failed (${response.status})`,
          details: data,
        },
      };
    }
    await updateBadge();
    return { ok: true, data, status: response.status };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      error: {
        code: 'BACKEND_UNREACHABLE',
        message: `Cannot reach the backend. Check that it is running and that "${(await getSettings()).backendUrl}" is correct in Settings. (${err instanceof Error ? err.message : 'network error'})`,
      },
    };
  }
}

// ---------------------------------------------------------------------------
// Google OAuth via backend one-time code
// ---------------------------------------------------------------------------

async function startGoogleAuth(): Promise<ApiEnvelope> {
  try {
    const settings = await getSettings();
    const base = settings.backendUrl.replace(/\/$/, '');
    const extensionId = chrome.runtime.id;
    const authorizeResponse = await fetch(`${base}/api/auth/google/authorize?extensionId=${extensionId}`);
    if (!authorizeResponse.ok) {
      return { ok: false, status: authorizeResponse.status, error: { code: 'AUTH_INIT_FAILED', message: `Backend refused to start OAuth (${authorizeResponse.status}). Check GOOGLE_CLIENT_ID/SECRET in the backend .env.` } };
    }
    const { url } = (await authorizeResponse.json()) as { url: string };

    const redirectUrl = await chrome.identity.launchWebAuthFlow({
      url,
      interactive: true,
    });
    if (!redirectUrl) {
      return { ok: false, status: 0, error: { code: 'AUTH_CANCELLED', message: 'Sign-in window closed before completing.' } };
    }

    const params = new URLSearchParams(new URL(redirectUrl).search);
    const code = params.get('code');
    const authError = params.get('auth_error');
    if (authError || !code) {
      return { ok: false, status: 0, error: { code: 'AUTH_DENIED', message: `Google sign-in did not complete: ${authError ?? 'no code returned'}` } };
    }

    const exchangeResponse = await fetch(`${base}/api/auth/exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });
    if (!exchangeResponse.ok) {
      const body = (await exchangeResponse.json().catch(() => ({}))) as { error?: { message?: string } };
      return { ok: false, status: exchangeResponse.status, error: { code: 'AUTH_EXCHANGE_FAILED', message: body.error?.message ?? 'Login code exchange failed' } };
    }
    const data = (await exchangeResponse.json()) as { accessToken: string; expiresIn: number; user: Session['user'] };
    await setSession({ accessToken: data.accessToken, expiresAt: Date.now() + data.expiresIn * 1000, user: data.user });
    return { ok: true, data: { ok: true }, status: 200 };
  } catch (err) {
    return { ok: false, status: 0, error: { code: 'AUTH_FAILED', message: err instanceof Error ? err.message : String(err) } };
  }
}

// ---------------------------------------------------------------------------
// Badge + alarms
// ---------------------------------------------------------------------------

async function updateBadge(): Promise<void> {
  try {
    const session = await getSession();
    if (!session) {
      chrome.action.setBadgeText({ text: '' });
      return;
    }
    const response = await backendFetch('/api/notifications', {}, false);
    if (!response.ok) return;
    const data = (await response.json()) as { unread: number };
    chrome.action.setBadgeText({ text: data.unread > 0 ? String(Math.min(data.unread, 99)) : '' });
    chrome.action.setBadgeBackgroundColor({ color: '#0EA5E9' });
  } catch {
    /* badge is cosmetic */
  }
}

chrome.alarms.create('poll-notifications', { periodInMinutes: 15 });
chrome.alarms.onAlarm.addListener((alarm: chrome.alarms.Alarm) => {
  if (alarm.name === 'poll-notifications') void updateBadge();
});

chrome.runtime.onInstalled.addListener(() => {
  void updateBadge();
});

// ---------------------------------------------------------------------------
// Message router
// ---------------------------------------------------------------------------

interface BackgroundMessage {
  type: string;
  payload?: { method?: string; path?: string; body?: unknown };
}

chrome.runtime.onMessage.addListener(
  (message: BackgroundMessage, _sender: chrome.runtime.MessageSender, sendResponse: (response: ApiEnvelope | { ok: true }) => void) => {
    (async () => {
      if (message.type === 'api' && message.payload) {
        const { method = 'GET', path, body } = message.payload;
        if (!path) {
          sendResponse({ ok: false, status: 400, error: { code: 'BAD_REQUEST', message: 'Missing API path' } });
          return;
        }
        const result = await handleApi(method, path, body);
        sendResponse(result);
        return;
      }
      if (message.type === 'auth:start') {
        const result = await startGoogleAuth();
        sendResponse(result);
        return;
      }
      if (message.type === 'auth:logout') {
        const session = await getSession();
        if (session) {
          await backendFetch('/api/auth/logout', { method: 'POST' }, false).catch(() => undefined);
        }
        await setSession(null);
        chrome.action.setBadgeText({ text: '' });
        sendResponse({ ok: true, status: 200, data: { ok: true } });
        return;
      }
      if (message.type === 'notify:show' && message.payload) {
        const { title, body } = message.payload as { title: string; body: string };
        chrome.notifications.create({ type: 'basic', iconUrl: 'icons/icon128.png', title, message: body });
        sendResponse({ ok: true, status: 200 });
        return;
      }
      if (message.type === 'openSidePanel') {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab?.windowId != null) {
          await chrome.sidePanel.open({ windowId: tab.windowId }).catch(async () => {
            await chrome.tabs.create({ url: chrome.runtime.getURL('src/dashboard/index.html') });
          });
        }
        sendResponse({ ok: true, status: 200, data: { ok: true } });
        return;
      }
      sendResponse({ ok: false, status: 400, error: { code: 'UNKNOWN_MESSAGE', message: `Unknown message type: ${message.type}` } });
    })();
    return true; // async sendResponse
  },
);

void OFFSCREEN_LOG;
