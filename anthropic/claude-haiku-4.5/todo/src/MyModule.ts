import { Module } from "@nestjs/common";

import { AuthGuestController } from "./controllers/auth/guest/AuthGuestController";
import { AuthUserController } from "./controllers/auth/user/AuthUserController";
import { AuthUserPasswordReset_requestController } from "./controllers/auth/user/password/reset-request/AuthUserPasswordReset_requestController";
import { AuthUserPasswordReset_confirmController } from "./controllers/auth/user/password/reset-confirm/AuthUserPasswordReset_confirmController";
import { TodolistUserAuthUserController } from "./controllers/todoList/user/auth/user/logout/TodolistUserAuthUserController";
import { TodolistUserAuthUserLogout_all_devicesController } from "./controllers/todoList/user/auth/user/logout-all-devices/TodolistUserAuthUserLogout_all_devicesController";
import { TodolistUserAuthUserProfileController } from "./controllers/todoList/user/auth/user/profile/TodolistUserAuthUserProfileController";
import { TodolistUserAuthUserSessionsController } from "./controllers/todoList/user/auth/user/sessions/TodolistUserAuthUserSessionsController";
import { TodolistUserAuthUserVerify_tokenController } from "./controllers/todoList/user/auth/user/verify-token/TodolistUserAuthUserVerify_tokenController";
import { TodolistAuthGuestController } from "./controllers/todoList/auth/guest/logout/TodolistAuthGuestController";
import { TodolistUserTodosController } from "./controllers/todoList/user/todos/TodolistUserTodosController";
import { TodolistUserSystemconfigurationsController } from "./controllers/todoList/user/systemConfigurations/TodolistUserSystemconfigurationsController";
import { TodolistSystemconfigurationsController } from "./controllers/todoList/systemConfigurations/TodolistSystemconfigurationsController";

@Module({
  controllers: [
    AuthGuestController,
    AuthUserController,
    AuthUserPasswordReset_requestController,
    AuthUserPasswordReset_confirmController,
    TodolistUserAuthUserController,
    TodolistUserAuthUserLogout_all_devicesController,
    TodolistUserAuthUserProfileController,
    TodolistUserAuthUserSessionsController,
    TodolistUserAuthUserVerify_tokenController,
    TodolistAuthGuestController,
    TodolistUserTodosController,
    TodolistUserSystemconfigurationsController,
    TodolistSystemconfigurationsController,
  ],
})
export class MyModule {}
