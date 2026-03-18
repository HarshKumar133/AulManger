import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { TasksService } from './tasks.service.js';
import { JwtGuard } from '../auth/jwt.guard.js';
import { CreateTaskDto } from './dto/create-task.dto.js';
import { UpdateTaskDto } from './dto/update-task.dto.js';

@Controller('tasks')
export class TasksController {
  constructor(private tasksService: TasksService) {}

  @UseGuards(JwtGuard)
  @Post()
  create(@Body() body: CreateTaskDto, @Req() req: any) {
    return this.tasksService.createTask(body, req.user.userId);
  }

  @UseGuards(JwtGuard)
  @Get()
  list(@Req() req: any, @Query() query: any) {
    return this.tasksService.getTasks(req.user.userId, query);
  }

  @UseGuards(JwtGuard)
  @Patch('bulk/update')
  bulkUpdate(
    @Body() body: { taskIds: number[]; data: UpdateTaskDto },
    @Req() req: any,
  ) {
    return this.tasksService.bulkUpdateTasks(
      body.taskIds,
      req.user.userId,
      body.data || {},
    );
  }

  @UseGuards(JwtGuard)
  @Delete('bulk/delete')
  bulkDelete(@Body() body: { taskIds: number[] }, @Req() req: any) {
    return this.tasksService.bulkDeleteTasks(body.taskIds, req.user.userId);
  }

  @UseGuards(JwtGuard)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() body: UpdateTaskDto,
    @Req() req: any,
  ) {
    return this.tasksService.updateTask(Number(id), req.user.userId, body);
  }

  @UseGuards(JwtGuard)
  @Patch(':id/restore')
  restore(@Param('id') id: string, @Req() req: any) {
    return this.tasksService.restoreTask(Number(id), req.user.userId);
  }

  @UseGuards(JwtGuard)
  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.tasksService.deleteTask(Number(id), req.user.userId);
  }
}
