import { Module } from "@nestjs/common";

import { ErphrmAuthGuestController } from "./controllers/erpHrm/auth/guest/ErphrmAuthGuestController";
import { ErphrmAuthMemberController } from "./controllers/erpHrm/auth/member/ErphrmAuthMemberController";
import { ErphrmMemberActivitylogsController } from "./controllers/erpHrm/member/activityLogs/ErphrmMemberActivitylogsController";
import { ErphrmMemberInvitationsController } from "./controllers/erpHrm/member/invitations/accept/ErphrmMemberInvitationsController";
import { ErphrmMemberOrganizationmembersController } from "./controllers/erpHrm/member/organizationMembers/ErphrmMemberOrganizationmembersController";
import { ErphrmMemberOrganizationmembersContractsController } from "./controllers/erpHrm/member/organizationMembers/contracts/ErphrmMemberOrganizationmembersContractsController";
import { ErphrmMemberOrganizationsController } from "./controllers/erpHrm/member/organizations/ErphrmMemberOrganizationsController";
import { ErphrmMemberOrganizationsDepartmentsController } from "./controllers/erpHrm/member/organizations/departments/ErphrmMemberOrganizationsDepartmentsController";
import { ErphrmMemberOrganizationsInvitationsController } from "./controllers/erpHrm/member/organizations/invitations/ErphrmMemberOrganizationsInvitationsController";
import { ErphrmMemberOrganizationsMembersController } from "./controllers/erpHrm/member/organizations/members/ErphrmMemberOrganizationsMembersController";
import { ErphrmMemberOrganizationsOwnershipTransferController } from "./controllers/erpHrm/member/organizations/ownership/transfer/ErphrmMemberOrganizationsOwnershipTransferController";
import { ErphrmMemberOrganizationsRolesController } from "./controllers/erpHrm/member/organizations/roles/ErphrmMemberOrganizationsRolesController";
import { ErphrmMemberOrganizationsRolesPermissionsController } from "./controllers/erpHrm/member/organizations/roles/permissions/ErphrmMemberOrganizationsRolesPermissionsController";
import { ErphrmMemberOrganizations_switchController } from "./controllers/erpHrm/member/organizations/switch/ErphrmMemberOrganizations_switchController";
import { ErphrmMemberProfileController } from "./controllers/erpHrm/member/profile/ErphrmMemberProfileController";
import { ErphrmMemberProjectassignmentsController } from "./controllers/erpHrm/member/projectAssignments/ErphrmMemberProjectassignmentsController";
import { ErphrmMemberProjectsController } from "./controllers/erpHrm/member/projects/ErphrmMemberProjectsController";
import { ErphrmMemberProjectsMembersController } from "./controllers/erpHrm/member/projects/members/ErphrmMemberProjectsMembersController";
import { ErphrmMemberProjectsTasksController } from "./controllers/erpHrm/member/projects/tasks/ErphrmMemberProjectsTasksController";
import { ErphrmMemberProjectsTasksHistoriesController } from "./controllers/erpHrm/member/projects/tasks/histories/ErphrmMemberProjectsTasksHistoriesController";
import { ErphrmMemberSessionsController } from "./controllers/erpHrm/member/sessions/ErphrmMemberSessionsController";
import { ErphrmMemberTimelogsController } from "./controllers/erpHrm/member/timelogs/ErphrmMemberTimelogsController";
import { ErphrmMemberTimersController } from "./controllers/erpHrm/member/timers/ErphrmMemberTimersController";
import { ErphrmMemberTimersCurrentController } from "./controllers/erpHrm/member/timers/current/ErphrmMemberTimersCurrentController";
import { ErphrmMemberTimesheetsController } from "./controllers/erpHrm/member/timesheets/ErphrmMemberTimesheetsController";
import { ErphrmMembersController } from "./controllers/erpHrm/members/ErphrmMembersController";

@Module({
  controllers: [
    ErphrmAuthGuestController,
    ErphrmAuthMemberController,
    ErphrmMembersController,
    ErphrmMemberProfileController,
    ErphrmMemberSessionsController,
    ErphrmMemberOrganizationsController,
    ErphrmMemberOrganizationsMembersController,
    ErphrmMemberOrganizationsRolesController,
    ErphrmMemberOrganizationsRolesPermissionsController,
    ErphrmMemberOrganizationsDepartmentsController,
    ErphrmMemberOrganizationsInvitationsController,
    ErphrmMemberOrganizationmembersController,
    ErphrmMemberOrganizationmembersContractsController,
    ErphrmMemberProjectsController,
    ErphrmMemberProjectassignmentsController,
    ErphrmMemberProjectsMembersController,
    ErphrmMemberProjectsTasksController,
    ErphrmMemberProjectsTasksHistoriesController,
    ErphrmMemberTimelogsController,
    ErphrmMemberTimesheetsController,
    ErphrmMemberTimersController,
    ErphrmMemberTimersCurrentController,
    ErphrmMemberActivitylogsController,
    ErphrmMemberOrganizationsOwnershipTransferController,
    ErphrmMemberInvitationsController,
    ErphrmMemberOrganizations_switchController,
  ],
})
export class MyModule {}
