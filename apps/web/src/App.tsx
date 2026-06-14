import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Calendar } from './Calendar';
import { HabitsPanel } from './HabitsPanel';
import { Category, Habit, Priority, Recurrence, Todo, todosApi } from './api';
import { formatDueLabel, isOverdue, isToday, todayISO } from './dateUtils';
import { CATEGORY_META, CATEGORY_ORDER, formatDuration, PRIORITY_META, RECURRENCE_META } from './meta';
import { useBrowserNotifications } from './useBrowserNotifications';

type Filter = 'all' | 'active' | 'completed';

const FILTER_LABELS: Record<Filter, string> = {
  all: 'Wszystkie',
  active: 'Aktywne',
  completed: 'Ukończone',
};

export function App() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [category, setCategory] = useState<Category>('praca');
  const [dueDate, setDueDate] = useState('');
  const [estimate, setEstimate] = useState('');
  const [recurrence, setRecurrence] = useState<Recurrence | ''>('');
  const [filter, setFilter] = useState<Filter>('all');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { permission, requestPermission, supported } = useBrowserNotifications(todos);

  const refreshHabits = useCallback(() => {
    todosApi.habits().then(setHabits).catch(() => {});
  }, []);

  useEffect(() => {
    todosApi
      .list()
      .then(setTodos)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
    refreshHabits();
  }, [refreshHabits]);

  const addTodo = async (e: FormEvent) => {
    e.preventDefault();
    const value = title.trim();
    if (!value) return;
    try {
      const created = await todosApi.create({
        title: value,
        priority,
        category,
        dueDate: dueDate || null,
        estimatedMinutes: estimate ? Number(estimate) : null,
        recurrence: recurrence || null,
      });
      setTodos((prev) => [...prev, created]);
      setTitle('');
      setDueDate('');
      setEstimate('');
      setRecurrence('');
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const toggle = async (todo: Todo) => {
    try {
      const updated = await todosApi.update(todo.id, { completed: !todo.completed });
      // Po ukończeniu serwer mógł utworzyć kolejne wystąpienie / nowy nawyk
      if (updated.completed) {
        const fresh = await todosApi.list();
        setTodos(fresh);
        refreshHabits();
      } else {
        setTodos((prev) => prev.map((t) => (t.id === todo.id ? updated : t)));
      }
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const remove = async (id: string) => {
    try {
      await todosApi.remove(id);
      setTodos((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const trackHabit = async (habit: Habit) => {
    try {
      await todosApi.create({
        title: habit.title,
        category: habit.category,
        priority: 'medium',
        dueDate: todayISO(),
        recurrence: 'daily',
      });
      const fresh = await todosApi.list();
      setTodos(fresh);
      refreshHabits();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const visible = useMemo(() => {
    return todos.filter((t) => {
      if (filter === 'active' && t.completed) return false;
      if (filter === 'completed' && !t.completed) return false;
      if (selectedDate && t.dueDate !== selectedDate) return false;
      return true;
    });
  }, [todos, filter, selectedDate]);

  // Grupowanie wg kategorii w kolejności ważności
  const groups = useMemo(() => {
    return CATEGORY_ORDER.map((cat) => ({
      category: cat,
      items: visible.filter((t) => t.category === cat),
    })).filter((g) => g.items.length > 0);
  }, [visible]);

  const total = todos.length;
  const done = todos.filter((t) => t.completed).length;
  const remaining = total - done;
  const overdueCount = todos.filter((t) => isOverdue(t.dueDate, t.completed)).length;
  const progress = total === 0 ? 0 : Math.round((done / total) * 100);
  const remainingMinutes = todos
    .filter((t) => !t.completed && t.estimatedMinutes)
    .reduce((sum, t) => sum + (t.estimatedMinutes ?? 0), 0);

  return (
    <div className="page">
      <div className="layout">
        <main className="card">
          <header className="header">
            <div className="header-top">
              <h1>Moje zadania</h1>
              <span className="badge">{remaining} do zrobienia</span>
            </div>
            <div className="progress">
              <div className="progress-bar" style={{ width: `${progress}%` }} />
            </div>
            <p className="progress-label">
              {total === 0 ? 'Brak zadań' : `${done} z ${total} ukończonych`}
              {remainingMinutes > 0 && (
                <span className="time-pill">⏱ {formatDuration(remainingMinutes)}</span>
              )}
              {overdueCount > 0 && <span className="overdue-pill">⏰ {overdueCount} zaległe</span>}
            </p>
          </header>

          {supported && permission !== 'granted' && (
            <button className="notify-banner" onClick={requestPermission}>
              🔔 Włącz powiadomienia w przeglądarce
            </button>
          )}

          <form className="add-form" onSubmit={addTodo}>
            <div className="add-row">
              <input
                type="text"
                placeholder="Dodaj nowe zadanie…"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={200}
              />
              <button type="submit" disabled={!title.trim()}>
                <span>＋</span>
              </button>
            </div>

            <div className="add-options">
              <select
                className="select"
                value={category}
                onChange={(e) => setCategory(e.target.value as Category)}
              >
                {CATEGORY_ORDER.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_META[c].icon} {CATEGORY_META[c].label}
                  </option>
                ))}
              </select>

              <div className="priority-pills">
                {PRIORITY_META.map((p) => (
                  <button
                    type="button"
                    key={p.value}
                    className={`prio-pill prio-${p.value} ${priority === p.value ? 'active' : ''}`}
                    onClick={() => setPriority(p.value)}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="add-options">
              <input
                type="date"
                className="date-input"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
              <input
                type="number"
                className="estimate-input"
                placeholder="czas (min)"
                min={1}
                value={estimate}
                onChange={(e) => setEstimate(e.target.value)}
              />
              <select
                className="select"
                value={recurrence}
                onChange={(e) => setRecurrence(e.target.value as Recurrence | '')}
              >
                <option value="">Jednorazowe</option>
                <option value="daily">{RECURRENCE_META.daily}</option>
                <option value="weekly">{RECURRENCE_META.weekly}</option>
              </select>
            </div>
          </form>

          {error && <p className="error">⚠️ {error}</p>}

          <HabitsPanel habits={habits} onTrack={trackHabit} />

          <div className="filters">
            {(Object.keys(FILTER_LABELS) as Filter[]).map((f) => (
              <button
                key={f}
                className={filter === f ? 'active' : ''}
                onClick={() => setFilter(f)}
              >
                {FILTER_LABELS[f]}
              </button>
            ))}
          </div>

          {selectedDate && (
            <p className="day-filter-note">
              Pokazuję zadania na <strong>{formatDueLabel(selectedDate)}</strong>
            </p>
          )}

          {loading ? (
            <p className="muted">Ładowanie…</p>
          ) : groups.length === 0 ? (
            <div className="empty">
              <div className="empty-icon">✓</div>
              <p>{filter === 'completed' ? 'Nic jeszcze nie ukończono' : 'Brak zadań tutaj'}</p>
            </div>
          ) : (
            groups.map((group) => {
              const groupMinutes = group.items
                .filter((t) => !t.completed && t.estimatedMinutes)
                .reduce((s, t) => s + (t.estimatedMinutes ?? 0), 0);
              return (
                <section key={group.category} className="group">
                  <div className="group-header">
                    <span className="group-title">
                      {CATEGORY_META[group.category].icon} {CATEGORY_META[group.category].label}
                    </span>
                    <span className="group-meta">
                      {group.items.length}
                      {groupMinutes > 0 && ` · ${formatDuration(groupMinutes)}`}
                    </span>
                  </div>
                  <ul className="list">
                    {group.items.map((todo) => (
                      <TodoRow key={todo.id} todo={todo} onToggle={toggle} onRemove={remove} />
                    ))}
                  </ul>
                </section>
              );
            })
          )}
        </main>

        <aside className="side">
          <div className="card calendar-card">
            <h2 className="cal-heading">Kalendarz</h2>
            <Calendar todos={todos} selectedDate={selectedDate} onSelectDate={setSelectedDate} />
            <p className="cal-hint">Kliknij dzień, aby zobaczyć zadania. Kropki = liczba zadań.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function TodoRow({
  todo,
  onToggle,
  onRemove,
}: {
  todo: Todo;
  onToggle: (t: Todo) => void;
  onRemove: (id: string) => void;
}) {
  const overdue = isOverdue(todo.dueDate, todo.completed);
  const today = isToday(todo.dueDate);

  return (
    <li className={todo.completed ? 'done' : ''}>
      <button
        className="check"
        onClick={() => onToggle(todo)}
        aria-label={todo.completed ? 'Cofnij' : 'Oznacz jako zrobione'}
      >
        {todo.completed && <span>✓</span>}
      </button>
      <span className={`prio-dot prio-${todo.priority}`} title={`Priorytet: ${todo.priority}`} />
      <div className="todo-body">
        <span className="todo-title">{todo.title}</span>
        <span className="tags">
          {todo.dueDate && (
            <span className={`tag due ${overdue ? 'overdue' : ''} ${today ? 'today' : ''}`}>
              📅 {formatDueLabel(todo.dueDate)}
            </span>
          )}
          {todo.estimatedMinutes && <span className="tag">⏱ {formatDuration(todo.estimatedMinutes)}</span>}
          {todo.recurrence && (
            <span className="tag recur">🔁 {RECURRENCE_META[todo.recurrence]}</span>
          )}
        </span>
      </div>
      <button className="delete" onClick={() => onRemove(todo.id)} aria-label="Usuń">
        ✕
      </button>
    </li>
  );
}
