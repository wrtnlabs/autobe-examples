import { Module } from "@nestjs/common";

import { AuthUserController } from "./controllers/auth/user/AuthUserController";
import { TodoappUserConfigurationsController } from "./controllers/todoApp/user/configurations/TodoappUserConfigurationsController";
import { TodoappUserConfigurationsValuesController } from "./controllers/todoApp/user/configurations/values/TodoappUserConfigurationsValuesController";
import { TodoappConfigurationsValuesController } from "./controllers/todoApp/configurations/values/TodoappConfigurationsValuesController";
import { TodoappUserConfigurationsSnapshotsController } from "./controllers/todoApp/user/configurations/snapshots/TodoappUserConfigurationsSnapshotsController";
import { TodoappUserSnapshotsController } from "./controllers/todoApp/user/snapshots/TodoappUserSnapshotsController";
import { TodoappUserUsersController } from "./controllers/todoApp/user/users/TodoappUserUsersController";
import { TodoappUserUsersSessionsController } from "./controllers/todoApp/user/users/sessions/TodoappUserUsersSessionsController";
import { TodoappUserTodosController } from "./controllers/todoApp/user/todos/TodoappUserTodosController";

@Module({
  controllers: [
    AuthUserController,
    TodoappUserConfigurationsController,
    TodoappUserConfigurationsValuesController,
    TodoappConfigurationsValuesController,
    TodoappUserConfigurationsSnapshotsController,
    TodoappUserSnapshotsController,
    TodoappUserUsersController,
    TodoappUserUsersSessionsController,
    TodoappUserTodosController,
  ],
})
export class MyModule {}
