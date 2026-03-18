import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import type { IHrmTimeTrackingReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingReport";
import type { IHrmTimeTrackingReportEmployeeFilter } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingReportEmployeeFilter";
import type { IHrmTimeTrackingReportProjectFilter } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingReportProjectFilter";
import type { IHrmTimeTrackingReportSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingReportSnapshot";
import type { IHrmTimeTrackingReportTaskFilter } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingReportTaskFilter";
import type { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { generate_random_hrm_time_tracking_reports_create } from "../../../generate/generate_random_hrm_time_tracking_reports_create";
import { generate_random_hrm_time_tracking_reports_snapshots_create } from "../../../generate/generate_random_hrm_time_tracking_reports_snapshots_create";
import { prepare_random_hrm_time_tracking_report } from "../../../prepare/prepare_random_hrm_time_tracking_report";
import { prepare_random_hrm_time_tracking_report_employee_filter } from "../../../prepare/prepare_random_hrm_time_tracking_report_employee_filter";
import { prepare_random_hrm_time_tracking_report_project_filter } from "../../../prepare/prepare_random_hrm_time_tracking_report_project_filter";
import { prepare_random_hrm_time_tracking_report_snapshot } from "../../../prepare/prepare_random_hrm_time_tracking_report_snapshot";
import { prepare_random_hrm_time_tracking_report_task_filter } from "../../../prepare/prepare_random_hrm_time_tracking_report_task_filter";

export async function test_api_report_snapshot_detail_parent_child_mismatch(
  connection: api.IConnection,
): Promise<void> {
  const reportConnection: api.IConnection = { host: connection.host };
  const firstReportBody = {
    name: `report-${RandomGenerator.alphaNumeric(8)}-a`,
    reportType: "time_report",
    rangeStartDate: new Date("2024-01-01T00:00:00.000Z").toISOString(),
    rangeEndDate: new Date("2024-01-31T23:59:59.999Z").toISOString(),
    groupBy: "employee",
    billableOnly: false,
    includeNonBillable: true,
    employeeFilters: [],
    projectFilters: [],
    taskFilters: [],
  } satisfies IHrmTimeTrackingReport.ICreate;
  const secondReportBody = {
    name: `report-${RandomGenerator.alphaNumeric(8)}-b`,
    reportType: "weekly_summary_report",
    rangeStartDate: new Date("2024-02-01T00:00:00.000Z").toISOString(),
    rangeEndDate: new Date("2024-02-29T23:59:59.999Z").toISOString(),
    groupBy: "project",
    billableOnly: false,
    includeNonBillable: true,
    employeeFilters: [],
    projectFilters: [],
    taskFilters: [],
  } satisfies IHrmTimeTrackingReport.ICreate;
  const firstReport = await generate_random_hrm_time_tracking_reports_create(
    reportConnection,
    {
      body: firstReportBody,
    },
  );
  typia.assert(firstReport);
  const secondReport = await generate_random_hrm_time_tracking_reports_create(
    reportConnection,
    {
      body: secondReportBody,
    },
  );
  typia.assert(secondReport);
  TestValidator.notEquals(
    "two reports must be different",
    firstReport.id,
    secondReport.id,
  );
  const firstSnapshotBody = {
    output_uri: `https://example.com/${RandomGenerator.alphaNumeric(12)}.csv`,
    output_format: "csv",
    period_start: new Date("2024-01-01T00:00:00.000Z").toISOString(),
    period_end: new Date("2024-01-31T23:59:59.999Z").toISOString(),
    row_count: 10,
    generated_at: new Date("2024-02-01T00:00:00.000Z").toISOString(),
  } satisfies IHrmTimeTrackingReportSnapshot.ICreate;
  const secondSnapshotBody = {
    output_uri: `https://example.com/${RandomGenerator.alphaNumeric(12)}.pdf`,
    output_format: "pdf",
    period_start: new Date("2024-02-01T00:00:00.000Z").toISOString(),
    period_end: new Date("2024-02-29T23:59:59.999Z").toISOString(),
    row_count: 20,
    generated_at: new Date("2024-03-01T00:00:00.000Z").toISOString(),
  } satisfies IHrmTimeTrackingReportSnapshot.ICreate;
  const firstSnapshot =
    await generate_random_hrm_time_tracking_reports_snapshots_create(
      reportConnection,
      {
        params: {
          reportId: firstReport.id,
        },
        body: firstSnapshotBody,
      },
    );
  typia.assert(firstSnapshot);
  const secondSnapshot =
    await generate_random_hrm_time_tracking_reports_snapshots_create(
      reportConnection,
      {
        params: {
          reportId: secondReport.id,
        },
        body: secondSnapshotBody,
      },
    );
  typia.assert(secondSnapshot);
  TestValidator.notEquals(
    "two snapshots must be different",
    firstSnapshot.id,
    secondSnapshot.id,
  );
  TestValidator.equals(
    "second snapshot belongs to second report",
    secondSnapshot.report.id,
    secondReport.id,
  );
  await TestValidator.httpError(
    "snapshot detail must reject mismatched parent-child path",
    404,
    async () => {
      await api.functional.hrmTimeTracking.reports.snapshots.at(
        reportConnection,
        {
          reportId: firstReport.id,
          snapshotId: secondSnapshot.id,
        },
      );
    },
  );
}
