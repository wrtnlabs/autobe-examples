import { Module } from "@nestjs/common";

import { HrmAuthGuestController } from "./controllers/hrm/auth/guest/HrmAuthGuestController";
import { HrmAuthMemberController } from "./controllers/hrm/auth/member/HrmAuthMemberController";
import { HrmGuestGuestSessionsController } from "./controllers/hrm/guest/guest/sessions/HrmGuestGuestSessionsController";
import { HrmGuestInvitationsController } from "./controllers/hrm/guest/invitations/accept/HrmGuestInvitationsController";
import { HrmGuestsController } from "./controllers/hrm/guests/HrmGuestsController";
import { HrmMemberActive_timersController } from "./controllers/hrm/member/active-timers/HrmMemberActive_timersController";
import { HrmMemberDashboardOrganizationController } from "./controllers/hrm/member/dashboard/organization/HrmMemberDashboardOrganizationController";
import { HrmMemberEmployeesAnalyticsController } from "./controllers/hrm/member/employees/analytics/HrmMemberEmployeesAnalyticsController";
import { HrmMemberEmployeesContractsController } from "./controllers/hrm/member/employees/contracts/HrmMemberEmployeesContractsController";
import { HrmMemberEmployeesContractsSnapshotsController } from "./controllers/hrm/member/employees/contracts/snapshots/HrmMemberEmployeesContractsSnapshotsController";
import { HrmMemberInvitationsController } from "./controllers/hrm/member/invitations/HrmMemberInvitationsController";
import { HrmMemberMemberEmail_verificationsController } from "./controllers/hrm/member/member/email-verifications/HrmMemberMemberEmail_verificationsController";
import { HrmMemberMemberPassword_resetsController } from "./controllers/hrm/member/member/password-resets/HrmMemberMemberPassword_resetsController";
import { HrmMemberMemberSessionsController } from "./controllers/hrm/member/member/sessions/HrmMemberMemberSessionsController";
import { HrmMemberOrganizationsController } from "./controllers/hrm/member/organizations/HrmMemberOrganizationsController";
import { HrmMemberOrganizationsActivity_logsController } from "./controllers/hrm/member/organizations/activity-logs/HrmMemberOrganizationsActivity_logsController";
import { HrmMemberOrganizationsAnalyticsContractsController } from "./controllers/hrm/member/organizations/analytics/contracts/HrmMemberOrganizationsAnalyticsContractsController";
import { HrmMemberOrganizationsDashboardEmployeeController } from "./controllers/hrm/member/organizations/dashboard/employee/HrmMemberOrganizationsDashboardEmployeeController";
import { HrmMemberOrganizationsDepartmentsController } from "./controllers/hrm/member/organizations/departments/HrmMemberOrganizationsDepartmentsController";
import { HrmMemberOrganizationsEmployeesController } from "./controllers/hrm/member/organizations/employees/HrmMemberOrganizationsEmployeesController";
import { HrmMemberOrganizationsEmployeesContractsController } from "./controllers/hrm/member/organizations/employees/contracts/HrmMemberOrganizationsEmployeesContractsController";
import { HrmMemberOrganizationsOwnersController } from "./controllers/hrm/member/organizations/owners/HrmMemberOrganizationsOwnersController";
import { HrmMemberOrganizationsProjectsController } from "./controllers/hrm/member/organizations/projects/HrmMemberOrganizationsProjectsController";
import { HrmMemberOrganizationsProjectsBudget_reportController } from "./controllers/hrm/member/organizations/projects/budget-report/HrmMemberOrganizationsProjectsBudget_reportController";
import { HrmMemberOrganizationsProjectsMembersController } from "./controllers/hrm/member/organizations/projects/members/metrics/HrmMemberOrganizationsProjectsMembersController";
import { HrmMemberOrganizationsProjectsStatusController } from "./controllers/hrm/member/organizations/projects/status/HrmMemberOrganizationsProjectsStatusController";
import { HrmMemberOrganizationsProjectsTasksController } from "./controllers/hrm/member/organizations/projects/tasks/HrmMemberOrganizationsProjectsTasksController";
import { HrmMemberOrganizationsProjectsTasksHistoryController } from "./controllers/hrm/member/organizations/projects/tasks/history/HrmMemberOrganizationsProjectsTasksHistoryController";
import { HrmMemberOrganizationsReportsContract_compensationController } from "./controllers/hrm/member/organizations/reports/contract-compensation/HrmMemberOrganizationsReportsContract_compensationController";
import { HrmMemberOrganizationsReportsContract_expirationsController } from "./controllers/hrm/member/organizations/reports/contract-expirations/HrmMemberOrganizationsReportsContract_expirationsController";
import { HrmMemberOrganizationsReportsProject_budgetController } from "./controllers/hrm/member/organizations/reports/project-budget/HrmMemberOrganizationsReportsProject_budgetController";
import { HrmMemberOrganizationsReportsTimeController } from "./controllers/hrm/member/organizations/reports/time/HrmMemberOrganizationsReportsTimeController";
import { HrmMemberOrganizationsReportsWeekly_summaryController } from "./controllers/hrm/member/organizations/reports/weekly-summary/HrmMemberOrganizationsReportsWeekly_summaryController";
import { HrmMemberOrganizationsRolesController } from "./controllers/hrm/member/organizations/roles/HrmMemberOrganizationsRolesController";
import { HrmMemberOrganizations_switchController } from "./controllers/hrm/member/organizations/switch/HrmMemberOrganizations_switchController";
import { HrmMemberOrganizationsTimelogsController } from "./controllers/hrm/member/organizations/timelogs/HrmMemberOrganizationsTimelogsController";
import { HrmMemberOrganizationsTimesheetsController } from "./controllers/hrm/member/organizations/timesheets/HrmMemberOrganizationsTimesheetsController";
import { HrmMemberPermissionsController } from "./controllers/hrm/member/permissions/HrmMemberPermissionsController";
import { HrmMemberProfileController } from "./controllers/hrm/member/profile/HrmMemberProfileController";
import { HrmMemberProfilePasswordController } from "./controllers/hrm/member/profile/password/HrmMemberProfilePasswordController";
import { HrmMemberProjectsController } from "./controllers/hrm/member/projects/HrmMemberProjectsController";
import { HrmMemberProjectsMembersController } from "./controllers/hrm/member/projects/members/HrmMemberProjectsMembersController";
import { HrmMemberRolesController } from "./controllers/hrm/member/roles/HrmMemberRolesController";
import { HrmMemberRolesPermissionsController } from "./controllers/hrm/member/roles/permissions/HrmMemberRolesPermissionsController";
import { HrmMemberSnapshotsController } from "./controllers/hrm/member/snapshots/HrmMemberSnapshotsController";
import { HrmMemberTimelogsController } from "./controllers/hrm/member/timelogs/HrmMemberTimelogsController";
import { HrmMemberTimesheetsController } from "./controllers/hrm/member/timesheets/HrmMemberTimesheetsController";
import { HrmMemberTimesheetsTimelogsController } from "./controllers/hrm/member/timesheets/timelogs/HrmMemberTimesheetsTimelogsController";
import { HrmMembersController } from "./controllers/hrm/members/HrmMembersController";

@Module({
  controllers: [
    HrmAuthGuestController,
    HrmAuthMemberController,
    HrmMembersController,
    HrmMemberProfileController,
    HrmGuestsController,
    HrmMemberMemberSessionsController,
    HrmGuestGuestSessionsController,
    HrmMemberMemberPassword_resetsController,
    HrmMemberMemberEmail_verificationsController,
    HrmMemberOrganizationsController,
    HrmMemberOrganizationsOwnersController,
    HrmMemberOrganizationsRolesController,
    HrmMemberOrganizationsDepartmentsController,
    HrmMemberOrganizationsEmployeesController,
    HrmMemberInvitationsController,
    HrmGuestInvitationsController,
    HrmMemberSnapshotsController,
    HrmMemberRolesController,
    HrmMemberPermissionsController,
    HrmMemberRolesPermissionsController,
    HrmMemberEmployeesContractsController,
    HrmMemberOrganizationsEmployeesContractsController,
    HrmMemberEmployeesContractsSnapshotsController,
    HrmMemberProjectsController,
    HrmMemberOrganizationsProjectsController,
    HrmMemberProjectsMembersController,
    HrmMemberOrganizationsProjectsTasksController,
    HrmMemberOrganizationsProjectsTasksHistoryController,
    HrmMemberTimelogsController,
    HrmMemberOrganizationsTimelogsController,
    HrmMemberOrganizationsTimesheetsController,
    HrmMemberTimesheetsController,
    HrmMemberTimesheetsTimelogsController,
    HrmMemberActive_timersController,
    HrmMemberOrganizationsActivity_logsController,
    HrmMemberOrganizationsDashboardEmployeeController,
    HrmMemberDashboardOrganizationController,
    HrmMemberProfilePasswordController,
    HrmMemberOrganizations_switchController,
    HrmMemberOrganizationsReportsTimeController,
    HrmMemberOrganizationsReportsProject_budgetController,
    HrmMemberOrganizationsReportsWeekly_summaryController,
    HrmMemberEmployeesAnalyticsController,
    HrmMemberOrganizationsAnalyticsContractsController,
    HrmMemberOrganizationsReportsContract_expirationsController,
    HrmMemberOrganizationsReportsContract_compensationController,
    HrmMemberOrganizationsProjectsStatusController,
    HrmMemberOrganizationsProjectsBudget_reportController,
    HrmMemberOrganizationsProjectsMembersController,
  ],
})
export class MyModule {}
