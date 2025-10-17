import { Module } from "@nestjs/common";

import { AuthGuestController } from "./controllers/auth/guest/AuthGuestController";
import { AuthUserController } from "./controllers/auth/user/AuthUserController";
import { AuthUserPasswordController } from "./controllers/auth/user/password/AuthUserPasswordController";
import { TodolistAuthController } from "./controllers/todoList/auth/TodolistAuthController";
import { TodolistAuthTokenController } from "./controllers/todoList/auth/token/refresh/TodolistAuthTokenController";
import { TodolistAuthVerify_emailController } from "./controllers/todoList/auth/verify-email/TodolistAuthVerify_emailController";
import { TodolistAuthPassword_resetController } from "./controllers/todoList/auth/password-reset/TodolistAuthPassword_resetController";
import { TodolistUserAuthUserController } from "./controllers/todoList/user/auth/user/logout/TodolistUserAuthUserController";
import { TodolistUserAuthUserPasswordController } from "./controllers/todoList/user/auth/user/password/TodolistUserAuthUserPasswordController";
import { TodolistUserAuthUserProfileController } from "./controllers/todoList/user/auth/user/profile/TodolistUserAuthUserProfileController";
import { TodolistUserAuthUserSessionsController } from "./controllers/todoList/user/auth/user/sessions/TodolistUserAuthUserSessionsController";
import { TodolistUserAuthUserAccountController } from "./controllers/todoList/user/auth/user/account/TodolistUserAuthUserAccountController";
import { TodolistUserTodosController } from "./controllers/todoList/user/todos/TodolistUserTodosController";

@Module({
  controllers: [
    AuthGuestController,
    AuthUserController,
    AuthUserPasswordController,
    TodolistAuthController,
    TodolistAuthTokenController,
    TodolistAuthVerify_emailController,
    TodolistAuthPassword_resetController,
    TodolistUserAuthUserController,
    TodolistUserAuthUserPasswordController,
    TodolistUserAuthUserProfileController,
    TodolistUserAuthUserSessionsController,
    TodolistUserAuthUserAccountController,
    TodolistUserTodosController,
  ],
})
export class MyModule {}
