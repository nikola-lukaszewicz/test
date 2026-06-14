import { Category, Priority, Recurrence } from './api';

// Kolejność = hierarchia ważności (taka sama jak na backendzie)
export const CATEGORY_ORDER: Category[] = ['praca', 'spotkanie', 'wizyta', 'inne', 'dom'];

export const CATEGORY_META: Record<Category, { label: string; icon: string }> = {
  praca: { label: 'Praca', icon: '💼' },
  spotkanie: { label: 'Spotkania', icon: '👥' },
  wizyta: { label: 'Wizyty', icon: '🩺' },
  inne: { label: 'Inne', icon: '📌' },
  dom: { label: 'Obowiązki domowe', icon: '🏠' },
};

export const PRIORITY_META: { value: Priority; label: string }[] = [
  { value: 'low', label: 'Niski' },
  { value: 'medium', label: 'Średni' },
  { value: 'high', label: 'Wysoki' },
];

export const RECURRENCE_META: Record<Recurrence, string> = {
  daily: 'Codziennie',
  weekly: 'Co tydzień',
};

// "90" -> "1 h 30 min"
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}
