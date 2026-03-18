import { IsNotEmpty, IsObject, IsString } from 'class-validator';

export class UpsertContextDto {
  @IsString()
  @IsNotEmpty()
  scope: string;

  @IsObject()
  context: Record<string, unknown>;
}
