import { Module } from "@nestjs/common";

import { AuthUserController } from "./controllers/auth/user/AuthUserController";
import { TodoappUserUsersController } from "./controllers/todoApp/user/users/TodoappUserUsersController";
import { TodoappUserUsersSessionsController } from "./controllers/todoApp/user/users/sessions/TodoappUserUsersSessionsController";
import { TodoappUserUsersTasksController } from "./controllers/todoApp/user/users/tasks/TodoappUserUsersTasksController";
import { TodoappUserTasksController } from "./controllers/todoApp/user/tasks/TodoappUserTasksController";
import { TodoappUserTasksStatisticsController } from "./controllers/todoApp/user/tasks/statistics/TodoappUserTasksStatisticsController";
import { TodoappUserDashboardUser_progressController } from "./controllers/todoApp/user/dashboard/user-progress/TodoappUserDashboardUser_progressController";
import { TodoappUserTasksBulkController } from "./controllers/todoApp/user/tasks/bulk/TodoappUserTasksBulkController";

@Module({
  controllers: [
    AuthUserController,
    TodoappUserUsersController,
    TodoappUserUsersSessionsController,
    TodoappUserUsersTasksController,
    TodoappUserTasksController,
    TodoappUserTasksStatisticsController,
    TodoappUserDashboardUser_progressController,
    TodoappUserTasksBulkController,
  ],
})
export class MyModule {}
