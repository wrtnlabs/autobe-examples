import { Module } from "@nestjs/common";

import { AuthGuestController } from "./controllers/auth/guest/AuthGuestController";
import { AuthUserController } from "./controllers/auth/user/AuthUserController";
import { AuthUserPasswordResetRequestController } from "./controllers/auth/user/password/reset/request/AuthUserPasswordResetRequestController";
import { AuthUserPasswordResetCompleteController } from "./controllers/auth/user/password/reset/complete/AuthUserPasswordResetCompleteController";
import { AuthUserPasswordChangeController } from "./controllers/auth/user/password/change/AuthUserPasswordChangeController";
import { TodolistUserUsersController } from "./controllers/todoList/user/users/TodolistUserUsersController";
import { TodolistUserUsersSessionsController } from "./controllers/todoList/user/users/sessions/TodolistUserUsersSessionsController";
import { TodolistUserPasswordresettokensController } from "./controllers/todoList/user/passwordResetTokens/TodolistUserPasswordresettokensController";
import { TodolistPasswordresettokensController } from "./controllers/todoList/passwordResetTokens/TodolistPasswordresettokensController";
import { TodolistUserTodosController } from "./controllers/todoList/user/todos/TodolistUserTodosController";
import { TodolistUserCategoriesController } from "./controllers/todoList/user/categories/TodolistUserCategoriesController";

@Module({
  controllers: [
    AuthGuestController,
    AuthUserController,
    AuthUserPasswordResetRequestController,
    AuthUserPasswordResetCompleteController,
    AuthUserPasswordChangeController,
    TodolistUserUsersController,
    TodolistUserUsersSessionsController,
    TodolistUserPasswordresettokensController,
    TodolistPasswordresettokensController,
    TodolistUserTodosController,
    TodolistUserCategoriesController,
  ],
})
export class MyModule {}
