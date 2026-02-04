import { Module } from "@nestjs/common";

import { TodoappAuthUserController } from "./controllers/todoApp/auth/user/TodoappAuthUserController";
import { TodoappUserEmail_verificationsController } from "./controllers/todoApp/user/email-verifications/TodoappUserEmail_verificationsController";
import { TodoappUserPassword_resetsController } from "./controllers/todoApp/user/password-resets/TodoappUserPassword_resetsController";
import { TodoappUserProfileController } from "./controllers/todoApp/user/profile/TodoappUserProfileController";
import { TodoappUserSessionsController } from "./controllers/todoApp/user/sessions/TodoappUserSessionsController";
import { TodoappUserTodosController } from "./controllers/todoApp/user/todos/TodoappUserTodosController";

@Module({
  controllers: [
    TodoappAuthUserController,
    TodoappUserProfileController,
    TodoappUserSessionsController,
    TodoappUserEmail_verificationsController,
    TodoappUserPassword_resetsController,
    TodoappUserTodosController,
  ],
})
export class MyModule {}
