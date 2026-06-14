import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Todo, todosApi } from './api';

type Filter = 'all' | 'active' | 'completed';

const FILTER_LABELS: Record<Filter, string> = {
  all: 'Wszystkie',
  active: 'Aktywne',
  completed: 'Ukończone',
};

export function App() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [title, setTitle] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
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
      const created = await todosApi.create(value);
      setTodos((prev) => [...prev, created]);
      setTitle('');
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
    if (filter === 'active') return todos.filter((t) => !t.completed);
    if (filter === 'completed') return todos.filter((t) => t.completed);
    return todos;
  }, [todos, filter]);

  const total = todos.length;
  const done = todos.filter((t) => t.completed).length;
  const remaining = total - done;
  const progress = total === 0 ? 0 : Math.round((done / total) * 100);

  return (
    <div className="page">
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
          </p>
        </header>

        <form className="add-form" onSubmit={addTodo}>
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

        {loading ? (
          <p className="muted">Ładowanie…</p>
        ) : visible.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">✓</div>
            <p>{filter === 'completed' ? 'Nic jeszcze nie ukończono' : 'Wszystko zrobione!'}</p>
          </div>
        ) : (
          <ul className="list">
            {visible.map((todo) => (
              <li key={todo.id} className={todo.completed ? 'done' : ''}>
                <button
                  className="check"
                  onClick={() => toggle(todo)}
                  aria-label={todo.completed ? 'Oznacz jako niezrobione' : 'Oznacz jako zrobione'}
                >
                  {todo.completed && <span>✓</span>}
                </button>
                <span className="todo-title">{todo.title}</span>
                <button
                  className="delete"
                  onClick={() => remove(todo.id)}
                  aria-label="Usuń"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
