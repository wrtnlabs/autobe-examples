import { Module } from "@nestjs/common";

import { AuthUserController } from "./controllers/auth/user/AuthUserController";
import { TodolistUserTodosController } from "./controllers/todoList/user/todos/TodolistUserTodosController";
import { TodolistUserUsersTodosController } from "./controllers/todoList/user/users/todos/TodolistUserUsersTodosController";

@Module({
  controllers: [
    AuthUserController,
    TodolistUserTodosController,
    TodolistUserUsersTodosController,
  ],
})
export class MyModule {}
