import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import type { IHrmTimeTrackingReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingReport";
import type { IHrmTimeTrackingReportEmployeeFilter } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingReportEmployeeFilter";
import type { IHrmTimeTrackingReportProjectFilter } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingReportProjectFilter";
import type { IHrmTimeTrackingReportTaskFilter } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingReportTaskFilter";
import type { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { generate_random_hrm_time_tracking_projects_create } from "../../../generate/generate_random_hrm_time_tracking_projects_create";
import { generate_random_hrm_time_tracking_reports_create } from "../../../generate/generate_random_hrm_time_tracking_reports_create";
import { generate_random_hrm_time_tracking_reports_project_filters_create } from "../../../generate/generate_random_hrm_time_tracking_reports_project_filters_create";
import { prepare_random_hrm_time_tracking_project } from "../../../prepare/prepare_random_hrm_time_tracking_project";
import { prepare_random_hrm_time_tracking_report } from "../../../prepare/prepare_random_hrm_time_tracking_report";
import { prepare_random_hrm_time_tracking_report_employee_filter } from "../../../prepare/prepare_random_hrm_time_tracking_report_employee_filter";
import { prepare_random_hrm_time_tracking_report_project_filter } from "../../../prepare/prepare_random_hrm_time_tracking_report_project_filter";
import { prepare_random_hrm_time_tracking_report_task_filter } from "../../../prepare/prepare_random_hrm_time_tracking_report_task_filter";

export async function test_api_report_project_filter_delete_success(
  connection: api.IConnection,
): Promise<void> {
  const employeeConnection: api.IConnection = {
    host: connection.host,
  };
  const project: IHrmTimeTrackingProject =
    await generate_random_hrm_time_tracking_projects_create(
      employeeConnection,
      {
        body: {
          name: `project-${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          color_code: "#33aa77",
          status: "active",
          budget_hours: 40,
        },
      },
    );
  typia.assert(project);
  const report: IHrmTimeTrackingReport =
    await generate_random_hrm_time_tracking_reports_create(employeeConnection, {
      body: {
        name: `report-${RandomGenerator.alphabets(8)}`,
        reportType: "time_report",
        groupBy: null,
        billableOnly: null,
        includeNonBillable: null,
      },
    });
  typia.assert(report);
  TestValidator.equals(
    "project and report share organization",
    project.organization.id,
    report.organization.id,
  );
  const reportWithFilter: IHrmTimeTrackingReport =
    await generate_random_hrm_time_tracking_reports_project_filters_create(
      employeeConnection,
      {
        params: {
          reportId: report.id,
        },
        body: {
          projectIds: [project.id],
        },
      },
    );
  typia.assert(reportWithFilter);
  const attachedFilter: IHrmTimeTrackingReportProjectFilter | undefined =
    reportWithFilter.projectFilters.find(
      (filter) => filter.project.id === project.id,
    );
  TestValidator.predicate(
    "attached project filter exists before deletion",
    attachedFilter !== undefined,
  );
  const safeAttachedFilter: IHrmTimeTrackingReportProjectFilter = typia.assert(
    attachedFilter!,
  );
  TestValidator.equals(
    "attached filter belongs to created report",
    safeAttachedFilter.report.id,
    report.id,
  );
  TestValidator.equals(
    "attached filter points to created project",
    safeAttachedFilter.project.id,
    project.id,
  );
  await api.functional.hrmTimeTracking.reports.projectFilters.erase(
    employeeConnection,
    {
      reportId: report.id,
      projectFilterId: safeAttachedFilter.id,
    },
  );
  const reportAfterReAdd: IHrmTimeTrackingReport =
    await generate_random_hrm_time_tracking_reports_project_filters_create(
      employeeConnection,
      {
        params: {
          reportId: report.id,
        },
        body: {
          projectIds: [project.id],
        },
      },
    );
  typia.assert(reportAfterReAdd);
  const matchingFilters: IHrmTimeTrackingReportProjectFilter[] =
    reportAfterReAdd.projectFilters.filter(
      (filter) => filter.project.id === project.id,
    );
  TestValidator.equals(
    "deleted project can be selected again in future report configuration",
    matchingFilters.length,
    1,
  );
  TestValidator.predicate(
    "re-added project filter exists",
    matchingFilters[0] !== undefined,
  );
  const reAddedFilter: IHrmTimeTrackingReportProjectFilter = typia.assert(
    matchingFilters[0]!,
  );
  TestValidator.equals(
    "re-added filter belongs to same report",
    reAddedFilter.report.id,
    report.id,
  );
  TestValidator.equals(
    "re-added filter references same project",
    reAddedFilter.project.id,
    project.id,
  );
}
