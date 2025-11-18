import { Module } from "@nestjs/common";

import { AuthUserController } from "./controllers/auth/user/AuthUserController";
import { AuthGuestController } from "./controllers/auth/guest/AuthGuestController";
import { TodolistUserTodo_list_usersController } from "./controllers/todoList/user/todo-list-users/TodolistUserTodo_list_usersController";
import { TodolistGuestTodo_list_usersController } from "./controllers/todoList/guest/todo-list-users/TodolistGuestTodo_list_usersController";
import { TodolistTodo_list_usersController } from "./controllers/todoList/todo-list-users/TodolistTodo_list_usersController";
import { TodolistGuestTodo_list_guestsController } from "./controllers/todoList/guest/todo-list-guests/TodolistGuestTodo_list_guestsController";
import { TodolistUserTodo_list_guestsController } from "./controllers/todoList/user/todo-list-guests/TodolistUserTodo_list_guestsController";
import { TodolistTodo_list_guestsController } from "./controllers/todoList/todo-list-guests/TodolistTodo_list_guestsController";
import { TodolistUserTodoitemsController } from "./controllers/todoList/user/todoItems/TodolistUserTodoitemsController";

@Module({
  controllers: [
    AuthUserController,
    AuthGuestController,
    TodolistUserTodo_list_usersController,
    TodolistGuestTodo_list_usersController,
    TodolistTodo_list_usersController,
    TodolistGuestTodo_list_guestsController,
    TodolistUserTodo_list_guestsController,
    TodolistTodo_list_guestsController,
    TodolistUserTodoitemsController,
  ],
})
export class MyModule {}
