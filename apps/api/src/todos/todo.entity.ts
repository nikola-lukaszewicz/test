export type Priority = 'low' | 'medium' | 'high';

export interface Todo {
  id: string;
  title: string;
  completed: boolean;
  priority: Priority;
  dueDate: string | null; // ISO date (YYYY-MM-DD) lub null
  createdAt: string;
}
