import { Module } from "@nestjs/common";

import { AuthUserController } from "./controllers/auth/user/AuthUserController";
import { TodoappUserAuthSessionsController } from "./controllers/todoApp/user/auth/sessions/TodoappUserAuthSessionsController";
import { TodoappAuthUsersSessionsController } from "./controllers/todoApp/auth/users/sessions/TodoappAuthUsersSessionsController";
import { TodoappUserAuthUsersController } from "./controllers/todoApp/user/auth/users/TodoappUserAuthUsersController";
import { TodoappUserAuthProfileController } from "./controllers/todoApp/user/auth/profile/TodoappUserAuthProfileController";
import { TodoappUserAuthUsersProfileController } from "./controllers/todoApp/user/auth/users/profile/TodoappUserAuthUsersProfileController";
import { TodoappUserAuthUsersSecurityController } from "./controllers/todoApp/user/auth/users/security/TodoappUserAuthUsersSecurityController";
import { TodoappUserAuthUsersActivityController } from "./controllers/todoApp/user/auth/users/activity/TodoappUserAuthUsersActivityController";
import { TodoappUserTasksController } from "./controllers/todoApp/user/tasks/TodoappUserTasksController";
import { TodoappUserTasksnapshotsController } from "./controllers/todoApp/user/taskSnapshots/TodoappUserTasksnapshotsController";
import { TodoappConfigurationsController } from "./controllers/todoApp/configurations/TodoappConfigurationsController";
import { TodoappUserConfigurationsController } from "./controllers/todoApp/user/configurations/TodoappUserConfigurationsController";

@Module({
  controllers: [
    AuthUserController,
    TodoappUserAuthSessionsController,
    TodoappAuthUsersSessionsController,
    TodoappUserAuthUsersController,
    TodoappUserAuthProfileController,
    TodoappUserAuthUsersProfileController,
    TodoappUserAuthUsersSecurityController,
    TodoappUserAuthUsersActivityController,
    TodoappUserTasksController,
    TodoappUserTasksnapshotsController,
    TodoappConfigurationsController,
    TodoappUserConfigurationsController,
  ],
})
export class MyModule {}
