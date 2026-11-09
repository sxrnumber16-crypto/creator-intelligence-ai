import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import { Header } from '../components/layout';
import { Card, Button, EmptyState, Skeleton } from '../components/ui';
import { formatRelative } from '../lib/format';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  createdAt?: string;
}

const SUGGESTED_QUESTIONS = [
  'Why are my Shorts getting fewer views?',
  'Which of my videos are performing best?',
  'What should I publish next?',
  'How can I improve my CTR?',
  'Build me a 30-day content strategy',
  'Analyze my channel growth',
];

export function AssistantPage(): React.JSX.Element {
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversations, setConversations] = useState<{ id: string; title: string; updatedAt: string }[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void (async () => {
      try {
        const result = await api.conversations();
        setConversations(result.items.map((c) => ({ id: c.id, title: c.title, updatedAt: c.updatedAt })));
      } catch {
        /* list is optional */
      }
    })();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, busy]);

  async function send(text: string): Promise<void> {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    setError(null);
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: trimmed }]);
    try {
      const response = await api.chat(conversationId, trimmed);
      setConversationId(response.conversationId);
      setMessages((prev) => [...prev, { role: 'assistant', content: response.message.content, createdAt: response.message.createdAt }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function openConversation(id: string): Promise<void> {
    try {
      const result = await api.conversations();
      const found = result.items.find((c) => c.id === id);
      if (found) {
        setConversationId(found.id);
        setMessages(found.messages.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })));
      }
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="flex min-h-screen flex-col pb-6">
      <Header
        title="AI Growth Assistant"
        subtitle="Answers are grounded in your connected channel's synced data. The assistant says so when data is missing."
      >
        {conversationId && (
          <Button
            variant="ghost"
            className="!text-xs"
            onClick={() => {
              setConversationId(undefined);
              setMessages([]);
            }}
          >
            New chat
          </Button>
        )}
      </Header>

      <div className="flex flex-1 gap-4 px-5 py-4">
        <div className="hidden w-48 shrink-0 flex-col gap-1 xl:flex">
          <p className="label">Recent conversations</p>
          {conversations.map((c) => (
            <button
              key={c.id}
              onClick={() => void openConversation(c.id)}
              className={`rounded-lg px-3 py-2 text-left text-[11px] ${conversationId === c.id ? 'bg-brand-500/15 text-brand-300' : 'text-slate-400 hover:bg-ink-700/50'}`}
            >
              <span className="line-clamp-2">{c.title}</span>
              <span className="mt-0.5 block text-[9px] text-slate-600">{formatRelative(c.updatedAt)}</span>
            </button>
          ))}
          {conversations.length === 0 && <p className="muted">No conversations yet.</p>}
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex-1 space-y-3 overflow-y-auto">
            {messages.length === 0 && !busy && (
              <>
                <EmptyState
                  title="Ask about your channel"
                  body="The assistant can reference your subscribers, views, top videos and tracked competitors. It distinguishes data from interpretation and tells you when something needs data it does not have."
                />
                <div className="flex flex-wrap gap-1.5">
                  {SUGGESTED_QUESTIONS.map((q) => (
                    <button key={q} className="badge bg-ink-700 text-slate-300 hover:bg-ink-600" onClick={() => void send(q)}>
                      {q}
                    </button>
                  ))}
                </div>
              </>
            )}

            {messages.map((message, i) => (
              <div key={i} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed ${
                    message.role === 'user' ? 'bg-brand-500/20 text-slate-100' : 'border border-ink-700 bg-ink-850 text-slate-300'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            ))}

            {busy && (
              <div className="flex justify-start">
                <div className="rounded-2xl border border-ink-700 bg-ink-850 px-4 py-3">
                  <Skeleton rows={1} height="h-4" />
                </div>
              </div>
            )}
            {error && (
              <div className="rounded-xl border border-bad/30 bg-bad/5 px-4 py-2.5 text-xs text-red-300">{error}</div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="mt-3 flex gap-2">
            <input
              className="input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && void send(input)}
              placeholder="Ask about your channel, competitors, or strategy..."
              disabled={busy}
            />
            <Button variant="primary" loading={busy} onClick={() => void send(input)} disabled={input.trim().length === 0}>
              Send
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

void Card;
