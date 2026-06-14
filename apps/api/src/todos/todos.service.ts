import { Injectable, NotFoundException } from '@nestjs/common';
import { Todo } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTodoDto } from './dto/create-todo.dto';
import { UpdateTodoDto } from './dto/update-todo.dto';
import {
  Category,
  CATEGORY_RANK,
  Priority,
  PRIORITY_RANK,
  Recurrence,
} from './todo.constants';

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
}
