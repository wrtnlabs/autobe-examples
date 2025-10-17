import { Module } from "@nestjs/common";

import { AuthGuestController } from "./controllers/auth/guest/AuthGuestController";
import { AuthUserController } from "./controllers/auth/user/AuthUserController";
import { AuthUserChange_passwordController } from "./controllers/auth/user/change-password/AuthUserChange_passwordController";
import { AuthAdminController } from "./controllers/auth/admin/AuthAdminController";
import { AuthAdminPasswordResetController } from "./controllers/auth/admin/password/reset/AuthAdminPasswordResetController";
import { AuthAdminPasswordChangeController } from "./controllers/auth/admin/password/change/AuthAdminPasswordChangeController";
import { TodoappUserTodosController } from "./controllers/todoApp/user/todos/TodoappUserTodosController";
import { TodoappUserTodosVersionsController } from "./controllers/todoApp/user/todos/versions/TodoappUserTodosVersionsController";
import { TodoappAdminTodosVersionsController } from "./controllers/todoApp/admin/todos/versions/TodoappAdminTodosVersionsController";
import { TodoappAdminAuditrecordsController } from "./controllers/todoApp/admin/auditRecords/TodoappAdminAuditrecordsController";
import { TodoappAdminGuestsController } from "./controllers/todoApp/admin/guests/TodoappAdminGuestsController";
import { TodoappAdminUsersController } from "./controllers/todoApp/admin/users/TodoappAdminUsersController";
import { TodoappUserUsersController } from "./controllers/todoApp/user/users/TodoappUserUsersController";
import { TodoappAdminAdminsController } from "./controllers/todoApp/admin/admins/TodoappAdminAdminsController";

@Module({
  controllers: [
    AuthGuestController,
    AuthUserController,
    AuthUserChange_passwordController,
    AuthAdminController,
    AuthAdminPasswordResetController,
    AuthAdminPasswordChangeController,
    TodoappUserTodosController,
    TodoappUserTodosVersionsController,
    TodoappAdminTodosVersionsController,
    TodoappAdminAuditrecordsController,
    TodoappAdminGuestsController,
    TodoappAdminUsersController,
    TodoappUserUsersController,
    TodoappAdminAdminsController,
  ],
})
export class MyModule {}
