import { Module } from "@nestjs/common";

import { AuthUserController } from "./controllers/auth/user/AuthUserController";
import { AuthAdminController } from "./controllers/auth/admin/AuthAdminController";
import { TodoappAuthRegisterController } from "./controllers/todoApp/auth/register/TodoappAuthRegisterController";
import { TodoappAuthLoginController } from "./controllers/todoApp/auth/login/TodoappAuthLoginController";
import { TodoappUserAuthController } from "./controllers/todoApp/user/auth/TodoappUserAuthController";
import { TodoappAuthPassword_resetController } from "./controllers/todoApp/auth/password-reset/TodoappAuthPassword_resetController";
import { TodoappUserAuthChange_passwordController } from "./controllers/todoApp/user/auth/change-password/TodoappUserAuthChange_passwordController";
import { TodoappAdminUsersController } from "./controllers/todoApp/admin/users/TodoappAdminUsersController";
import { TodoappUsersController } from "./controllers/todoApp/users/TodoappUsersController";
import { TodoappUserUsersController } from "./controllers/todoApp/user/users/TodoappUserUsersController";
import { TodoappUsersMeController } from "./controllers/todoApp/users/me/TodoappUsersMeController";
import { TodoappUserTodosController } from "./controllers/todoApp/user/todos/TodoappUserTodosController";
import { TodoappUserDashboardController } from "./controllers/todoApp/user/dashboard/TodoappUserDashboardController";
import { TodoappAdminStatisticsController } from "./controllers/todoApp/admin/statistics/TodoappAdminStatisticsController";
import { TodoappAdminBackupsController } from "./controllers/todoApp/admin/backups/TodoappAdminBackupsController";
import { TodoappUserSessionsController } from "./controllers/todoApp/user/sessions/TodoappUserSessionsController";
import { TodoappAdminSessionsController } from "./controllers/todoApp/admin/sessions/TodoappAdminSessionsController";

@Module({
  controllers: [
    AuthUserController,
    AuthAdminController,
    TodoappAuthRegisterController,
    TodoappAuthLoginController,
    TodoappUserAuthController,
    TodoappAuthPassword_resetController,
    TodoappUserAuthChange_passwordController,
    TodoappAdminUsersController,
    TodoappUsersController,
    TodoappUserUsersController,
    TodoappUsersMeController,
    TodoappUserTodosController,
    TodoappUserDashboardController,
    TodoappAdminStatisticsController,
    TodoappAdminBackupsController,
    TodoappUserSessionsController,
    TodoappAdminSessionsController,
  ],
})
export class MyModule {}
