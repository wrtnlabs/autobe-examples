import { Module } from "@nestjs/common";

import { AuthUserController } from "./controllers/auth/user/AuthUserController";
import { AuthUserPasswordRequest_resetController } from "./controllers/auth/user/password/request-reset/AuthUserPasswordRequest_resetController";
import { AuthAdminController } from "./controllers/auth/admin/AuthAdminController";
import { AuthAdminPasswordReset_tokenController } from "./controllers/auth/admin/password/reset-token/AuthAdminPasswordReset_tokenController";
import { TodolistUsersController } from "./controllers/todoList/users/TodolistUsersController";
import { TodolistAdminUsersController } from "./controllers/todoList/admin/users/TodolistAdminUsersController";
import { TodolistAdminUsersSessionsController } from "./controllers/todoList/admin/users/sessions/TodolistAdminUsersSessionsController";
import { TodolistAdminAdminsController } from "./controllers/todoList/admin/admins/TodolistAdminAdminsController";
import { TodolistAdminAdminsSessionsController } from "./controllers/todoList/admin/admins/sessions/TodolistAdminAdminsSessionsController";
import { TodolistUserUsersPasswordresettokensController } from "./controllers/todoList/user/users/passwordResetTokens/TodolistUserUsersPasswordresettokensController";
import { TodolistAdminUsersPasswordresettokensController } from "./controllers/todoList/admin/users/passwordResetTokens/TodolistAdminUsersPasswordresettokensController";
import { TodolistUserTodosController } from "./controllers/todoList/user/todos/TodolistUserTodosController";
import { TodolistAdminTodosAdminauditlogsController } from "./controllers/todoList/admin/todos/adminAuditLogs/TodolistAdminTodosAdminauditlogsController";

@Module({
  controllers: [
    AuthUserController,
    AuthUserPasswordRequest_resetController,
    AuthAdminController,
    AuthAdminPasswordReset_tokenController,
    TodolistUsersController,
    TodolistAdminUsersController,
    TodolistAdminUsersSessionsController,
    TodolistAdminAdminsController,
    TodolistAdminAdminsSessionsController,
    TodolistUserUsersPasswordresettokensController,
    TodolistAdminUsersPasswordresettokensController,
    TodolistUserTodosController,
    TodolistAdminTodosAdminauditlogsController,
  ],
})
export class MyModule {}
