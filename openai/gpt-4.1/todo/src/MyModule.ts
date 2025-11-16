import { Module } from "@nestjs/common";

import { AuthUserController } from "./controllers/auth/user/AuthUserController";
import { TodolistUserUsersController } from "./controllers/todoList/user/users/TodolistUserUsersController";
import { TodolistUserUsersSessionsController } from "./controllers/todoList/user/users/sessions/TodolistUserUsersSessionsController";
import { TodolistUserTodosController } from "./controllers/todoList/user/todos/TodolistUserTodosController";

@Module({
  controllers: [
    AuthUserController,
    TodolistUserUsersController,
    TodolistUserUsersSessionsController,
    TodolistUserTodosController,
  ],
})
export class MyModule {}
