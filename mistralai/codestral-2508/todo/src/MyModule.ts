import { Module } from "@nestjs/common";

import { AuthUserController } from "./controllers/auth/user/AuthUserController";
import { AuthUserPasswordRequest_resetController } from "./controllers/auth/user/password/request-reset/AuthUserPasswordRequest_resetController";
import { AuthUserPasswordResetController } from "./controllers/auth/user/password/reset/AuthUserPasswordResetController";
import { AuthUserVerificationRequestController } from "./controllers/auth/user/verification/request/AuthUserVerificationRequestController";
import { TodolistUserUsersController } from "./controllers/todoList/user/users/TodolistUserUsersController";
import { TodolistUsersSessionsController } from "./controllers/todoList/users/sessions/TodolistUsersSessionsController";
import { TodolistUserUsersSessionsController } from "./controllers/todoList/user/users/sessions/TodolistUserUsersSessionsController";
import { TodolistUserTodosController } from "./controllers/todoList/user/todos/TodolistUserTodosController";

@Module({
  controllers: [
    AuthUserController,
    AuthUserPasswordRequest_resetController,
    AuthUserPasswordResetController,
    AuthUserVerificationRequestController,
    TodolistUserUsersController,
    TodolistUsersSessionsController,
    TodolistUserUsersSessionsController,
    TodolistUserTodosController,
  ],
})
export class MyModule {}
