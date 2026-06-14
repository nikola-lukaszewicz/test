import {
  IsEnum,
  IsISO8601,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Category, Priority, Recurrence } from '../todo.constants';

export class CreateTodoDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsEnum(['low', 'medium', 'high'])
  priority?: Priority;

  @IsOptional()
  @IsEnum(['praca', 'spotkanie', 'wizyta', 'inne', 'dom'])
  category?: Category;

  @IsOptional()
  @IsISO8601({ strict: true })
  dueDate?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100000)
  estimatedMinutes?: number;

  @IsOptional()
  @IsEnum(['daily', 'weekly'])
  recurrence?: Recurrence;
}
