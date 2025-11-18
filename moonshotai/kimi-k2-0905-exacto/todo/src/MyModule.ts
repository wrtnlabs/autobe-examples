import { Module } from "@nestjs/common";

import { AuthUserController } from "./controllers/auth/user/AuthUserController";
import { AuthAdminController } from "./controllers/auth/admin/AuthAdminController";
import { TodolistAdminSystemsettingsController } from "./controllers/todoList/admin/systemSettings/TodolistAdminSystemsettingsController";
import { TodolistAdminUsersController } from "./controllers/todoList/admin/users/TodolistAdminUsersController";
import { TodolistUserUsersController } from "./controllers/todoList/user/users/TodolistUserUsersController";
import { TodolistAdminUsersSessionsController } from "./controllers/todoList/admin/users/sessions/TodolistAdminUsersSessionsController";
import { TodolistAdminAdminsController } from "./controllers/todoList/admin/admins/TodolistAdminAdminsController";
import { TodolistAdminAdminsSessionsController } from "./controllers/todoList/admin/admins/sessions/TodolistAdminAdminsSessionsController";
import { TodolistUserTodosController } from "./controllers/todoList/user/todos/TodolistUserTodosController";
import { TodolistAdminTodosController } from "./controllers/todoList/admin/todos/TodolistAdminTodosController";
import { TodolistAdminTodosAuditlogsController } from "./controllers/todoList/admin/todos/auditLogs/TodolistAdminTodosAuditlogsController";

@Module({
  controllers: [
    AuthUserController,
    AuthAdminController,
    TodolistAdminSystemsettingsController,
    TodolistAdminUsersController,
    TodolistUserUsersController,
    TodolistAdminUsersSessionsController,
    TodolistAdminAdminsController,
    TodolistAdminAdminsSessionsController,
    TodolistUserTodosController,
    TodolistAdminTodosController,
    TodolistAdminTodosAuditlogsController,
  ],
})
export class MyModule {}
