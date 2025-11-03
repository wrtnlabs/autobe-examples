import { Module } from "@nestjs/common";

import { AuthUserController } from "./controllers/auth/user/AuthUserController";
import { AuthUserPasswordResetController } from "./controllers/auth/user/password/reset/AuthUserPasswordResetController";
import { AuthUserPasswordChangeController } from "./controllers/auth/user/password/change/AuthUserPasswordChangeController";
import { TodoappUserConfigurationsController } from "./controllers/todoApp/user/configurations/TodoappUserConfigurationsController";
import { TodoappConfigurationsController } from "./controllers/todoApp/configurations/TodoappConfigurationsController";
import { TodoappUserUsersController } from "./controllers/todoApp/user/users/TodoappUserUsersController";
import { TodoappUserUsersTodosController } from "./controllers/todoApp/user/users/todos/TodoappUserUsersTodosController";
import { TodoappUserUsersSessionsController } from "./controllers/todoApp/user/users/sessions/TodoappUserUsersSessionsController";
import { TodoappAuthController } from "./controllers/todoApp/auth/login/TodoappAuthController";
import { TodoappUserAuthController } from "./controllers/todoApp/user/auth/logout/TodoappUserAuthController";
import { TodoappAuthRegisterController } from "./controllers/todoApp/auth/register/TodoappAuthRegisterController";

@Module({
  controllers: [
    AuthUserController,
    AuthUserPasswordResetController,
    AuthUserPasswordChangeController,
    TodoappUserConfigurationsController,
    TodoappConfigurationsController,
    TodoappUserUsersController,
    TodoappUserUsersTodosController,
    TodoappUserUsersSessionsController,
    TodoappAuthController,
    TodoappUserAuthController,
    TodoappAuthRegisterController,
  ],
})
export class MyModule {}
