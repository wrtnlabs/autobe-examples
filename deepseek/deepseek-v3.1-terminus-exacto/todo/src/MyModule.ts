import { Module } from "@nestjs/common";

import { AuthUserController } from "./controllers/auth/user/AuthUserController";
import { AuthAdminController } from "./controllers/auth/admin/AuthAdminController";
import { TodolistAdminSystemconfigsController } from "./controllers/todoList/admin/systemConfigs/TodolistAdminSystemconfigsController";
import { TodolistAdminUsersController } from "./controllers/todoList/admin/users/TodolistAdminUsersController";
import { TodolistUserUsersController } from "./controllers/todoList/user/users/TodolistUserUsersController";
import { TodolistAdminUsersSessionsController } from "./controllers/todoList/admin/users/sessions/TodolistAdminUsersSessionsController";
import { TodolistAdminUsersDeletionlogsController } from "./controllers/todoList/admin/users/deletionLogs/TodolistAdminUsersDeletionlogsController";
import { TodolistAdminAdminsController } from "./controllers/todoList/admin/admins/TodolistAdminAdminsController";
import { TodolistAdminAdminsSessionsController } from "./controllers/todoList/admin/admins/sessions/TodolistAdminAdminsSessionsController";
import { TodolistAdminAdminsDeletionlogsController } from "./controllers/todoList/admin/admins/deletionLogs/TodolistAdminAdminsDeletionlogsController";
import { TodolistAdminAuditlogsController } from "./controllers/todoList/admin/auditLogs/TodolistAdminAuditlogsController";
import { TodolistUserTodosController } from "./controllers/todoList/user/todos/TodolistUserTodosController";

@Module({
  controllers: [
    AuthUserController,
    AuthAdminController,
    TodolistAdminSystemconfigsController,
    TodolistAdminUsersController,
    TodolistUserUsersController,
    TodolistAdminUsersSessionsController,
    TodolistAdminUsersDeletionlogsController,
    TodolistAdminAdminsController,
    TodolistAdminAdminsSessionsController,
    TodolistAdminAdminsDeletionlogsController,
    TodolistAdminAuditlogsController,
    TodolistUserTodosController,
  ],
})
export class MyModule {}
