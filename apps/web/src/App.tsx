import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Todo, todosApi } from './api';

type Filter = 'all' | 'active' | 'completed';

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

  const remaining = todos.filter((t) => !t.completed).length;

  return (
    <main className="app">
      <h1>📝 Todo List</h1>

      <form className="add-form" onSubmit={addTodo}>
        <input
          type="text"
          placeholder="Co masz do zrobienia?"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={200}
        />
        <button type="submit">Dodaj</button>
      </form>

      {error && <p className="error">⚠️ {error}</p>}

      <div className="filters">
        {(['all', 'active', 'completed'] as Filter[]).map((f) => (
          <button
            key={f}
            className={filter === f ? 'active' : ''}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? 'Wszystkie' : f === 'active' ? 'Aktywne' : 'Ukończone'}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="muted">Ładowanie…</p>
      ) : visible.length === 0 ? (
        <p className="muted">Brak zadań do wyświetlenia.</p>
      ) : (
        <ul className="list">
          {visible.map((todo) => (
            <li key={todo.id} className={todo.completed ? 'done' : ''}>
              <label>
                <input
                  type="checkbox"
                  checked={todo.completed}
                  onChange={() => toggle(todo)}
                />
                <span>{todo.title}</span>
              </label>
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

      <footer className="footer">
        {remaining} {remaining === 1 ? 'zadanie' : 'zadań'} pozostało
      </footer>
    </main>
  );
}
