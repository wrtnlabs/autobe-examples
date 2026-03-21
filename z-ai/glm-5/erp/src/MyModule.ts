import { Module } from "@nestjs/common";

import { ErphrmAuthGuestController } from "./controllers/erpHrm/auth/guest/ErphrmAuthGuestController";
import { ErphrmAuthMemberController } from "./controllers/erpHrm/auth/member/ErphrmAuthMemberController";
import { ErphrmMemberActivity_logsController } from "./controllers/erpHrm/member/activity-logs/ErphrmMemberActivity_logsController";
import { ErphrmMemberDashboardController } from "./controllers/erpHrm/member/dashboard/ErphrmMemberDashboardController";
import { ErphrmMemberDashboardsOrganizationController } from "./controllers/erpHrm/member/dashboards/organization/ErphrmMemberDashboardsOrganizationController";
import { ErphrmMemberDashboardsPersonalController } from "./controllers/erpHrm/member/dashboards/personal/ErphrmMemberDashboardsPersonalController";
import { ErphrmMemberDepartmentsController } from "./controllers/erpHrm/member/departments/ErphrmMemberDepartmentsController";
import { ErphrmMemberEmployeesController } from "./controllers/erpHrm/member/employees/ErphrmMemberEmployeesController";
import { ErphrmMemberEmployeesContractsController } from "./controllers/erpHrm/member/employees/contracts/ErphrmMemberEmployeesContractsController";
import { ErphrmMemberEmployeesMeController } from "./controllers/erpHrm/member/employees/me/ErphrmMemberEmployeesMeController";
import { ErphrmMemberGuest_sessionsController } from "./controllers/erpHrm/member/guest-sessions/ErphrmMemberGuest_sessionsController";
import { ErphrmMemberGuestsController } from "./controllers/erpHrm/member/guests/ErphrmMemberGuestsController";
import { ErphrmMemberMembersController } from "./controllers/erpHrm/member/members/ErphrmMemberMembersController";
import { ErphrmMemberOrganizationsController } from "./controllers/erpHrm/member/organizations/ErphrmMemberOrganizationsController";
import { ErphrmMemberOrganizationsInvitationsController } from "./controllers/erpHrm/member/organizations/invitations/ErphrmMemberOrganizationsInvitationsController";
import { ErphrmMemberPassword_resetsController } from "./controllers/erpHrm/member/password-resets/ErphrmMemberPassword_resetsController";
import { ErphrmMemberProfileController } from "./controllers/erpHrm/member/profile/ErphrmMemberProfileController";
import { ErphrmMemberProjectsController } from "./controllers/erpHrm/member/projects/ErphrmMemberProjectsController";
import { ErphrmMemberProjectsAssignedController } from "./controllers/erpHrm/member/projects/assigned/ErphrmMemberProjectsAssignedController";
import { ErphrmMemberProjectsMembersController } from "./controllers/erpHrm/member/projects/members/ErphrmMemberProjectsMembersController";
import { ErphrmMemberProjectsTasksController } from "./controllers/erpHrm/member/projects/tasks/ErphrmMemberProjectsTasksController";
import { ErphrmMemberProjectsTasksHistoriesController } from "./controllers/erpHrm/member/projects/tasks/histories/ErphrmMemberProjectsTasksHistoriesController";
import { ErphrmMemberReportsController } from "./controllers/erpHrm/member/reports/dashboard/ErphrmMemberReportsController";
import { ErphrmMemberReportsProjectsBudgetController } from "./controllers/erpHrm/member/reports/projects/budget/ErphrmMemberReportsProjectsBudgetController";
import { ErphrmMemberReportsTimeController } from "./controllers/erpHrm/member/reports/time/ErphrmMemberReportsTimeController";
import { ErphrmMemberReportsWeekly_summaryController } from "./controllers/erpHrm/member/reports/weekly-summary/ErphrmMemberReportsWeekly_summaryController";
import { ErphrmMemberRolesController } from "./controllers/erpHrm/member/roles/ErphrmMemberRolesController";
import { ErphrmMemberSessionsController } from "./controllers/erpHrm/member/sessions/ErphrmMemberSessionsController";
import { ErphrmMemberTimelogsController } from "./controllers/erpHrm/member/timelogs/ErphrmMemberTimelogsController";
import { ErphrmMemberTimersController } from "./controllers/erpHrm/member/timers/ErphrmMemberTimersController";
import { ErphrmMemberTimersCurrentController } from "./controllers/erpHrm/member/timers/current/ErphrmMemberTimersCurrentController";
import { ErphrmMemberTimesheetsController } from "./controllers/erpHrm/member/timesheets/ErphrmMemberTimesheetsController";
import { ErphrmMemberTimesheetsTimelogsController } from "./controllers/erpHrm/member/timesheets/timelogs/ErphrmMemberTimesheetsTimelogsController";

@Module({
  controllers: [
    ErphrmAuthGuestController,
    ErphrmAuthMemberController,
    ErphrmMemberGuestsController,
    ErphrmMemberGuest_sessionsController,
    ErphrmMemberMembersController,
    ErphrmMemberProfileController,
    ErphrmMemberSessionsController,
    ErphrmMemberPassword_resetsController,
    ErphrmMemberOrganizationsController,
    ErphrmMemberEmployeesController,
    ErphrmMemberRolesController,
    ErphrmMemberDepartmentsController,
    ErphrmMemberEmployeesContractsController,
    ErphrmMemberProjectsController,
    ErphrmMemberProjectsMembersController,
    ErphrmMemberProjectsAssignedController,
    ErphrmMemberProjectsTasksController,
    ErphrmMemberProjectsTasksHistoriesController,
    ErphrmMemberTimelogsController,
    ErphrmMemberTimesheetsController,
    ErphrmMemberTimesheetsTimelogsController,
    ErphrmMemberTimersCurrentController,
    ErphrmMemberTimersController,
    ErphrmMemberOrganizationsInvitationsController,
    ErphrmMemberActivity_logsController,
    ErphrmMemberReportsTimeController,
    ErphrmMemberReportsProjectsBudgetController,
    ErphrmMemberReportsWeekly_summaryController,
    ErphrmMemberDashboardController,
    ErphrmMemberReportsController,
    ErphrmMemberDashboardsPersonalController,
    ErphrmMemberDashboardsOrganizationController,
    ErphrmMemberEmployeesMeController,
  ],
})
export class MyModule {}
