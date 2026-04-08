import { Module } from "@nestjs/common";

import { ErphrmtimeAuthGuestController } from "./controllers/erpHrmTime/auth/guest/ErphrmtimeAuthGuestController";
import { ErphrmtimeAuthMemberController } from "./controllers/erpHrmTime/auth/member/ErphrmtimeAuthMemberController";
import { ErphrmtimeMemberActivity_log_entriesController } from "./controllers/erpHrmTime/member/activity-log-entries/ErphrmtimeMemberActivity_log_entriesController";
import { ErphrmtimeMemberDepartmentsController } from "./controllers/erpHrmTime/member/departments/ErphrmtimeMemberDepartmentsController";
import { ErphrmtimeMemberDepartmentsChildrenController } from "./controllers/erpHrmTime/member/departments/children/ErphrmtimeMemberDepartmentsChildrenController";
import { ErphrmtimeMemberEmailverificationsController } from "./controllers/erpHrmTime/member/emailVerifications/ErphrmtimeMemberEmailverificationsController";
import { ErphrmtimeMemberEmployeesController } from "./controllers/erpHrmTime/member/employees/ErphrmtimeMemberEmployeesController";
import { ErphrmtimeMemberEmployeesContractsController } from "./controllers/erpHrmTime/member/employees/contracts/ErphrmtimeMemberEmployeesContractsController";
import { ErphrmtimeMemberEmployeesDashboardsummariesController } from "./controllers/erpHrmTime/member/employees/dashboardSummaries/ErphrmtimeMemberEmployeesDashboardsummariesController";
import { ErphrmtimeMemberOrganizationmembershipsController } from "./controllers/erpHrmTime/member/organizationMemberships/ErphrmtimeMemberOrganizationmembershipsController";
import { ErphrmtimeMemberOrganizationsController } from "./controllers/erpHrmTime/member/organizations/ErphrmtimeMemberOrganizationsController";
import { ErphrmtimeMemberOrganizationsDashboardsummariesController } from "./controllers/erpHrmTime/member/organizations/dashboardSummaries/ErphrmtimeMemberOrganizationsDashboardsummariesController";
import { ErphrmtimeMemberOrganizationsProjectbudgetreportrowsController } from "./controllers/erpHrmTime/member/organizations/projectBudgetReportRows/ErphrmtimeMemberOrganizationsProjectbudgetreportrowsController";
import { ErphrmtimeMemberOrganizationsSettingsController } from "./controllers/erpHrmTime/member/organizations/settings/ErphrmtimeMemberOrganizationsSettingsController";
import { ErphrmtimeMemberOrganizationsTimereportrowsController } from "./controllers/erpHrmTime/member/organizations/timeReportRows/ErphrmtimeMemberOrganizationsTimereportrowsController";
import { ErphrmtimeMemberOrganizationsWeeklysummaryreportrowsController } from "./controllers/erpHrmTime/member/organizations/weeklySummaryReportRows/ErphrmtimeMemberOrganizationsWeeklysummaryreportrowsController";
import { ErphrmtimeMemberPasswordresetsController } from "./controllers/erpHrmTime/member/passwordResets/ErphrmtimeMemberPasswordresetsController";
import { ErphrmtimeMemberPermissionsController } from "./controllers/erpHrmTime/member/permissions/ErphrmtimeMemberPermissionsController";
import { ErphrmtimeMemberProfileController } from "./controllers/erpHrmTime/member/profile/ErphrmtimeMemberProfileController";
import { ErphrmtimeMemberProjectsController } from "./controllers/erpHrmTime/member/projects/ErphrmtimeMemberProjectsController";
import { ErphrmtimeMemberProjectsAssignedController } from "./controllers/erpHrmTime/member/projects/assigned/ErphrmtimeMemberProjectsAssignedController";
import { ErphrmtimeMemberProjectsMembershipsController } from "./controllers/erpHrmTime/member/projects/memberships/ErphrmtimeMemberProjectsMembershipsController";
import { ErphrmtimeMemberProjectsTasksController } from "./controllers/erpHrmTime/member/projects/tasks/ErphrmtimeMemberProjectsTasksController";
import { ErphrmtimeMemberProjectsTasksHistoryentriesController } from "./controllers/erpHrmTime/member/projects/tasks/historyEntries/ErphrmtimeMemberProjectsTasksHistoryentriesController";
import { ErphrmtimeMemberRole_assignmentController } from "./controllers/erpHrmTime/member/role-assignment/ErphrmtimeMemberRole_assignmentController";
import { ErphrmtimeMemberRolesController } from "./controllers/erpHrmTime/member/roles/ErphrmtimeMemberRolesController";
import { ErphrmtimeMemberRolesBuiltinController } from "./controllers/erpHrmTime/member/roles/builtIn/ErphrmtimeMemberRolesBuiltinController";
import { ErphrmtimeMemberRolesPermissionsController } from "./controllers/erpHrmTime/member/roles/permissions/ErphrmtimeMemberRolesPermissionsController";
import { ErphrmtimeMemberSessionsController } from "./controllers/erpHrmTime/member/sessions/ErphrmtimeMemberSessionsController";
import { ErphrmtimeMemberStatusDeactivateController } from "./controllers/erpHrmTime/member/status/deactivate/ErphrmtimeMemberStatusDeactivateController";
import { ErphrmtimeMemberStatusReactivateController } from "./controllers/erpHrmTime/member/status/reactivate/ErphrmtimeMemberStatusReactivateController";
import { ErphrmtimeMemberTimelogsController } from "./controllers/erpHrmTime/member/timelogs/ErphrmtimeMemberTimelogsController";
import { ErphrmtimeMemberTimersController } from "./controllers/erpHrmTime/member/timers/ErphrmtimeMemberTimersController";
import { ErphrmtimeMemberTimersDiscardController } from "./controllers/erpHrmTime/member/timers/discard/ErphrmtimeMemberTimersDiscardController";
import { ErphrmtimeMemberTimersStopController } from "./controllers/erpHrmTime/member/timers/stop/ErphrmtimeMemberTimersStopController";
import { ErphrmtimeMemberTimesheetsController } from "./controllers/erpHrmTime/member/timesheets/ErphrmtimeMemberTimesheetsController";
import { ErphrmtimeMemberTimesheetsTimelogsController } from "./controllers/erpHrmTime/member/timesheets/timelogs/ErphrmtimeMemberTimesheetsTimelogsController";

@Module({
  controllers: [
    ErphrmtimeAuthGuestController,
    ErphrmtimeAuthMemberController,
    ErphrmtimeMemberSessionsController,
    ErphrmtimeMemberPasswordresetsController,
    ErphrmtimeMemberEmailverificationsController,
    ErphrmtimeMemberProfileController,
    ErphrmtimeMemberOrganizationsController,
    ErphrmtimeMemberOrganizationsSettingsController,
    ErphrmtimeMemberOrganizationmembershipsController,
    ErphrmtimeMemberEmployeesController,
    ErphrmtimeMemberEmployeesContractsController,
    ErphrmtimeMemberDepartmentsController,
    ErphrmtimeMemberDepartmentsChildrenController,
    ErphrmtimeMemberRolesController,
    ErphrmtimeMemberPermissionsController,
    ErphrmtimeMemberRolesPermissionsController,
    ErphrmtimeMemberProjectsController,
    ErphrmtimeMemberProjectsMembershipsController,
    ErphrmtimeMemberProjectsTasksController,
    ErphrmtimeMemberProjectsTasksHistoryentriesController,
    ErphrmtimeMemberTimelogsController,
    ErphrmtimeMemberTimersController,
    ErphrmtimeMemberTimesheetsController,
    ErphrmtimeMemberTimesheetsTimelogsController,
    ErphrmtimeMemberOrganizationsTimereportrowsController,
    ErphrmtimeMemberOrganizationsProjectbudgetreportrowsController,
    ErphrmtimeMemberOrganizationsWeeklysummaryreportrowsController,
    ErphrmtimeMemberOrganizationsDashboardsummariesController,
    ErphrmtimeMemberEmployeesDashboardsummariesController,
    ErphrmtimeMemberActivity_log_entriesController,
    ErphrmtimeMemberStatusDeactivateController,
    ErphrmtimeMemberStatusReactivateController,
    ErphrmtimeMemberRole_assignmentController,
    ErphrmtimeMemberRolesBuiltinController,
    ErphrmtimeMemberProjectsAssignedController,
    ErphrmtimeMemberTimersStopController,
    ErphrmtimeMemberTimersDiscardController,
  ],
})
export class MyModule {}
