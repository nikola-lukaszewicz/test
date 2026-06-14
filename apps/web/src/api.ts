export interface Todo {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
}

const BASE = '/api/todos';

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    throw new Error(`Błąd API: ${res.status} ${res.statusText}`);
  }
  if (res.status === 204) {
    return undefined as T;
  }
  return res.json() as Promise<T>;
}

export const todosApi = {
  list: () => fetch(BASE).then((r) => handle<Todo[]>(r)),

  create: (title: string) =>
    fetch(BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    }).then((r) => handle<Todo>(r)),

  update: (id: string, patch: Partial<Pick<Todo, 'title' | 'completed'>>) =>
    fetch(`${BASE}/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    }).then((r) => handle<Todo>(r)),

  remove: (id: string) =>
    fetch(`${BASE}/${id}`, { method: 'DELETE' }).then((r) => handle<void>(r)),
};
