import { Module } from "@nestjs/common";

import { AuthGuestController } from "./controllers/auth/guest/AuthGuestController";
import { AuthUserController } from "./controllers/auth/user/AuthUserController";
import { TodolistUserTodolistusersController } from "./controllers/todoList/user/todoListUsers/TodolistUserTodolistusersController";
import { TodolistUserTodolistusersTodolistusersessionsController } from "./controllers/todoList/user/todoListUsers/todoListUserSessions/TodolistUserTodolistusersTodolistusersessionsController";
import { TodolistUserTodolisttasksController } from "./controllers/todoList/user/todoListTasks/TodolistUserTodolisttasksController";

@Module({
  controllers: [
    AuthGuestController,
    AuthUserController,
    TodolistUserTodolistusersController,
    TodolistUserTodolistusersTodolistusersessionsController,
    TodolistUserTodolisttasksController,
  ],
})
export class MyModule {}
