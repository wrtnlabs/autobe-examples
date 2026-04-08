import { Module } from "@nestjs/common";

import { HrmtimetrackAuthGuestController } from "./controllers/hrmTimeTrack/auth/guest/HrmtimetrackAuthGuestController";
import { HrmtimetrackAuthMemberController } from "./controllers/hrmTimeTrack/auth/member/HrmtimetrackAuthMemberController";
import { HrmtimetrackGuestsController } from "./controllers/hrmTimeTrack/guests/HrmtimetrackGuestsController";
import { HrmtimetrackMemberActivity_logsController } from "./controllers/hrmTimeTrack/member/activity-logs/HrmtimetrackMemberActivity_logsController";
import { HrmtimetrackMemberDashboardController } from "./controllers/hrmTimeTrack/member/dashboard/HrmtimetrackMemberDashboardController";
import { HrmtimetrackMemberDepartmentsController } from "./controllers/hrmTimeTrack/member/departments/HrmtimetrackMemberDepartmentsController";
import { HrmtimetrackMemberEffective_permissionsController } from "./controllers/hrmTimeTrack/member/effective-permissions/HrmtimetrackMemberEffective_permissionsController";
import { HrmtimetrackMemberEmail_verificationsController } from "./controllers/hrmTimeTrack/member/email-verifications/HrmtimetrackMemberEmail_verificationsController";
import { HrmtimetrackMemberEmployee_snapshotsController } from "./controllers/hrmTimeTrack/member/employee-snapshots/HrmtimetrackMemberEmployee_snapshotsController";
import { HrmtimetrackMemberEmployeesController } from "./controllers/hrmTimeTrack/member/employees/HrmtimetrackMemberEmployeesController";
import { HrmtimetrackMemberEmployeesContractsController } from "./controllers/hrmTimeTrack/member/employees/contracts/HrmtimetrackMemberEmployeesContractsController";
import { HrmtimetrackMemberOrganization_snapshotsController } from "./controllers/hrmTimeTrack/member/organization-snapshots/HrmtimetrackMemberOrganization_snapshotsController";
import { HrmtimetrackMemberOrganizationsController } from "./controllers/hrmTimeTrack/member/organizations/HrmtimetrackMemberOrganizationsController";
import { HrmtimetrackMemberOrganizations_switchController } from "./controllers/hrmTimeTrack/member/organizations/switch/HrmtimetrackMemberOrganizations_switchController";
import { HrmtimetrackMemberPassword_resetsController } from "./controllers/hrmTimeTrack/member/password-resets/HrmtimetrackMemberPassword_resetsController";
import { HrmtimetrackMemberProfileController } from "./controllers/hrmTimeTrack/member/profile/HrmtimetrackMemberProfileController";
import { HrmtimetrackMemberProjectsController } from "./controllers/hrmTimeTrack/member/projects/HrmtimetrackMemberProjectsController";
import { HrmtimetrackMemberProjectsMembersController } from "./controllers/hrmTimeTrack/member/projects/members/HrmtimetrackMemberProjectsMembersController";
import { HrmtimetrackMemberReportsDepartmentsController } from "./controllers/hrmTimeTrack/member/reports/departments/HrmtimetrackMemberReportsDepartmentsController";
import { HrmtimetrackMemberReportsEmployeesController } from "./controllers/hrmTimeTrack/member/reports/employees/HrmtimetrackMemberReportsEmployeesController";
import { HrmtimetrackMemberReportsRolesController } from "./controllers/hrmTimeTrack/member/reports/roles/HrmtimetrackMemberReportsRolesController";
import { HrmtimetrackMemberRole_snapshotsController } from "./controllers/hrmTimeTrack/member/role-snapshots/HrmtimetrackMemberRole_snapshotsController";
import { HrmtimetrackMemberRole_snapshotsPermissionsController } from "./controllers/hrmTimeTrack/member/role-snapshots/permissions/HrmtimetrackMemberRole_snapshotsPermissionsController";
import { HrmtimetrackMemberRolesController } from "./controllers/hrmTimeTrack/member/roles/HrmtimetrackMemberRolesController";
import { HrmtimetrackMemberRolesPermissionsController } from "./controllers/hrmTimeTrack/member/roles/permissions/HrmtimetrackMemberRolesPermissionsController";
import { HrmtimetrackMemberSessionsController } from "./controllers/hrmTimeTrack/member/sessions/HrmtimetrackMemberSessionsController";
import { HrmtimetrackMemberTasksController } from "./controllers/hrmTimeTrack/member/tasks/HrmtimetrackMemberTasksController";
import { HrmtimetrackMemberTasksHistoriesController } from "./controllers/hrmTimeTrack/member/tasks/histories/HrmtimetrackMemberTasksHistoriesController";
import { HrmtimetrackMemberTimelogsController } from "./controllers/hrmTimeTrack/member/timelogs/HrmtimetrackMemberTimelogsController";
import { HrmtimetrackMemberTimersController } from "./controllers/hrmTimeTrack/member/timers/HrmtimetrackMemberTimersController";
import { HrmtimetrackMemberTimersSnapshotsController } from "./controllers/hrmTimeTrack/member/timers/snapshots/HrmtimetrackMemberTimersSnapshotsController";
import { HrmtimetrackMemberTimesheetsController } from "./controllers/hrmTimeTrack/member/timesheets/HrmtimetrackMemberTimesheetsController";
import { HrmtimetrackMemberTimesheetsSnapshotsController } from "./controllers/hrmTimeTrack/member/timesheets/snapshots/HrmtimetrackMemberTimesheetsSnapshotsController";
import { HrmtimetrackMemberTimesheetsTimelogsController } from "./controllers/hrmTimeTrack/member/timesheets/timelogs/HrmtimetrackMemberTimesheetsTimelogsController";
import { HrmtimetrackMembersController } from "./controllers/hrmTimeTrack/members/HrmtimetrackMembersController";

@Module({
  controllers: [
    HrmtimetrackAuthGuestController,
    HrmtimetrackAuthMemberController,
    HrmtimetrackMembersController,
    HrmtimetrackMemberProfileController,
    HrmtimetrackMemberSessionsController,
    HrmtimetrackMemberPassword_resetsController,
    HrmtimetrackMemberEmail_verificationsController,
    HrmtimetrackGuestsController,
    HrmtimetrackMemberOrganizationsController,
    HrmtimetrackMemberOrganization_snapshotsController,
    HrmtimetrackMemberEmployeesController,
    HrmtimetrackMemberEmployee_snapshotsController,
    HrmtimetrackMemberEmployeesContractsController,
    HrmtimetrackMemberDepartmentsController,
    HrmtimetrackMemberRolesController,
    HrmtimetrackMemberRole_snapshotsController,
    HrmtimetrackMemberRolesPermissionsController,
    HrmtimetrackMemberRole_snapshotsPermissionsController,
    HrmtimetrackMemberProjectsController,
    HrmtimetrackMemberProjectsMembersController,
    HrmtimetrackMemberTasksController,
    HrmtimetrackMemberTasksHistoriesController,
    HrmtimetrackMemberTimelogsController,
    HrmtimetrackMemberTimesheetsController,
    HrmtimetrackMemberTimesheetsTimelogsController,
    HrmtimetrackMemberTimesheetsSnapshotsController,
    HrmtimetrackMemberTimersController,
    HrmtimetrackMemberTimersSnapshotsController,
    HrmtimetrackMemberActivity_logsController,
    HrmtimetrackMemberOrganizations_switchController,
    HrmtimetrackMemberDashboardController,
    HrmtimetrackMemberReportsEmployeesController,
    HrmtimetrackMemberReportsDepartmentsController,
    HrmtimetrackMemberReportsRolesController,
    HrmtimetrackMemberEffective_permissionsController,
  ],
})
export class MyModule {}
