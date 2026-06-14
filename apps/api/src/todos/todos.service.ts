import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { CreateTodoDto } from './dto/create-todo.dto';
import { UpdateTodoDto } from './dto/update-todo.dto';
import { Priority, Todo } from './todo.entity';

const PRIORITY_RANK: Record<Priority, number> = { high: 0, medium: 1, low: 2 };

@Injectable()
export class TodosService {
  // Magazyn w pamięci — wystarczy do demonstracji.
  // Łatwo podmienić na bazę danych (np. Prisma / TypeORM).
  private todos: Todo[] = [
    {
      id: randomUUID(),
      title: 'Przykładowe zadanie — kliknij, aby oznaczyć jako zrobione',
      completed: false,
      priority: 'medium',
      dueDate: new Date().toISOString().slice(0, 10),
      createdAt: new Date().toISOString(),
    },
  ];

  findAll(): Todo[] {
    return [...this.todos].sort((a, b) => {
      // Najpierw niezakończone, potem wg terminu, potem wg priorytetu
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      if (a.dueDate && b.dueDate && a.dueDate !== b.dueDate) {
        return a.dueDate.localeCompare(b.dueDate);
      }
      if (a.dueDate && !b.dueDate) return -1;
      if (!a.dueDate && b.dueDate) return 1;
      if (a.priority !== b.priority) return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
      return a.createdAt.localeCompare(b.createdAt);
    });
  }

  findOne(id: string): Todo {
    const todo = this.todos.find((t) => t.id === id);
    if (!todo) {
      throw new NotFoundException(`Nie znaleziono zadania o id ${id}`);
    }
    return todo;
  }

  create(dto: CreateTodoDto): Todo {
    const todo: Todo = {
      id: randomUUID(),
      title: dto.title.trim(),
      completed: false,
      priority: dto.priority ?? 'medium',
      dueDate: dto.dueDate ? dto.dueDate.slice(0, 10) : null,
      createdAt: new Date().toISOString(),
    };
    this.todos.push(todo);
    return todo;
  }

  update(id: string, dto: UpdateTodoDto): Todo {
    const todo = this.findOne(id);
    if (dto.title !== undefined) {
      todo.title = dto.title.trim();
    }
    if (dto.completed !== undefined) {
      todo.completed = dto.completed;
    }
    if (dto.priority !== undefined) {
      todo.priority = dto.priority;
    }
    if (dto.dueDate !== undefined) {
      todo.dueDate = dto.dueDate ? dto.dueDate.slice(0, 10) : null;
    }
    return todo;
  }

  remove(id: string): void {
    const index = this.todos.findIndex((t) => t.id === id);
    if (index === -1) {
      throw new NotFoundException(`Nie znaleziono zadania o id ${id}`);
    }
    this.todos.splice(index, 1);
  }
}
