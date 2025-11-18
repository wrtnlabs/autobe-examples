import { Module } from "@nestjs/common";

import { AuthTodolistmemberController } from "./controllers/auth/todoListMember/AuthTodolistmemberController";
import { TodolistTodolistmemberActorsMeController } from "./controllers/todoList/todoListMember/actors/me/TodolistTodolistmemberActorsMeController";
import { TodolistTodolistmemberActorsMeSessionsController } from "./controllers/todoList/todoListMember/actors/me/sessions/TodolistTodolistmemberActorsMeSessionsController";
import { TodolistTodolistmemberTodosController } from "./controllers/todoList/todoListMember/todos/TodolistTodolistmemberTodosController";

@Module({
  controllers: [
    AuthTodolistmemberController,
    TodolistTodolistmemberActorsMeController,
    TodolistTodolistmemberActorsMeSessionsController,
    TodolistTodolistmemberTodosController,
  ],
})
export class MyModule {}
