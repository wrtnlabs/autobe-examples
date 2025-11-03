import { Module } from "@nestjs/common";

import { AuthUserController } from "./controllers/auth/user/AuthUserController";
import { AuthUserPasswordController } from "./controllers/auth/user/password/AuthUserPasswordController";
import { AuthUserSessionsExpireController } from "./controllers/auth/user/sessions/expire/AuthUserSessionsExpireController";
import { TodoUserTodosController } from "./controllers/todo/user/todos/TodoUserTodosController";
import { TodoUserTodosCompletionController } from "./controllers/todo/user/todos/completion/TodoUserTodosCompletionController";
import { TodoUserAuditeventsController } from "./controllers/todo/user/auditEvents/TodoUserAuditeventsController";
import { TodoUserReportsPersonaldataController } from "./controllers/todo/user/reports/personalData/TodoUserReportsPersonaldataController";
import { TodoUserUsersController } from "./controllers/todo/user/users/TodoUserUsersController";

@Module({
  controllers: [
    AuthUserController,
    AuthUserPasswordController,
    AuthUserSessionsExpireController,
    TodoUserTodosController,
    TodoUserTodosCompletionController,
    TodoUserAuditeventsController,
    TodoUserReportsPersonaldataController,
    TodoUserUsersController,
  ],
})
export class MyModule {}
