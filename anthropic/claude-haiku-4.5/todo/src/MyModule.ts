import { Module } from "@nestjs/common";

import { AuthUserController } from "./controllers/auth/user/AuthUserController";
import { AuthAdminController } from "./controllers/auth/admin/AuthAdminController";
import { TodoappUserTodosController } from "./controllers/todoApp/user/todos/TodoappUserTodosController";
import { TodoappAdminAuditlogsController } from "./controllers/todoApp/admin/auditLogs/TodoappAdminAuditlogsController";
import { TodoappAdminAlertsController } from "./controllers/todoApp/admin/alerts/TodoappAdminAlertsController";
import { TodoappSystemsettingsController } from "./controllers/todoApp/systemSettings/TodoappSystemsettingsController";
import { TodoappAdminSystemsettingsController } from "./controllers/todoApp/admin/systemSettings/TodoappAdminSystemsettingsController";
import { TodoappAdminSystemhealthController } from "./controllers/todoApp/admin/systemHealth/TodoappAdminSystemhealthController";
import { TodoappAdminStatisticsUsersController } from "./controllers/todoApp/admin/statistics/users/TodoappAdminStatisticsUsersController";
import { TodoappStatisticsTodosController } from "./controllers/todoApp/statistics/todos/TodoappStatisticsTodosController";
import { TodoappStatisticsEngagementController } from "./controllers/todoApp/statistics/engagement/TodoappStatisticsEngagementController";

@Module({
  controllers: [
    AuthUserController,
    AuthAdminController,
    TodoappUserTodosController,
    TodoappAdminAuditlogsController,
    TodoappAdminAlertsController,
    TodoappSystemsettingsController,
    TodoappAdminSystemsettingsController,
    TodoappAdminSystemhealthController,
    TodoappAdminStatisticsUsersController,
    TodoappStatisticsTodosController,
    TodoappStatisticsEngagementController,
  ],
})
export class MyModule {}
