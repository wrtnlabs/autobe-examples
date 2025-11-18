import { Module } from "@nestjs/common";

import { AuthUserController } from "./controllers/auth/user/AuthUserController";
import { TodolistUserActorsController } from "./controllers/todoList/user/actors/TodolistUserActorsController";
import { TodolistActorsSessionsController } from "./controllers/todoList/actors/sessions/TodolistActorsSessionsController";
import { TodolistUserActorsSessionsController } from "./controllers/todoList/user/actors/sessions/TodolistUserActorsSessionsController";
import { TodolistUserTasksController } from "./controllers/todoList/user/tasks/TodolistUserTasksController";

@Module({
  controllers: [
    AuthUserController,
    TodolistUserActorsController,
    TodolistActorsSessionsController,
    TodolistUserActorsSessionsController,
    TodolistUserTasksController,
  ],
})
export class MyModule {}
