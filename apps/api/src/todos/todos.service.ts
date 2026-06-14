import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { CreateTodoDto } from './dto/create-todo.dto';
import { UpdateTodoDto } from './dto/update-todo.dto';
import { Todo } from './todo.entity';

@Injectable()
export class TodosService {
  // Magazyn w pamięci — wystarczy do demonstracji.
  // Łatwo podmienić na bazę danych (np. Prisma / TypeORM).
  private todos: Todo[] = [
    {
      id: randomUUID(),
      title: 'Przykładowe zadanie — kliknij, aby oznaczyć jako zrobione',
      completed: false,
      createdAt: new Date().toISOString(),
    },
  ];

  findAll(): Todo[] {
    return [...this.todos].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
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
