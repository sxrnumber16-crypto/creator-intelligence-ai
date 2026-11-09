import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Area, AreaChart } from 'recharts';
import { formatCompact } from '../lib/format';

const AXIS_STYLE = { fill: '#64748B', fontSize: 10 } as const;
const GRID_COLOR = '#1E2638';
const TOOLTIP_STYLE = {
  backgroundColor: '#121724',
  border: '1px solid #2A3450',
  borderRadius: 8,
  fontSize: 12,
  color: '#E2E8F0',
} as const;

export function ViewsLineChart({ data, dataKey = 'views', color = '#38BDF8', height = 200 }: { data: Record<string, unknown>[]; dataKey?: string; color?: string; height?: number }): React.JSX.Element {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -14 }}>
        <defs>
          <linearGradient id={`grad-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.28} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={GRID_COLOR} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="date" tick={AXIS_STYLE} tickLine={false} axisLine={false} tickFormatter={(v: string) => (typeof v === 'string' ? v.slice(5) : String(v))} minTickGap={28} />
        <YAxis tick={AXIS_STYLE} tickLine={false} axisLine={false} tickFormatter={(v: number) => formatCompact(v)} width={44} />
        <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value) => [formatCompact(Number(value)), dataKey === 'views' ? 'Views' : dataKey]} />
        <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} fill={`url(#grad-${dataKey})`} connectNulls />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function SimpleBarChart({ data, dataKey = 'value', color = '#A855F7', height = 200, xKey = 'label' }: { data: Record<string, unknown>[]; dataKey?: string; color?: string; height?: number; xKey?: string }): React.JSX.Element {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -14 }}>
        <CartesianGrid stroke={GRID_COLOR} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey={xKey} tick={AXIS_STYLE} tickLine={false} axisLine={false} interval={0} />
        <YAxis tick={AXIS_STYLE} tickLine={false} axisLine={false} tickFormatter={(v: number) => formatCompact(v)} width={44} />
        <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: '#1E263855' }} formatter={(value) => [formatCompact(Number(value)), 'Views']} />
        <Bar dataKey={dataKey} fill={color} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DualLineChart({ data, series, height = 220 }: { data: Record<string, unknown>[]; series: { key: string; color: string; label: string }[]; height?: number }): React.JSX.Element {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -14 }}>
        <CartesianGrid stroke={GRID_COLOR} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="date" tick={AXIS_STYLE} tickLine={false} axisLine={false} tickFormatter={(v: string) => (typeof v === 'string' ? v.slice(5) : String(v))} minTickGap={28} />
        <YAxis tick={AXIS_STYLE} tickLine={false} axisLine={false} tickFormatter={(v: number) => formatCompact(v)} width={44} />
        <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value, name) => [formatCompact(Number(value)), String(name)]} />
        {series.map((s) => (
          <Line key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={s.color} strokeWidth={2} dot={false} connectNulls />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function Heatmap({ cells }: { cells: { weekday: number; hour: number; medianFirst48hViews: number | null; sampleSize: number }[] }): React.JSX.Element {
  const hours = [...new Set(cells.map((c) => c.hour))].sort((a, b) => a - b);
  const max = Math.max(1, ...cells.map((c) => c.medianFirst48hViews ?? 0));

  const color = (v: number | null, sample: number): string => {
    if (v == null || sample === 0) return '#121724';
    const intensity = v / max;
    return `rgba(14, 165, 233, ${0.12 + intensity * 0.75})`;
  };

  return (
    <div className="overflow-x-auto">
      <table className="border-separate border-spacing-0.5">
        <thead>
          <tr>
            <th className="w-10" />
            {hours.map((h) => (
              <th key={h} className="px-1 pb-1 text-[9px] font-medium text-slate-500">
                {String(h).padStart(2, '0')}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {WEEKDAYS.map((day, weekday) => (
            <tr key={day}>
              <td className="pr-1 text-right text-[10px] text-slate-500">{day}</td>
              {hours.map((hour) => {
                const cell = cells.find((c) => c.weekday === weekday && c.hour === hour);
                return (
                  <td key={hour}>
                    <div
                      title={cell ? `${day} ${String(hour).padStart(2, '0')}:00 - median ${cell.medianFirst48hViews ?? 0} views in first 48h (${cell.sampleSize} videos)` : `${day} ${hour}:00 - no data`}
                      className="h-5 w-5 rounded"
                      style={{ backgroundColor: cell ? color(cell.medianFirst48hViews, cell.sampleSize) : '#121724' }}
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
