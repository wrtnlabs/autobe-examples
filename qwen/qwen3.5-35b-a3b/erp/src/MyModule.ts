import { Module } from "@nestjs/common";

import { HrmsAuthGuestController } from "./controllers/hrms/auth/guest/HrmsAuthGuestController";
import { HrmsAuthMemberController } from "./controllers/hrms/auth/member/HrmsAuthMemberController";
import { HrmsGuestGuest_sessionsController } from "./controllers/hrms/guest/guest-sessions/HrmsGuestGuest_sessionsController";
import { HrmsGuestProfileController } from "./controllers/hrms/guest/profile/HrmsGuestProfileController";
import { HrmsGuestsController } from "./controllers/hrms/guests/HrmsGuestsController";
import { HrmsMemberActivity_logsController } from "./controllers/hrms/member/activity-logs/HrmsMemberActivity_logsController";
import { HrmsMemberAvatarController } from "./controllers/hrms/member/avatar/HrmsMemberAvatarController";
import { HrmsMemberContractsController } from "./controllers/hrms/member/contracts/analytics/HrmsMemberContractsController";
import { HrmsMemberDashboardController } from "./controllers/hrms/member/dashboard/HrmsMemberDashboardController";
import { HrmsMemberDashboardOrganizationController } from "./controllers/hrms/member/dashboard/organization/HrmsMemberDashboardOrganizationController";
import { HrmsMemberDepartmentsController } from "./controllers/hrms/member/departments/HrmsMemberDepartmentsController";
import { HrmsMemberDepartmentsEmployeesController } from "./controllers/hrms/member/departments/employees/metrics/HrmsMemberDepartmentsEmployeesController";
import { HrmsMemberEmail_verificationsController } from "./controllers/hrms/member/email-verifications/HrmsMemberEmail_verificationsController";
import { HrmsMemberEmployeesController } from "./controllers/hrms/member/employees/HrmsMemberEmployeesController";
import { HrmsMemberEmployeesAnalyticsController } from "./controllers/hrms/member/employees/analytics/HrmsMemberEmployeesAnalyticsController";
import { HrmsMemberEmployeesContractsController } from "./controllers/hrms/member/employees/contracts/HrmsMemberEmployeesContractsController";
import { HrmsMemberFilesController } from "./controllers/hrms/member/files/HrmsMemberFilesController";
import { HrmsMemberFilesPermanently_deleteController } from "./controllers/hrms/member/files/permanently-delete/HrmsMemberFilesPermanently_deleteController";
import { HrmsMemberController } from "./controllers/hrms/member/metrics/HrmsMemberController";
import { HrmsMemberOrganization_dashboardController } from "./controllers/hrms/member/organization-dashboard/HrmsMemberOrganization_dashboardController";
import { HrmsMemberOrganization_membersController } from "./controllers/hrms/member/organization-members/HrmsMemberOrganization_membersController";
import { HrmsMemberOrganizationDashboardController } from "./controllers/hrms/member/organization/dashboard/HrmsMemberOrganizationDashboardController";
import { HrmsMemberOrganizationsController } from "./controllers/hrms/member/organizations/HrmsMemberOrganizationsController";
import { HrmsMemberOrganizationsDepartmentsController } from "./controllers/hrms/member/organizations/departments/HrmsMemberOrganizationsDepartmentsController";
import { HrmsMemberOrganizationsEmployeesController } from "./controllers/hrms/member/organizations/employees/HrmsMemberOrganizationsEmployeesController";
import { HrmsMemberOrganizationsEmployeesTimelogsController } from "./controllers/hrms/member/organizations/employees/timelogs/HrmsMemberOrganizationsEmployeesTimelogsController";
import { HrmsMemberOrganizationsFilesController } from "./controllers/hrms/member/organizations/files/HrmsMemberOrganizationsFilesController";
import { HrmsMemberOrganizationsLogoController } from "./controllers/hrms/member/organizations/logo/HrmsMemberOrganizationsLogoController";
import { HrmsMemberOrganizationsProjectsController } from "./controllers/hrms/member/organizations/projects/HrmsMemberOrganizationsProjectsController";
import { HrmsMemberOrganizationsProjectsMembersController } from "./controllers/hrms/member/organizations/projects/members/HrmsMemberOrganizationsProjectsMembersController";
import { HrmsMemberOrganizationsRolesController } from "./controllers/hrms/member/organizations/roles/HrmsMemberOrganizationsRolesController";
import { HrmsMemberOrganizations_switchController } from "./controllers/hrms/member/organizations/switch/HrmsMemberOrganizations_switchController";
import { HrmsMemberOrganizationsTasksController } from "./controllers/hrms/member/organizations/tasks/HrmsMemberOrganizationsTasksController";
import { HrmsMemberOrganizationsTimerController } from "./controllers/hrms/member/organizations/timer/HrmsMemberOrganizationsTimerController";
import { HrmsMemberPassword_resetsController } from "./controllers/hrms/member/password-resets/HrmsMemberPassword_resetsController";
import { HrmsMemberProjectsController } from "./controllers/hrms/member/projects/HrmsMemberProjectsController";
import { HrmsMemberProjectsAnalyticsController } from "./controllers/hrms/member/projects/analytics/HrmsMemberProjectsAnalyticsController";
import { HrmsMemberProjectsMembersController } from "./controllers/hrms/member/projects/members/HrmsMemberProjectsMembersController";
import { HrmsMemberProjectsStatus_analyticsController } from "./controllers/hrms/member/projects/status-analytics/HrmsMemberProjectsStatus_analyticsController";
import { HrmsMemberProjectsTasksController } from "./controllers/hrms/member/projects/tasks/HrmsMemberProjectsTasksController";
import { HrmsMemberProjectsTasksStatus_historyController } from "./controllers/hrms/member/projects/tasks/status-history/HrmsMemberProjectsTasksStatus_historyController";
import { HrmsMemberProjectsTop_employeesController } from "./controllers/hrms/member/projects/top-employees/HrmsMemberProjectsTop_employeesController";
import { HrmsMemberReportsController } from "./controllers/hrms/member/reports/budget/HrmsMemberReportsController";
import { HrmsMemberReportsTimeController } from "./controllers/hrms/member/reports/time/HrmsMemberReportsTimeController";
import { HrmsMemberReportsTop_employeesController } from "./controllers/hrms/member/reports/top-employees/HrmsMemberReportsTop_employeesController";
import { HrmsMemberReportsWeeklyController } from "./controllers/hrms/member/reports/weekly/HrmsMemberReportsWeeklyController";
import { HrmsMemberRolesController } from "./controllers/hrms/member/roles/HrmsMemberRolesController";
import { HrmsMemberSessionsController } from "./controllers/hrms/member/sessions/HrmsMemberSessionsController";
import { HrmsMemberTasksController } from "./controllers/hrms/member/tasks/HrmsMemberTasksController";
import { HrmsMemberTimelogsController } from "./controllers/hrms/member/timelogs/HrmsMemberTimelogsController";
import { HrmsMemberTimerController } from "./controllers/hrms/member/timer/HrmsMemberTimerController";
import { HrmsMemberTimerActiveController } from "./controllers/hrms/member/timer/active/HrmsMemberTimerActiveController";
import { HrmsMemberTimerStartController } from "./controllers/hrms/member/timer/start/HrmsMemberTimerStartController";
import { HrmsMemberTimersController } from "./controllers/hrms/member/timers/HrmsMemberTimersController";
import { HrmsMemberTimesheetsController } from "./controllers/hrms/member/timesheets/HrmsMemberTimesheetsController";
import { HrmsMemberUpload_requestsController } from "./controllers/hrms/member/upload-requests/HrmsMemberUpload_requestsController";
import { HrmsMemberUpload_requestsAssign_ownershipController } from "./controllers/hrms/member/upload-requests/assign-ownership/HrmsMemberUpload_requestsAssign_ownershipController";
import { HrmsMemberUpload_requestsValidation_statusController } from "./controllers/hrms/member/upload-requests/validation-status/HrmsMemberUpload_requestsValidation_statusController";
import { HrmsMembersController } from "./controllers/hrms/members/HrmsMembersController";

@Module({
  controllers: [
    HrmsAuthGuestController,
    HrmsAuthMemberController,
    HrmsGuestGuest_sessionsController,
    HrmsMemberPassword_resetsController,
    HrmsMemberEmail_verificationsController,
    HrmsMembersController,
    HrmsMemberSessionsController,
    HrmsGuestProfileController,
    HrmsGuestsController,
    HrmsMemberOrganization_membersController,
    HrmsMemberOrganizationsEmployeesController,
    HrmsMemberOrganizationsController,
    HrmsMemberOrganizationsRolesController,
    HrmsMemberRolesController,
    HrmsMemberEmployeesController,
    HrmsMemberEmployeesContractsController,
    HrmsMemberOrganizationsDepartmentsController,
    HrmsMemberDepartmentsController,
    HrmsMemberProjectsController,
    HrmsMemberOrganizationsProjectsController,
    HrmsMemberProjectsMembersController,
    HrmsMemberOrganizationsProjectsMembersController,
    HrmsMemberProjectsTasksController,
    HrmsMemberProjectsTasksStatus_historyController,
    HrmsMemberTimelogsController,
    HrmsMemberOrganizationsEmployeesTimelogsController,
    HrmsMemberTimesheetsController,
    HrmsMemberTimerActiveController,
    HrmsMemberTimerStartController,
    HrmsMemberOrganizationsTimerController,
    HrmsMemberTimerController,
    HrmsMemberFilesController,
    HrmsMemberUpload_requestsController,
    HrmsMemberActivity_logsController,
    HrmsMemberReportsTimeController,
    HrmsMemberReportsController,
    HrmsMemberReportsWeeklyController,
    HrmsMemberTimersController,
    HrmsMemberTasksController,
    HrmsMemberOrganizationsTasksController,
    HrmsMemberDashboardController,
    HrmsMemberDashboardOrganizationController,
    HrmsMemberOrganizations_switchController,
    HrmsMemberOrganizationDashboardController,
    HrmsMemberController,
    HrmsMemberContractsController,
    HrmsMemberDepartmentsEmployeesController,
    HrmsMemberEmployeesAnalyticsController,
    HrmsMemberProjectsAnalyticsController,
    HrmsMemberProjectsTop_employeesController,
    HrmsMemberProjectsStatus_analyticsController,
    HrmsMemberAvatarController,
    HrmsMemberOrganizationsLogoController,
    HrmsMemberOrganizationsFilesController,
    HrmsMemberFilesPermanently_deleteController,
    HrmsMemberUpload_requestsValidation_statusController,
    HrmsMemberUpload_requestsAssign_ownershipController,
    HrmsMemberOrganization_dashboardController,
    HrmsMemberReportsTop_employeesController,
  ],
})
export class MyModule {}
