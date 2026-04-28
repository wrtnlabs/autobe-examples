import { Module } from "@nestjs/common";

import { HrmplatformAuthGuestController } from "./controllers/hrmPlatform/auth/guest/HrmplatformAuthGuestController";
import { HrmplatformAuthMemberController } from "./controllers/hrmPlatform/auth/member/HrmplatformAuthMemberController";
import { HrmplatformMemberActivity_logsController } from "./controllers/hrmPlatform/member/activity-logs/HrmplatformMemberActivity_logsController";
import { HrmplatformMemberDepartment_snapshotsController } from "./controllers/hrmPlatform/member/department-snapshots/HrmplatformMemberDepartment_snapshotsController";
import { HrmplatformMemberDepartmentsController } from "./controllers/hrmPlatform/member/departments/HrmplatformMemberDepartmentsController";
import { HrmplatformMemberEmployeesController } from "./controllers/hrmPlatform/member/employees/HrmplatformMemberEmployeesController";
import { HrmplatformMemberEmployeesContractsController } from "./controllers/hrmPlatform/member/employees/contracts/HrmplatformMemberEmployeesContractsController";
import { HrmplatformMemberEmployees_meContractsController } from "./controllers/hrmPlatform/member/employees/me/contracts/HrmplatformMemberEmployees_meContractsController";
import { HrmplatformMemberOrganization_dashboardController } from "./controllers/hrmPlatform/member/organization-dashboard/HrmplatformMemberOrganization_dashboardController";
import { HrmplatformMemberPersonal_dashboardController } from "./controllers/hrmPlatform/member/personal-dashboard/HrmplatformMemberPersonal_dashboardController";
import { HrmplatformMemberProfileController } from "./controllers/hrmPlatform/member/profile/HrmplatformMemberProfileController";
import { HrmplatformMemberProjectsController } from "./controllers/hrmPlatform/member/projects/HrmplatformMemberProjectsController";
import { HrmplatformMemberProjectsMembershipsController } from "./controllers/hrmPlatform/member/projects/memberships/HrmplatformMemberProjectsMembershipsController";
import { HrmplatformMemberProjectsReportsController } from "./controllers/hrmPlatform/member/projects/reports/HrmplatformMemberProjectsReportsController";
import { HrmplatformMemberProjectsReportsTimeController } from "./controllers/hrmPlatform/member/projects/reports/time/HrmplatformMemberProjectsReportsTimeController";
import { HrmplatformMemberProjectsReportsWeeklyController } from "./controllers/hrmPlatform/member/projects/reports/weekly/HrmplatformMemberProjectsReportsWeeklyController";
import { HrmplatformMemberProjectsTasksController } from "./controllers/hrmPlatform/member/projects/tasks/HrmplatformMemberProjectsTasksController";
import { HrmplatformMemberProjectsTasks_historiesController } from "./controllers/hrmPlatform/member/projects/tasks/histories/HrmplatformMemberProjectsTasks_historiesController";
import { HrmplatformMemberReportsProject_budgetController } from "./controllers/hrmPlatform/member/reports/project-budget/HrmplatformMemberReportsProject_budgetController";
import { HrmplatformMemberReportsTimeController } from "./controllers/hrmPlatform/member/reports/time/HrmplatformMemberReportsTimeController";
import { HrmplatformMemberReportsWeekly_summaryController } from "./controllers/hrmPlatform/member/reports/weekly-summary/HrmplatformMemberReportsWeekly_summaryController";
import { HrmplatformMemberRolesController } from "./controllers/hrmPlatform/member/roles/HrmplatformMemberRolesController";
import { HrmplatformMemberRolesRole_permissionsController } from "./controllers/hrmPlatform/member/roles/role-permissions/HrmplatformMemberRolesRole_permissionsController";
import { HrmplatformMemberSessionsController } from "./controllers/hrmPlatform/member/sessions/HrmplatformMemberSessionsController";
import { HrmplatformMemberTasksController } from "./controllers/hrmPlatform/member/tasks/HrmplatformMemberTasksController";
import { HrmplatformMemberTimelogsController } from "./controllers/hrmPlatform/member/timelogs/HrmplatformMemberTimelogsController";
import { HrmplatformMemberTimersController } from "./controllers/hrmPlatform/member/timers/HrmplatformMemberTimersController";
import { HrmplatformMemberTimesheetsController } from "./controllers/hrmPlatform/member/timesheets/HrmplatformMemberTimesheetsController";
import { HrmplatformMembersController } from "./controllers/hrmPlatform/members/HrmplatformMembersController";
import { HrmplatformOrganizationsController } from "./controllers/hrmPlatform/organizations/HrmplatformOrganizationsController";
import { HrmplatformOrganizationsSnapshotsController } from "./controllers/hrmPlatform/organizations/snapshots/HrmplatformOrganizationsSnapshotsController";

@Module({
  controllers: [
    HrmplatformAuthGuestController,
    HrmplatformAuthMemberController,
    HrmplatformMembersController,
    HrmplatformMemberProfileController,
    HrmplatformMemberSessionsController,
    HrmplatformOrganizationsController,
    HrmplatformOrganizationsSnapshotsController,
    HrmplatformMemberDepartmentsController,
    HrmplatformMemberDepartment_snapshotsController,
    HrmplatformMemberRolesController,
    HrmplatformMemberEmployeesController,
    HrmplatformMemberEmployeesContractsController,
    HrmplatformMemberRolesRole_permissionsController,
    HrmplatformMemberProjectsController,
    HrmplatformMemberProjectsMembershipsController,
    HrmplatformMemberProjectsTasksController,
    HrmplatformMemberProjectsTasks_historiesController,
    HrmplatformMemberTasksController,
    HrmplatformMemberTimelogsController,
    HrmplatformMemberTimesheetsController,
    HrmplatformMemberTimersController,
    HrmplatformMemberReportsTimeController,
    HrmplatformMemberReportsProject_budgetController,
    HrmplatformMemberReportsWeekly_summaryController,
    HrmplatformMemberActivity_logsController,
    HrmplatformMemberPersonal_dashboardController,
    HrmplatformMemberOrganization_dashboardController,
    HrmplatformMemberEmployees_meContractsController,
    HrmplatformMemberProjectsReportsTimeController,
    HrmplatformMemberProjectsReportsController,
    HrmplatformMemberProjectsReportsWeeklyController,
  ],
})
export class MyModule {}
