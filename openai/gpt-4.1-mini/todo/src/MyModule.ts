import { Module } from "@nestjs/common";

import { AuthGuestController } from "./controllers/auth/guest/AuthGuestController";
import { AuthUserController } from "./controllers/auth/user/AuthUserController";
import { TodolistTodolistguestsController } from "./controllers/todoList/todoListGuests/TodolistTodolistguestsController";
import { TodolistUserTodolistguestsController } from "./controllers/todoList/user/todoListGuests/TodolistUserTodolistguestsController";
import { TodolistUserTodolistusersController } from "./controllers/todoList/user/todoListUsers/TodolistUserTodolistusersController";
import { TodolistUserTodolistusersessionsController } from "./controllers/todoList/user/todoListUserSessions/TodolistUserTodolistusersessionsController";
import { TodolistGuestTodolistusersessionsController } from "./controllers/todoList/guest/todoListUserSessions/TodolistGuestTodolistusersessionsController";
import { TodolistUserTodolisttodosController } from "./controllers/todoList/user/todoListTodos/TodolistUserTodolisttodosController";

@Module({
  controllers: [
    AuthGuestController,
    AuthUserController,
    TodolistTodolistguestsController,
    TodolistUserTodolistguestsController,
    TodolistUserTodolistusersController,
    TodolistUserTodolistusersessionsController,
    TodolistGuestTodolistusersessionsController,
    TodolistUserTodolisttodosController,
  ],
})
export class MyModule {}
