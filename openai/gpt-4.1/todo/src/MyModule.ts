import { Module } from "@nestjs/common";

import { AuthTodouserController } from "./controllers/auth/todoUser/AuthTodouserController";
import { TodolistTodouserTodousersController } from "./controllers/todoList/todoUser/todoUsers/TodolistTodouserTodousersController";
import { TodolistTodouserTodousersSessionsController } from "./controllers/todoList/todoUser/todoUsers/sessions/TodolistTodouserTodousersSessionsController";
import { TodolistTodouserTodosController } from "./controllers/todoList/todoUser/todos/TodolistTodouserTodosController";

@Module({
  controllers: [
    AuthTodouserController,
    TodolistTodouserTodousersController,
    TodolistTodouserTodousersSessionsController,
    TodolistTodouserTodosController,
  ],
})
export class MyModule {}
