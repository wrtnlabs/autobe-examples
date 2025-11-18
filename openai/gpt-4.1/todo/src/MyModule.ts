import { Module } from "@nestjs/common";

import { AuthUserController } from "./controllers/auth/user/AuthUserController";
import { AuthUserEmailVerifyController } from "./controllers/auth/user/email/verify/AuthUserEmailVerifyController";
import { AuthUserPasswordResetRequestController } from "./controllers/auth/user/password/reset/request/AuthUserPasswordResetRequestController";
import { AuthUserPasswordResetController } from "./controllers/auth/user/password/reset/AuthUserPasswordResetController";
import { TodolistUserUsersController } from "./controllers/todoList/user/users/TodolistUserUsersController";
import { TodolistUsersSessionsController } from "./controllers/todoList/users/sessions/TodolistUsersSessionsController";
import { TodolistUserTodosController } from "./controllers/todoList/user/todos/TodolistUserTodosController";

@Module({
  controllers: [
    AuthUserController,
    AuthUserEmailVerifyController,
    AuthUserPasswordResetRequestController,
    AuthUserPasswordResetController,
    TodolistUserUsersController,
    TodolistUsersSessionsController,
    TodolistUserTodosController,
  ],
})
export class MyModule {}
