import { Module } from "@nestjs/common";

import { HrmplatformAdminActivity_logsController } from "./controllers/hrmPlatform/admin/activity-logs/HrmplatformAdminActivity_logsController";
import { HrmplatformAdminActivity_logsChangesController } from "./controllers/hrmPlatform/admin/activity-logs/changes/HrmplatformAdminActivity_logsChangesController";
import { HrmplatformAdminDepartmentsController } from "./controllers/hrmPlatform/admin/departments/HrmplatformAdminDepartmentsController";
import { HrmplatformAdminEmployeesController } from "./controllers/hrmPlatform/admin/employees/HrmplatformAdminEmployeesController";
import { HrmplatformAdminInvitationsController } from "./controllers/hrmPlatform/admin/invitations/HrmplatformAdminInvitationsController";
import { HrmplatformAdminOrganization_dashboardController } from "./controllers/hrmPlatform/admin/organization-dashboard/HrmplatformAdminOrganization_dashboardController";
import { HrmplatformAdminOrganizationsController } from "./controllers/hrmPlatform/admin/organizations/HrmplatformAdminOrganizationsController";
import { HrmplatformAdminOrganizationsLogoController } from "./controllers/hrmPlatform/admin/organizations/logo/HrmplatformAdminOrganizationsLogoController";
import { HrmplatformAdminOrganizationsSettingsController } from "./controllers/hrmPlatform/admin/organizations/settings/HrmplatformAdminOrganizationsSettingsController";
import { HrmplatformAdminProject_budget_reportsController } from "./controllers/hrmPlatform/admin/project-budget-reports/HrmplatformAdminProject_budget_reportsController";
import { HrmplatformAdminProjectsTasksController } from "./controllers/hrmPlatform/admin/projects/tasks/HrmplatformAdminProjectsTasksController";
import { HrmplatformAdminRolesController } from "./controllers/hrmPlatform/admin/roles/HrmplatformAdminRolesController";
import { HrmplatformAdminRolesPermissionsController } from "./controllers/hrmPlatform/admin/roles/permissions/HrmplatformAdminRolesPermissionsController";
import { HrmplatformAdminSnapshotsController } from "./controllers/hrmPlatform/admin/snapshots/HrmplatformAdminSnapshotsController";
import { HrmplatformAdminTask_historiesController } from "./controllers/hrmPlatform/admin/task-histories/HrmplatformAdminTask_historiesController";
import { HrmplatformAdminTask_snapshotsController } from "./controllers/hrmPlatform/admin/task-snapshots/HrmplatformAdminTask_snapshotsController";
import { HrmplatformAdminTasksController } from "./controllers/hrmPlatform/admin/tasks/HrmplatformAdminTasksController";
import { HrmplatformAdminTime_reportsController } from "./controllers/hrmPlatform/admin/time-reports/HrmplatformAdminTime_reportsController";
import { HrmplatformAdminTimelogsController } from "./controllers/hrmPlatform/admin/timelogs/HrmplatformAdminTimelogsController";
import { HrmplatformAdminTimersController } from "./controllers/hrmPlatform/admin/timers/HrmplatformAdminTimersController";
import { HrmplatformAdminTimesheet_snapshotsController } from "./controllers/hrmPlatform/admin/timesheet-snapshots/HrmplatformAdminTimesheet_snapshotsController";
import { HrmplatformAdminTimesheetsController } from "./controllers/hrmPlatform/admin/timesheets/HrmplatformAdminTimesheetsController";
import { HrmplatformAdminWeekly_summary_reportsController } from "./controllers/hrmPlatform/admin/weekly-summary-reports/HrmplatformAdminWeekly_summary_reportsController";
import { HrmplatformAuthAdminController } from "./controllers/hrmPlatform/auth/admin/HrmplatformAuthAdminController";
import { HrmplatformAuthGuestController } from "./controllers/hrmPlatform/auth/guest/HrmplatformAuthGuestController";
import { HrmplatformAuthMemberController } from "./controllers/hrmPlatform/auth/member/HrmplatformAuthMemberController";
import { HrmplatformContractsController } from "./controllers/hrmPlatform/contracts/HrmplatformContractsController";
import { HrmplatformContractsSnapshotsController } from "./controllers/hrmPlatform/contracts/snapshots/HrmplatformContractsSnapshotsController";
import { HrmplatformGuestSessionsController } from "./controllers/hrmPlatform/guest/sessions/HrmplatformGuestSessionsController";
import { HrmplatformMemberActivity_logsController } from "./controllers/hrmPlatform/member/activity-logs/HrmplatformMemberActivity_logsController";
import { HrmplatformMemberActivity_logsChangesController } from "./controllers/hrmPlatform/member/activity-logs/changes/HrmplatformMemberActivity_logsChangesController";
import { HrmplatformMemberDepartmentsController } from "./controllers/hrmPlatform/member/departments/HrmplatformMemberDepartmentsController";
import { HrmplatformMemberEmployeesController } from "./controllers/hrmPlatform/member/employees/HrmplatformMemberEmployeesController";
import { HrmplatformMemberOrganizationsController } from "./controllers/hrmPlatform/member/organizations/HrmplatformMemberOrganizationsController";
import { HrmplatformMemberOrganizationsLogoController } from "./controllers/hrmPlatform/member/organizations/logo/HrmplatformMemberOrganizationsLogoController";
import { HrmplatformMemberOrganizationsSettingsController } from "./controllers/hrmPlatform/member/organizations/settings/HrmplatformMemberOrganizationsSettingsController";
import { HrmplatformMemberPersonal_dashboardController } from "./controllers/hrmPlatform/member/personal-dashboard/HrmplatformMemberPersonal_dashboardController";
import { HrmplatformMemberProfileController } from "./controllers/hrmPlatform/member/profile/HrmplatformMemberProfileController";
import { HrmplatformMemberProjectsController } from "./controllers/hrmPlatform/member/projects/HrmplatformMemberProjectsController";
import { HrmplatformMemberProjectsBudget_reportController } from "./controllers/hrmPlatform/member/projects/budget-report/HrmplatformMemberProjectsBudget_reportController";
import { HrmplatformMemberProjectsMembershipsController } from "./controllers/hrmPlatform/member/projects/memberships/HrmplatformMemberProjectsMembershipsController";
import { HrmplatformMemberProjectsMy_projectsController } from "./controllers/hrmPlatform/member/projects/my-projects/HrmplatformMemberProjectsMy_projectsController";
import { HrmplatformMemberProjectsSnapshotsController } from "./controllers/hrmPlatform/member/projects/snapshots/HrmplatformMemberProjectsSnapshotsController";
import { HrmplatformMemberProjectsTasksController } from "./controllers/hrmPlatform/member/projects/tasks/HrmplatformMemberProjectsTasksController";
import { HrmplatformMemberProjectsTeam_activityController } from "./controllers/hrmPlatform/member/projects/team-activity/HrmplatformMemberProjectsTeam_activityController";
import { HrmplatformMemberTask_historiesController } from "./controllers/hrmPlatform/member/task-histories/HrmplatformMemberTask_historiesController";
import { HrmplatformMemberTask_snapshotsController } from "./controllers/hrmPlatform/member/task-snapshots/HrmplatformMemberTask_snapshotsController";
import { HrmplatformMemberTasksController } from "./controllers/hrmPlatform/member/tasks/HrmplatformMemberTasksController";
import { HrmplatformMemberTimelogsController } from "./controllers/hrmPlatform/member/timelogs/HrmplatformMemberTimelogsController";
import { HrmplatformMemberTimersController } from "./controllers/hrmPlatform/member/timers/HrmplatformMemberTimersController";
import { HrmplatformMemberTimesheet_snapshotsController } from "./controllers/hrmPlatform/member/timesheet-snapshots/HrmplatformMemberTimesheet_snapshotsController";
import { HrmplatformMemberTimesheetsController } from "./controllers/hrmPlatform/member/timesheets/HrmplatformMemberTimesheetsController";
import { HrmplatformOrganizationsController } from "./controllers/hrmPlatform/organizations/HrmplatformOrganizationsController";

@Module({
  controllers: [
    HrmplatformAuthGuestController,
    HrmplatformAuthMemberController,
    HrmplatformAuthAdminController,
    HrmplatformMemberProfileController,
    HrmplatformGuestSessionsController,
    HrmplatformOrganizationsController,
    HrmplatformMemberOrganizationsController,
    HrmplatformAdminOrganizationsController,
    HrmplatformMemberOrganizationsSettingsController,
    HrmplatformAdminOrganizationsSettingsController,
    HrmplatformMemberOrganizationsLogoController,
    HrmplatformAdminOrganizationsLogoController,
    HrmplatformMemberEmployeesController,
    HrmplatformAdminEmployeesController,
    HrmplatformAdminSnapshotsController,
    HrmplatformMemberDepartmentsController,
    HrmplatformAdminDepartmentsController,
    HrmplatformAdminInvitationsController,
    HrmplatformAdminRolesController,
    HrmplatformAdminRolesPermissionsController,
    HrmplatformContractsController,
    HrmplatformContractsSnapshotsController,
    HrmplatformMemberProjectsController,
    HrmplatformMemberProjectsSnapshotsController,
    HrmplatformMemberProjectsMembershipsController,
    HrmplatformMemberTasksController,
    HrmplatformAdminTasksController,
    HrmplatformMemberProjectsTasksController,
    HrmplatformAdminProjectsTasksController,
    HrmplatformMemberTask_snapshotsController,
    HrmplatformAdminTask_snapshotsController,
    HrmplatformMemberTask_historiesController,
    HrmplatformAdminTask_historiesController,
    HrmplatformMemberTimersController,
    HrmplatformAdminTimersController,
    HrmplatformMemberTimelogsController,
    HrmplatformAdminTimelogsController,
    HrmplatformMemberTimesheetsController,
    HrmplatformAdminTimesheetsController,
    HrmplatformMemberTimesheet_snapshotsController,
    HrmplatformAdminTimesheet_snapshotsController,
    HrmplatformAdminActivity_logsController,
    HrmplatformMemberActivity_logsController,
    HrmplatformAdminActivity_logsChangesController,
    HrmplatformMemberActivity_logsChangesController,
    HrmplatformMemberPersonal_dashboardController,
    HrmplatformAdminOrganization_dashboardController,
    HrmplatformAdminTime_reportsController,
    HrmplatformAdminProject_budget_reportsController,
    HrmplatformAdminWeekly_summary_reportsController,
    HrmplatformMemberProjectsMy_projectsController,
    HrmplatformMemberProjectsBudget_reportController,
    HrmplatformMemberProjectsTeam_activityController,
  ],
})
export class MyModule {}
