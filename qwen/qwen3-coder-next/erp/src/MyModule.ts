import { Module } from "@nestjs/common";

import { HrmtrackerActivity_logsController } from "./controllers/hrmTracker/activity-logs/HrmtrackerActivity_logsController";
import { HrmtrackerAuthGuestController } from "./controllers/hrmTracker/auth/guest/HrmtrackerAuthGuestController";
import { HrmtrackerAuthMemberController } from "./controllers/hrmTracker/auth/member/HrmtrackerAuthMemberController";
import { HrmtrackerDepartmentsController } from "./controllers/hrmTracker/departments/HrmtrackerDepartmentsController";
import { HrmtrackerEmployeesController } from "./controllers/hrmTracker/employees/HrmtrackerEmployeesController";
import { HrmtrackerEmployeesHistoriesController } from "./controllers/hrmTracker/employees/histories/HrmtrackerEmployeesHistoriesController";
import { HrmtrackerEmployeesRole_changesController } from "./controllers/hrmTracker/employees/role-changes/HrmtrackerEmployeesRole_changesController";
import { HrmtrackerMemberAnalyticsActivitiesController } from "./controllers/hrmTracker/member/analytics/activities/HrmtrackerMemberAnalyticsActivitiesController";
import { HrmtrackerMemberAuditRole_changesController } from "./controllers/hrmTracker/member/audit/role-changes/HrmtrackerMemberAuditRole_changesController";
import { HrmtrackerMemberConfigsController } from "./controllers/hrmTracker/member/configs/HrmtrackerMemberConfigsController";
import { HrmtrackerMemberDashboardController } from "./controllers/hrmTracker/member/dashboard/HrmtrackerMemberDashboardController";
import { HrmtrackerMemberDepartmentsController } from "./controllers/hrmTracker/member/departments/HrmtrackerMemberDepartmentsController";
import { HrmtrackerMemberEmployeesController } from "./controllers/hrmTracker/member/employees/HrmtrackerMemberEmployeesController";
import { HrmtrackerMemberEmployeesRoleController } from "./controllers/hrmTracker/member/employees/role/HrmtrackerMemberEmployeesRoleController";
import { HrmtrackerMemberInvitationsController } from "./controllers/hrmTracker/member/invitations/HrmtrackerMemberInvitationsController";
import { HrmtrackerMemberOrganizationsController } from "./controllers/hrmTracker/member/organizations/HrmtrackerMemberOrganizationsController";
import { HrmtrackerMemberOrganizationsAnalyticsEmployeesController } from "./controllers/hrmTracker/member/organizations/analytics/employees/HrmtrackerMemberOrganizationsAnalyticsEmployeesController";
import { HrmtrackerMemberOrganizationsDashboardOverviewController } from "./controllers/hrmTracker/member/organizations/dashboard/overview/HrmtrackerMemberOrganizationsDashboardOverviewController";
import { HrmtrackerMemberOrganizationsStatus_historyController } from "./controllers/hrmTracker/member/organizations/status-history/HrmtrackerMemberOrganizationsStatus_historyController";
import { HrmtrackerMemberProfileController } from "./controllers/hrmTracker/member/profile/HrmtrackerMemberProfileController";
import { HrmtrackerMemberProjectsController } from "./controllers/hrmTracker/member/projects/HrmtrackerMemberProjectsController";
import { HrmtrackerMemberProjectsActivity_summaryController } from "./controllers/hrmTracker/member/projects/activity-summary/HrmtrackerMemberProjectsActivity_summaryController";
import { HrmtrackerMemberProjectsDashboardController } from "./controllers/hrmTracker/member/projects/dashboard/HrmtrackerMemberProjectsDashboardController";
import { HrmtrackerMemberProjectsProjectmembersController } from "./controllers/hrmTracker/member/projects/projectMembers/HrmtrackerMemberProjectsProjectmembersController";
import { HrmtrackerMemberProjectsStatus_changeController } from "./controllers/hrmTracker/member/projects/status-change/HrmtrackerMemberProjectsStatus_changeController";
import { HrmtrackerMemberProjectsTasksController } from "./controllers/hrmTracker/member/projects/tasks/HrmtrackerMemberProjectsTasksController";
import { HrmtrackerMemberProjectsTasksTaskhistoriesController } from "./controllers/hrmTracker/member/projects/tasks/taskHistories/HrmtrackerMemberProjectsTasksTaskhistoriesController";
import { HrmtrackerMemberProjectsTasksTimelineController } from "./controllers/hrmTracker/member/projects/tasks/timeline/HrmtrackerMemberProjectsTasksTimelineController";
import { HrmtrackerMemberRolesController } from "./controllers/hrmTracker/member/roles/HrmtrackerMemberRolesController";
import { HrmtrackerMemberRolesPermissionsController } from "./controllers/hrmTracker/member/roles/permissions/HrmtrackerMemberRolesPermissionsController";
import { HrmtrackerMemberSessionsController } from "./controllers/hrmTracker/member/sessions/HrmtrackerMemberSessionsController";
import { HrmtrackerMemberSettingsController } from "./controllers/hrmTracker/member/settings/HrmtrackerMemberSettingsController";
import { HrmtrackerMemberTimelogsController } from "./controllers/hrmTracker/member/timelogs/HrmtrackerMemberTimelogsController";
import { HrmtrackerMemberTimersStatusController } from "./controllers/hrmTracker/member/timers/status/HrmtrackerMemberTimersStatusController";
import { HrmtrackerMemberTimesheetsController } from "./controllers/hrmTracker/member/timesheets/HrmtrackerMemberTimesheetsController";
import { HrmtrackerMemberTimesheetsMetricsController } from "./controllers/hrmTracker/member/timesheets/metrics/HrmtrackerMemberTimesheetsMetricsController";
import { HrmtrackerMemberVersionsController } from "./controllers/hrmTracker/member/versions/HrmtrackerMemberVersionsController";
import { HrmtrackerRolesController } from "./controllers/hrmTracker/roles/HrmtrackerRolesController";

@Module({
  controllers: [
    HrmtrackerAuthGuestController,
    HrmtrackerAuthMemberController,
    HrmtrackerMemberProfileController,
    HrmtrackerMemberSessionsController,
    HrmtrackerMemberConfigsController,
    HrmtrackerMemberVersionsController,
    HrmtrackerMemberOrganizationsController,
    HrmtrackerMemberInvitationsController,
    HrmtrackerMemberSettingsController,
    HrmtrackerMemberEmployeesRoleController,
    HrmtrackerMemberRolesPermissionsController,
    HrmtrackerEmployeesController,
    HrmtrackerMemberEmployeesController,
    HrmtrackerRolesController,
    HrmtrackerMemberRolesController,
    HrmtrackerDepartmentsController,
    HrmtrackerMemberDepartmentsController,
    HrmtrackerEmployeesHistoriesController,
    HrmtrackerEmployeesRole_changesController,
    HrmtrackerMemberProjectsTasksController,
    HrmtrackerMemberProjectsController,
    HrmtrackerMemberProjectsProjectmembersController,
    HrmtrackerMemberProjectsTasksTaskhistoriesController,
    HrmtrackerMemberTimelogsController,
    HrmtrackerMemberTimesheetsController,
    HrmtrackerActivity_logsController,
    HrmtrackerMemberOrganizationsDashboardOverviewController,
    HrmtrackerMemberOrganizationsAnalyticsEmployeesController,
    HrmtrackerMemberAuditRole_changesController,
    HrmtrackerMemberOrganizationsStatus_historyController,
    HrmtrackerMemberProjectsActivity_summaryController,
    HrmtrackerMemberProjectsDashboardController,
    HrmtrackerMemberProjectsTasksTimelineController,
    HrmtrackerMemberProjectsStatus_changeController,
    HrmtrackerMemberTimesheetsMetricsController,
    HrmtrackerMemberAnalyticsActivitiesController,
    HrmtrackerMemberDashboardController,
    HrmtrackerMemberTimersStatusController,
  ],
})
export class MyModule {}
