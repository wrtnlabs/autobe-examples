import { Module } from "@nestjs/common";

import { AuthUserController } from "./controllers/auth/user/AuthUserController";
import { AuthUserPasswordResetController } from "./controllers/auth/user/password/reset/AuthUserPasswordResetController";
import { AuthUserPasswordResetConfirmController } from "./controllers/auth/user/password/reset/confirm/AuthUserPasswordResetConfirmController";
import { AuthGuestController } from "./controllers/auth/guest/AuthGuestController";
import { TodoUserConfigurationsController } from "./controllers/todo/user/configurations/TodoUserConfigurationsController";
import { TodoUserConfigurationController } from "./controllers/todo/user/configuration/TodoUserConfigurationController";
import { TodoConfigurationsController } from "./controllers/todo/configurations/TodoConfigurationsController";
import { TodoUserUser_tasksController } from "./controllers/todo/user/user-tasks/TodoUserUser_tasksController";
import { UsersTasksController } from "./controllers/users/tasks/UsersTasksController";
import { TodoUserTasksController } from "./controllers/todo/user/tasks/TodoUserTasksController";
import { TodoUserUsersController } from "./controllers/todo/user/users/TodoUserUsersController";
import { TodoUserUsersSessionsController } from "./controllers/todo/user/users/sessions/TodoUserUsersSessionsController";
import { TodoUserUsersTasksController } from "./controllers/todo/user/users/tasks/TodoUserUsersTasksController";
import { TodoGuestsController } from "./controllers/todo/guests/TodoGuestsController";
import { TodoGuestGuestsSessionsController } from "./controllers/todo/guest/guests/sessions/TodoGuestGuestsSessionsController";
import { TodoUserGuestsController } from "./controllers/todo/user/guests/TodoUserGuestsController";
import { TodoGuestsSessionsController } from "./controllers/todo/guests/sessions/TodoGuestsSessionsController";
import { TodoUserTodoTasksController } from "./controllers/todo/user/todo/tasks/TodoUserTodoTasksController";

@Module({
  controllers: [
    AuthUserController,
    AuthUserPasswordResetController,
    AuthUserPasswordResetConfirmController,
    AuthGuestController,
    TodoUserConfigurationsController,
    TodoUserConfigurationController,
    TodoConfigurationsController,
    TodoUserUser_tasksController,
    UsersTasksController,
    TodoUserTasksController,
    TodoUserUsersController,
    TodoUserUsersSessionsController,
    TodoUserUsersTasksController,
    TodoGuestsController,
    TodoGuestGuestsSessionsController,
    TodoUserGuestsController,
    TodoGuestsSessionsController,
    TodoUserTodoTasksController,
  ],
})
export class MyModule {}
