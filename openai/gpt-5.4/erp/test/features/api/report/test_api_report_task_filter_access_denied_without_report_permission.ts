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

export async function test_api_report_task_filter_access_denied_without_report_permission(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const deniedConnection: api.IConnection = { host: connection.host };
  const rangeStartDate = new Date().toISOString();
  const rangeEndDate = new Date().toISOString();
  const reportBody = {
    name: `report-${RandomGenerator.alphabets(8)}`,
    reportType: "time_report",
    rangeStartDate,
    rangeEndDate,
    groupBy: null,
    billableOnly: null,
    includeNonBillable: null,
  } satisfies IHrmTimeTrackingReport.ICreate;
  const report = await generate_random_hrm_time_tracking_reports_create(
    ownerConnection,
    {
      body: reportBody,
    },
  );
  typia.assert(report);
  const taskFilter =
    await generate_random_hrm_time_tracking_reports_task_filters_create(
      ownerConnection,
      {
        params: {
          reportId: report.id,
        },
      },
    );
  typia.assert(taskFilter);
  TestValidator.equals(
    "task filter belongs to created report",
    taskFilter.report.id,
    report.id,
  );
  await TestValidator.httpError(
    "task filter detail access is denied without report permission",
    [401, 403, 404],
    async () => {
      await api.functional.hrmTimeTracking.reports.taskFilters.at(
        deniedConnection,
        {
          reportId: report.id,
          taskFilterId: taskFilter.id,
        },
      );
    },
  );
}
