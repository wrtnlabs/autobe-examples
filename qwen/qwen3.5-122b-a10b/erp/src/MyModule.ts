import { Module } from "@nestjs/common";

import { HrmplatformAuthGuestController } from "./controllers/hrmPlatform/auth/guest/HrmplatformAuthGuestController";
import { HrmplatformAuthMemberController } from "./controllers/hrmPlatform/auth/member/HrmplatformAuthMemberController";
import { HrmplatformMemberActivity_logsController } from "./controllers/hrmPlatform/member/activity-logs/HrmplatformMemberActivity_logsController";
import { HrmplatformMemberContractsnapshotsController } from "./controllers/hrmPlatform/member/contractSnapshots/HrmplatformMemberContractsnapshotsController";
import { HrmplatformMemberContractsController } from "./controllers/hrmPlatform/member/contracts/HrmplatformMemberContractsController";
import { HrmplatformMemberDashboardOrganizationController } from "./controllers/hrmPlatform/member/dashboard/organization/HrmplatformMemberDashboardOrganizationController";
import { HrmplatformMemberDashboardPersonalController } from "./controllers/hrmPlatform/member/dashboard/personal/HrmplatformMemberDashboardPersonalController";
import { HrmplatformMemberDepartmentsnapshotsController } from "./controllers/hrmPlatform/member/departmentSnapshots/HrmplatformMemberDepartmentsnapshotsController";
import { HrmplatformMemberDepartmentsController } from "./controllers/hrmPlatform/member/departments/HrmplatformMemberDepartmentsController";
import { HrmplatformMemberDepartmentsSnapshotsController } from "./controllers/hrmPlatform/member/departments/snapshots/HrmplatformMemberDepartmentsSnapshotsController";
import { HrmplatformMemberEmail_verificationsController } from "./controllers/hrmPlatform/member/email-verifications/HrmplatformMemberEmail_verificationsController";
import { HrmplatformMemberEmployeesnapshotsController } from "./controllers/hrmPlatform/member/employeeSnapshots/HrmplatformMemberEmployeesnapshotsController";
import { HrmplatformMemberEmployeesController } from "./controllers/hrmPlatform/member/employees/HrmplatformMemberEmployeesController";
import { HrmplatformMemberEmployeesContractsController } from "./controllers/hrmPlatform/member/employees/contracts/HrmplatformMemberEmployeesContractsController";
import { HrmplatformMemberInvitationsController } from "./controllers/hrmPlatform/member/invitations/HrmplatformMemberInvitationsController";
import { HrmplatformMemberOrganizationsController } from "./controllers/hrmPlatform/member/organizations/HrmplatformMemberOrganizationsController";
import { HrmplatformMemberOrganizationsSnapshotsController } from "./controllers/hrmPlatform/member/organizations/snapshots/HrmplatformMemberOrganizationsSnapshotsController";
import { HrmplatformMemberPermissionsController } from "./controllers/hrmPlatform/member/permissions/HrmplatformMemberPermissionsController";
import { HrmplatformMemberProfileController } from "./controllers/hrmPlatform/member/profile/HrmplatformMemberProfileController";
import { HrmplatformMemberProjectsController } from "./controllers/hrmPlatform/member/projects/HrmplatformMemberProjectsController";
import { HrmplatformMemberProjectsMembersController } from "./controllers/hrmPlatform/member/projects/members/HrmplatformMemberProjectsMembersController";
import { HrmplatformMemberProjectsSnapshotsController } from "./controllers/hrmPlatform/member/projects/snapshots/HrmplatformMemberProjectsSnapshotsController";
import { HrmplatformMemberProjectsTasksController } from "./controllers/hrmPlatform/member/projects/tasks/HrmplatformMemberProjectsTasksController";
import { HrmplatformMemberProjectsTasksHistoriesController } from "./controllers/hrmPlatform/member/projects/tasks/histories/HrmplatformMemberProjectsTasksHistoriesController";
import { HrmplatformMemberProjectsTasksStatusController } from "./controllers/hrmPlatform/member/projects/tasks/status/HrmplatformMemberProjectsTasksStatusController";
import { HrmplatformMemberReportsProject_budgetController } from "./controllers/hrmPlatform/member/reports/project-budget/HrmplatformMemberReportsProject_budgetController";
import { HrmplatformMemberReportsTimeController } from "./controllers/hrmPlatform/member/reports/time/HrmplatformMemberReportsTimeController";
import { HrmplatformMemberReportsWeekly_summaryController } from "./controllers/hrmPlatform/member/reports/weekly-summary/HrmplatformMemberReportsWeekly_summaryController";
import { HrmplatformMemberRolesController } from "./controllers/hrmPlatform/member/roles/HrmplatformMemberRolesController";
import { HrmplatformMemberRolesBuilt_inController } from "./controllers/hrmPlatform/member/roles/built-in/HrmplatformMemberRolesBuilt_inController";
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
    HrmplatformMemberEmail_verificationsController,
    HrmplatformMemberOrganizationsController,
    HrmplatformMemberOrganizationsSnapshotsController,
    HrmplatformMemberEmployeesController,
    HrmplatformMemberDepartmentsController,
    HrmplatformMemberEmployeesContractsController,
    HrmplatformMemberContractsController,
    HrmplatformMemberEmployeesnapshotsController,
    HrmplatformMemberDepartmentsnapshotsController,
    HrmplatformMemberDepartmentsSnapshotsController,
    HrmplatformMemberContractsnapshotsController,
    HrmplatformMemberProjectsController,
    HrmplatformMemberProjectsMembersController,
    HrmplatformMemberProjectsTasksController,
    HrmplatformMemberProjectsTasksHistoriesController,
    HrmplatformMemberProjectsSnapshotsController,
    HrmplatformMemberTimelogsController,
    HrmplatformMemberTimersController,
    HrmplatformMemberTimesheetsController,
    HrmplatformMemberRolesController,
    HrmplatformMemberRolesPermissionsController,
    HrmplatformMemberPermissionsController,
    HrmplatformMemberActivity_logsController,
    HrmplatformMemberDashboardPersonalController,
    HrmplatformMemberDashboardOrganizationController,
    HrmplatformMemberReportsTimeController,
    HrmplatformMemberReportsProject_budgetController,
    HrmplatformMemberReportsWeekly_summaryController,
    HrmplatformMemberInvitationsController,
    HrmplatformMemberProjectsTasksStatusController,
    HrmplatformMemberRolesBuilt_inController,
  ],
})
export class MyModule {}
