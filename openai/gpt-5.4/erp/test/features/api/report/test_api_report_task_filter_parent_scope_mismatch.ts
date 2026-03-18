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

import { generate_random_hrm_time_tracking_reports_create } from "../../../generate/generate_random_hrm_time_tracking_reports_create";
import { generate_random_hrm_time_tracking_reports_task_filters_create } from "../../../generate/generate_random_hrm_time_tracking_reports_task_filters_create";
import { prepare_random_hrm_time_tracking_report } from "../../../prepare/prepare_random_hrm_time_tracking_report";
import { prepare_random_hrm_time_tracking_report_employee_filter } from "../../../prepare/prepare_random_hrm_time_tracking_report_employee_filter";
import { prepare_random_hrm_time_tracking_report_project_filter } from "../../../prepare/prepare_random_hrm_time_tracking_report_project_filter";
import { prepare_random_hrm_time_tracking_report_task_filter } from "../../../prepare/prepare_random_hrm_time_tracking_report_task_filter";

export async function test_api_report_task_filter_parent_scope_mismatch(
  connection: api.IConnection,
): Promise<void> {
  const actorConnection: api.IConnection = { host: connection.host };
  const firstReport = await generate_random_hrm_time_tracking_reports_create(
    actorConnection,
    {
      body: {
        name: `report-${RandomGenerator.alphabets(8)}`,
        reportType: "time_report",
      },
    },
  );
  typia.assert(firstReport);
  const firstTaskFilter =
    await generate_random_hrm_time_tracking_reports_task_filters_create(
      actorConnection,
      {
        params: {
          reportId: firstReport.id,
        },
      },
    );
  typia.assert(firstTaskFilter);
  const secondReport = await generate_random_hrm_time_tracking_reports_create(
    actorConnection,
    {
      body: {
        name: `report-${RandomGenerator.alphabets(8)}-${RandomGenerator.alphabets(4)}`,
        reportType: "time_report",
      },
    },
  );
  typia.assert(secondReport);
  TestValidator.equals(
    "task filter belongs to first report",
    firstTaskFilter.report.id,
    firstReport.id,
  );
  TestValidator.notEquals(
    "second report differs from first report",
    secondReport.id,
    firstReport.id,
  );
  TestValidator.equals(
    "reports share same organization",
    secondReport.organization.id,
    firstReport.organization.id,
  );
  TestValidator.notEquals(
    "task filter is not owned by second report",
    firstTaskFilter.report.id,
    secondReport.id,
  );
  await TestValidator.httpError(
    "rejects retrieval through mismatched parent report path",
    404,
    async () => {
      await api.functional.hrmTimeTracking.reports.taskFilters.at(
        actorConnection,
        {
          reportId: secondReport.id,
          taskFilterId: firstTaskFilter.id,
        },
      );
    },
  );
}
