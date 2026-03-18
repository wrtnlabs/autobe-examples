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

export async function test_api_report_project_filter_update_duplicated_project_conflict(
  connection: api.IConnection,
): Promise<void> {
  const actorConnection: api.IConnection = { host: connection.host };
  const firstProject = await generate_random_hrm_time_tracking_projects_create(
    actorConnection,
    {
      body: {
        name: `project-${RandomGenerator.alphabets(8)}`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        color_code: "#112233",
        status: "active",
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 86400000).toISOString(),
      } satisfies IHrmTimeTrackingProject.ICreate,
    },
  );
  typia.assert(firstProject);
  const secondProject = await generate_random_hrm_time_tracking_projects_create(
    actorConnection,
    {
      body: {
        name: `project-${RandomGenerator.alphabets(8)}`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        color_code: "#445566",
        status: "active",
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 172800000).toISOString(),
      } satisfies IHrmTimeTrackingProject.ICreate,
    },
  );
  typia.assert(secondProject);
  const report = await generate_random_hrm_time_tracking_reports_create(
    actorConnection,
    {
      body: {
        name: `report-${RandomGenerator.alphabets(8)}`,
        reportType: "time_report",
        rangeStartDate: new Date().toISOString(),
        rangeEndDate: new Date(Date.now() + 86400000).toISOString(),
        groupBy: null,
        billableOnly: null,
        includeNonBillable: null,
      } satisfies IHrmTimeTrackingReport.ICreate,
    },
  );
  typia.assert(report);
  const reportWithFirstFilter =
    await generate_random_hrm_time_tracking_reports_project_filters_create(
      actorConnection,
      {
        params: {
          reportId: report.id,
        },
        body: {
          projectIds: [firstProject.id],
        } satisfies IHrmTimeTrackingReportProjectFilter.ICreate,
      },
    );
  typia.assert(reportWithFirstFilter);
  const reportWithBothFilters =
    await generate_random_hrm_time_tracking_reports_project_filters_create(
      actorConnection,
      {
        params: {
          reportId: report.id,
        },
        body: {
          projectIds: [secondProject.id],
        } satisfies IHrmTimeTrackingReportProjectFilter.ICreate,
      },
    );
  typia.assert(reportWithBothFilters);
  TestValidator.equals(
    "report has two active project filters in last successful state",
    reportWithBothFilters.projectFilters.length,
    2,
  );
  const originalFilter = reportWithBothFilters.projectFilters.find(
    (filter) => filter.project.id === firstProject.id,
  );
  const duplicateTargetFilter = reportWithBothFilters.projectFilters.find(
    (filter) => filter.project.id === secondProject.id,
  );
  TestValidator.predicate(
    "original filter exists in last successful state",
    originalFilter !== undefined,
  );
  TestValidator.predicate(
    "duplicate target filter exists in last successful state",
    duplicateTargetFilter !== undefined,
  );
  const targetFilter = originalFilter!;
  const existingDuplicateFilter = duplicateTargetFilter!;
  TestValidator.notEquals(
    "project filter rows are distinct",
    targetFilter.id,
    existingDuplicateFilter.id,
  );
  TestValidator.equals(
    "target filter initially points to first project",
    targetFilter.project.id,
    firstProject.id,
  );
  TestValidator.equals(
    "existing filter initially points to second project",
    existingDuplicateFilter.project.id,
    secondProject.id,
  );
  await TestValidator.error(
    "updating project filter to duplicate active project is rejected",
    async () => {
      await api.functional.hrmTimeTracking.reports.projectFilters.update(
        actorConnection,
        {
          reportId: report.id,
          projectFilterId: targetFilter.id,
          body: {
            hrm_time_tracking_project_id: secondProject.id,
          } satisfies IHrmTimeTrackingReportProjectFilter.IUpdate,
        },
      );
    },
  );
  TestValidator.equals(
    "last successful snapshot still has two project filters",
    reportWithBothFilters.projectFilters.length,
    2,
  );
  TestValidator.equals(
    "target filter remains mapped to first project in last successful snapshot",
    targetFilter.project.id,
    firstProject.id,
  );
  TestValidator.equals(
    "existing filter remains mapped to second project in last successful snapshot",
    existingDuplicateFilter.project.id,
    secondProject.id,
  );
  TestValidator.equals(
    "last successful snapshot contains unique project ids",
    new Set(
      reportWithBothFilters.projectFilters.map((filter) => filter.project.id),
    ).size,
    reportWithBothFilters.projectFilters.length,
  );
}
