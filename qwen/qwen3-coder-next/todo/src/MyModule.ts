import { Module } from "@nestjs/common";

import { TodoappAuthUserController } from "./controllers/todoApp/auth/user/TodoappAuthUserController";
import { TodoappEmail_verificationsController } from "./controllers/todoApp/email-verifications/TodoappEmail_verificationsController";
import { TodoappPassword_resetsController } from "./controllers/todoApp/password-resets/TodoappPassword_resetsController";
import { TodoappSessionsController } from "./controllers/todoApp/sessions/TodoappSessionsController";
import { TodoappUserTodosController } from "./controllers/todoApp/user/todos/TodoappUserTodosController";
import { TodoappUserTrashController } from "./controllers/todoApp/user/trash/TodoappUserTrashController";
import { TodoappUsersController } from "./controllers/todoApp/users/TodoappUsersController";

@Module({
  controllers: [
    TodoappAuthUserController,
    TodoappUsersController,
    TodoappSessionsController,
    TodoappPassword_resetsController,
    TodoappEmail_verificationsController,
    TodoappUserTodosController,
    TodoappUserTrashController,
  ],
})
export class MyModule {}
