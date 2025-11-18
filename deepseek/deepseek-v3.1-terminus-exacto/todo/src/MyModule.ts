import { Module } from "@nestjs/common";

import { AuthUserController } from "./controllers/auth/user/AuthUserController";
import { TodolistUserConfigurationsController } from "./controllers/TodolistUserConfigurationsController";
import { TodolistUserUsersController } from "./controllers/todoList/user/users/TodolistUserUsersController";
import { TodolistUserUsersSessionsController } from "./controllers/todoList/user/users/sessions/TodolistUserUsersSessionsController";
import { TodolistUsersSessionsController } from "./controllers/todoList/users/sessions/TodolistUsersSessionsController";
import { TodolistUserTodosController } from "./controllers/todoList/user/todos/TodolistUserTodosController";
import { TodolistUserTodosSnapshotsController } from "./controllers/todoList/user/todos/snapshots/TodolistUserTodosSnapshotsController";

@Module({
  controllers: [
    AuthUserController,
    TodolistUserConfigurationsController,
    TodolistUserUsersController,
    TodolistUserUsersSessionsController,
    TodolistUsersSessionsController,
    TodolistUserTodosController,
    TodolistUserTodosSnapshotsController,
  ],
})
export class MyModule {}
