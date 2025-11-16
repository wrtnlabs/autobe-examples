import { Module } from "@nestjs/common";

import { AuthGuestController } from "./controllers/auth/guest/AuthGuestController";
import { AuthUserController } from "./controllers/auth/user/AuthUserController";
import { AuthUserEmailVerifyController } from "./controllers/auth/user/email/verify/AuthUserEmailVerifyController";
import { AuthUserPasswordResetRequestController } from "./controllers/auth/user/password/reset/request/AuthUserPasswordResetRequestController";
import { AuthUserPasswordResetConfirmController } from "./controllers/auth/user/password/reset/confirm/AuthUserPasswordResetConfirmController";
import { AuthUserPasswordChangeController } from "./controllers/auth/user/password/change/AuthUserPasswordChangeController";
import { AuthAdminController } from "./controllers/auth/admin/AuthAdminController";
import { TodolistUserUsersController } from "./controllers/todoList/user/users/TodolistUserUsersController";
import { TodolistAdminUsersController } from "./controllers/todoList/admin/users/TodolistAdminUsersController";
import { TodolistUserUsersSessionsController } from "./controllers/todoList/user/users/sessions/TodolistUserUsersSessionsController";
import { TodolistAdminUsersSessionsController } from "./controllers/todoList/admin/users/sessions/TodolistAdminUsersSessionsController";
import { TodolistAdminAdminsController } from "./controllers/todoList/admin/admins/TodolistAdminAdminsController";
import { TodolistAdminAdminsSessionsController } from "./controllers/todoList/admin/admins/sessions/TodolistAdminAdminsSessionsController";
import { TodolistUserUsersEmailverificationsController } from "./controllers/todoList/user/users/emailVerifications/TodolistUserUsersEmailverificationsController";
import { TodolistAdminUsersEmailverificationsController } from "./controllers/todoList/admin/users/emailVerifications/TodolistAdminUsersEmailverificationsController";
import { TodolistUserUsersPasswordresetsController } from "./controllers/todoList/user/users/passwordResets/TodolistUserUsersPasswordresetsController";
import { TodolistAdminUsersPasswordresetsController } from "./controllers/todoList/admin/users/passwordResets/TodolistAdminUsersPasswordresetsController";
import { TodolistAdminGuestsController } from "./controllers/todoList/admin/guests/TodolistAdminGuestsController";
import { TodolistUserTodosController } from "./controllers/todoList/user/todos/TodolistUserTodosController";
import { TodolistUserTodosStatisticsController } from "./controllers/todoList/user/todos/statistics/TodolistUserTodosStatisticsController";

@Module({
  controllers: [
    AuthGuestController,
    AuthUserController,
    AuthUserEmailVerifyController,
    AuthUserPasswordResetRequestController,
    AuthUserPasswordResetConfirmController,
    AuthUserPasswordChangeController,
    AuthAdminController,
    TodolistUserUsersController,
    TodolistAdminUsersController,
    TodolistUserUsersSessionsController,
    TodolistAdminUsersSessionsController,
    TodolistAdminAdminsController,
    TodolistAdminAdminsSessionsController,
    TodolistUserUsersEmailverificationsController,
    TodolistAdminUsersEmailverificationsController,
    TodolistUserUsersPasswordresetsController,
    TodolistAdminUsersPasswordresetsController,
    TodolistAdminGuestsController,
    TodolistUserTodosController,
    TodolistUserTodosStatisticsController,
  ],
})
export class MyModule {}
