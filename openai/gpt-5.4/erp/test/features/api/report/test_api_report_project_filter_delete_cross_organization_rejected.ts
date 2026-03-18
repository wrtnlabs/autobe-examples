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

export async function test_api_report_project_filter_delete_cross_organization_rejected(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = {
    host: connection.host,
    headers:
      connection.headers === undefined ? undefined : { ...connection.headers },
  };
  const inaccessibleConnection: api.IConnection = {
    host: connection.host,
  };
  const project = await generate_random_hrm_time_tracking_projects_create(
    ownerConnection,
    {
      body: {
        name: `project-${RandomGenerator.alphabets(8)}`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        color_code: "#33AA55",
        status: "active",
        budget_hours: 120,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
      },
    },
  );
  typia.assert(project);
  const report = await generate_random_hrm_time_tracking_reports_create(
    ownerConnection,
    {
      body: {
        name: `report-${RandomGenerator.alphabets(8)}`,
        reportType: "time_report",
        rangeStartDate: new Date().toISOString(),
        rangeEndDate: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
        groupBy: null,
        billableOnly: null,
        includeNonBillable: null,
      },
    },
  );
  typia.assert(report);
  const reportWithFilter =
    await generate_random_hrm_time_tracking_reports_project_filters_create(
      ownerConnection,
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
  TestValidator.equals(
    "project filter mutation returns same report id",
    reportWithFilter.id,
    report.id,
  );
  TestValidator.predicate(
    "report contains created project filter",
    reportWithFilter.projectFilters.length > 0,
  );
  const createdFilter = typia.assert(reportWithFilter.projectFilters[0]!);
  TestValidator.equals(
    "filter report id matches parent report",
    createdFilter.report.id,
    report.id,
  );
  TestValidator.equals(
    "filter project id matches created project",
    createdFilter.project.id,
    project.id,
  );
  await TestValidator.httpError(
    "inaccessible organization context deletion is rejected",
    [403, 404],
    async () => {
      await api.functional.hrmTimeTracking.reports.projectFilters.erase(
        inaccessibleConnection,
        {
          reportId: report.id,
          projectFilterId: createdFilter.id,
        },
      );
    },
  );
  await api.functional.hrmTimeTracking.reports.projectFilters.erase(
    ownerConnection,
    {
      reportId: report.id,
      projectFilterId: createdFilter.id,
    },
  );
}
