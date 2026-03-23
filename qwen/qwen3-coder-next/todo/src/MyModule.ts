import { Module } from "@nestjs/common";

import { TodoappAuthAdminController } from "./controllers/todoApp/auth/admin/TodoappAuthAdminController";
import { TodoappAuthGuestController } from "./controllers/todoApp/auth/guest/TodoappAuthGuestController";
import { TodoappAuthMemberController } from "./controllers/todoApp/auth/member/TodoappAuthMemberController";
import { TodoappMemberAnalyticsActivitiesController } from "./controllers/todoApp/member/analytics/activities/TodoappMemberAnalyticsActivitiesController";
import { TodoappMemberDashboardController } from "./controllers/todoApp/member/dashboard/TodoappMemberDashboardController";
import { TodoappMemberProfileController } from "./controllers/todoApp/member/profile/TodoappMemberProfileController";
import { TodoappMemberProfileMeController } from "./controllers/todoApp/member/profile/me/TodoappMemberProfileMeController";
import { TodoappMemberTodosController } from "./controllers/todoApp/member/todos/TodoappMemberTodosController";
import { TodoappMemberTodosEdit_historyController } from "./controllers/todoApp/member/todos/edit-history/TodoappMemberTodosEdit_historyController";
import { TodoappMemberTodosHistoryController } from "./controllers/todoApp/member/todos/history/TodoappMemberTodosHistoryController";
import { TodoappMemberTodosToggle_completeController } from "./controllers/todoApp/member/todos/toggle-complete/TodoappMemberTodosToggle_completeController";
import { TodoappMemberTrashController } from "./controllers/todoApp/member/trash/TodoappMemberTrashController";
import { TodoappMemberUsersMeController } from "./controllers/todoApp/member/users/me/TodoappMemberUsersMeController";

@Module({
  controllers: [
    TodoappAuthGuestController,
    TodoappAuthMemberController,
    TodoappAuthAdminController,
    TodoappMemberProfileMeController,
    TodoappMemberUsersMeController,
    TodoappMemberProfileController,
    TodoappMemberTodosToggle_completeController,
    TodoappMemberTrashController,
    TodoappMemberTodosController,
    TodoappMemberTodosHistoryController,
    TodoappMemberTodosEdit_historyController,
    TodoappMemberDashboardController,
    TodoappMemberAnalyticsActivitiesController,
  ],
})
export class MyModule {}
