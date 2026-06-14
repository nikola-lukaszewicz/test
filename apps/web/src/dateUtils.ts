// Pomocniki dat operujące na lokalnym kalendarzu (format YYYY-MM-DD)

export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function isOverdue(dueDate: string | null, completed: boolean): boolean {
  if (!dueDate || completed) return false;
  return dueDate < todayISO();
}

export function isToday(dueDate: string | null): boolean {
  return !!dueDate && dueDate === todayISO();
}

const MONTHS = [
  'styczeń', 'luty', 'marzec', 'kwiecień', 'maj', 'czerwiec',
  'lipiec', 'sierpień', 'wrzesień', 'październik', 'listopad', 'grudzień',
];

export function monthLabel(year: number, month: number): string {
  return `${MONTHS[month]} ${year}`;
}

// Dni tygodnia zaczynając od poniedziałku
export const WEEKDAYS = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd'];

// Zwraca siatkę 6x7 dat (Date) dla widoku miesiąca, zaczynając od poniedziałku
export function buildMonthGrid(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  // getDay: 0 = niedziela → przesuwamy tak, by poniedziałek był pierwszy
  const offset = (first.getDay() + 6) % 7;
  const start = new Date(year, month, 1 - offset);

  const cells: Date[] = [];
  for (let i = 0; i < 42; i++) {
    cells.push(new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
  }
  return cells;
}

export function formatDueLabel(dueDate: string): string {
  const today = todayISO();
  if (dueDate === today) return 'Dziś';

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (dueDate === toISODate(tomorrow)) return 'Jutro';

  const [, m, d] = dueDate.split('-').map(Number);
  return `${d} ${MONTHS[m - 1].slice(0, 3)}`;
}
