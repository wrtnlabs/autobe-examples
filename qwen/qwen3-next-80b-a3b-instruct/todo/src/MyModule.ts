import { Module } from "@nestjs/common";

import { AuthUserController } from "./controllers/auth/user/AuthUserController";
import { TodolistTasksController } from "./controllers/todoList/tasks/TodolistTasksController";
import { TodolistTasksCompleteController } from "./controllers/todoList/tasks/complete/TodolistTasksCompleteController";

@Module({
  controllers: [
    AuthUserController,
    TodolistTasksController,
    TodolistTasksCompleteController,
  ],
})
export class MyModule {}
