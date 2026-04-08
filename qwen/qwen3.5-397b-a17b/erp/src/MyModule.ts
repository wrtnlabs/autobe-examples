import { Module } from "@nestjs/common";

import { HrmplatformAuthGuestController } from "./controllers/hrmPlatform/auth/guest/HrmplatformAuthGuestController";
import { HrmplatformAuthMemberController } from "./controllers/hrmPlatform/auth/member/HrmplatformAuthMemberController";
import { HrmplatformMemberActivity_logsController } from "./controllers/hrmPlatform/member/activity-logs/HrmplatformMemberActivity_logsController";
import { HrmplatformMemberDashboardOrganizationController } from "./controllers/hrmPlatform/member/dashboard/organization/HrmplatformMemberDashboardOrganizationController";
import { HrmplatformMemberDashboardController } from "./controllers/hrmPlatform/member/dashboard/personal/HrmplatformMemberDashboardController";
import { HrmplatformMemberEmployee_contractsController } from "./controllers/hrmPlatform/member/employee-contracts/HrmplatformMemberEmployee_contractsController";
import { HrmplatformMemberEmployee_invitationsController } from "./controllers/hrmPlatform/member/employee-invitations/HrmplatformMemberEmployee_invitationsController";
import { HrmplatformMemberEmployeesController } from "./controllers/hrmPlatform/member/employees/HrmplatformMemberEmployeesController";
import { HrmplatformMemberMembershipsController } from "./controllers/hrmPlatform/member/memberships/HrmplatformMemberMembershipsController";
import { HrmplatformMemberOrganizationsController } from "./controllers/hrmPlatform/member/organizations/HrmplatformMemberOrganizationsController";
import { HrmplatformMemberOrganizationsDepartmentsController } from "./controllers/hrmPlatform/member/organizations/departments/HrmplatformMemberOrganizationsDepartmentsController";
import { HrmplatformMemberPermissionsController } from "./controllers/hrmPlatform/member/permissions/HrmplatformMemberPermissionsController";
import { HrmplatformMemberProfileController } from "./controllers/hrmPlatform/member/profile/HrmplatformMemberProfileController";
import { HrmplatformMemberProjectsController } from "./controllers/hrmPlatform/member/projects/HrmplatformMemberProjectsController";
import { HrmplatformMemberProjectsMembersController } from "./controllers/hrmPlatform/member/projects/members/HrmplatformMemberProjectsMembersController";
import { HrmplatformMemberProjectsTasksController } from "./controllers/hrmPlatform/member/projects/tasks/HrmplatformMemberProjectsTasksController";
import { HrmplatformMemberProjectsTasksHistoriesController } from "./controllers/hrmPlatform/member/projects/tasks/histories/HrmplatformMemberProjectsTasksHistoriesController";
import { HrmplatformMemberReportsProject_budgetController } from "./controllers/hrmPlatform/member/reports/project-budget/HrmplatformMemberReportsProject_budgetController";
import { HrmplatformMemberReportsTimeController } from "./controllers/hrmPlatform/member/reports/time/HrmplatformMemberReportsTimeController";
import { HrmplatformMemberReportsWeekly_summaryController } from "./controllers/hrmPlatform/member/reports/weekly-summary/HrmplatformMemberReportsWeekly_summaryController";
import { HrmplatformMemberRolesController } from "./controllers/hrmPlatform/member/roles/HrmplatformMemberRolesController";
import { HrmplatformMemberTimelogsController } from "./controllers/hrmPlatform/member/timelogs/HrmplatformMemberTimelogsController";
import { HrmplatformMemberTimersController } from "./controllers/hrmPlatform/member/timers/HrmplatformMemberTimersController";
import { HrmplatformMemberTimersActiveController } from "./controllers/hrmPlatform/member/timers/active/HrmplatformMemberTimersActiveController";
import { HrmplatformMemberTimesheetsController } from "./controllers/hrmPlatform/member/timesheets/HrmplatformMemberTimesheetsController";

@Module({
  controllers: [
    HrmplatformAuthGuestController,
    HrmplatformAuthMemberController,
    HrmplatformMemberProfileController,
    HrmplatformMemberOrganizationsController,
    HrmplatformMemberOrganizationsDepartmentsController,
    HrmplatformMemberMembershipsController,
    HrmplatformMemberRolesController,
    HrmplatformMemberPermissionsController,
    HrmplatformMemberEmployeesController,
    HrmplatformMemberEmployee_contractsController,
    HrmplatformMemberEmployee_invitationsController,
    HrmplatformMemberProjectsController,
    HrmplatformMemberProjectsMembersController,
    HrmplatformMemberProjectsTasksController,
    HrmplatformMemberProjectsTasksHistoriesController,
    HrmplatformMemberTimelogsController,
    HrmplatformMemberTimesheetsController,
    HrmplatformMemberTimersActiveController,
    HrmplatformMemberTimersController,
    HrmplatformMemberActivity_logsController,
    HrmplatformMemberReportsTimeController,
    HrmplatformMemberReportsProject_budgetController,
    HrmplatformMemberReportsWeekly_summaryController,
    HrmplatformMemberDashboardController,
    HrmplatformMemberDashboardOrganizationController,
  ],
})
export class MyModule {}
