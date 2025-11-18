import { Module } from "@nestjs/common";

import { AuthUserController } from "./controllers/auth/user/AuthUserController";
import { TodolistUserUsersMeController } from "./controllers/todoList/user/users/me/TodolistUserUsersMeController";
import { TodolistUserUsersMeSessionsController } from "./controllers/todoList/user/users/me/sessions/TodolistUserUsersMeSessionsController";
import { TodolistUserTodosController } from "./controllers/todoList/user/todos/TodolistUserTodosController";

@Module({
  controllers: [
    AuthUserController,
    TodolistUserUsersMeController,
    TodolistUserUsersMeSessionsController,
    TodolistUserTodosController,
  ],
})
export class MyModule {}
