import { useMemo, useState } from 'react';
import { Todo } from './api';
import {
  buildMonthGrid,
  monthLabel,
  toISODate,
  todayISO,
  WEEKDAYS,
} from './dateUtils';

interface CalendarProps {
  todos: Todo[];
  selectedDate: string | null;
  onSelectDate: (date: string | null) => void;
}

export function Calendar({ todos, selectedDate, onSelectDate }: CalendarProps) {
  const now = new Date();
  const [view, setView] = useState({ year: now.getFullYear(), month: now.getMonth() });

  // Mapa: data -> liczba niezakończonych zadań
  const countsByDate = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of todos) {
      if (t.dueDate && !t.completed) {
        map.set(t.dueDate, (map.get(t.dueDate) ?? 0) + 1);
      }
    }
    return map;
  }, [todos]);

  const grid = useMemo(() => buildMonthGrid(view.year, view.month), [view]);
  const today = todayISO();

  const changeMonth = (delta: number) => {
    setView((v) => {
      const d = new Date(v.year, v.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  };

  const goToday = () => {
    setView({ year: now.getFullYear(), month: now.getMonth() });
    onSelectDate(null);
  };

  return (
    <div className="calendar">
      <div className="cal-header">
        <button className="cal-nav" onClick={() => changeMonth(-1)} aria-label="Poprzedni miesiąc">
          ‹
        </button>
        <button className="cal-title" onClick={goToday} title="Wróć do dziś">
          {monthLabel(view.year, view.month)}
        </button>
        <button className="cal-nav" onClick={() => changeMonth(1)} aria-label="Następny miesiąc">
          ›
        </button>
      </div>

      <div className="cal-weekdays">
        {WEEKDAYS.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>

      <div className="cal-grid">
        {grid.map((date) => {
          const iso = toISODate(date);
          const inMonth = date.getMonth() === view.month;
          const count = countsByDate.get(iso) ?? 0;
          const classes = [
            'cal-day',
            inMonth ? '' : 'outside',
            iso === today ? 'today' : '',
            iso === selectedDate ? 'selected' : '',
          ]
            .filter(Boolean)
            .join(' ');

          return (
            <button
              key={iso}
              className={classes}
              onClick={() => onSelectDate(iso === selectedDate ? null : iso)}
            >
              <span className="cal-num">{date.getDate()}</span>
              {count > 0 && <span className="cal-dot" data-count={count > 3 ? '3+' : count} />}
            </button>
          );
        })}
      </div>

      {selectedDate && (
        <button className="cal-clear" onClick={() => onSelectDate(null)}>
          ✕ Pokaż wszystkie
        </button>
      )}
    </div>
  );
}
