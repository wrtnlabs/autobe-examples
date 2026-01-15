import { Module } from "@nestjs/common";

import { AuthMemberController } from "./controllers/auth/member/AuthMemberController";
import { MyTodosController } from "./controllers/my/todos/MyTodosController";
import { TodolistUserUsersController } from "./controllers/todoList/user/users/TodolistUserUsersController";
import { TodolistUserSessionsController } from "./controllers/todoList/user/sessions/TodolistUserSessionsController";
import { TodolistUserTodosController } from "./controllers/todoList/user/todos/TodolistUserTodosController";

@Module({
  controllers: [
    AuthMemberController,
    MyTodosController,
    TodolistUserUsersController,
    TodolistUserSessionsController,
    TodolistUserTodosController,
  ],
})
export class MyModule {}
