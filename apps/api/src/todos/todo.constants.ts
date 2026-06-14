export type Priority = 'low' | 'medium' | 'high';
export type Category = 'praca' | 'spotkanie' | 'wizyta' | 'inne' | 'dom';
export type Recurrence = 'daily' | 'weekly';

export const PRIORITIES: Priority[] = ['low', 'medium', 'high'];
export const CATEGORIES: Category[] = ['praca', 'spotkanie', 'wizyta', 'inne', 'dom'];
export const RECURRENCES: Recurrence[] = ['daily', 'weekly'];

// Im niższa waga, tym wyżej na liście (ważniejsze).
// Praca -> spotkania -> wizyty (np. lekarz) -> inne -> obowiązki domowe na końcu.
export const CATEGORY_RANK: Record<Category, number> = {
  praca: 0,
  spotkanie: 1,
  wizyta: 2,
  inne: 3,
  dom: 4,
};

export const PRIORITY_RANK: Record<Priority, number> = {
  high: 0,
  medium: 1,
  low: 2,
};
