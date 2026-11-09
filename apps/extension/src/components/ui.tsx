import { useState, type ReactNode, type ButtonHTMLAttributes } from 'react';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }): ReactNode {
  return <div className={`card p-4 ${className}`}>{children}</div>;
}

export function SectionHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }): ReactNode {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h2 className="text-base font-semibold text-slate-100">{title}</h2>
        {subtitle && <p className="muted mt-0.5 max-w-2xl">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; loading?: boolean };

export function Button({ variant = 'secondary', loading, children, className = '', disabled, ...rest }: ButtonProps): ReactNode {
  const variantClass = { primary: 'btn-primary', secondary: 'btn-secondary', ghost: 'btn-ghost', danger: 'btn-danger' }[variant];
  return (
    <button className={`${variantClass} ${className}`} disabled={disabled || loading} {...rest}>
      {loading && <Spinner />}
      {children}
    </button>
  );
}

export function Spinner({ size = 14 }: { size?: number }): ReactNode {
  return (
    <svg className="animate-spin" width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z" />
    </svg>
  );
}

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'good' | 'warn' | 'bad' | 'brand' }): ReactNode {
  const tones = {
    neutral: 'bg-ink-700 text-slate-300',
    good: 'bg-good/10 text-good',
    warn: 'bg-warn/10 text-warn',
    bad: 'bg-bad/10 text-bad',
    brand: 'bg-brand-500/15 text-brand-300',
  } as const;
  return <span className={`badge ${tones[tone]}`}>{children}</span>;
}

export function Stat({ label, value, delta, hint }: { label: string; value: string; delta?: number | null; hint?: string }): ReactNode {
  return (
    <div className="rounded-xl border border-ink-700 bg-ink-850 p-3.5">
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-slate-100">{value}</p>
      {delta != null && Number.isFinite(delta) && (
        <p className={`mt-0.5 text-xs font-medium ${delta >= 0 ? 'text-good' : 'text-bad'}`}>
          {delta >= 0 ? '+' : ''}
          {delta.toFixed(1)}%
        </p>
      )}
      {hint && <p className="mt-0.5 text-[11px] text-slate-500">{hint}</p>}
    </div>
  );
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }): ReactNode {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-ink-600 bg-ink-900/50 px-6 py-10 text-center">
      <p className="text-sm font-medium text-slate-300">{title}</p>
      <p className="muted mt-1 max-w-sm">{body}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, retry }: { message: string; retry?: () => void }): ReactNode {
  return (
    <div className="rounded-xl border border-bad/30 bg-bad/5 px-4 py-3">
      <p className="text-xs leading-relaxed text-red-300">{message}</p>
      {retry && (
        <button className="btn-secondary mt-2 !text-xs" onClick={retry}>
          Retry
        </button>
      )}
    </div>
  );
}

export function NotConfigured({ what, how }: { what: string; how: string }): ReactNode {
  return (
    <div className="rounded-xl border border-warn/30 bg-warn/5 px-4 py-3">
      <p className="text-xs font-semibold text-amber-300">{what} is not configured</p>
      <p className="mt-1 text-xs leading-relaxed text-amber-200/80">{how}</p>
    </div>
  );
}

export function Skeleton({ rows = 3, height = 'h-16' }: { rows?: number; height?: string }): ReactNode {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className={`skeleton w-full ${height}`} />
      ))}
    </div>
  );
}

export function Select({ value, onChange, options, className = '' }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; className?: string }): ReactNode {
  return (
    <select
      className={`input !w-auto cursor-pointer appearance-none bg-ink-800 ${className}`}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>): ReactNode {
  return <input className="input" {...props} />;
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>): ReactNode {
  return <textarea className="input min-h-[80px]" {...props} />;
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }): ReactNode {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 py-2">
      <span className="text-sm text-slate-300">{label}</span>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${checked ? 'bg-brand-500' : 'bg-ink-600'}`}
      >
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${checked ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
      </button>
    </label>
  );
}

export function ProgressRing({ score, size = 74 }: { score: number; size?: number }): ReactNode {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - score / 100);
  const color = score >= 80 ? '#34D399' : score >= 55 ? '#FBBF24' : '#F87171';
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={radius} stroke="#1E2638" strokeWidth="6" fill="none" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={color}
        strokeWidth="6"
        fill="none"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" fill="#E2E8F0" fontSize={size * 0.24} fontWeight="600">
        {score}
      </text>
    </svg>
  );
}

export function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }): ReactNode {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className="btn-ghost !px-2 !py-1 !text-[11px]"
      onClick={() => {
        navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        });
      }}
    >
      {copied ? 'Copied' : label}
    </button>
  );
}

export function SourceNote({ children }: { children: ReactNode }): ReactNode {
  return (
    <p className="rounded-lg border border-ink-700 bg-ink-900/60 px-3 py-2 text-[11px] leading-relaxed text-slate-500">{children}</p>
  );
}
