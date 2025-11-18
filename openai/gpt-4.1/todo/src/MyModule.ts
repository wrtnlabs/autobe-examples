import { Module } from "@nestjs/common";

import { AuthUserController } from "./controllers/auth/user/AuthUserController";
import { TodolistUserUsersController } from "./controllers/todoList/user/users/TodolistUserUsersController";
import { TodolistUsersSessionsController } from "./controllers/todoList/users/sessions/TodolistUsersSessionsController";
import { TodolistUserTodosController } from "./controllers/todoList/user/todos/TodolistUserTodosController";
import { TodolistUserUsersSessionsController } from "./controllers/todoList/user/users/sessions/TodolistUserUsersSessionsController";

@Module({
  controllers: [
    AuthUserController,
    TodolistUserUsersController,
    TodolistUsersSessionsController,
    TodolistUserTodosController,
    TodolistUserUsersSessionsController,
  ],
})
export class MyModule {}
