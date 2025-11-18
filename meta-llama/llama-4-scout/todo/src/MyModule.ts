import { Module } from "@nestjs/common";

import { AuthUserController } from "./controllers/auth/user/AuthUserController";
import { AuthUserVerify_emailController } from "./controllers/auth/user/verify-email/AuthUserVerify_emailController";
import { AuthUserRequest_password_resetController } from "./controllers/auth/user/request-password-reset/AuthUserRequest_password_resetController";
import { AuthUserReset_passwordController } from "./controllers/auth/user/reset-password/AuthUserReset_passwordController";
import { AuthUserChange_passwordController } from "./controllers/auth/user/change-password/AuthUserChange_passwordController";
import { AuthUserErase_accountController } from "./controllers/auth/user/erase-account/AuthUserErase_accountController";
import { TodolistUserUsersMeController } from "./controllers/todoList/user/users/me/TodolistUserUsersMeController";
import { TodolistUserUsersMeSessionsController } from "./controllers/todoList/user/users/me/sessions/TodolistUserUsersMeSessionsController";
import { TodolistUserUsersMeEmailverificationsController } from "./controllers/todoList/user/users/me/emailVerifications/TodolistUserUsersMeEmailverificationsController";
import { TodolistUserUsersMePasswordresetsController } from "./controllers/todoList/user/users/me/passwordResets/TodolistUserUsersMePasswordresetsController";
import { TodolistUserTodosController } from "./controllers/todoList/user/todos/TodolistUserTodosController";

@Module({
  controllers: [
    AuthUserController,
    AuthUserVerify_emailController,
    AuthUserRequest_password_resetController,
    AuthUserReset_passwordController,
    AuthUserChange_passwordController,
    AuthUserErase_accountController,
    TodolistUserUsersMeController,
    TodolistUserUsersMeSessionsController,
    TodolistUserUsersMeEmailverificationsController,
    TodolistUserUsersMePasswordresetsController,
    TodolistUserTodosController,
  ],
})
export class MyModule {}
