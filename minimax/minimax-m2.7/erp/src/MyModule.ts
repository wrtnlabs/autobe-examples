import { Module } from "@nestjs/common";

import { ErphrmAdminActivity_logsController } from "./controllers/erpHrm/admin/activity-logs/ErphrmAdminActivity_logsController";
import { ErphrmAdminAnalyticsBudgetController } from "./controllers/erpHrm/admin/analytics/budget/ErphrmAdminAnalyticsBudgetController";
import { ErphrmAdminAnalyticsTimeController } from "./controllers/erpHrm/admin/analytics/time/ErphrmAdminAnalyticsTimeController";
import { ErphrmAdminAnalyticsWeekly_summaryController } from "./controllers/erpHrm/admin/analytics/weekly-summary/ErphrmAdminAnalyticsWeekly_summaryController";
import { ErphrmAdminAudit_logsController } from "./controllers/erpHrm/admin/audit-logs/ErphrmAdminAudit_logsController";
import { ErphrmAdminDashboardOrganizationController } from "./controllers/erpHrm/admin/dashboard/organization/ErphrmAdminDashboardOrganizationController";
import { ErphrmAdminDepartmentsController } from "./controllers/erpHrm/admin/departments/ErphrmAdminDepartmentsController";
import { ErphrmAdminEmployeesController } from "./controllers/erpHrm/admin/employees/ErphrmAdminEmployeesController";
import { ErphrmAdminEmployeesContractsController } from "./controllers/erpHrm/admin/employees/contracts/ErphrmAdminEmployeesContractsController";
import { ErphrmAdminInvitationsBulkController } from "./controllers/erpHrm/admin/invitations/bulk/ErphrmAdminInvitationsBulkController";
import { ErphrmAdminInvitationsController } from "./controllers/erpHrm/admin/invitations/resend/ErphrmAdminInvitationsController";
import { ErphrmAdminMembersTimelogsController } from "./controllers/erpHrm/admin/members/timelogs/ErphrmAdminMembersTimelogsController";
import { ErphrmAdminMembersTimesheetsController } from "./controllers/erpHrm/admin/members/timesheets/ErphrmAdminMembersTimesheetsController";
import { ErphrmAdminOrganizationsController } from "./controllers/erpHrm/admin/organizations/ErphrmAdminOrganizationsController";
import { ErphrmAdminPermissionsController } from "./controllers/erpHrm/admin/permissions/ErphrmAdminPermissionsController";
import { ErphrmAdminProfileController } from "./controllers/erpHrm/admin/profile/ErphrmAdminProfileController";
import { ErphrmAdminProjectsController } from "./controllers/erpHrm/admin/projects/ErphrmAdminProjectsController";
import { ErphrmAdminProjectsAnalyticsBudgetController } from "./controllers/erpHrm/admin/projects/analytics/budget/ErphrmAdminProjectsAnalyticsBudgetController";
import { ErphrmAdminProjectsAnalyticsMembersController } from "./controllers/erpHrm/admin/projects/analytics/members/ErphrmAdminProjectsAnalyticsMembersController";
import { ErphrmAdminProjectsMembersController } from "./controllers/erpHrm/admin/projects/members/ErphrmAdminProjectsMembersController";
import { ErphrmAdminProjectsTasksController } from "./controllers/erpHrm/admin/projects/tasks/ErphrmAdminProjectsTasksController";
import { ErphrmAdminProjectsTasksHistoriesController } from "./controllers/erpHrm/admin/projects/tasks/histories/ErphrmAdminProjectsTasksHistoriesController";
import { ErphrmAdminReportsController } from "./controllers/erpHrm/admin/reports/ErphrmAdminReportsController";
import { ErphrmAdminReportsParametersController } from "./controllers/erpHrm/admin/reports/parameters/ErphrmAdminReportsParametersController";
import { ErphrmAdminRolesController } from "./controllers/erpHrm/admin/roles/ErphrmAdminRolesController";
import { ErphrmAdminRolesPermissionsController } from "./controllers/erpHrm/admin/roles/permissions/ErphrmAdminRolesPermissionsController";
import { ErphrmAdminRolesPermissionsBulkController } from "./controllers/erpHrm/admin/roles/permissions/bulk/ErphrmAdminRolesPermissionsBulkController";
import { ErphrmAdminStatisticsController } from "./controllers/erpHrm/admin/statistics/ErphrmAdminStatisticsController";
import { ErphrmAdminTimesheetsController } from "./controllers/erpHrm/admin/timesheets/ErphrmAdminTimesheetsController";
import { ErphrmAdminsController } from "./controllers/erpHrm/admins/ErphrmAdminsController";
import { ErphrmAuthAdminController } from "./controllers/erpHrm/auth/admin/ErphrmAuthAdminController";
import { ErphrmAuthGuestController } from "./controllers/erpHrm/auth/guest/ErphrmAuthGuestController";
import { ErphrmAuthMemberController } from "./controllers/erpHrm/auth/member/ErphrmAuthMemberController";
import { ErphrmGuestInvitationsController } from "./controllers/erpHrm/guest/invitations/verify/ErphrmGuestInvitationsController";
import { ErphrmMemberAnalyticsTimeController } from "./controllers/erpHrm/member/analytics/time/ErphrmMemberAnalyticsTimeController";
import { ErphrmMemberDashboardController } from "./controllers/erpHrm/member/dashboard/ErphrmMemberDashboardController";
import { ErphrmMemberDepartmentsController } from "./controllers/erpHrm/member/departments/ErphrmMemberDepartmentsController";
import { ErphrmMemberErphrmOrganizationsInvitationsController } from "./controllers/erpHrm/member/erpHrm/organizations/invitations/ErphrmMemberErphrmOrganizationsInvitationsController";
import { ErphrmMemberInvitationsController } from "./controllers/erpHrm/member/invitations/accept/ErphrmMemberInvitationsController";
import { ErphrmMemberOrganization_contextController } from "./controllers/erpHrm/member/organization-context/ErphrmMemberOrganization_contextController";
import { ErphrmMemberProfileController } from "./controllers/erpHrm/member/profile/ErphrmMemberProfileController";
import { ErphrmMemberProjectsAnalyticsMembersController } from "./controllers/erpHrm/member/projects/analytics/members/ErphrmMemberProjectsAnalyticsMembersController";
import { ErphrmMemberProjectsTasksController } from "./controllers/erpHrm/member/projects/tasks/analytics/ErphrmMemberProjectsTasksController";
import { ErphrmMemberReportsController } from "./controllers/erpHrm/member/reports/ErphrmMemberReportsController";
import { ErphrmMemberReportsParametersController } from "./controllers/erpHrm/member/reports/parameters/ErphrmMemberReportsParametersController";
import { ErphrmMemberRolesController } from "./controllers/erpHrm/member/roles/ErphrmMemberRolesController";
import { ErphrmMemberRolesPermissionsController } from "./controllers/erpHrm/member/roles/permissions/ErphrmMemberRolesPermissionsController";
import { ErphrmMemberSessionsController } from "./controllers/erpHrm/member/sessions/ErphrmMemberSessionsController";
import { ErphrmMemberTimelogsController } from "./controllers/erpHrm/member/timelogs/ErphrmMemberTimelogsController";
import { ErphrmMemberTimersController } from "./controllers/erpHrm/member/timers/ErphrmMemberTimersController";
import { ErphrmMemberTimesheetsController } from "./controllers/erpHrm/member/timesheets/ErphrmMemberTimesheetsController";
import { ErphrmMemberTimesheetsTimelogsController } from "./controllers/erpHrm/member/timesheets/timelogs/ErphrmMemberTimesheetsTimelogsController";
import { ErphrmMembersController } from "./controllers/erpHrm/members/ErphrmMembersController";

@Module({
  controllers: [
    ErphrmAuthGuestController,
    ErphrmAuthMemberController,
    ErphrmAuthAdminController,
    ErphrmMemberSessionsController,
    ErphrmAdminAudit_logsController,
    ErphrmMembersController,
    ErphrmAdminsController,
    ErphrmAdminOrganizationsController,
    ErphrmAdminProfileController,
    ErphrmAdminActivity_logsController,
    ErphrmAdminReportsController,
    ErphrmMemberReportsController,
    ErphrmAdminReportsParametersController,
    ErphrmMemberReportsParametersController,
    ErphrmMemberProfileController,
    ErphrmAdminEmployeesController,
    ErphrmMemberDepartmentsController,
    ErphrmAdminDepartmentsController,
    ErphrmMemberRolesController,
    ErphrmAdminRolesController,
    ErphrmMemberRolesPermissionsController,
    ErphrmAdminRolesPermissionsController,
    ErphrmAdminEmployeesContractsController,
    ErphrmAdminProjectsController,
    ErphrmAdminProjectsMembersController,
    ErphrmAdminProjectsTasksController,
    ErphrmAdminProjectsTasksHistoriesController,
    ErphrmMemberTimelogsController,
    ErphrmAdminMembersTimelogsController,
    ErphrmMemberTimesheetsController,
    ErphrmAdminMembersTimesheetsController,
    ErphrmAdminTimesheetsController,
    ErphrmMemberTimesheetsTimelogsController,
    ErphrmMemberTimersController,
    ErphrmMemberErphrmOrganizationsInvitationsController,
    ErphrmMemberDashboardController,
    ErphrmMemberOrganization_contextController,
    ErphrmAdminStatisticsController,
    ErphrmAdminPermissionsController,
    ErphrmAdminRolesPermissionsBulkController,
    ErphrmAdminProjectsAnalyticsBudgetController,
    ErphrmMemberProjectsAnalyticsMembersController,
    ErphrmAdminProjectsAnalyticsMembersController,
    ErphrmMemberProjectsTasksController,
    ErphrmAdminDashboardOrganizationController,
    ErphrmMemberAnalyticsTimeController,
    ErphrmAdminAnalyticsTimeController,
    ErphrmAdminAnalyticsBudgetController,
    ErphrmAdminAnalyticsWeekly_summaryController,
    ErphrmMemberInvitationsController,
    ErphrmAdminInvitationsController,
    ErphrmGuestInvitationsController,
    ErphrmAdminInvitationsBulkController,
  ],
})
export class MyModule {}
