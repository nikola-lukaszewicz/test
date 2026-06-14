export type Priority = 'low' | 'medium' | 'high';

export interface Todo {
  id: string;
  title: string;
  completed: boolean;
  priority: Priority;
  dueDate: string | null;
  createdAt: string;
}

export interface CreateTodoInput {
  title: string;
  priority?: Priority;
  dueDate?: string | null;
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

  create: (input: CreateTodoInput) =>
    fetch(BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    }).then((r) => handle<Todo>(r)),

  update: (id: string, patch: Partial<Pick<Todo, 'title' | 'completed' | 'priority' | 'dueDate'>>) =>
    fetch(`${BASE}/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    }).then((r) => handle<Todo>(r)),

  remove: (id: string) =>
    fetch(`${BASE}/${id}`, { method: 'DELETE' }).then((r) => handle<void>(r)),
};
