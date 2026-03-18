import { Module } from "@nestjs/common";

import { HrmplatformAuthGuestController } from "./controllers/hrmPlatform/auth/guest/HrmplatformAuthGuestController";
import { HrmplatformAuthMemberController } from "./controllers/hrmPlatform/auth/member/HrmplatformAuthMemberController";
import { HrmplatformGuestSessionsController } from "./controllers/hrmPlatform/guest/sessions/HrmplatformGuestSessionsController";
import { HrmplatformGuestsController } from "./controllers/hrmPlatform/guests/HrmplatformGuestsController";
import { HrmplatformMemberActivity_logsController } from "./controllers/hrmPlatform/member/activity-logs/HrmplatformMemberActivity_logsController";
import { HrmplatformMemberContractsController } from "./controllers/hrmPlatform/member/contracts/HrmplatformMemberContractsController";
import { HrmplatformMemberDashboardOrganizationController } from "./controllers/hrmPlatform/member/dashboard/organization/HrmplatformMemberDashboardOrganizationController";
import { HrmplatformMemberDashboardPersonalController } from "./controllers/hrmPlatform/member/dashboard/personal/HrmplatformMemberDashboardPersonalController";
import { HrmplatformMemberDashboardProjectsController } from "./controllers/hrmPlatform/member/dashboard/projects/HrmplatformMemberDashboardProjectsController";
import { HrmplatformMemberDepartmentsController } from "./controllers/hrmPlatform/member/departments/HrmplatformMemberDepartmentsController";
import { HrmplatformMemberEmployee_department_historiesController } from "./controllers/hrmPlatform/member/employee-department-histories/HrmplatformMemberEmployee_department_historiesController";
import { HrmplatformMemberEmployeesController } from "./controllers/hrmPlatform/member/employees/HrmplatformMemberEmployeesController";
import { HrmplatformMemberEmployeesContractsController } from "./controllers/hrmPlatform/member/employees/contracts/HrmplatformMemberEmployeesContractsController";
import { HrmplatformMemberOrganizationsController } from "./controllers/hrmPlatform/member/organizations/HrmplatformMemberOrganizationsController";
import { HrmplatformMemberProfileController } from "./controllers/hrmPlatform/member/profile/HrmplatformMemberProfileController";
import { HrmplatformMemberProjectsController } from "./controllers/hrmPlatform/member/projects/HrmplatformMemberProjectsController";
import { HrmplatformMemberProjectsAnalyticsController } from "./controllers/hrmPlatform/member/projects/analytics/budget/HrmplatformMemberProjectsAnalyticsController";
import { HrmplatformMemberProjectsAnalyticsTimeController } from "./controllers/hrmPlatform/member/projects/analytics/time/HrmplatformMemberProjectsAnalyticsTimeController";
import { HrmplatformMemberProjectsMembersController } from "./controllers/hrmPlatform/member/projects/members/HrmplatformMemberProjectsMembersController";
import { HrmplatformMemberProjectsMyController } from "./controllers/hrmPlatform/member/projects/my/HrmplatformMemberProjectsMyController";
import { HrmplatformMemberProjectsTasksController } from "./controllers/hrmPlatform/member/projects/tasks/HrmplatformMemberProjectsTasksController";
import { HrmplatformMemberProjectsTasksHistoriesController } from "./controllers/hrmPlatform/member/projects/tasks/histories/HrmplatformMemberProjectsTasksHistoriesController";
import { HrmplatformMemberReportsProject_budgetController } from "./controllers/hrmPlatform/member/reports/project-budget/HrmplatformMemberReportsProject_budgetController";
import { HrmplatformMemberReportsTimeController } from "./controllers/hrmPlatform/member/reports/time/HrmplatformMemberReportsTimeController";
import { HrmplatformMemberReportsWeekly_summaryController } from "./controllers/hrmPlatform/member/reports/weekly-summary/HrmplatformMemberReportsWeekly_summaryController";
import { HrmplatformMemberRolesController } from "./controllers/hrmPlatform/member/roles/HrmplatformMemberRolesController";
import { HrmplatformMemberRolesPermissionsController } from "./controllers/hrmPlatform/member/roles/permissions/HrmplatformMemberRolesPermissionsController";
import { HrmplatformMemberTimelogsController } from "./controllers/hrmPlatform/member/timelogs/HrmplatformMemberTimelogsController";
import { HrmplatformMemberTimersController } from "./controllers/hrmPlatform/member/timers/HrmplatformMemberTimersController";
import { HrmplatformMemberTimesheetsController } from "./controllers/hrmPlatform/member/timesheets/HrmplatformMemberTimesheetsController";
import { HrmplatformMembersController } from "./controllers/hrmPlatform/members/HrmplatformMembersController";

@Module({
  controllers: [
    HrmplatformAuthGuestController,
    HrmplatformAuthMemberController,
    HrmplatformGuestsController,
    HrmplatformGuestSessionsController,
    HrmplatformMembersController,
    HrmplatformMemberProfileController,
    HrmplatformMemberOrganizationsController,
    HrmplatformMemberEmployeesController,
    HrmplatformMemberDepartmentsController,
    HrmplatformMemberEmployee_department_historiesController,
    HrmplatformMemberRolesController,
    HrmplatformMemberRolesPermissionsController,
    HrmplatformMemberEmployeesContractsController,
    HrmplatformMemberContractsController,
    HrmplatformMemberProjectsController,
    HrmplatformMemberProjectsMembersController,
    HrmplatformMemberProjectsTasksController,
    HrmplatformMemberProjectsTasksHistoriesController,
    HrmplatformMemberTimelogsController,
    HrmplatformMemberTimesheetsController,
    HrmplatformMemberTimersController,
    HrmplatformMemberReportsTimeController,
    HrmplatformMemberReportsProject_budgetController,
    HrmplatformMemberReportsWeekly_summaryController,
    HrmplatformMemberDashboardPersonalController,
    HrmplatformMemberDashboardOrganizationController,
    HrmplatformMemberActivity_logsController,
    HrmplatformMemberDashboardProjectsController,
    HrmplatformMemberProjectsAnalyticsController,
    HrmplatformMemberProjectsAnalyticsTimeController,
    HrmplatformMemberProjectsMyController,
  ],
})
export class MyModule {}
