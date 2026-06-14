import { Injectable, NotFoundException } from '@nestjs/common';
import { Todo } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTodoDto } from './dto/create-todo.dto';
import { UpdateTodoDto } from './dto/update-todo.dto';
import {
  Category,
  CATEGORIES,
  CATEGORY_RANK,
  Priority,
  PRIORITY_RANK,
  Recurrence,
} from './todo.constants';

export interface Stats {
  totals: {
    total: number;
    completed: number;
    active: number;
    overdue: number;
    completionRate: number;
  };
  byCategory: { category: string; total: number; completed: number }[];
  last7Days: { date: string; count: number }[];
  streaks: {
    titleKey: string;
    title: string;
    category: string;
    current: number;
    longest: number;
    lastCompletedAt: string;
  }[];
}

export interface Habit {
  titleKey: string;
  title: string;
  category: string;
  count: number;
  lastCompletedAt: string;
  alreadyTracked: boolean; // czy istnieje już powtarzalne zadanie o tym tytule
}

const HABIT_THRESHOLD = 3; // tyle ukończeń, by uznać czynność za nawyk

@Injectable()
export class TodosService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<Todo[]> {
    const todos = await this.prisma.todo.findMany();
    return todos.sort(this.compare);
  }

  // Sortowanie hierarchiczne: niezakończone najpierw, potem wg kategorii
  // (praca > spotkanie > wizyta > inne > dom), terminu i priorytetu.
  private compare = (a: Todo, b: Todo): number => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;

    const catA = CATEGORY_RANK[a.category as Category] ?? 99;
    const catB = CATEGORY_RANK[b.category as Category] ?? 99;
    if (catA !== catB) return catA - catB;

    if (a.dueDate && b.dueDate && a.dueDate !== b.dueDate) {
      return a.dueDate.localeCompare(b.dueDate);
    }
    if (a.dueDate && !b.dueDate) return -1;
    if (!a.dueDate && b.dueDate) return 1;

    const prioA = PRIORITY_RANK[a.priority as Priority] ?? 1;
    const prioB = PRIORITY_RANK[b.priority as Priority] ?? 1;
    if (prioA !== prioB) return prioA - prioB;

    return a.createdAt.getTime() - b.createdAt.getTime();
  };

  async findOne(id: string): Promise<Todo> {
    const todo = await this.prisma.todo.findUnique({ where: { id } });
    if (!todo) {
      throw new NotFoundException(`Nie znaleziono zadania o id ${id}`);
    }
    return todo;
  }

  async create(dto: CreateTodoDto): Promise<Todo> {
    return this.prisma.todo.create({
      data: {
        title: dto.title.trim(),
        priority: dto.priority ?? 'medium',
        category: dto.category ?? 'inne',
        dueDate: dto.dueDate ? dto.dueDate.slice(0, 10) : null,
        estimatedMinutes: dto.estimatedMinutes ?? null,
        recurrence: dto.recurrence ?? null,
      },
    });
  }

  async update(id: string, dto: UpdateTodoDto): Promise<Todo> {
    const existing = await this.findOne(id);

    const data: Record<string, unknown> = {};
    if (dto.title !== undefined) data.title = dto.title.trim();
    if (dto.priority !== undefined) data.priority = dto.priority;
    if (dto.category !== undefined) data.category = dto.category;
    if (dto.dueDate !== undefined) data.dueDate = dto.dueDate ? dto.dueDate.slice(0, 10) : null;
    if (dto.estimatedMinutes !== undefined) data.estimatedMinutes = dto.estimatedMinutes;
    if (dto.recurrence !== undefined) data.recurrence = dto.recurrence;

    // Wykrycie momentu ukończenia
    const justCompleted = dto.completed === true && !existing.completed;
    const justReopened = dto.completed === false && existing.completed;
    if (dto.completed !== undefined) {
      data.completed = dto.completed;
      data.completedAt = justCompleted ? new Date() : justReopened ? null : existing.completedAt;
    }

    const updated = await this.prisma.todo.update({ where: { id }, data });

    if (justCompleted) {
      await this.onCompleted(updated);
    }

    return updated;
  }

  private async onCompleted(todo: Todo): Promise<void> {
    // 1. Zapis do historii ukończeń (baza nawyków)
    await this.prisma.completionLog.create({
      data: {
        titleKey: todo.title.trim().toLowerCase(),
        title: todo.title.trim(),
        category: todo.category,
      },
    });

    // 2. Zadanie powtarzalne -> utwórz następne wystąpienie
    if (todo.recurrence && todo.dueDate) {
      const next = this.nextDueDate(todo.dueDate, todo.recurrence as Recurrence);
      await this.prisma.todo.create({
        data: {
          title: todo.title,
          priority: todo.priority,
          category: todo.category,
          dueDate: next,
          estimatedMinutes: todo.estimatedMinutes,
          recurrence: todo.recurrence,
        },
      });
    }
  }

  private nextDueDate(dueDate: string, recurrence: Recurrence): string {
    const [y, m, d] = dueDate.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() + (recurrence === 'daily' ? 1 : 7));
    const yy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yy}-${mm}-${dd}`;
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.prisma.todo.delete({ where: { id } });
  }

  // ----- Nawyki -----
  // Czynność uznajemy za nawyk, gdy ukończono ją >= HABIT_THRESHOLD razy.
  async detectHabits(): Promise<Habit[]> {
    const logs = await this.prisma.completionLog.groupBy({
      by: ['titleKey'],
      _count: { titleKey: true },
      _max: { completedAt: true },
      having: { titleKey: { _count: { gte: HABIT_THRESHOLD } } },
    });

    if (logs.length === 0) return [];

    // Pobierz reprezentatywny tytuł/kategorię oraz aktualne powtarzalne zadania
    const [samples, recurring] = await Promise.all([
      this.prisma.completionLog.findMany({
        where: { titleKey: { in: logs.map((l) => l.titleKey) } },
        distinct: ['titleKey'],
        orderBy: { completedAt: 'desc' },
      }),
      this.prisma.todo.findMany({ where: { recurrence: { not: null } } }),
    ]);

    const trackedKeys = new Set(recurring.map((t) => t.title.trim().toLowerCase()));
    const sampleByKey = new Map(samples.map((s) => [s.titleKey, s]));

    return logs
      .map((l) => {
        const sample = sampleByKey.get(l.titleKey);
        return {
          titleKey: l.titleKey,
          title: sample?.title ?? l.titleKey,
          category: sample?.category ?? 'inne',
          count: l._count.titleKey,
          lastCompletedAt: (l._max.completedAt ?? new Date()).toISOString(),
          alreadyTracked: trackedKeys.has(l.titleKey),
        };
      })
      .sort((a, b) => b.count - a.count);
  }

  // ----- Statystyki + streaki -----
  async getStats(): Promise<Stats> {
    const today = this.localISO(new Date());
    const [todos, logs] = await Promise.all([
      this.prisma.todo.findMany(),
      this.prisma.completionLog.findMany({ orderBy: { completedAt: 'asc' } }),
    ]);

    const total = todos.length;
    const completed = todos.filter((t) => t.completed).length;
    const active = total - completed;
    const overdue = todos.filter((t) => !t.completed && t.dueDate && t.dueDate < today).length;
    const completionRate = total === 0 ? 0 : Math.round((completed / total) * 100);

    const byCategory = CATEGORIES.map((cat) => {
      const items = todos.filter((t) => t.category === cat);
      return { category: cat, total: items.length, completed: items.filter((t) => t.completed).length };
    }).filter((c) => c.total > 0);

    // Ukończenia w ostatnich 7 dniach
    const byDay = new Map<string, number>();
    for (const l of logs) {
      const d = this.localISO(l.completedAt);
      byDay.set(d, (byDay.get(d) ?? 0) + 1);
    }
    const last7Days: { date: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const iso = this.localISO(d);
      last7Days.push({ date: iso, count: byDay.get(iso) ?? 0 });
    }

    const streaks = this.computeStreaks(logs);

    return {
      totals: { total, completed, active, overdue, completionRate },
      byCategory,
      last7Days,
      streaks,
    };
  }

  private localISO(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
      date.getDate(),
    ).padStart(2, '0')}`;
  }

  private computeStreaks(
    logs: { titleKey: string; title: string; category: string; completedAt: Date }[],
  ): Stats['streaks'] {
    // Grupowanie ukończeń po tytule, zbiór unikalnych dni
    const byKey = new Map<
      string,
      { title: string; category: string; days: Set<string>; last: Date }
    >();
    for (const l of logs) {
      const day = this.localISO(l.completedAt);
      const entry = byKey.get(l.titleKey);
      if (entry) {
        entry.days.add(day);
        if (l.completedAt > entry.last) entry.last = l.completedAt;
      } else {
        byKey.set(l.titleKey, {
          title: l.title,
          category: l.category,
          days: new Set([day]),
          last: l.completedAt,
        });
      }
    }

    const today = this.localISO(new Date());
    const yesterday = (() => {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      return this.localISO(d);
    })();

    const result: Stats['streaks'] = [];
    for (const [titleKey, e] of byKey) {
      if (e.days.size < 2) continue; // streak ma sens przy >= 2 dniach

      // Bieżący streak: liczymy wstecz od dziś (lub wczoraj, jeśli dziś jeszcze nie zrobiono)
      let current = 0;
      const cursor = new Date();
      if (!e.days.has(today)) {
        if (e.days.has(yesterday)) {
          cursor.setDate(cursor.getDate() - 1);
        } else {
          cursor.setDate(cursor.getDate() - 9999); // brak bieżącego streaka
        }
      }
      while (e.days.has(this.localISO(cursor))) {
        current++;
        cursor.setDate(cursor.getDate() - 1);
      }

      // Najdłuższy streak
      const sorted = [...e.days].sort();
      let longest = 0;
      let run = 0;
      let prev: string | null = null;
      for (const day of sorted) {
        if (prev && this.dayDiff(day, prev) === 1) run++;
        else run = 1;
        if (run > longest) longest = run;
        prev = day;
      }

      result.push({
        titleKey,
        title: e.title,
        category: e.category,
        current,
        longest,
        lastCompletedAt: e.last.toISOString(),
      });
    }

    return result
      .sort((a, b) => b.current - a.current || b.longest - a.longest)
      .slice(0, 8);
  }

  private dayDiff(a: string, b: string): number {
    const [ay, am, ad] = a.split('-').map(Number);
    const [by, bm, bd] = b.split('-').map(Number);
    const da = new Date(ay, am - 1, ad).getTime();
    const db = new Date(by, bm - 1, bd).getTime();
    return Math.round((da - db) / 86400000);
  }
}
