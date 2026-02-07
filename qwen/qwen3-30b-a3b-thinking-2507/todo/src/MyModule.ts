import { Module } from "@nestjs/common";

import { TodoAudit_logsController } from "./controllers/todo/audit-logs/TodoAudit_logsController";
import { TodoAuthUserController } from "./controllers/todo/auth/user/TodoAuthUserController";
import { TodoSystem_configsController } from "./controllers/todo/system-configs/TodoSystem_configsController";
import { TodoUserEmail_verificationsController } from "./controllers/todo/user/email-verifications/TodoUserEmail_verificationsController";
import { TodoUserPassword_resetsController } from "./controllers/todo/user/password-resets/TodoUserPassword_resetsController";
import { TodoUserProfileController } from "./controllers/todo/user/profile/TodoUserProfileController";
import { TodoUserSessionsController } from "./controllers/todo/user/sessions/TodoUserSessionsController";
import { TodoUserTodosController } from "./controllers/todo/user/todos/TodoUserTodosController";
import { TodoUserTodosHistoriesController } from "./controllers/todo/user/todos/histories/TodoUserTodosHistoriesController";
import { TodoUserTrashController } from "./controllers/todo/user/trash/TodoUserTrashController";

@Module({
  controllers: [
    TodoAuthUserController,
    TodoUserProfileController,
    TodoUserSessionsController,
    TodoUserPassword_resetsController,
    TodoUserEmail_verificationsController,
    TodoUserTodosController,
    TodoUserTodosHistoriesController,
    TodoSystem_configsController,
    TodoAudit_logsController,
    TodoUserTrashController,
  ],
})
export class MyModule {}
