import {
  IsBoolean,
  IsEnum,
  IsISO8601,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { Category, Priority, Recurrence } from '../todo.constants';

export class UpdateTodoDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsBoolean()
  completed?: boolean;

  @IsOptional()
  @IsEnum(['low', 'medium', 'high'])
  priority?: Priority;

  @IsOptional()
  @IsEnum(['praca', 'spotkanie', 'wizyta', 'inne', 'dom'])
  category?: Category;

  // null = usunięcie terminu
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsISO8601({ strict: true })
  dueDate?: string | null;

  // null = brak szacowanego czasu
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsInt()
  @Min(1)
  @Max(100000)
  estimatedMinutes?: number | null;

  // null = zadanie jednorazowe
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsEnum(['daily', 'weekly'])
  recurrence?: Recurrence | null;
}
