import { Module } from "@nestjs/common";

import { HrmplatformAuthGuestController } from "./controllers/hrmPlatform/auth/guest/HrmplatformAuthGuestController";
import { HrmplatformAuthMemberController } from "./controllers/hrmPlatform/auth/member/HrmplatformAuthMemberController";
import { HrmplatformMemberActivity_logsController } from "./controllers/hrmPlatform/member/activity-logs/HrmplatformMemberActivity_logsController";
import { HrmplatformMemberDashboardController } from "./controllers/hrmPlatform/member/dashboard/HrmplatformMemberDashboardController";
import { HrmplatformMemberDepartmentsController } from "./controllers/hrmPlatform/member/departments/HrmplatformMemberDepartmentsController";
import { HrmplatformMemberEmployeesController } from "./controllers/hrmPlatform/member/employees/HrmplatformMemberEmployeesController";
import { HrmplatformMemberEmployeesContractsController } from "./controllers/hrmPlatform/member/employees/contracts/HrmplatformMemberEmployeesContractsController";
import { HrmplatformMemberInvitationsController } from "./controllers/hrmPlatform/member/invitations/HrmplatformMemberInvitationsController";
import { HrmplatformMemberOrganizationsController } from "./controllers/hrmPlatform/member/organizations/HrmplatformMemberOrganizationsController";
import { HrmplatformMemberOrganizationsMyController } from "./controllers/hrmPlatform/member/organizations/my/HrmplatformMemberOrganizationsMyController";
import { HrmplatformMemberProfileController } from "./controllers/hrmPlatform/member/profile/HrmplatformMemberProfileController";
import { HrmplatformMemberProjectsController } from "./controllers/hrmPlatform/member/projects/HrmplatformMemberProjectsController";
import { HrmplatformMemberProjectsMembersController } from "./controllers/hrmPlatform/member/projects/members/HrmplatformMemberProjectsMembersController";
import { HrmplatformMemberProjectsTasksController } from "./controllers/hrmPlatform/member/projects/tasks/HrmplatformMemberProjectsTasksController";
import { HrmplatformMemberProjectsTasksHistoriesController } from "./controllers/hrmPlatform/member/projects/tasks/histories/HrmplatformMemberProjectsTasksHistoriesController";
import { HrmplatformMemberReportsBudgetController } from "./controllers/hrmPlatform/member/reports/budget/HrmplatformMemberReportsBudgetController";
import { HrmplatformMemberReportsTimeController } from "./controllers/hrmPlatform/member/reports/time/HrmplatformMemberReportsTimeController";
import { HrmplatformMemberReportsWeekly_summaryController } from "./controllers/hrmPlatform/member/reports/weekly-summary/HrmplatformMemberReportsWeekly_summaryController";
import { HrmplatformMemberRolesController } from "./controllers/hrmPlatform/member/roles/HrmplatformMemberRolesController";
import { HrmplatformMemberRolesPermissionsController } from "./controllers/hrmPlatform/member/roles/permissions/HrmplatformMemberRolesPermissionsController";
import { HrmplatformMemberSessionsController } from "./controllers/hrmPlatform/member/sessions/HrmplatformMemberSessionsController";
import { HrmplatformMemberTimelogsController } from "./controllers/hrmPlatform/member/timelogs/HrmplatformMemberTimelogsController";
import { HrmplatformMemberTimersController } from "./controllers/hrmPlatform/member/timers/HrmplatformMemberTimersController";
import { HrmplatformMemberTimesheetsController } from "./controllers/hrmPlatform/member/timesheets/HrmplatformMemberTimesheetsController";

@Module({
  controllers: [
    HrmplatformAuthGuestController,
    HrmplatformAuthMemberController,
    HrmplatformMemberProfileController,
    HrmplatformMemberSessionsController,
    HrmplatformMemberOrganizationsController,
    HrmplatformMemberDepartmentsController,
    HrmplatformMemberEmployeesController,
    HrmplatformMemberEmployeesContractsController,
    HrmplatformMemberRolesController,
    HrmplatformMemberRolesPermissionsController,
    HrmplatformMemberInvitationsController,
    HrmplatformMemberProjectsController,
    HrmplatformMemberProjectsMembersController,
    HrmplatformMemberProjectsTasksController,
    HrmplatformMemberProjectsTasksHistoriesController,
    HrmplatformMemberTimelogsController,
    HrmplatformMemberTimesheetsController,
    HrmplatformMemberTimersController,
    HrmplatformMemberReportsTimeController,
    HrmplatformMemberReportsBudgetController,
    HrmplatformMemberReportsWeekly_summaryController,
    HrmplatformMemberDashboardController,
    HrmplatformMemberActivity_logsController,
    HrmplatformMemberOrganizationsMyController,
  ],
})
export class MyModule {}
