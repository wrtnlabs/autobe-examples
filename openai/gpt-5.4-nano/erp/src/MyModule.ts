import { Module } from "@nestjs/common";

import { ErphrmtimetrackingAuthGuestJoinController } from "./controllers/erpHrmTimeTracking/auth/guest/join/ErphrmtimetrackingAuthGuestJoinController";
import { ErphrmtimetrackingAuthGuestRefreshController } from "./controllers/erpHrmTimeTracking/auth/guest/refresh/ErphrmtimetrackingAuthGuestRefreshController";
import { ErphrmtimetrackingAuthMemberController } from "./controllers/erpHrmTimeTracking/auth/member/ErphrmtimetrackingAuthMemberController";
import { ErphrmtimetrackingGuestGuestsController } from "./controllers/erpHrmTimeTracking/guest/guests/ErphrmtimetrackingGuestGuestsController";
import { ErphrmtimetrackingGuestSessionsController } from "./controllers/erpHrmTimeTracking/guest/sessions/ErphrmtimetrackingGuestSessionsController";
import { ErphrmtimetrackingMemberActivitylogentriesController } from "./controllers/erpHrmTimeTracking/member/activityLogEntries/ErphrmtimetrackingMemberActivitylogentriesController";
import { ErphrmtimetrackingMemberActivitylogentrysnapshotsController } from "./controllers/erpHrmTimeTracking/member/activityLogEntrySnapshots/ErphrmtimetrackingMemberActivitylogentrysnapshotsController";
import { ErphrmtimetrackingMemberActivitylogsnapshotsController } from "./controllers/erpHrmTimeTracking/member/activityLogSnapshots/search/ErphrmtimetrackingMemberActivitylogsnapshotsController";
import { ErphrmtimetrackingMemberActivitylogsnapshotsTargetentitiesTimelineController } from "./controllers/erpHrmTimeTracking/member/activityLogSnapshots/targetEntities/timeline/ErphrmtimetrackingMemberActivitylogsnapshotsTargetentitiesTimelineController";
import { ErphrmtimetrackingMemberActivitylogsController } from "./controllers/erpHrmTimeTracking/member/activityLogs/search/ErphrmtimetrackingMemberActivitylogsController";
import { ErphrmtimetrackingMemberActivitylogsTargetentitiesTimelineController } from "./controllers/erpHrmTimeTracking/member/activityLogs/targetEntities/timeline/ErphrmtimetrackingMemberActivitylogsTargetentitiesTimelineController";
import { ErphrmtimetrackingMemberContractsnapshotsController } from "./controllers/erpHrmTimeTracking/member/contractSnapshots/ErphrmtimetrackingMemberContractsnapshotsController";
import { ErphrmtimetrackingMemberContractsController } from "./controllers/erpHrmTimeTracking/member/contracts/ErphrmtimetrackingMemberContractsController";
import { ErphrmtimetrackingMemberDashboardController } from "./controllers/erpHrmTimeTracking/member/dashboard/ErphrmtimetrackingMemberDashboardController";
import { ErphrmtimetrackingMemberDepartmentsController } from "./controllers/erpHrmTimeTracking/member/departments/ErphrmtimetrackingMemberDepartmentsController";
import { ErphrmtimetrackingMemberDepartmentsTreeController } from "./controllers/erpHrmTimeTracking/member/departments/tree/ErphrmtimetrackingMemberDepartmentsTreeController";
import { ErphrmtimetrackingMemberEmail_verificationsController } from "./controllers/erpHrmTimeTracking/member/email-verifications/ErphrmtimetrackingMemberEmail_verificationsController";
import { ErphrmtimetrackingMemberMembersController } from "./controllers/erpHrmTimeTracking/member/members/ErphrmtimetrackingMemberMembersController";
import { ErphrmtimetrackingMemberOrganizationsController } from "./controllers/erpHrmTimeTracking/member/organizations/ErphrmtimetrackingMemberOrganizationsController";
import { ErphrmtimetrackingMemberOrganizationsTimezoneRebuildController } from "./controllers/erpHrmTimeTracking/member/organizations/timezone/rebuild/ErphrmtimetrackingMemberOrganizationsTimezoneRebuildController";
import { ErphrmtimetrackingMemberPassword_resetsController } from "./controllers/erpHrmTimeTracking/member/password-resets/ErphrmtimetrackingMemberPassword_resetsController";
import { ErphrmtimetrackingMemberPersonaldashboardController } from "./controllers/erpHrmTimeTracking/member/personalDashboard/ErphrmtimetrackingMemberPersonaldashboardController";
import { ErphrmtimetrackingMemberProjectsController } from "./controllers/erpHrmTimeTracking/member/projects/ErphrmtimetrackingMemberProjectsController";
import { ErphrmtimetrackingMemberProjectsAssignedController } from "./controllers/erpHrmTimeTracking/member/projects/assigned/ErphrmtimetrackingMemberProjectsAssignedController";
import { ErphrmtimetrackingMemberProjectsMembershipsController } from "./controllers/erpHrmTimeTracking/member/projects/memberships/ErphrmtimetrackingMemberProjectsMembershipsController";
import { ErphrmtimetrackingMemberProjectsMembershipsBulkassignController } from "./controllers/erpHrmTimeTracking/member/projects/memberships/bulkAssign/ErphrmtimetrackingMemberProjectsMembershipsBulkassignController";
import { ErphrmtimetrackingMemberProjectsTasktreeController } from "./controllers/erpHrmTimeTracking/member/projects/taskTree/ErphrmtimetrackingMemberProjectsTasktreeController";
import { ErphrmtimetrackingMemberProjectsTasksController } from "./controllers/erpHrmTimeTracking/member/projects/tasks/ErphrmtimetrackingMemberProjectsTasksController";
import { ErphrmtimetrackingMemberReportdefinitionsGenerateController } from "./controllers/erpHrmTimeTracking/member/reportDefinitions/generate/ErphrmtimetrackingMemberReportdefinitionsGenerateController";
import { ErphrmtimetrackingMemberReportdefinitionsPreviewController } from "./controllers/erpHrmTimeTracking/member/reportDefinitions/preview/ErphrmtimetrackingMemberReportdefinitionsPreviewController";
import { ErphrmtimetrackingMemberReportgenerationrunsExportsController } from "./controllers/erpHrmTimeTracking/member/reportGenerationRuns/exports/ErphrmtimetrackingMemberReportgenerationrunsExportsController";
import { ErphrmtimetrackingMemberTimelogsnapshotsController } from "./controllers/erpHrmTimeTracking/member/timelogSnapshots/ErphrmtimetrackingMemberTimelogsnapshotsController";
import { ErphrmtimetrackingMemberTimelogsController } from "./controllers/erpHrmTimeTracking/member/timelogs/ErphrmtimetrackingMemberTimelogsController";
import { ErphrmtimetrackingMemberTimersessionsController } from "./controllers/erpHrmTimeTracking/member/timerSessions/ErphrmtimetrackingMemberTimersessionsController";
import { ErphrmtimetrackingMemberTimersessionsCurrentStopController } from "./controllers/erpHrmTimeTracking/member/timerSessions/current/stop/ErphrmtimetrackingMemberTimersessionsCurrentStopController";
import { ErphrmtimetrackingMemberTimesheetversioninglocksController } from "./controllers/erpHrmTimeTracking/member/timesheetVersioningLocks/ErphrmtimetrackingMemberTimesheetversioninglocksController";
import { ErphrmtimetrackingMemberTimesheetsController } from "./controllers/erpHrmTimeTracking/member/timesheets/ErphrmtimetrackingMemberTimesheetsController";
import { ErphrmtimetrackingMemberTimesheetsApproveController } from "./controllers/erpHrmTimeTracking/member/timesheets/approve/ErphrmtimetrackingMemberTimesheetsApproveController";
import { ErphrmtimetrackingReportdefinitionsController } from "./controllers/erpHrmTimeTracking/reportDefinitions/ErphrmtimetrackingReportdefinitionsController";
import { ErphrmtimetrackingReportdefinitionsDimensionsController } from "./controllers/erpHrmTimeTracking/reportDefinitions/dimensions/ErphrmtimetrackingReportdefinitionsDimensionsController";
import { ErphrmtimetrackingReportdefinitionsFiltersController } from "./controllers/erpHrmTimeTracking/reportDefinitions/filters/ErphrmtimetrackingReportdefinitionsFiltersController";
import { ErphrmtimetrackingReportdefinitionsReportgenerationrunsController } from "./controllers/erpHrmTimeTracking/reportDefinitions/reportGenerationRuns/ErphrmtimetrackingReportdefinitionsReportgenerationrunsController";
import { ErphrmtimetrackingReportgenerationrunsController } from "./controllers/erpHrmTimeTracking/reportGenerationRuns/ErphrmtimetrackingReportgenerationrunsController";
import { ErphrmtimetrackingReportgenerationrunsOutputsController } from "./controllers/erpHrmTimeTracking/reportGenerationRuns/outputs/ErphrmtimetrackingReportgenerationrunsOutputsController";
import { ErphrmtimetrackingReportoutputmetricsController } from "./controllers/erpHrmTimeTracking/reportOutputMetrics/ErphrmtimetrackingReportoutputmetricsController";
import { ErphrmtimetrackingReportoutputsController } from "./controllers/erpHrmTimeTracking/reportOutputs/ErphrmtimetrackingReportoutputsController";
import { ErphrmtimetrackingReportoutputsMetricsController } from "./controllers/erpHrmTimeTracking/reportOutputs/metrics/ErphrmtimetrackingReportoutputsMetricsController";

@Module({
  controllers: [
    ErphrmtimetrackingAuthGuestJoinController,
    ErphrmtimetrackingAuthGuestRefreshController,
    ErphrmtimetrackingAuthMemberController,
    ErphrmtimetrackingGuestSessionsController,
    ErphrmtimetrackingGuestGuestsController,
    ErphrmtimetrackingMemberEmail_verificationsController,
    ErphrmtimetrackingMemberPassword_resetsController,
    ErphrmtimetrackingMemberMembersController,
    ErphrmtimetrackingMemberOrganizationsController,
    ErphrmtimetrackingMemberDepartmentsController,
    ErphrmtimetrackingMemberContractsController,
    ErphrmtimetrackingMemberContractsnapshotsController,
    ErphrmtimetrackingMemberProjectsController,
    ErphrmtimetrackingMemberProjectsMembershipsController,
    ErphrmtimetrackingMemberProjectsTasksController,
    ErphrmtimetrackingMemberTimesheetsController,
    ErphrmtimetrackingMemberTimelogsController,
    ErphrmtimetrackingMemberTimersessionsController,
    ErphrmtimetrackingMemberTimelogsnapshotsController,
    ErphrmtimetrackingMemberTimesheetversioninglocksController,
    ErphrmtimetrackingReportdefinitionsController,
    ErphrmtimetrackingReportdefinitionsDimensionsController,
    ErphrmtimetrackingReportdefinitionsFiltersController,
    ErphrmtimetrackingReportdefinitionsReportgenerationrunsController,
    ErphrmtimetrackingReportgenerationrunsController,
    ErphrmtimetrackingReportgenerationrunsOutputsController,
    ErphrmtimetrackingReportoutputsController,
    ErphrmtimetrackingReportoutputsMetricsController,
    ErphrmtimetrackingReportoutputmetricsController,
    ErphrmtimetrackingMemberActivitylogentriesController,
    ErphrmtimetrackingMemberActivitylogentrysnapshotsController,
    ErphrmtimetrackingMemberDepartmentsTreeController,
    ErphrmtimetrackingMemberOrganizationsTimezoneRebuildController,
    ErphrmtimetrackingMemberProjectsAssignedController,
    ErphrmtimetrackingMemberProjectsTasktreeController,
    ErphrmtimetrackingMemberProjectsMembershipsBulkassignController,
    ErphrmtimetrackingMemberTimesheetsApproveController,
    ErphrmtimetrackingMemberTimersessionsCurrentStopController,
    ErphrmtimetrackingMemberDashboardController,
    ErphrmtimetrackingMemberPersonaldashboardController,
    ErphrmtimetrackingMemberReportdefinitionsGenerateController,
    ErphrmtimetrackingMemberReportgenerationrunsExportsController,
    ErphrmtimetrackingMemberReportdefinitionsPreviewController,
    ErphrmtimetrackingMemberActivitylogsController,
    ErphrmtimetrackingMemberActivitylogsTargetentitiesTimelineController,
    ErphrmtimetrackingMemberActivitylogsnapshotsController,
    ErphrmtimetrackingMemberActivitylogsnapshotsTargetentitiesTimelineController,
  ],
})
export class MyModule {}
