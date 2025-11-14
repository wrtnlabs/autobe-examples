import { Module } from "@nestjs/common";

import { AuthUserController } from "./controllers/auth/user/AuthUserController";
import { AuthAdminController } from "./controllers/auth/admin/AuthAdminController";
import { TodoappUsersController } from "./controllers/todoApp/users/TodoappUsersController";
import { TodoappUserUsersController } from "./controllers/todoApp/user/users/TodoappUserUsersController";
import { TodoappAdminUsersController } from "./controllers/todoApp/admin/users/TodoappAdminUsersController";
import { TodoappAdminAdminsController } from "./controllers/todoApp/admin/admins/TodoappAdminAdminsController";
import { TodoappUserTodosController } from "./controllers/todoApp/user/todos/TodoappUserTodosController";
import { TodoappAdminTodosController } from "./controllers/todoApp/admin/todos/TodoappAdminTodosController";
import { TodoappAdminAuditAuthlogsController } from "./controllers/todoApp/admin/audit/authLogs/TodoappAdminAuditAuthlogsController";
import { TodoappAdminAuditAuditlogsController } from "./controllers/todoApp/admin/audit/auditLogs/TodoappAdminAuditAuditlogsController";

@Module({
  controllers: [
    AuthUserController,
    AuthAdminController,
    TodoappUsersController,
    TodoappUserUsersController,
    TodoappAdminUsersController,
    TodoappAdminAdminsController,
    TodoappUserTodosController,
    TodoappAdminTodosController,
    TodoappAdminAuditAuthlogsController,
    TodoappAdminAuditAuditlogsController,
  ],
})
export class MyModule {}
