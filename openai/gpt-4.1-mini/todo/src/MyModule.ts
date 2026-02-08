import { Module } from "@nestjs/common";

import { MultiusertodoAuthUserController } from "./controllers/multiUserTodo/auth/user/MultiusertodoAuthUserController";
import { MultiusertodoUserCompletionToggleController } from "./controllers/multiUserTodo/user/completion/toggle/MultiusertodoUserCompletionToggleController";
import { MultiusertodoUserEmail_verificationsController } from "./controllers/multiUserTodo/user/email-verifications/MultiusertodoUserEmail_verificationsController";
import { MultiusertodoUserPassword_resetsController } from "./controllers/multiUserTodo/user/password-resets/MultiusertodoUserPassword_resetsController";
import { MultiusertodoUserProfileController } from "./controllers/multiUserTodo/user/profile/MultiusertodoUserProfileController";
import { MultiusertodoUserSessionsController } from "./controllers/multiUserTodo/user/sessions/MultiusertodoUserSessionsController";
import { MultiusertodoUserTodosController } from "./controllers/multiUserTodo/user/todos/MultiusertodoUserTodosController";
import { MultiusertodoUserTodosEdithistoriesController } from "./controllers/multiUserTodo/user/todos/editHistories/MultiusertodoUserTodosEdithistoriesController";
import { MultiusertodoUserTrashController } from "./controllers/multiUserTodo/user/trash/MultiusertodoUserTrashController";
import { MultiusertodoUsersController } from "./controllers/multiUserTodo/users/MultiusertodoUsersController";

@Module({
  controllers: [
    MultiusertodoAuthUserController,
    MultiusertodoUsersController,
    MultiusertodoUserProfileController,
    MultiusertodoUserSessionsController,
    MultiusertodoUserPassword_resetsController,
    MultiusertodoUserEmail_verificationsController,
    MultiusertodoUserTodosController,
    MultiusertodoUserTodosEdithistoriesController,
    MultiusertodoUserTrashController,
    MultiusertodoUserCompletionToggleController,
  ],
})
export class MyModule {}
