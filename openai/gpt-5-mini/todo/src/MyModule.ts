import { Module } from "@nestjs/common";

import { AuthGuestController } from "./controllers/auth/guest/AuthGuestController";
import { AuthTodouserController } from "./controllers/auth/todoUser/AuthTodouserController";
import { AuthTodouserPasswordRequestController } from "./controllers/auth/todoUser/password/request/AuthTodouserPasswordRequestController";
import { AuthTodouserPasswordResetController } from "./controllers/auth/todoUser/password/reset/AuthTodouserPasswordResetController";
import { AuthTodouserPasswordController } from "./controllers/auth/todoUser/password/AuthTodouserPasswordController";
import { AuthTodouserMfaEnableController } from "./controllers/auth/todoUser/mfa/enable/AuthTodouserMfaEnableController";
import { AuthTodouserMfaDisableController } from "./controllers/auth/todoUser/mfa/disable/AuthTodouserMfaDisableController";
import { AuthTodouserRevokeController } from "./controllers/auth/todoUser/revoke/AuthTodouserRevokeController";
import { AuthAdminController } from "./controllers/auth/admin/AuthAdminController";
import { TodoappAdminSystemsettingsController } from "./controllers/todoApp/admin/systemSettings/TodoappAdminSystemsettingsController";
import { TodoappAdminFeatureflagsController } from "./controllers/todoApp/admin/featureFlags/TodoappAdminFeatureflagsController";
import { TodoappTodouserListsController } from "./controllers/todoApp/todoUser/lists/TodoappTodouserListsController";
import { TodoappListsController } from "./controllers/todoApp/lists/TodoappListsController";
import { TodoappAdminListsController } from "./controllers/todoApp/admin/lists/TodoappAdminListsController";
import { TodoappTodouserListsPublicindexpreferencesController } from "./controllers/todoApp/todoUser/lists/publicIndexPreferences/TodoappTodouserListsPublicindexpreferencesController";
import { TodoappAdminListsPublicindexpreferencesController } from "./controllers/todoApp/admin/lists/publicIndexPreferences/TodoappAdminListsPublicindexpreferencesController";
import { TodoappTodouserListsCollaboratorsController } from "./controllers/todoApp/todoUser/lists/collaborators/TodoappTodouserListsCollaboratorsController";
import { TodoappTodouserListsInvitationsController } from "./controllers/todoApp/todoUser/lists/invitations/TodoappTodouserListsInvitationsController";
import { TodoappTodouserInvitationsController } from "./controllers/todoApp/todoUser/invitations/accept/TodoappTodouserInvitationsController";
import { TodoappTodouserListsSharesController } from "./controllers/todoApp/todoUser/lists/shares/TodoappTodouserListsSharesController";
import { TodoappListsSharesController } from "./controllers/todoApp/lists/shares/TodoappListsSharesController";
import { TodoappAdminListsSharesController } from "./controllers/todoApp/admin/lists/shares/TodoappAdminListsSharesController";
import { TodoappListsTasksController } from "./controllers/todoApp/lists/tasks/TodoappListsTasksController";
import { TodoappTodouserListsTasksController } from "./controllers/todoApp/todoUser/lists/tasks/TodoappTodouserListsTasksController";
import { TodoappTodouserTasktagsController } from "./controllers/todoApp/todoUser/taskTags/TodoappTodouserTasktagsController";
import { TodoappTasktagsController } from "./controllers/todoApp/taskTags/TodoappTasktagsController";
import { TodoappAdminTasktagsController } from "./controllers/todoApp/admin/taskTags/TodoappAdminTasktagsController";
import { TodoappAdminTodousersController } from "./controllers/todoApp/admin/todoUsers/TodoappAdminTodousersController";
import { TodoappTodouserTodousersController } from "./controllers/todoApp/todoUser/todoUsers/TodoappTodouserTodousersController";
import { TodoappTodouserTodousersSessionsController } from "./controllers/todoApp/todoUser/todoUsers/sessions/TodoappTodouserTodousersSessionsController";
import { TodoappAdminAdminsController } from "./controllers/todoApp/admin/admins/TodoappAdminAdminsController";
import { TodoappAdminAdminsSessionsController } from "./controllers/todoApp/admin/admins/sessions/TodoappAdminAdminsSessionsController";
import { TodoappAdminGuestsController } from "./controllers/todoApp/admin/guests/TodoappAdminGuestsController";
import { TodoappAdminAuditlogsController } from "./controllers/todoApp/admin/auditLogs/TodoappAdminAuditlogsController";
import { TodoappAdminAdminactionsController } from "./controllers/todoApp/admin/adminActions/TodoappAdminAdminactionsController";
import { TodoappAdminActivitylogsController } from "./controllers/todoApp/admin/activityLogs/TodoappAdminActivitylogsController";
import { TodoappTodouserTasksSnapshotsController } from "./controllers/todoApp/todoUser/tasks/snapshots/TodoappTodouserTasksSnapshotsController";
import { TodoappTodouserTasksHistoryController } from "./controllers/todoApp/todoUser/tasks/history/TodoappTodouserTasksHistoryController";
import { TodoappAdminDashboardAdmin_overviewController } from "./controllers/todoApp/admin/dashboard/admin-overview/TodoappAdminDashboardAdmin_overviewController";
import { TodoappTodouserDashboardUser_overviewController } from "./controllers/todoApp/todoUser/dashboard/user-overview/TodoappTodouserDashboardUser_overviewController";
import { TodoappAdminStatisticsTask_completion_by_dayController } from "./controllers/todoApp/admin/statistics/task-completion-by-day/TodoappAdminStatisticsTask_completion_by_dayController";
import { TodoappTodouserSearchGlobalController } from "./controllers/todoApp/todoUser/search/global/TodoappTodouserSearchGlobalController";
import { TodoappAdminCollaborationpermissionsController } from "./controllers/todoApp/admin/collaborationPermissions/TodoappAdminCollaborationpermissionsController";

@Module({
  controllers: [
    AuthGuestController,
    AuthTodouserController,
    AuthTodouserPasswordRequestController,
    AuthTodouserPasswordResetController,
    AuthTodouserPasswordController,
    AuthTodouserMfaEnableController,
    AuthTodouserMfaDisableController,
    AuthTodouserRevokeController,
    AuthAdminController,
    TodoappAdminSystemsettingsController,
    TodoappAdminFeatureflagsController,
    TodoappTodouserListsController,
    TodoappListsController,
    TodoappAdminListsController,
    TodoappTodouserListsPublicindexpreferencesController,
    TodoappAdminListsPublicindexpreferencesController,
    TodoappTodouserListsCollaboratorsController,
    TodoappTodouserListsInvitationsController,
    TodoappTodouserInvitationsController,
    TodoappTodouserListsSharesController,
    TodoappListsSharesController,
    TodoappAdminListsSharesController,
    TodoappListsTasksController,
    TodoappTodouserListsTasksController,
    TodoappTodouserTasktagsController,
    TodoappTasktagsController,
    TodoappAdminTasktagsController,
    TodoappAdminTodousersController,
    TodoappTodouserTodousersController,
    TodoappTodouserTodousersSessionsController,
    TodoappAdminAdminsController,
    TodoappAdminAdminsSessionsController,
    TodoappAdminGuestsController,
    TodoappAdminAuditlogsController,
    TodoappAdminAdminactionsController,
    TodoappAdminActivitylogsController,
    TodoappTodouserTasksSnapshotsController,
    TodoappTodouserTasksHistoryController,
    TodoappAdminDashboardAdmin_overviewController,
    TodoappTodouserDashboardUser_overviewController,
    TodoappAdminStatisticsTask_completion_by_dayController,
    TodoappTodouserSearchGlobalController,
    TodoappAdminCollaborationpermissionsController,
  ],
})
export class MyModule {}
