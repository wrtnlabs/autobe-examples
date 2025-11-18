import { Module } from "@nestjs/common";

import { AuthUserController } from "./controllers/auth/user/AuthUserController";
import { TodolistUserUsersSelfController } from "./controllers/todoList/user/users/self/TodolistUserUsersSelfController";
import { TodolistUserUsersSelfSessionsController } from "./controllers/todoList/user/users/self/sessions/TodolistUserUsersSelfSessionsController";
import { TodolistUserTodosController } from "./controllers/todoList/user/todos/TodolistUserTodosController";

@Module({
  controllers: [
    AuthUserController,
    TodolistUserUsersSelfController,
    TodolistUserUsersSelfSessionsController,
    TodolistUserTodosController,
  ],
})
export class MyModule {}
