import { Module } from "@nestjs/common";

import { ErphrmAuthGuestController } from "./controllers/erpHrm/auth/guest/ErphrmAuthGuestController";
import { ErphrmAuthMemberController } from "./controllers/erpHrm/auth/member/ErphrmAuthMemberController";
import { ErphrmGuestSessionsController } from "./controllers/erpHrm/guest/sessions/ErphrmGuestSessionsController";
import { ErphrmMemberContractsController } from "./controllers/erpHrm/member/contracts/ErphrmMemberContractsController";
import { ErphrmMemberDepartmentsController } from "./controllers/erpHrm/member/departments/ErphrmMemberDepartmentsController";
import { ErphrmMemberMembersController } from "./controllers/erpHrm/member/members/ErphrmMemberMembersController";
import { ErphrmMemberOrganizationmembersController } from "./controllers/erpHrm/member/organizationMembers/ErphrmMemberOrganizationmembersController";
import { ErphrmMemberOrganizationsController } from "./controllers/erpHrm/member/organizations/ErphrmMemberOrganizationsController";
import { ErphrmMemberOrganizationsActivity_logsController } from "./controllers/erpHrm/member/organizations/activity-logs/ErphrmMemberOrganizationsActivity_logsController";
import { ErphrmMemberOrganizationsActivity_logsDetailsController } from "./controllers/erpHrm/member/organizations/activity-logs/details/ErphrmMemberOrganizationsActivity_logsDetailsController";
import { ErphrmMemberOrganizationsLogoController } from "./controllers/erpHrm/member/organizations/logo/ErphrmMemberOrganizationsLogoController";
import { ErphrmMemberProfileController } from "./controllers/erpHrm/member/profile/ErphrmMemberProfileController";
import { ErphrmMemberProfileAvatarController } from "./controllers/erpHrm/member/profile/avatar/ErphrmMemberProfileAvatarController";
import { ErphrmMemberProjectsController } from "./controllers/erpHrm/member/projects/ErphrmMemberProjectsController";
import { ErphrmMemberProjectsMembersController } from "./controllers/erpHrm/member/projects/members/ErphrmMemberProjectsMembersController";
import { ErphrmMemberProjectsTasksController } from "./controllers/erpHrm/member/projects/tasks/ErphrmMemberProjectsTasksController";
import { ErphrmMemberProjectsTasksHistoriesController } from "./controllers/erpHrm/member/projects/tasks/histories/ErphrmMemberProjectsTasksHistoriesController";
import { ErphrmMemberRolesController } from "./controllers/erpHrm/member/roles/ErphrmMemberRolesController";
import { ErphrmMemberRolesPermissionsController } from "./controllers/erpHrm/member/roles/permissions/ErphrmMemberRolesPermissionsController";
import { ErphrmMemberTimelogsController } from "./controllers/erpHrm/member/timelogs/ErphrmMemberTimelogsController";
import { ErphrmMemberTimerController } from "./controllers/erpHrm/member/timer/ErphrmMemberTimerController";
import { ErphrmMemberTimersController } from "./controllers/erpHrm/member/timers/ErphrmMemberTimersController";
import { ErphrmMemberTimesheetsController } from "./controllers/erpHrm/member/timesheets/ErphrmMemberTimesheetsController";

@Module({
  controllers: [
    ErphrmAuthGuestController,
    ErphrmAuthMemberController,
    ErphrmMemberMembersController,
    ErphrmGuestSessionsController,
    ErphrmMemberProfileController,
    ErphrmMemberOrganizationsController,
    ErphrmMemberOrganizationmembersController,
    ErphrmMemberRolesController,
    ErphrmMemberDepartmentsController,
    ErphrmMemberContractsController,
    ErphrmMemberRolesPermissionsController,
    ErphrmMemberProjectsController,
    ErphrmMemberProjectsMembersController,
    ErphrmMemberProjectsTasksController,
    ErphrmMemberProjectsTasksHistoriesController,
    ErphrmMemberTimerController,
    ErphrmMemberTimersController,
    ErphrmMemberTimesheetsController,
    ErphrmMemberTimelogsController,
    ErphrmMemberOrganizationsActivity_logsController,
    ErphrmMemberOrganizationsActivity_logsDetailsController,
    ErphrmMemberOrganizationsLogoController,
    ErphrmMemberProfileAvatarController,
  ],
})
export class MyModule {}
