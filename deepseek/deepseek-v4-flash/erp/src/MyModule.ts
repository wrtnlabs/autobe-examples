import { Module } from "@nestjs/common";

import { HrmtimetrackingAuthGuestController } from "./controllers/hrmTimeTracking/auth/guest/HrmtimetrackingAuthGuestController";
import { HrmtimetrackingAuthMemberController } from "./controllers/hrmTimeTracking/auth/member/HrmtimetrackingAuthMemberController";
import { HrmtimetrackingEmployeesController } from "./controllers/hrmTimeTracking/employees/HrmtimetrackingEmployeesController";
import { HrmtimetrackingEmployeesContractsController } from "./controllers/hrmTimeTracking/employees/contracts/HrmtimetrackingEmployeesContractsController";
import { HrmtimetrackingEmployeesSnapshotsController } from "./controllers/hrmTimeTracking/employees/snapshots/HrmtimetrackingEmployeesSnapshotsController";
import { HrmtimetrackingGuestProfileController } from "./controllers/hrmTimeTracking/guest/profile/HrmtimetrackingGuestProfileController";
import { HrmtimetrackingGuestSessionsController } from "./controllers/hrmTimeTracking/guest/sessions/HrmtimetrackingGuestSessionsController";
import { HrmtimetrackingGuestsController } from "./controllers/hrmTimeTracking/guests/HrmtimetrackingGuestsController";
import { HrmtimetrackingMemberActivity_log_typesController } from "./controllers/hrmTimeTracking/member/activity-log-types/HrmtimetrackingMemberActivity_log_typesController";
import { HrmtimetrackingMemberActivity_logsController } from "./controllers/hrmTimeTracking/member/activity-logs/HrmtimetrackingMemberActivity_logsController";
import { HrmtimetrackingMemberActivitylogtypesController } from "./controllers/hrmTimeTracking/member/activityLogTypes/HrmtimetrackingMemberActivitylogtypesController";
import { HrmtimetrackingMemberAvailable_permissionsController } from "./controllers/hrmTimeTracking/member/available-permissions/HrmtimetrackingMemberAvailable_permissionsController";
import { HrmtimetrackingMemberDashboardController } from "./controllers/hrmTimeTracking/member/dashboard/HrmtimetrackingMemberDashboardController";
import { HrmtimetrackingMemberDashboardOrganizationController } from "./controllers/hrmTimeTracking/member/dashboard/organization/HrmtimetrackingMemberDashboardOrganizationController";
import { HrmtimetrackingMemberDepartmentsController } from "./controllers/hrmTimeTracking/member/departments/HrmtimetrackingMemberDepartmentsController";
import { HrmtimetrackingMemberDepartmentsSnapshotsController } from "./controllers/hrmTimeTracking/member/departments/snapshots/HrmtimetrackingMemberDepartmentsSnapshotsController";
import { HrmtimetrackingMemberInvitationsController } from "./controllers/hrmTimeTracking/member/invitations/HrmtimetrackingMemberInvitationsController";
import { HrmtimetrackingMemberOrganizationsController } from "./controllers/hrmTimeTracking/member/organizations/HrmtimetrackingMemberOrganizationsController";
import { HrmtimetrackingMemberOrganizationsDashboardController } from "./controllers/hrmTimeTracking/member/organizations/dashboard/HrmtimetrackingMemberOrganizationsDashboardController";
import { HrmtimetrackingMemberOrganizationsDeletion_requirementsController } from "./controllers/hrmTimeTracking/member/organizations/deletion-requirements/HrmtimetrackingMemberOrganizationsDeletion_requirementsController";
import { HrmtimetrackingMemberOrganizationsFilesController } from "./controllers/hrmTimeTracking/member/organizations/files/HrmtimetrackingMemberOrganizationsFilesController";
import { HrmtimetrackingMemberOrganizationsRolesController } from "./controllers/hrmTimeTracking/member/organizations/roles/HrmtimetrackingMemberOrganizationsRolesController";
import { HrmtimetrackingMemberOrganizationsRolesPermissionsController } from "./controllers/hrmTimeTracking/member/organizations/roles/permissions/HrmtimetrackingMemberOrganizationsRolesPermissionsController";
import { HrmtimetrackingMemberOrganizationsSnapshotsController } from "./controllers/hrmTimeTracking/member/organizations/snapshots/HrmtimetrackingMemberOrganizationsSnapshotsController";
import { HrmtimetrackingMemberOrganizationsTransfer_ownershipController } from "./controllers/hrmTimeTracking/member/organizations/transfer-ownership/HrmtimetrackingMemberOrganizationsTransfer_ownershipController";
import { HrmtimetrackingMemberProjectsController } from "./controllers/hrmTimeTracking/member/projects/HrmtimetrackingMemberProjectsController";
import { HrmtimetrackingMemberProjectsAssignedController } from "./controllers/hrmTimeTracking/member/projects/assigned/HrmtimetrackingMemberProjectsAssignedController";
import { HrmtimetrackingMemberProjectsMembersController } from "./controllers/hrmTimeTracking/member/projects/members/HrmtimetrackingMemberProjectsMembersController";
import { HrmtimetrackingMemberProjectsStatusController } from "./controllers/hrmTimeTracking/member/projects/status/HrmtimetrackingMemberProjectsStatusController";
import { HrmtimetrackingMemberProjectsTasksController } from "./controllers/hrmTimeTracking/member/projects/tasks/HrmtimetrackingMemberProjectsTasksController";
import { HrmtimetrackingMemberProjectsTasksHistoriesController } from "./controllers/hrmTimeTracking/member/projects/tasks/histories/HrmtimetrackingMemberProjectsTasksHistoriesController";
import { HrmtimetrackingMemberProjectsTasksStatusController } from "./controllers/hrmTimeTracking/member/projects/tasks/status/HrmtimetrackingMemberProjectsTasksStatusController";
import { HrmtimetrackingMemberSwitch_organizationController } from "./controllers/hrmTimeTracking/member/switch-organization/HrmtimetrackingMemberSwitch_organizationController";
import { HrmtimetrackingMember_switchOrganizationsController } from "./controllers/hrmTimeTracking/member/switch/organizations/HrmtimetrackingMember_switchOrganizationsController";
import { HrmtimetrackingMemberTimelogsController } from "./controllers/hrmTimeTracking/member/timelogs/HrmtimetrackingMemberTimelogsController";
import { HrmtimetrackingMemberTimersController } from "./controllers/hrmTimeTracking/member/timers/HrmtimetrackingMemberTimersController";
import { HrmtimetrackingMemberTimesheetsController } from "./controllers/hrmTimeTracking/member/timesheets/HrmtimetrackingMemberTimesheetsController";
import { HrmtimetrackingMembersController } from "./controllers/hrmTimeTracking/members/HrmtimetrackingMembersController";

@Module({
  controllers: [
    HrmtimetrackingAuthGuestController,
    HrmtimetrackingAuthMemberController,
    HrmtimetrackingGuestsController,
    HrmtimetrackingGuestProfileController,
    HrmtimetrackingGuestSessionsController,
    HrmtimetrackingMembersController,
    HrmtimetrackingMemberOrganizationsController,
    HrmtimetrackingMemberOrganizationsFilesController,
    HrmtimetrackingMemberOrganizationsSnapshotsController,
    HrmtimetrackingMemberDepartmentsController,
    HrmtimetrackingMemberDepartmentsSnapshotsController,
    HrmtimetrackingMemberOrganizationsRolesController,
    HrmtimetrackingMemberOrganizationsRolesPermissionsController,
    HrmtimetrackingEmployeesController,
    HrmtimetrackingEmployeesContractsController,
    HrmtimetrackingEmployeesSnapshotsController,
    HrmtimetrackingMemberProjectsController,
    HrmtimetrackingMemberProjectsMembersController,
    HrmtimetrackingMemberProjectsTasksController,
    HrmtimetrackingMemberProjectsTasksHistoriesController,
    HrmtimetrackingMemberTimelogsController,
    HrmtimetrackingMemberTimesheetsController,
    HrmtimetrackingMemberTimersController,
    HrmtimetrackingMemberInvitationsController,
    HrmtimetrackingMemberActivity_logsController,
    HrmtimetrackingMemberActivitylogtypesController,
    HrmtimetrackingMemberActivity_log_typesController,
    HrmtimetrackingMemberSwitch_organizationController,
    HrmtimetrackingMember_switchOrganizationsController,
    HrmtimetrackingMemberOrganizationsTransfer_ownershipController,
    HrmtimetrackingMemberOrganizationsDeletion_requirementsController,
    HrmtimetrackingMemberAvailable_permissionsController,
    HrmtimetrackingMemberDashboardController,
    HrmtimetrackingMemberDashboardOrganizationController,
    HrmtimetrackingMemberProjectsAssignedController,
    HrmtimetrackingMemberProjectsStatusController,
    HrmtimetrackingMemberProjectsTasksStatusController,
    HrmtimetrackingMemberOrganizationsDashboardController,
  ],
})
export class MyModule {}
