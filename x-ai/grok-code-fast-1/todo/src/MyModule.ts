import { Module } from "@nestjs/common";

import { AuthUserController } from "./controllers/auth/user/AuthUserController";
import { AuthAdminController } from "./controllers/auth/admin/AuthAdminController";
import { TodolistUserUsersController } from "./controllers/todoList/user/users/TodolistUserUsersController";
import { TodolistAdminUsersController } from "./controllers/todoList/admin/users/TodolistAdminUsersController";
import { TodolistUserUsersSessionsController } from "./controllers/todoList/user/users/sessions/TodolistUserUsersSessionsController";
import { TodolistAdminUsersSessionsController } from "./controllers/todoList/admin/users/sessions/TodolistAdminUsersSessionsController";
import { TodolistAdminAdminsController } from "./controllers/todoList/admin/admins/TodolistAdminAdminsController";
import { TodolistAdminAdminsSessionsController } from "./controllers/todoList/admin/admins/sessions/TodolistAdminAdminsSessionsController";
import { TodolistUserTodosController } from "./controllers/todoList/user/todos/TodolistUserTodosController";
import { TodolistAdminTodosController } from "./controllers/todoList/admin/todos/TodolistAdminTodosController";
import { TodolistAdminAuditlogsController } from "./controllers/todoList/admin/auditLogs/TodolistAdminAuditlogsController";
import { TodolistAdminSystemsettingsController } from "./controllers/todoList/admin/systemSettings/TodolistAdminSystemsettingsController";

@Module({
  controllers: [
    AuthUserController,
    AuthAdminController,
    TodolistUserUsersController,
    TodolistAdminUsersController,
    TodolistUserUsersSessionsController,
    TodolistAdminUsersSessionsController,
    TodolistAdminAdminsController,
    TodolistAdminAdminsSessionsController,
    TodolistUserTodosController,
    TodolistAdminTodosController,
    TodolistAdminAuditlogsController,
    TodolistAdminSystemsettingsController,
  ],
})
export class MyModule {}
