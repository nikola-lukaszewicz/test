export type Priority = 'low' | 'medium' | 'high';
export type Category = 'praca' | 'spotkanie' | 'wizyta' | 'inne' | 'dom';
export type Recurrence = 'daily' | 'weekly';

export interface Todo {
  id: string;
  title: string;
  completed: boolean;
  priority: Priority;
  category: Category;
  dueDate: string | null;
  estimatedMinutes: number | null;
  recurrence: Recurrence | null;
  createdAt: string;
  completedAt: string | null;
}

export interface Habit {
  titleKey: string;
  title: string;
  category: Category;
  count: number;
  lastCompletedAt: string;
  alreadyTracked: boolean;
}

export interface Stats {
  totals: {
    total: number;
    completed: number;
    active: number;
    overdue: number;
    completionRate: number;
  };
  byCategory: { category: Category; total: number; completed: number }[];
  last7Days: { date: string; count: number }[];
  streaks: {
    titleKey: string;
    title: string;
    category: Category;
    current: number;
    longest: number;
    lastCompletedAt: string;
  }[];
}

export interface CreateTodoInput {
  title: string;
  priority?: Priority;
  category?: Category;
  dueDate?: string | null;
  estimatedMinutes?: number | null;
  recurrence?: Recurrence | null;
}

export type UpdateTodoInput = Partial<
  Pick<Todo, 'title' | 'completed' | 'priority' | 'category' | 'dueDate' | 'estimatedMinutes' | 'recurrence'>
>;

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

  habits: () => fetch(`${BASE}/habits`).then((r) => handle<Habit[]>(r)),

  stats: () => fetch(`${BASE}/stats`).then((r) => handle<Stats>(r)),

  create: (input: CreateTodoInput) =>
    fetch(BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    }).then((r) => handle<Todo>(r)),

  update: (id: string, patch: UpdateTodoInput) =>
    fetch(`${BASE}/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    }).then((r) => handle<Todo>(r)),

  remove: (id: string) =>
    fetch(`${BASE}/${id}`, { method: 'DELETE' }).then((r) => handle<void>(r)),
};
