import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Calendar } from './Calendar';
import { Priority, Todo, todosApi } from './api';
import { formatDueLabel, isOverdue, isToday } from './dateUtils';

type Filter = 'all' | 'active' | 'completed';

const FILTER_LABELS: Record<Filter, string> = {
  all: 'Wszystkie',
  active: 'Aktywne',
  completed: 'Ukończone',
};

const PRIORITIES: { value: Priority; label: string }[] = [
  { value: 'low', label: 'Niski' },
  { value: 'medium', label: 'Średni' },
  { value: 'high', label: 'Wysoki' },
];

export function App() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [dueDate, setDueDate] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    todosApi
      .list()
      .then(setTodos)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const addTodo = async (e: FormEvent) => {
    e.preventDefault();
    const value = title.trim();
    if (!value) return;
    try {
      const created = await todosApi.create({
        title: value,
        priority,
        dueDate: dueDate || null,
      });
      setTodos((prev) => [...prev, created]);
      setTitle('');
      setDueDate('');
      setPriority('medium');
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const toggle = async (todo: Todo) => {
    try {
      const updated = await todosApi.update(todo.id, { completed: !todo.completed });
      setTodos((prev) => prev.map((t) => (t.id === todo.id ? updated : t)));
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

  const visible = useMemo(() => {
    return todos.filter((t) => {
      if (filter === 'active' && t.completed) return false;
      if (filter === 'completed' && !t.completed) return false;
      if (selectedDate && t.dueDate !== selectedDate) return false;
      return true;
    });
  }, [todos, filter, selectedDate]);

  const total = todos.length;
  const done = todos.filter((t) => t.completed).length;
  const remaining = total - done;
  const overdueCount = todos.filter((t) => isOverdue(t.dueDate, t.completed)).length;
  const progress = total === 0 ? 0 : Math.round((done / total) * 100);

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
              {overdueCount > 0 && <span className="overdue-pill">⏰ {overdueCount} zaległe</span>}
            </p>
          </header>

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
              <div className="priority-pills">
                {PRIORITIES.map((p) => (
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
              <input
                type="date"
                className="date-input"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </form>

          {error && <p className="error">⚠️ {error}</p>}

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
          ) : visible.length === 0 ? (
            <div className="empty">
              <div className="empty-icon">✓</div>
              <p>{filter === 'completed' ? 'Nic jeszcze nie ukończono' : 'Brak zadań tutaj'}</p>
            </div>
          ) : (
            <ul className="list">
              {visible.map((todo) => {
                const overdue = isOverdue(todo.dueDate, todo.completed);
                const today = isToday(todo.dueDate);
                return (
                  <li key={todo.id} className={todo.completed ? 'done' : ''}>
                    <button
                      className="check"
                      onClick={() => toggle(todo)}
                      aria-label={todo.completed ? 'Cofnij' : 'Oznacz jako zrobione'}
                    >
                      {todo.completed && <span>✓</span>}
                    </button>
                    <span className={`prio-dot prio-${todo.priority}`} title={`Priorytet: ${todo.priority}`} />
                    <div className="todo-body">
                      <span className="todo-title">{todo.title}</span>
                      {todo.dueDate && (
                        <span
                          className={`due-tag ${overdue ? 'overdue' : ''} ${today ? 'today' : ''}`}
                        >
                          📅 {formatDueLabel(todo.dueDate)}
                        </span>
                      )}
                    </div>
                    <button
                      className="delete"
                      onClick={() => remove(todo.id)}
                      aria-label="Usuń"
                    >
                      ✕
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </main>

        <aside className="card calendar-card">
          <h2 className="cal-heading">Kalendarz</h2>
          <Calendar todos={todos} selectedDate={selectedDate} onSelectDate={setSelectedDate} />
          <p className="cal-hint">Kliknij dzień, aby zobaczyć zadania. Kropki = liczba zadań.</p>
        </aside>
      </div>
    </div>
  );
}
