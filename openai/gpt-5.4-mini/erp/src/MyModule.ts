import { Module } from "@nestjs/common";

import { HrmtimetrackingAuthGuestController } from "./controllers/hrmTimeTracking/auth/guest/HrmtimetrackingAuthGuestController";
import { HrmtimetrackingAuthMemberController } from "./controllers/hrmTimeTracking/auth/member/HrmtimetrackingAuthMemberController";
import { HrmtimetrackingGuestGuestsController } from "./controllers/hrmTimeTracking/guest/guests/HrmtimetrackingGuestGuestsController";
import { HrmtimetrackingGuestSessionsController } from "./controllers/hrmTimeTracking/guest/sessions/HrmtimetrackingGuestSessionsController";
import { HrmtimetrackingMemberActivity_recordsController } from "./controllers/hrmTimeTracking/member/activity-records/HrmtimetrackingMemberActivity_recordsController";
import { HrmtimetrackingMemberDashboardController } from "./controllers/hrmTimeTracking/member/dashboard/HrmtimetrackingMemberDashboardController";
import { HrmtimetrackingMemberDepartmentsController } from "./controllers/hrmTimeTracking/member/departments/HrmtimetrackingMemberDepartmentsController";
import { HrmtimetrackingMemberEmail_verificationsController } from "./controllers/hrmTimeTracking/member/email-verifications/HrmtimetrackingMemberEmail_verificationsController";
import { HrmtimetrackingMemberEmployeesController } from "./controllers/hrmTimeTracking/member/employees/HrmtimetrackingMemberEmployeesController";
import { HrmtimetrackingMemberEmployeesContractsController } from "./controllers/hrmTimeTracking/member/employees/contracts/HrmtimetrackingMemberEmployeesContractsController";
import { HrmtimetrackingMemberEmployeesRolesController } from "./controllers/hrmTimeTracking/member/employees/roles/HrmtimetrackingMemberEmployeesRolesController";
import { HrmtimetrackingMemberHrmtimetrackingActivity_recordsController } from "./controllers/hrmTimeTracking/member/hrmTimeTracking/activity-records/HrmtimetrackingMemberHrmtimetrackingActivity_recordsController";
import { HrmtimetrackingMemberInvitationsController } from "./controllers/hrmTimeTracking/member/invitations/HrmtimetrackingMemberInvitationsController";
import { HrmtimetrackingMemberMeDashboardController } from "./controllers/hrmTimeTracking/member/me/dashboard/HrmtimetrackingMemberMeDashboardController";
import { HrmtimetrackingMemberMeTimelogsController } from "./controllers/hrmTimeTracking/member/me/timelogs/HrmtimetrackingMemberMeTimelogsController";
import { HrmtimetrackingMemberMeTimer_sessionController } from "./controllers/hrmTimeTracking/member/me/timer-session/HrmtimetrackingMemberMeTimer_sessionController";
import { HrmtimetrackingMemberMeTimer_sessionStartController } from "./controllers/hrmTimeTracking/member/me/timer-session/start/HrmtimetrackingMemberMeTimer_sessionStartController";
import { HrmtimetrackingMemberMeTimesheetsDraftController } from "./controllers/hrmTimeTracking/member/me/timesheets/draft/HrmtimetrackingMemberMeTimesheetsDraftController";
import { HrmtimetrackingMemberMembersController } from "./controllers/hrmTimeTracking/member/members/HrmtimetrackingMemberMembersController";
import { HrmtimetrackingMemberOrganizationsController } from "./controllers/hrmTimeTracking/member/organizations/HrmtimetrackingMemberOrganizationsController";
import { HrmtimetrackingMemberPassword_resetsController } from "./controllers/hrmTimeTracking/member/password-resets/HrmtimetrackingMemberPassword_resetsController";
import { HrmtimetrackingMemberProfileController } from "./controllers/hrmTimeTracking/member/profile/HrmtimetrackingMemberProfileController";
import { HrmtimetrackingMemberProjectsController } from "./controllers/hrmTimeTracking/member/projects/HrmtimetrackingMemberProjectsController";
import { HrmtimetrackingMemberProjectsAssignedController } from "./controllers/hrmTimeTracking/member/projects/assigned/HrmtimetrackingMemberProjectsAssignedController";
import { HrmtimetrackingMemberProjectsMembersController } from "./controllers/hrmTimeTracking/member/projects/members/HrmtimetrackingMemberProjectsMembersController";
import { HrmtimetrackingMemberProjectsTasksController } from "./controllers/hrmTimeTracking/member/projects/tasks/HrmtimetrackingMemberProjectsTasksController";
import { HrmtimetrackingMemberProjectsTasksStatusController } from "./controllers/hrmTimeTracking/member/projects/tasks/status/HrmtimetrackingMemberProjectsTasksStatusController";
import { HrmtimetrackingMemberProjectsTasksTask_historiesController } from "./controllers/hrmTimeTracking/member/projects/tasks/task-histories/HrmtimetrackingMemberProjectsTasksTask_historiesController";
import { HrmtimetrackingMemberReportsTimeController } from "./controllers/hrmTimeTracking/member/reports/time/HrmtimetrackingMemberReportsTimeController";
import { HrmtimetrackingMemberReportsWeekly_summaryController } from "./controllers/hrmTimeTracking/member/reports/weekly-summary/HrmtimetrackingMemberReportsWeekly_summaryController";
import { HrmtimetrackingMemberRolesController } from "./controllers/hrmTimeTracking/member/roles/HrmtimetrackingMemberRolesController";
import { HrmtimetrackingMemberRolesPermissionsController } from "./controllers/hrmTimeTracking/member/roles/permissions/HrmtimetrackingMemberRolesPermissionsController";
import { HrmtimetrackingMemberTimelogsController } from "./controllers/hrmTimeTracking/member/timelogs/HrmtimetrackingMemberTimelogsController";
import { HrmtimetrackingMemberTimelogsOrganization_viewController } from "./controllers/hrmTimeTracking/member/timelogs/organization-view/HrmtimetrackingMemberTimelogsOrganization_viewController";
import { HrmtimetrackingMemberTimer_sessionsController } from "./controllers/hrmTimeTracking/member/timer-sessions/HrmtimetrackingMemberTimer_sessionsController";
import { HrmtimetrackingMemberTimesheetsController } from "./controllers/hrmTimeTracking/member/timesheets/HrmtimetrackingMemberTimesheetsController";
import { HrmtimetrackingMemberTimesheetsSubmitController } from "./controllers/hrmTimeTracking/member/timesheets/submit/HrmtimetrackingMemberTimesheetsSubmitController";
import { HrmtimetrackingMemberTimesheetsTimelogsController } from "./controllers/hrmTimeTracking/member/timesheets/timelogs/HrmtimetrackingMemberTimesheetsTimelogsController";

@Module({
  controllers: [
    HrmtimetrackingAuthGuestController,
    HrmtimetrackingAuthMemberController,
    HrmtimetrackingGuestGuestsController,
    HrmtimetrackingGuestSessionsController,
    HrmtimetrackingMemberMembersController,
    HrmtimetrackingMemberPassword_resetsController,
    HrmtimetrackingMemberEmail_verificationsController,
    HrmtimetrackingMemberOrganizationsController,
    HrmtimetrackingMemberProfileController,
    HrmtimetrackingMemberInvitationsController,
    HrmtimetrackingMemberDepartmentsController,
    HrmtimetrackingMemberEmployeesController,
    HrmtimetrackingMemberEmployeesContractsController,
    HrmtimetrackingMemberRolesController,
    HrmtimetrackingMemberRolesPermissionsController,
    HrmtimetrackingMemberEmployeesRolesController,
    HrmtimetrackingMemberProjectsController,
    HrmtimetrackingMemberProjectsTasksController,
    HrmtimetrackingMemberTimelogsController,
    HrmtimetrackingMemberTimesheetsController,
    HrmtimetrackingMemberTimer_sessionsController,
    HrmtimetrackingMemberHrmtimetrackingActivity_recordsController,
    HrmtimetrackingMemberDashboardController,
    HrmtimetrackingMemberProjectsAssignedController,
    HrmtimetrackingMemberProjectsMembersController,
    HrmtimetrackingMemberProjectsTasksStatusController,
    HrmtimetrackingMemberProjectsTasksTask_historiesController,
    HrmtimetrackingMemberMeTimelogsController,
    HrmtimetrackingMemberTimelogsOrganization_viewController,
    HrmtimetrackingMemberMeTimesheetsDraftController,
    HrmtimetrackingMemberTimesheetsTimelogsController,
    HrmtimetrackingMemberTimesheetsSubmitController,
    HrmtimetrackingMemberMeTimer_sessionController,
    HrmtimetrackingMemberMeTimer_sessionStartController,
    HrmtimetrackingMemberReportsTimeController,
    HrmtimetrackingMemberReportsWeekly_summaryController,
    HrmtimetrackingMemberMeDashboardController,
    HrmtimetrackingMemberActivity_recordsController,
  ],
})
export class MyModule {}
