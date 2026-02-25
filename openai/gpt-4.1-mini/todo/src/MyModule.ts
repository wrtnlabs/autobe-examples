import { Module } from "@nestjs/common";

import { MultiusertodoAuthUserController } from "./controllers/multiUserTodo/auth/user/MultiusertodoAuthUserController";
import { MultiusertodoUserEmail_verificationsController } from "./controllers/multiUserTodo/user/email-verifications/MultiusertodoUserEmail_verificationsController";
import { MultiusertodoUserPassword_resetsController } from "./controllers/multiUserTodo/user/password-resets/MultiusertodoUserPassword_resetsController";
import { MultiusertodoUserProfileController } from "./controllers/multiUserTodo/user/profile/MultiusertodoUserProfileController";
import { MultiusertodoUserSessionsController } from "./controllers/multiUserTodo/user/sessions/MultiusertodoUserSessionsController";
import { MultiusertodoUserTodosController } from "./controllers/multiUserTodo/user/todos/MultiusertodoUserTodosController";
import { MultiusertodoUserTodosEdithistoriesController } from "./controllers/multiUserTodo/user/todos/editHistories/MultiusertodoUserTodosEdithistoriesController";
import { MultiusertodoUserUsersController } from "./controllers/multiUserTodo/user/users/MultiusertodoUserUsersController";

@Module({
  controllers: [
    MultiusertodoAuthUserController,
    MultiusertodoUserUsersController,
    MultiusertodoUserProfileController,
    MultiusertodoUserSessionsController,
    MultiusertodoUserPassword_resetsController,
    MultiusertodoUserEmail_verificationsController,
    MultiusertodoUserTodosController,
    MultiusertodoUserTodosEdithistoriesController,
  ],
})
export class MyModule {}
