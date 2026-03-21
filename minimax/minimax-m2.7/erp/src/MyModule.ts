import { Module } from "@nestjs/common";

import { ErphrmAdminAdmin_audit_logsController } from "./controllers/erpHrm/admin/admin-audit-logs/ErphrmAdminAdmin_audit_logsController";
import { ErphrmAdminAdmin_sessionsController } from "./controllers/erpHrm/admin/admin-sessions/ErphrmAdminAdmin_sessionsController";
import { ErphrmAdminAdminsController } from "./controllers/erpHrm/admin/admins/ErphrmAdminAdminsController";
import { ErphrmAdminDepartmentsController } from "./controllers/erpHrm/admin/departments/ErphrmAdminDepartmentsController";
import { ErphrmAdminEmployeesController } from "./controllers/erpHrm/admin/employees/ErphrmAdminEmployeesController";
import { ErphrmAdminEmployeesContractsController } from "./controllers/erpHrm/admin/employees/contracts/ErphrmAdminEmployeesContractsController";
import { ErphrmAdminGuest_sessionsController } from "./controllers/erpHrm/admin/guest-sessions/ErphrmAdminGuest_sessionsController";
import { ErphrmAdminGuestsController } from "./controllers/erpHrm/admin/guests/ErphrmAdminGuestsController";
import { ErphrmAdminInvitationsController } from "./controllers/erpHrm/admin/invitations/resend/ErphrmAdminInvitationsController";
import { ErphrmAdminMembersController } from "./controllers/erpHrm/admin/members/ErphrmAdminMembersController";
import { ErphrmAdminOrganizationsActivity_logsController } from "./controllers/erpHrm/admin/organizations/activity-logs/ErphrmAdminOrganizationsActivity_logsController";
import { ErphrmAdminOrganizationsDashboardController } from "./controllers/erpHrm/admin/organizations/dashboard/ErphrmAdminOrganizationsDashboardController";
import { ErphrmAdminOrganizationsReportsController } from "./controllers/erpHrm/admin/organizations/reports/ErphrmAdminOrganizationsReportsController";
import { ErphrmAdminOrganizationsReportsParametersController } from "./controllers/erpHrm/admin/organizations/reports/parameters/ErphrmAdminOrganizationsReportsParametersController";
import { ErphrmAdminOrganizationsReportsTypesController } from "./controllers/erpHrm/admin/organizations/reports/types/ErphrmAdminOrganizationsReportsTypesController";
import { ErphrmAdminProjectsController } from "./controllers/erpHrm/admin/projects/ErphrmAdminProjectsController";
import { ErphrmAdminProjectsMembersController } from "./controllers/erpHrm/admin/projects/members/ErphrmAdminProjectsMembersController";
import { ErphrmAdminProjectsTasksController } from "./controllers/erpHrm/admin/projects/tasks/ErphrmAdminProjectsTasksController";
import { ErphrmAdminProjectsTasksHistoriesController } from "./controllers/erpHrm/admin/projects/tasks/histories/ErphrmAdminProjectsTasksHistoriesController";
import { ErphrmAdminRolesController } from "./controllers/erpHrm/admin/roles/ErphrmAdminRolesController";
import { ErphrmAdminRolesPermissionsController } from "./controllers/erpHrm/admin/roles/permissions/ErphrmAdminRolesPermissionsController";
import { ErphrmAdminTimesheetsController } from "./controllers/erpHrm/admin/timesheets/ErphrmAdminTimesheetsController";
import { ErphrmAdminTimesheetsTimelogsController } from "./controllers/erpHrm/admin/timesheets/timelogs/ErphrmAdminTimesheetsTimelogsController";
import { ErphrmAuthAdminController } from "./controllers/erpHrm/auth/admin/ErphrmAuthAdminController";
import { ErphrmAuthGuestController } from "./controllers/erpHrm/auth/guest/ErphrmAuthGuestController";
import { ErphrmAuthMemberController } from "./controllers/erpHrm/auth/member/ErphrmAuthMemberController";
import { ErphrmMemberDashboardController } from "./controllers/erpHrm/member/dashboard/ErphrmMemberDashboardController";
import { ErphrmMemberDepartmentsController } from "./controllers/erpHrm/member/departments/tree/ErphrmMemberDepartmentsController";
import { ErphrmMemberEmployeesController } from "./controllers/erpHrm/member/employees/ErphrmMemberEmployeesController";
import { ErphrmMemberInvitationsController } from "./controllers/erpHrm/member/invitations/ErphrmMemberInvitationsController";
import { ErphrmMemberOrganizationsActivity_logsController } from "./controllers/erpHrm/member/organizations/activity-logs/ErphrmMemberOrganizationsActivity_logsController";
import { ErphrmMemberOrganizationsDashboardController } from "./controllers/erpHrm/member/organizations/dashboard/ErphrmMemberOrganizationsDashboardController";
import { ErphrmMemberOrganizationsReportsController } from "./controllers/erpHrm/member/organizations/reports/ErphrmMemberOrganizationsReportsController";
import { ErphrmMemberOrganizationsReportsGenerateController } from "./controllers/erpHrm/member/organizations/reports/generate/ErphrmMemberOrganizationsReportsGenerateController";
import { ErphrmMemberOrganizationsReportsParametersController } from "./controllers/erpHrm/member/organizations/reports/parameters/ErphrmMemberOrganizationsReportsParametersController";
import { ErphrmMemberOrganizationsReportsTypesController } from "./controllers/erpHrm/member/organizations/reports/types/ErphrmMemberOrganizationsReportsTypesController";
import { ErphrmMemberPermissionsController } from "./controllers/erpHrm/member/permissions/ErphrmMemberPermissionsController";
import { ErphrmMemberProfileController } from "./controllers/erpHrm/member/profile/ErphrmMemberProfileController";
import { ErphrmMemberProjectsController } from "./controllers/erpHrm/member/projects/ErphrmMemberProjectsController";
import { ErphrmMemberProjectsMembersController } from "./controllers/erpHrm/member/projects/members/ErphrmMemberProjectsMembersController";
import { ErphrmMemberProjectsTasksController } from "./controllers/erpHrm/member/projects/tasks/ErphrmMemberProjectsTasksController";
import { ErphrmMemberProjectsTasksHistoriesController } from "./controllers/erpHrm/member/projects/tasks/histories/ErphrmMemberProjectsTasksHistoriesController";
import { ErphrmMemberRolesController } from "./controllers/erpHrm/member/roles/summary/ErphrmMemberRolesController";
import { ErphrmMemberSessionsController } from "./controllers/erpHrm/member/sessions/ErphrmMemberSessionsController";
import { ErphrmMemberTimelogsController } from "./controllers/erpHrm/member/timelogs/ErphrmMemberTimelogsController";
import { ErphrmMemberTimersController } from "./controllers/erpHrm/member/timers/ErphrmMemberTimersController";
import { ErphrmMemberTimesheetsController } from "./controllers/erpHrm/member/timesheets/ErphrmMemberTimesheetsController";
import { ErphrmMemberTimesheetsTimelogsController } from "./controllers/erpHrm/member/timesheets/timelogs/ErphrmMemberTimesheetsTimelogsController";

@Module({
  controllers: [
    ErphrmAuthGuestController,
    ErphrmAuthMemberController,
    ErphrmAuthAdminController,
    ErphrmAdminMembersController,
    ErphrmMemberProfileController,
    ErphrmAdminAdminsController,
    ErphrmAdminAdmin_audit_logsController,
    ErphrmMemberSessionsController,
    ErphrmAdminAdmin_sessionsController,
    ErphrmAdminGuestsController,
    ErphrmAdminGuest_sessionsController,
    ErphrmAdminOrganizationsActivity_logsController,
    ErphrmMemberOrganizationsActivity_logsController,
    ErphrmAdminOrganizationsReportsController,
    ErphrmMemberOrganizationsReportsController,
    ErphrmAdminOrganizationsReportsParametersController,
    ErphrmMemberOrganizationsReportsParametersController,
    ErphrmAdminEmployeesController,
    ErphrmMemberEmployeesController,
    ErphrmAdminRolesController,
    ErphrmAdminRolesPermissionsController,
    ErphrmAdminDepartmentsController,
    ErphrmAdminEmployeesContractsController,
    ErphrmMemberProjectsController,
    ErphrmAdminProjectsController,
    ErphrmMemberProjectsMembersController,
    ErphrmAdminProjectsMembersController,
    ErphrmMemberProjectsTasksController,
    ErphrmAdminProjectsTasksController,
    ErphrmMemberProjectsTasksHistoriesController,
    ErphrmAdminProjectsTasksHistoriesController,
    ErphrmMemberTimelogsController,
    ErphrmMemberTimersController,
    ErphrmMemberTimesheetsController,
    ErphrmAdminTimesheetsController,
    ErphrmMemberTimesheetsTimelogsController,
    ErphrmAdminTimesheetsTimelogsController,
    ErphrmMemberInvitationsController,
    ErphrmMemberOrganizationsReportsGenerateController,
    ErphrmAdminOrganizationsDashboardController,
    ErphrmMemberOrganizationsDashboardController,
    ErphrmAdminOrganizationsReportsTypesController,
    ErphrmMemberOrganizationsReportsTypesController,
    ErphrmMemberPermissionsController,
    ErphrmMemberRolesController,
    ErphrmMemberDepartmentsController,
    ErphrmMemberDashboardController,
    ErphrmAdminInvitationsController,
  ],
})
export class MyModule {}
