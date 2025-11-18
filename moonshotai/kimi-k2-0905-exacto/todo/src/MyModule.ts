import { Module } from "@nestjs/common";

import { AuthUserController } from "./controllers/auth/user/AuthUserController";
import { AuthGuestController } from "./controllers/auth/guest/AuthGuestController";
import { TodoappUserUsersController } from "./controllers/todoApp/user/users/TodoappUserUsersController";
import { TodoappUserTasksController } from "./controllers/todoApp/user/tasks/TodoappUserTasksController";
import { TodoappUserCategoriesController } from "./controllers/todoApp/user/categories/TodoappUserCategoriesController";
import { TodoappUserCategoriesTasksController } from "./controllers/todoApp/user/categories/tasks/TodoappUserCategoriesTasksController";
import { TodoappSearchTasksController } from "./controllers/todoApp/search/tasks/TodoappSearchTasksController";
import { TodoappDashboardController } from "./controllers/todoApp/dashboard/overview/TodoappDashboardController";
import { TodoappUserStatisticsCompletion_rateController } from "./controllers/todoApp/user/statistics/completion-rate/TodoappUserStatisticsCompletion_rateController";
import { TodoappUserStatisticsDaily_completionsController } from "./controllers/todoApp/user/statistics/daily-completions/TodoappUserStatisticsDaily_completionsController";
import { TodoappUserTasksBulk_completeController } from "./controllers/todoApp/user/tasks/bulk-complete/TodoappUserTasksBulk_completeController";
import { TodoappUserTasksBulk_deleteController } from "./controllers/todoApp/user/tasks/bulk-delete/TodoappUserTasksBulk_deleteController";
import { TodoappUserUserquotasUserController } from "./controllers/todoApp/user/userQuotas/user/TodoappUserUserquotasUserController";
import { TodoappUserTasksBulk_update_categoryController } from "./controllers/todoApp/user/tasks/bulk-update-category/TodoappUserTasksBulk_update_categoryController";
import { TodoappUserUserlimitsUserController } from "./controllers/todoApp/user/userLimits/user/TodoappUserUserlimitsUserController";
import { TodoappUserValidationrulesController } from "./controllers/todoApp/user/validationRules/TodoappUserValidationrulesController";
import { TodoappUserSystemsettingsController } from "./controllers/todoApp/user/systemSettings/TodoappUserSystemsettingsController";

@Module({
  controllers: [
    AuthUserController,
    AuthGuestController,
    TodoappUserUsersController,
    TodoappUserTasksController,
    TodoappUserCategoriesController,
    TodoappUserCategoriesTasksController,
    TodoappSearchTasksController,
    TodoappDashboardController,
    TodoappUserStatisticsCompletion_rateController,
    TodoappUserStatisticsDaily_completionsController,
    TodoappUserTasksBulk_completeController,
    TodoappUserTasksBulk_deleteController,
    TodoappUserUserquotasUserController,
    TodoappUserTasksBulk_update_categoryController,
    TodoappUserUserlimitsUserController,
    TodoappUserValidationrulesController,
    TodoappUserSystemsettingsController,
  ],
})
export class MyModule {}
