import { Module } from "@nestjs/common";

import { ErphrmtimeAuthGuestController } from "./controllers/erpHrmTime/auth/guest/ErphrmtimeAuthGuestController";
import { ErphrmtimeAuthMemberController } from "./controllers/erpHrmTime/auth/member/ErphrmtimeAuthMemberController";
import { ErphrmtimeGuestProfileController } from "./controllers/erpHrmTime/guest/profile/ErphrmtimeGuestProfileController";
import { ErphrmtimeGuestSessionsController } from "./controllers/erpHrmTime/guest/sessions/ErphrmtimeGuestSessionsController";
import { ErphrmtimeMemberActivity_log_entriesController } from "./controllers/erpHrmTime/member/activity-log-entries/ErphrmtimeMemberActivity_log_entriesController";
import { ErphrmtimeMemberDepartmentsController } from "./controllers/erpHrmTime/member/departments/ErphrmtimeMemberDepartmentsController";
import { ErphrmtimeMemberEmployee_dashboard_summaryController } from "./controllers/erpHrmTime/member/employee-dashboard-summary/ErphrmtimeMemberEmployee_dashboard_summaryController";
import { ErphrmtimeMemberEmployeeContractsHistoryController } from "./controllers/erpHrmTime/member/employee/contracts/history/ErphrmtimeMemberEmployeeContractsHistoryController";
import { ErphrmtimeMemberEmployeesController } from "./controllers/erpHrmTime/member/employees/ErphrmtimeMemberEmployeesController";
import { ErphrmtimeMemberEmployeesContractsController } from "./controllers/erpHrmTime/member/employees/contracts/ErphrmtimeMemberEmployeesContractsController";
import { ErphrmtimeMemberEmployeesDeactivateController } from "./controllers/erpHrmTime/member/employees/deactivate/ErphrmtimeMemberEmployeesDeactivateController";
import { ErphrmtimeMemberEmployeesInvitationsController } from "./controllers/erpHrmTime/member/employees/invitations/ErphrmtimeMemberEmployeesInvitationsController";
import { ErphrmtimeMemberOrganizationmembershipsController } from "./controllers/erpHrmTime/member/organizationMemberships/ErphrmtimeMemberOrganizationmembershipsController";
import { ErphrmtimeMemberOrganizationsController } from "./controllers/erpHrmTime/member/organizations/ErphrmtimeMemberOrganizationsController";
import { ErphrmtimeMemberOrganizationsMembershipsController } from "./controllers/erpHrmTime/member/organizations/memberships/ErphrmtimeMemberOrganizationsMembershipsController";
import { ErphrmtimeMemberOrganizationsOwnership_transferController } from "./controllers/erpHrmTime/member/organizations/ownership-transfer/ErphrmtimeMemberOrganizationsOwnership_transferController";
import { ErphrmtimeMemberOrganizationsSettingsController } from "./controllers/erpHrmTime/member/organizations/settings/ErphrmtimeMemberOrganizationsSettingsController";
import { ErphrmtimeMemberPermissionsController } from "./controllers/erpHrmTime/member/permissions/ErphrmtimeMemberPermissionsController";
import { ErphrmtimeMemberProjectsController } from "./controllers/erpHrmTime/member/projects/ErphrmtimeMemberProjectsController";
import { ErphrmtimeMemberProjectsMembershipsController } from "./controllers/erpHrmTime/member/projects/memberships/ErphrmtimeMemberProjectsMembershipsController";
import { ErphrmtimeMemberProjectsTaskhistoriesController } from "./controllers/erpHrmTime/member/projects/taskHistories/ErphrmtimeMemberProjectsTaskhistoriesController";
import { ErphrmtimeMemberProjectsTasksController } from "./controllers/erpHrmTime/member/projects/tasks/ErphrmtimeMemberProjectsTasksController";
import { ErphrmtimeMemberProjectsTasksHistoryController } from "./controllers/erpHrmTime/member/projects/tasks/history/ErphrmtimeMemberProjectsTasksHistoryController";
import { ErphrmtimeMemberProjectsTasksHistoryentriesController } from "./controllers/erpHrmTime/member/projects/tasks/historyEntries/ErphrmtimeMemberProjectsTasksHistoryentriesController";
import { ErphrmtimeMemberReportsOrganization_dashboard_summariesController } from "./controllers/erpHrmTime/member/reports/organization-dashboard-summaries/ErphrmtimeMemberReportsOrganization_dashboard_summariesController";
import { ErphrmtimeMemberReportsProject_budget_report_rowsController } from "./controllers/erpHrmTime/member/reports/project-budget-report-rows/ErphrmtimeMemberReportsProject_budget_report_rowsController";
import { ErphrmtimeMemberReportsTime_report_rowsController } from "./controllers/erpHrmTime/member/reports/time-report-rows/ErphrmtimeMemberReportsTime_report_rowsController";
import { ErphrmtimeMemberReportsWeekly_summary_report_rowsController } from "./controllers/erpHrmTime/member/reports/weekly-summary-report-rows/ErphrmtimeMemberReportsWeekly_summary_report_rowsController";
import { ErphrmtimeMemberRolesController } from "./controllers/erpHrmTime/member/roles/ErphrmtimeMemberRolesController";
import { ErphrmtimeMemberRolesDeletion_checkController } from "./controllers/erpHrmTime/member/roles/deletion-check/ErphrmtimeMemberRolesDeletion_checkController";
import { ErphrmtimeMemberRolesPermissionsController } from "./controllers/erpHrmTime/member/roles/permissions/ErphrmtimeMemberRolesPermissionsController";
import { ErphrmtimeMemberRolesPermissionsEffectiveController } from "./controllers/erpHrmTime/member/roles/permissions/effective/ErphrmtimeMemberRolesPermissionsEffectiveController";
import { ErphrmtimeMemberTimelogsController } from "./controllers/erpHrmTime/member/timelogs/ErphrmtimeMemberTimelogsController";
import { ErphrmtimeMemberTimersController } from "./controllers/erpHrmTime/member/timers/ErphrmtimeMemberTimersController";
import { ErphrmtimeMemberTimersCurrentController } from "./controllers/erpHrmTime/member/timers/current/ErphrmtimeMemberTimersCurrentController";
import { ErphrmtimeMemberTimersDiscardController } from "./controllers/erpHrmTime/member/timers/discard/ErphrmtimeMemberTimersDiscardController";
import { ErphrmtimeMemberTimersStartController } from "./controllers/erpHrmTime/member/timers/start/ErphrmtimeMemberTimersStartController";
import { ErphrmtimeMemberTimesheetsController } from "./controllers/erpHrmTime/member/timesheets/ErphrmtimeMemberTimesheetsController";
import { ErphrmtimeMemberTimesheetsDraftController } from "./controllers/erpHrmTime/member/timesheets/draft/ErphrmtimeMemberTimesheetsDraftController";
import { ErphrmtimeMemberTimesheetsTimelogsController } from "./controllers/erpHrmTime/member/timesheets/timelogs/ErphrmtimeMemberTimesheetsTimelogsController";

@Module({
  controllers: [
    ErphrmtimeAuthGuestController,
    ErphrmtimeAuthMemberController,
    ErphrmtimeGuestSessionsController,
    ErphrmtimeGuestProfileController,
    ErphrmtimeMemberOrganizationsController,
    ErphrmtimeMemberOrganizationsSettingsController,
    ErphrmtimeMemberOrganizationsMembershipsController,
    ErphrmtimeMemberOrganizationmembershipsController,
    ErphrmtimeMemberEmployeesController,
    ErphrmtimeMemberEmployeesContractsController,
    ErphrmtimeMemberDepartmentsController,
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
    ErphrmtimeMemberReportsTime_report_rowsController,
    ErphrmtimeMemberReportsProject_budget_report_rowsController,
    ErphrmtimeMemberReportsWeekly_summary_report_rowsController,
    ErphrmtimeMemberReportsOrganization_dashboard_summariesController,
    ErphrmtimeMemberEmployee_dashboard_summaryController,
    ErphrmtimeMemberActivity_log_entriesController,
    ErphrmtimeMemberOrganizationsOwnership_transferController,
    ErphrmtimeMemberEmployeesInvitationsController,
    ErphrmtimeMemberEmployeesDeactivateController,
    ErphrmtimeMemberEmployeeContractsHistoryController,
    ErphrmtimeMemberRolesDeletion_checkController,
    ErphrmtimeMemberRolesPermissionsEffectiveController,
    ErphrmtimeMemberProjectsTaskhistoriesController,
    ErphrmtimeMemberProjectsTasksHistoryController,
    ErphrmtimeMemberTimersStartController,
    ErphrmtimeMemberTimersDiscardController,
    ErphrmtimeMemberTimersCurrentController,
    ErphrmtimeMemberTimesheetsDraftController,
  ],
})
export class MyModule {}
