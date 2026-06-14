import { Stats } from './api';
import { CATEGORY_META } from './meta';

const WEEKDAY_SHORT = ['Nd', 'Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So'];

function weekday(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return WEEKDAY_SHORT[new Date(y, m - 1, d).getDay()];
}

export function StatsPanel({ stats }: { stats: Stats }) {
  const { totals, last7Days, byCategory } = stats;
  const maxCount = Math.max(1, ...last7Days.map((d) => d.count));
  const weekTotal = last7Days.reduce((s, d) => s + d.count, 0);

  // Pierścień postępu
  const r = 34;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - totals.completionRate / 100);

  return (
    <div className="card stats-card">
      <h2 className="card-heading">📊 Statystyki</h2>

      <div className="stats-top">
        <div className="ring-wrap">
          <svg viewBox="0 0 80 80" className="ring">
            <circle cx="40" cy="40" r={r} className="ring-bg" />
            <circle
              cx="40"
              cy="40"
              r={r}
              className="ring-fg"
              strokeDasharray={circ}
              strokeDashoffset={offset}
            />
          </svg>
          <div className="ring-label">
            <strong>{totals.completionRate}%</strong>
            <span>ukończone</span>
          </div>
        </div>

        <div className="stat-tiles">
          <div className="stat-tile">
            <strong>{totals.active}</strong>
            <span>aktywne</span>
          </div>
          <div className="stat-tile">
            <strong>{totals.completed}</strong>
            <span>zrobione</span>
          </div>
          <div className={`stat-tile ${totals.overdue > 0 ? 'danger' : ''}`}>
            <strong>{totals.overdue}</strong>
            <span>zaległe</span>
          </div>
        </div>
      </div>

      <div className="stats-section">
        <div className="stats-section-head">
          <span>Ukończenia (7 dni)</span>
          <span className="muted-sm">{weekTotal} łącznie</span>
        </div>
        <div className="bar-chart">
          {last7Days.map((d) => (
            <div className="bar-col" key={d.date} title={`${d.date}: ${d.count}`}>
              <div className="bar-track">
                <div
                  className="bar-fill"
                  style={{ height: `${(d.count / maxCount) * 100}%` }}
                >
                  {d.count > 0 && <span className="bar-num">{d.count}</span>}
                </div>
              </div>
              <span className="bar-label">{weekday(d.date)}</span>
            </div>
          ))}
        </div>
      </div>

      {byCategory.length > 0 && (
        <div className="stats-section">
          <div className="stats-section-head">
            <span>Wg kategorii</span>
          </div>
          <div className="cat-bars">
            {byCategory.map((c) => {
              const pct = c.total === 0 ? 0 : Math.round((c.completed / c.total) * 100);
              return (
                <div className="cat-bar" key={c.category}>
                  <div className="cat-bar-head">
                    <span>
                      {CATEGORY_META[c.category].icon} {CATEGORY_META[c.category].label}
                    </span>
                    <span className="muted-sm">
                      {c.completed}/{c.total}
                    </span>
                  </div>
                  <div className="cat-bar-track">
                    <div className="cat-bar-fill" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export function StreaksPanel({ stats }: { stats: Stats }) {
  const streaks = stats.streaks;
  if (streaks.length === 0) return null;

  return (
    <div className="card streaks-card">
      <h2 className="card-heading">🔥 Streaki nawyków</h2>
      <ul className="streak-list">
        {streaks.map((s) => (
          <li key={s.titleKey} className={s.current === 0 ? 'broken' : ''}>
            <div className="streak-flame">
              <span className="flame-num">{s.current}</span>
              <span className="flame-ico">{s.current > 0 ? '🔥' : '💤'}</span>
            </div>
            <div className="streak-info">
              <span className="streak-name">
                {CATEGORY_META[s.category]?.icon ?? '📌'} {s.title}
              </span>
              <span className="streak-best">
                {s.current > 0 ? `${s.current} dni z rzędu` : 'streak przerwany'} · rekord {s.longest}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
