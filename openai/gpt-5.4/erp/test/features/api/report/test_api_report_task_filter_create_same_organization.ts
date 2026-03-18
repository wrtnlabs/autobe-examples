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

export async function test_api_report_task_filter_create_same_organization(
  connection: api.IConnection,
): Promise<void> {
  const userConnection: api.IConnection = { host: connection.host };
  const reportBody = {
    name: `report-${RandomGenerator.alphabets(8)}`,
    reportType: "time_report",
    rangeStartDate: new Date().toISOString(),
    rangeEndDate: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
    groupBy: "task",
    billableOnly: false,
    includeNonBillable: true,
    employeeFilters: [],
    projectFilters: [],
    taskFilters: [],
  } satisfies IHrmTimeTrackingReport.ICreate;
  const report = await generate_random_hrm_time_tracking_reports_create(
    userConnection,
    {
      body: reportBody,
    },
  );
  typia.assert(report);
  TestValidator.equals(
    "report starts with no task filters",
    report.taskFilters.length,
    0,
  );
  TestValidator.equals(
    "report starts with no employee filters",
    report.reportEmployeeFilters.length,
    0,
  );
  TestValidator.equals(
    "report starts with no project filters",
    report.projectFilters.length,
    0,
  );
  const taskFilter =
    await generate_random_hrm_time_tracking_reports_task_filters_create(
      userConnection,
      {
        params: {
          reportId: report.id,
        },
        body: {},
      },
    );
  typia.assert(taskFilter);
  TestValidator.notEquals(
    "task filter id differs from parent report id",
    taskFilter.id,
    report.id,
  );
  TestValidator.equals(
    "task filter belongs to parent report",
    taskFilter.report.id,
    report.id,
  );
  TestValidator.equals(
    "report summary name matches parent report",
    taskFilter.report.name,
    report.name,
  );
  TestValidator.equals(
    "report summary type matches parent report",
    taskFilter.report.report_type,
    report.reportType,
  );
  TestValidator.equals(
    "report summary range start matches parent report",
    taskFilter.report.range_start_date,
    report.rangeStartDate,
  );
  TestValidator.equals(
    "report summary range end matches parent report",
    taskFilter.report.range_end_date,
    report.rangeEndDate,
  );
  TestValidator.equals(
    "report summary groupBy matches parent report",
    taskFilter.report.group_by,
    report.groupBy,
  );
  TestValidator.equals(
    "report summary billableOnly matches parent report",
    taskFilter.report.billable_only,
    report.billableOnly,
  );
  TestValidator.equals(
    "report summary includeNonBillable matches parent report",
    taskFilter.report.include_non_billable,
    report.includeNonBillable,
  );
  TestValidator.equals(
    "report summary createdAt matches parent report",
    taskFilter.report.created_at,
    report.createdAt,
  );
  TestValidator.equals(
    "report summary updatedAt matches parent report",
    taskFilter.report.updated_at,
    report.updatedAt,
  );
  TestValidator.predicate(
    "task filter selected task id is distinct from filter row id",
    taskFilter.task.id !== taskFilter.id,
  );
  TestValidator.predicate(
    "task summary title is populated",
    taskFilter.task.title.length > 0,
  );
  TestValidator.equals(
    "task filter is active on creation",
    taskFilter.deleted_at,
    null,
  );
  TestValidator.predicate(
    "task filter timestamps are ordered",
    taskFilter.updated_at >= taskFilter.created_at,
  );
}
