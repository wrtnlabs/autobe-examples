import { Module } from "@nestjs/common";

import { HrmtimetrackingActivitylogsController } from "./controllers/hrmTimeTracking/activityLogs/HrmtimetrackingActivitylogsController";
import { HrmtimetrackingAuthEmployeeController } from "./controllers/hrmTimeTracking/auth/employee/HrmtimetrackingAuthEmployeeController";
import { HrmtimetrackingAuthManagerController } from "./controllers/hrmTimeTracking/auth/manager/HrmtimetrackingAuthManagerController";
import { HrmtimetrackingAuthOwnerController } from "./controllers/hrmTimeTracking/auth/owner/HrmtimetrackingAuthOwnerController";
import { HrmtimetrackingEmployeeDashboardController } from "./controllers/hrmTimeTracking/employee/dashboard/HrmtimetrackingEmployeeDashboardController";
import { HrmtimetrackingEmployeeOrganizationsController } from "./controllers/hrmTimeTracking/employee/organizations/HrmtimetrackingEmployeeOrganizationsController";
import { HrmtimetrackingEmployeeTimelogsController } from "./controllers/hrmTimeTracking/employee/timelogs/HrmtimetrackingEmployeeTimelogsController";
import { HrmtimetrackingEmployeeTimersController } from "./controllers/hrmTimeTracking/employee/timers/HrmtimetrackingEmployeeTimersController";
import { HrmtimetrackingEmployeeTimesheetsController } from "./controllers/hrmTimeTracking/employee/timesheets/HrmtimetrackingEmployeeTimesheetsController";
import { HrmtimetrackingEmployeeTimesheetsSnapshotsController } from "./controllers/hrmTimeTracking/employee/timesheets/snapshots/HrmtimetrackingEmployeeTimesheetsSnapshotsController";
import { HrmtimetrackingEmployeeTimesheetsTimelogsController } from "./controllers/hrmTimeTracking/employee/timesheets/timelogs/HrmtimetrackingEmployeeTimesheetsTimelogsController";
import { HrmtimetrackingEmployeeWeeklysummariesController } from "./controllers/hrmTimeTracking/employee/weeklySummaries/HrmtimetrackingEmployeeWeeklysummariesController";
import { HrmtimetrackingEmployeesController } from "./controllers/hrmTimeTracking/employees/HrmtimetrackingEmployeesController";
import { HrmtimetrackingManagerActivitylogsController } from "./controllers/hrmTimeTracking/manager/activityLogs/search/HrmtimetrackingManagerActivitylogsController";
import { HrmtimetrackingManagerDepartmentsController } from "./controllers/hrmTimeTracking/manager/departments/HrmtimetrackingManagerDepartmentsController";
import { HrmtimetrackingManagerEmployeesContractsController } from "./controllers/hrmTimeTracking/manager/employees/contracts/HrmtimetrackingManagerEmployeesContractsController";
import { HrmtimetrackingManagerReportsExecutionsController } from "./controllers/hrmTimeTracking/manager/reports/executions/HrmtimetrackingManagerReportsExecutionsController";
import { HrmtimetrackingManagerReportsWeeklysummariesController } from "./controllers/hrmTimeTracking/manager/reports/weeklySummaries/HrmtimetrackingManagerReportsWeeklysummariesController";
import { HrmtimetrackingManagerTimesheetsController } from "./controllers/hrmTimeTracking/manager/timesheets/HrmtimetrackingManagerTimesheetsController";
import { HrmtimetrackingManagerTimesheetsSnapshotsController } from "./controllers/hrmTimeTracking/manager/timesheets/snapshots/HrmtimetrackingManagerTimesheetsSnapshotsController";
import { HrmtimetrackingManagersController } from "./controllers/hrmTimeTracking/managers/HrmtimetrackingManagersController";
import { HrmtimetrackingOrganizationweeklysummariesController } from "./controllers/hrmTimeTracking/organizationWeeklySummaries/HrmtimetrackingOrganizationweeklysummariesController";
import { HrmtimetrackingOwnerActivitylogsController } from "./controllers/hrmTimeTracking/owner/activityLogs/search/HrmtimetrackingOwnerActivitylogsController";
import { HrmtimetrackingOwnerDepartmentsController } from "./controllers/hrmTimeTracking/owner/departments/HrmtimetrackingOwnerDepartmentsController";
import { HrmtimetrackingOwnerEmployeesContractsController } from "./controllers/hrmTimeTracking/owner/employees/contracts/HrmtimetrackingOwnerEmployeesContractsController";
import { HrmtimetrackingOwnerOrganizationsController } from "./controllers/hrmTimeTracking/owner/organizations/HrmtimetrackingOwnerOrganizationsController";
import { HrmtimetrackingOwnerOrganizationsInvitationsController } from "./controllers/hrmTimeTracking/owner/organizations/invitations/HrmtimetrackingOwnerOrganizationsInvitationsController";
import { HrmtimetrackingOwnerOrganizationsRolesController } from "./controllers/hrmTimeTracking/owner/organizations/roles/HrmtimetrackingOwnerOrganizationsRolesController";
import { HrmtimetrackingOwnerOrganizationsRolesPermissionsController } from "./controllers/hrmTimeTracking/owner/organizations/roles/permissions/HrmtimetrackingOwnerOrganizationsRolesPermissionsController";
import { HrmtimetrackingOwnerPassword_resetsController } from "./controllers/hrmTimeTracking/owner/password-resets/HrmtimetrackingOwnerPassword_resetsController";
import { HrmtimetrackingOwnerProfileController } from "./controllers/hrmTimeTracking/owner/profile/HrmtimetrackingOwnerProfileController";
import { HrmtimetrackingOwnerReportsExecutionsController } from "./controllers/hrmTimeTracking/owner/reports/executions/HrmtimetrackingOwnerReportsExecutionsController";
import { HrmtimetrackingOwnerReportsWeeklysummariesController } from "./controllers/hrmTimeTracking/owner/reports/weeklySummaries/HrmtimetrackingOwnerReportsWeeklysummariesController";
import { HrmtimetrackingOwnerSessionsController } from "./controllers/hrmTimeTracking/owner/sessions/HrmtimetrackingOwnerSessionsController";
import { HrmtimetrackingOwnerTimesheetsController } from "./controllers/hrmTimeTracking/owner/timesheets/HrmtimetrackingOwnerTimesheetsController";
import { HrmtimetrackingOwnerTimesheetsSnapshotsController } from "./controllers/hrmTimeTracking/owner/timesheets/snapshots/HrmtimetrackingOwnerTimesheetsSnapshotsController";
import { HrmtimetrackingOwnersController } from "./controllers/hrmTimeTracking/owners/HrmtimetrackingOwnersController";
import { HrmtimetrackingProjectbudgetalertsController } from "./controllers/hrmTimeTracking/projectBudgetAlerts/HrmtimetrackingProjectbudgetalertsController";
import { HrmtimetrackingProjectsController } from "./controllers/hrmTimeTracking/projects/HrmtimetrackingProjectsController";
import { HrmtimetrackingProjectsMembershipsController } from "./controllers/hrmTimeTracking/projects/memberships/HrmtimetrackingProjectsMembershipsController";
import { HrmtimetrackingProjectsTasksController } from "./controllers/hrmTimeTracking/projects/tasks/HrmtimetrackingProjectsTasksController";
import { HrmtimetrackingProjectsTasksHistoriesController } from "./controllers/hrmTimeTracking/projects/tasks/histories/HrmtimetrackingProjectsTasksHistoriesController";
import { HrmtimetrackingReportsController } from "./controllers/hrmTimeTracking/reports/HrmtimetrackingReportsController";
import { HrmtimetrackingReportsEmployeefiltersController } from "./controllers/hrmTimeTracking/reports/employeeFilters/HrmtimetrackingReportsEmployeefiltersController";
import { HrmtimetrackingReportsProjectfiltersController } from "./controllers/hrmTimeTracking/reports/projectFilters/HrmtimetrackingReportsProjectfiltersController";
import { HrmtimetrackingReportsSnapshotsController } from "./controllers/hrmTimeTracking/reports/snapshots/HrmtimetrackingReportsSnapshotsController";
import { HrmtimetrackingReportsTaskfiltersController } from "./controllers/hrmTimeTracking/reports/taskFilters/HrmtimetrackingReportsTaskfiltersController";

@Module({
  controllers: [
    HrmtimetrackingAuthOwnerController,
    HrmtimetrackingAuthManagerController,
    HrmtimetrackingAuthEmployeeController,
    HrmtimetrackingOwnersController,
    HrmtimetrackingOwnerProfileController,
    HrmtimetrackingOwnerSessionsController,
    HrmtimetrackingOwnerPassword_resetsController,
    HrmtimetrackingManagersController,
    HrmtimetrackingEmployeesController,
    HrmtimetrackingOwnerOrganizationsController,
    HrmtimetrackingOwnerOrganizationsInvitationsController,
    HrmtimetrackingOwnerOrganizationsRolesController,
    HrmtimetrackingOwnerOrganizationsRolesPermissionsController,
    HrmtimetrackingOwnerDepartmentsController,
    HrmtimetrackingManagerDepartmentsController,
    HrmtimetrackingOwnerEmployeesContractsController,
    HrmtimetrackingManagerEmployeesContractsController,
    HrmtimetrackingProjectsController,
    HrmtimetrackingProjectsMembershipsController,
    HrmtimetrackingProjectsTasksController,
    HrmtimetrackingProjectsTasksHistoriesController,
    HrmtimetrackingEmployeeOrganizationsController,
    HrmtimetrackingEmployeeTimersController,
    HrmtimetrackingEmployeeTimelogsController,
    HrmtimetrackingEmployeeTimesheetsController,
    HrmtimetrackingEmployeeTimesheetsTimelogsController,
    HrmtimetrackingOwnerTimesheetsSnapshotsController,
    HrmtimetrackingManagerTimesheetsSnapshotsController,
    HrmtimetrackingEmployeeTimesheetsSnapshotsController,
    HrmtimetrackingActivitylogsController,
    HrmtimetrackingReportsController,
    HrmtimetrackingReportsEmployeefiltersController,
    HrmtimetrackingReportsProjectfiltersController,
    HrmtimetrackingReportsTaskfiltersController,
    HrmtimetrackingReportsSnapshotsController,
    HrmtimetrackingOrganizationweeklysummariesController,
    HrmtimetrackingEmployeeWeeklysummariesController,
    HrmtimetrackingProjectbudgetalertsController,
    HrmtimetrackingEmployeeDashboardController,
    HrmtimetrackingOwnerTimesheetsController,
    HrmtimetrackingManagerTimesheetsController,
    HrmtimetrackingOwnerActivitylogsController,
    HrmtimetrackingManagerActivitylogsController,
    HrmtimetrackingOwnerReportsWeeklysummariesController,
    HrmtimetrackingManagerReportsWeeklysummariesController,
    HrmtimetrackingOwnerReportsExecutionsController,
    HrmtimetrackingManagerReportsExecutionsController,
  ],
})
export class MyModule {}
