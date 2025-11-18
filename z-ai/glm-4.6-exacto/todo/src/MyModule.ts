import { Module } from "@nestjs/common";

import { AuthUserController } from "./controllers/auth/user/AuthUserController";
import { AuthAdminController } from "./controllers/auth/admin/AuthAdminController";
import { TodoappAdminUsersController } from "./controllers/todoApp/admin/users/TodoappAdminUsersController";
import { TodoappUserUsersController } from "./controllers/todoApp/user/users/TodoappUserUsersController";
import { TodoappAdminUsersSessionsController } from "./controllers/todoApp/admin/users/sessions/TodoappAdminUsersSessionsController";
import { TodoappAdminAdminsController } from "./controllers/todoApp/admin/admins/TodoappAdminAdminsController";
import { TodoappAdminAdminsSessionsController } from "./controllers/todoApp/admin/admins/sessions/TodoappAdminAdminsSessionsController";
import { TodoappUserTodosController } from "./controllers/todoApp/user/todos/TodoappUserTodosController";
import { TodoappAdminTodosController } from "./controllers/todoApp/admin/todos/TodoappAdminTodosController";
import { TodoappUserTodosBulkController } from "./controllers/todoApp/user/todos/bulk/TodoappUserTodosBulkController";

@Module({
  controllers: [
    AuthUserController,
    AuthAdminController,
    TodoappAdminUsersController,
    TodoappUserUsersController,
    TodoappAdminUsersSessionsController,
    TodoappAdminAdminsController,
    TodoappAdminAdminsSessionsController,
    TodoappUserTodosController,
    TodoappAdminTodosController,
    TodoappUserTodosBulkController,
  ],
})
export class MyModule {}
