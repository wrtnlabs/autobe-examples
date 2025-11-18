import { Module } from "@nestjs/common";

import { AuthUserController } from "./controllers/auth/user/AuthUserController";
import { AuthUserPasswordReset_requestController } from "./controllers/auth/user/password/reset-request/AuthUserPasswordReset_requestController";
import { AuthUserPasswordReset_completeController } from "./controllers/auth/user/password/reset-complete/AuthUserPasswordReset_completeController";
import { AuthUserPasswordChangeController } from "./controllers/auth/user/password/change/AuthUserPasswordChangeController";
import { TodoUserUsersController } from "./controllers/todo/user/users/TodoUserUsersController";
import { TodoUsersSessionsController } from "./controllers/todo/users/sessions/TodoUsersSessionsController";
import { TodoUserTodosController } from "./controllers/todo/user/todos/TodoUserTodosController";

@Module({
  controllers: [
    AuthUserController,
    AuthUserPasswordReset_requestController,
    AuthUserPasswordReset_completeController,
    AuthUserPasswordChangeController,
    TodoUserUsersController,
    TodoUsersSessionsController,
    TodoUserTodosController,
  ],
})
export class MyModule {}
