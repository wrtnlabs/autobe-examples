import { Module } from "@nestjs/common";

import { ErphrmAuthGuestController } from "./controllers/erpHrm/auth/guest/ErphrmAuthGuestController";
import { ErphrmAuthMemberController } from "./controllers/erpHrm/auth/member/ErphrmAuthMemberController";
import { ErphrmGuestEmail_verificationsVerificationController } from "./controllers/erpHrm/guest/email-verifications/verification/ErphrmGuestEmail_verificationsVerificationController";
import { ErphrmGuestPassword_resetsController } from "./controllers/erpHrm/guest/password-resets/ErphrmGuestPassword_resetsController";
import { ErphrmGuestPassword_resetsCompletionController } from "./controllers/erpHrm/guest/password-resets/completion/ErphrmGuestPassword_resetsCompletionController";
import { ErphrmGuestSessionsController } from "./controllers/erpHrm/guest/sessions/ErphrmGuestSessionsController";
import { ErphrmMemberAccountController } from "./controllers/erpHrm/member/account/ErphrmMemberAccountController";
import { ErphrmMemberActivity_logsController } from "./controllers/erpHrm/member/activity-logs/ErphrmMemberActivity_logsController";
import { ErphrmMemberContractsController } from "./controllers/erpHrm/member/contracts/ErphrmMemberContractsController";
import { ErphrmMemberDashboardOrganizationController } from "./controllers/erpHrm/member/dashboard/organization/ErphrmMemberDashboardOrganizationController";
import { ErphrmMemberDashboardPersonalController } from "./controllers/erpHrm/member/dashboard/personal/ErphrmMemberDashboardPersonalController";
import { ErphrmMemberDepartmentsController } from "./controllers/erpHrm/member/departments/ErphrmMemberDepartmentsController";
import { ErphrmMemberEmail_verificationsController } from "./controllers/erpHrm/member/email-verifications/ErphrmMemberEmail_verificationsController";
import { ErphrmMemberEmployeesController } from "./controllers/erpHrm/member/employees/ErphrmMemberEmployeesController";
import { ErphrmMemberEmployeesContractsController } from "./controllers/erpHrm/member/employees/contracts/ErphrmMemberEmployeesContractsController";
import { ErphrmMemberEmployeesRoleController } from "./controllers/erpHrm/member/employees/role/ErphrmMemberEmployeesRoleController";
import { ErphrmMemberInvitationsController } from "./controllers/erpHrm/member/invitations/ErphrmMemberInvitationsController";
import { ErphrmMemberController } from "./controllers/erpHrm/member/logout/ErphrmMemberController";
import { ErphrmMemberPassword_resetsController } from "./controllers/erpHrm/member/password-resets/ErphrmMemberPassword_resetsController";
import { ErphrmMemberPassword_resetsCompletionController } from "./controllers/erpHrm/member/password-resets/completion/ErphrmMemberPassword_resetsCompletionController";
import { ErphrmMemberPasswordsController } from "./controllers/erpHrm/member/passwords/change/ErphrmMemberPasswordsController";
import { ErphrmMemberProfileController } from "./controllers/erpHrm/member/profile/ErphrmMemberProfileController";
import { ErphrmMemberProjectsController } from "./controllers/erpHrm/member/projects/ErphrmMemberProjectsController";
import { ErphrmMemberProjectsMembersController } from "./controllers/erpHrm/member/projects/members/ErphrmMemberProjectsMembersController";
import { ErphrmMemberProjectsTasksController } from "./controllers/erpHrm/member/projects/tasks/ErphrmMemberProjectsTasksController";
import { ErphrmMemberProjectsTasksHistoriesController } from "./controllers/erpHrm/member/projects/tasks/histories/ErphrmMemberProjectsTasksHistoriesController";
import { ErphrmMemberReportsProject_budgetController } from "./controllers/erpHrm/member/reports/project-budget/ErphrmMemberReportsProject_budgetController";
import { ErphrmMemberReportsTimeController } from "./controllers/erpHrm/member/reports/time/ErphrmMemberReportsTimeController";
import { ErphrmMemberReportsWeekly_summaryController } from "./controllers/erpHrm/member/reports/weekly-summary/ErphrmMemberReportsWeekly_summaryController";
import { ErphrmMemberSessionsOrganizationsController } from "./controllers/erpHrm/member/sessions/organizations/ErphrmMemberSessionsOrganizationsController";
import { ErphrmMemberTimelogsController } from "./controllers/erpHrm/member/timelogs/ErphrmMemberTimelogsController";
import { ErphrmMemberTimersController } from "./controllers/erpHrm/member/timers/ErphrmMemberTimersController";
import { ErphrmMemberTimesheetsController } from "./controllers/erpHrm/member/timesheets/ErphrmMemberTimesheetsController";
import { ErphrmMemberTimesheetsTimelogsController } from "./controllers/erpHrm/member/timesheets/timelogs/ErphrmMemberTimesheetsTimelogsController";
import { ErphrmMembersController } from "./controllers/erpHrm/members/ErphrmMembersController";
import { ErphrmPermissionsController } from "./controllers/erpHrm/permissions/ErphrmPermissionsController";
import { ErphrmRolesController } from "./controllers/erpHrm/roles/ErphrmRolesController";

@Module({
  controllers: [
    ErphrmAuthGuestController,
    ErphrmAuthMemberController,
    ErphrmGuestSessionsController,
    ErphrmMembersController,
    ErphrmMemberProfileController,
    ErphrmMemberPassword_resetsController,
    ErphrmMemberEmail_verificationsController,
    ErphrmPermissionsController,
    ErphrmRolesController,
    ErphrmMemberEmployeesController,
    ErphrmMemberDepartmentsController,
    ErphrmMemberContractsController,
    ErphrmMemberEmployeesContractsController,
    ErphrmMemberProjectsController,
    ErphrmMemberProjectsMembersController,
    ErphrmMemberProjectsTasksController,
    ErphrmMemberProjectsTasksHistoriesController,
    ErphrmMemberTimelogsController,
    ErphrmMemberTimesheetsController,
    ErphrmMemberTimersController,
    ErphrmMemberReportsTimeController,
    ErphrmMemberReportsProject_budgetController,
    ErphrmMemberReportsWeekly_summaryController,
    ErphrmMemberDashboardPersonalController,
    ErphrmMemberDashboardOrganizationController,
    ErphrmMemberActivity_logsController,
    ErphrmMemberController,
    ErphrmMemberSessionsOrganizationsController,
    ErphrmMemberPasswordsController,
    ErphrmGuestPassword_resetsController,
    ErphrmGuestPassword_resetsCompletionController,
    ErphrmMemberPassword_resetsCompletionController,
    ErphrmGuestEmail_verificationsVerificationController,
    ErphrmMemberAccountController,
    ErphrmMemberInvitationsController,
    ErphrmMemberEmployeesRoleController,
    ErphrmMemberTimesheetsTimelogsController,
  ],
})
export class MyModule {}
