import { IsEnum, IsISO8601, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { Priority } from '../todo.entity';

export class CreateTodoDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsEnum(['low', 'medium', 'high'])
  priority?: Priority;

  @IsOptional()
  @IsISO8601({ strict: true })
  dueDate?: string;
}
