import { IsNotEmpty, IsObject, IsString } from 'class-validator';

export class UpsertPreferenceDto {
  @IsString()
  @IsNotEmpty()
  key: string;

  @IsObject()
  value: Record<string, unknown>;
}
