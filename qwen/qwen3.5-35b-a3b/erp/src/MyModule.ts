import { Module } from "@nestjs/common";

import { HrmplatformAuthGuestController } from "./controllers/hrmPlatform/auth/guest/HrmplatformAuthGuestController";
import { HrmplatformAuthMemberController } from "./controllers/hrmPlatform/auth/member/HrmplatformAuthMemberController";
import { HrmplatformGuestSessionsController } from "./controllers/hrmPlatform/guest/sessions/HrmplatformGuestSessionsController";
import { HrmplatformGuestsController } from "./controllers/hrmPlatform/guests/HrmplatformGuestsController";
import { HrmplatformMemberActivity_logsController } from "./controllers/hrmPlatform/member/activity-logs/HrmplatformMemberActivity_logsController";
import { HrmplatformMemberContractsController } from "./controllers/hrmPlatform/member/contracts/HrmplatformMemberContractsController";
import { HrmplatformMemberContractsSnapshotsController } from "./controllers/hrmPlatform/member/contracts/snapshots/HrmplatformMemberContractsSnapshotsController";
import { HrmplatformMemberContractsSummaryController } from "./controllers/hrmPlatform/member/contracts/summary/HrmplatformMemberContractsSummaryController";
import { HrmplatformMemberDashboardController } from "./controllers/hrmPlatform/member/dashboard/HrmplatformMemberDashboardController";
import { HrmplatformMemberDepartmentsController } from "./controllers/hrmPlatform/member/departments/analytics/HrmplatformMemberDepartmentsController";
import { HrmplatformMemberEmail_verificationsController } from "./controllers/hrmPlatform/member/email-verifications/HrmplatformMemberEmail_verificationsController";
import { HrmplatformMemberEmployeesController } from "./controllers/hrmPlatform/member/employees/HrmplatformMemberEmployeesController";
import { HrmplatformMemberEmployeesSnapshotsController } from "./controllers/hrmPlatform/member/employees/snapshots/HrmplatformMemberEmployeesSnapshotsController";
import { HrmplatformMemberOrganizationsController } from "./controllers/hrmPlatform/member/organizations/HrmplatformMemberOrganizationsController";
import { HrmplatformMemberOrganizationsDepartmentsController } from "./controllers/hrmPlatform/member/organizations/departments/HrmplatformMemberOrganizationsDepartmentsController";
import { HrmplatformMemberOrganizationsDepartmentsSnapshotsController } from "./controllers/hrmPlatform/member/organizations/departments/snapshots/HrmplatformMemberOrganizationsDepartmentsSnapshotsController";
import { HrmplatformMemberOrganizationsFilesController } from "./controllers/hrmPlatform/member/organizations/files/HrmplatformMemberOrganizationsFilesController";
import { HrmplatformMemberOrganizationsSnapshotsController } from "./controllers/hrmPlatform/member/organizations/snapshots/HrmplatformMemberOrganizationsSnapshotsController";
import { HrmplatformMemberPassword_resetsController } from "./controllers/hrmPlatform/member/password-resets/HrmplatformMemberPassword_resetsController";
import { HrmplatformMemberProfileController } from "./controllers/hrmPlatform/member/profile/HrmplatformMemberProfileController";
import { HrmplatformMemberProjectsController } from "./controllers/hrmPlatform/member/projects/HrmplatformMemberProjectsController";
import { HrmplatformMemberProjectsAnalyticsController } from "./controllers/hrmPlatform/member/projects/analytics/HrmplatformMemberProjectsAnalyticsController";
import { HrmplatformMemberProjectsMembershipsController } from "./controllers/hrmPlatform/member/projects/memberships/HrmplatformMemberProjectsMembershipsController";
import { HrmplatformMemberRolesController } from "./controllers/hrmPlatform/member/roles/HrmplatformMemberRolesController";
import { HrmplatformMemberRolesPermissionsController } from "./controllers/hrmPlatform/member/roles/permissions/HrmplatformMemberRolesPermissionsController";
import { HrmplatformMemberTask_historiesController } from "./controllers/hrmPlatform/member/task-histories/HrmplatformMemberTask_historiesController";
import { HrmplatformMemberTasksController } from "./controllers/hrmPlatform/member/tasks/HrmplatformMemberTasksController";
import { HrmplatformMemberTasksHistoriesController } from "./controllers/hrmPlatform/member/tasks/histories/HrmplatformMemberTasksHistoriesController";
import { HrmplatformMemberTime_tracking_timezonesController } from "./controllers/hrmPlatform/member/time-tracking-timezones/HrmplatformMemberTime_tracking_timezonesController";
import { HrmplatformMemberTimelogsController } from "./controllers/hrmPlatform/member/timelogs/HrmplatformMemberTimelogsController";
import { HrmplatformMemberTimersController } from "./controllers/hrmPlatform/member/timers/HrmplatformMemberTimersController";
import { HrmplatformMemberTimesheet_weekly_statsController } from "./controllers/hrmPlatform/member/timesheet-weekly-stats/HrmplatformMemberTimesheet_weekly_statsController";
import { HrmplatformMemberTimesheetsController } from "./controllers/hrmPlatform/member/timesheets/HrmplatformMemberTimesheetsController";
import { HrmplatformMemberTimesheetsActionsController } from "./controllers/hrmPlatform/member/timesheets/actions/HrmplatformMemberTimesheetsActionsController";
import { HrmplatformMemberTimesheetsTimelogsController } from "./controllers/hrmPlatform/member/timesheets/timelogs/HrmplatformMemberTimesheetsTimelogsController";
import { HrmplatformMemberTimetrackingDaily_hoursController } from "./controllers/hrmPlatform/member/timetracking/daily-hours/HrmplatformMemberTimetrackingDaily_hoursController";
import { HrmplatformMemberTimetrackingOrganization_weekly_hoursController } from "./controllers/hrmPlatform/member/timetracking/organization-weekly-hours/HrmplatformMemberTimetrackingOrganization_weekly_hoursController";
import { HrmplatformMemberTimetrackingRecent_timelogsController } from "./controllers/hrmPlatform/member/timetracking/recent-timelogs/HrmplatformMemberTimetrackingRecent_timelogsController";
import { HrmplatformMemberTimetrackingWeekly_hoursController } from "./controllers/hrmPlatform/member/timetracking/weekly-hours/HrmplatformMemberTimetrackingWeekly_hoursController";
import { HrmplatformMembersController } from "./controllers/hrmPlatform/members/HrmplatformMembersController";

@Module({
  controllers: [
    HrmplatformAuthGuestController,
    HrmplatformAuthMemberController,
    HrmplatformGuestsController,
    HrmplatformGuestSessionsController,
    HrmplatformMembersController,
    HrmplatformMemberProfileController,
    HrmplatformMemberPassword_resetsController,
    HrmplatformMemberEmail_verificationsController,
    HrmplatformMemberOrganizationsController,
    HrmplatformMemberOrganizationsSnapshotsController,
    HrmplatformMemberOrganizationsFilesController,
    HrmplatformMemberOrganizationsDepartmentsController,
    HrmplatformMemberOrganizationsDepartmentsSnapshotsController,
    HrmplatformMemberEmployeesController,
    HrmplatformMemberEmployeesSnapshotsController,
    HrmplatformMemberContractsController,
    HrmplatformMemberContractsSnapshotsController,
    HrmplatformMemberRolesController,
    HrmplatformMemberRolesPermissionsController,
    HrmplatformMemberProjectsController,
    HrmplatformMemberProjectsMembershipsController,
    HrmplatformMemberTasksController,
    HrmplatformMemberTask_historiesController,
    HrmplatformMemberTimersController,
    HrmplatformMemberTimelogsController,
    HrmplatformMemberTimesheetsController,
    HrmplatformMemberTimesheetsTimelogsController,
    HrmplatformMemberTimesheetsActionsController,
    HrmplatformMemberTime_tracking_timezonesController,
    HrmplatformMemberTimesheet_weekly_statsController,
    HrmplatformMemberActivity_logsController,
    HrmplatformMemberDashboardController,
    HrmplatformMemberDepartmentsController,
    HrmplatformMemberContractsSummaryController,
    HrmplatformMemberProjectsAnalyticsController,
    HrmplatformMemberTasksHistoriesController,
    HrmplatformMemberTimetrackingDaily_hoursController,
    HrmplatformMemberTimetrackingWeekly_hoursController,
    HrmplatformMemberTimetrackingRecent_timelogsController,
    HrmplatformMemberTimetrackingOrganization_weekly_hoursController,
  ],
})
export class MyModule {}
