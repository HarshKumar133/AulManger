import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateAiSessionDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  title?: string;
}
