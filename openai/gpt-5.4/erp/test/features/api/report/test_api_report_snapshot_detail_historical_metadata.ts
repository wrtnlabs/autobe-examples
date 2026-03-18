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

export async function test_api_report_snapshot_detail_historical_metadata(
  connection: api.IConnection,
): Promise<void> {
  const actorConnection: api.IConnection = { host: connection.host };
  const reportRangeStart = new Date("2026-01-01T00:00:00.000Z").toISOString();
  const reportRangeEnd = new Date("2026-01-31T23:59:59.000Z").toISOString();
  const reportName = `report-${RandomGenerator.alphaNumeric(8)}`;
  const reportBody = {
    name: reportName,
    reportType: "time_report",
    rangeStartDate: reportRangeStart,
    rangeEndDate: reportRangeEnd,
    groupBy: "employee",
    billableOnly: false,
    includeNonBillable: true,
    employeeFilters: [],
    projectFilters: [],
    taskFilters: [],
  } satisfies IHrmTimeTrackingReport.ICreate;
  const report: IHrmTimeTrackingReport =
    await generate_random_hrm_time_tracking_reports_create(actorConnection, {
      body: reportBody,
    });
  typia.assert(report);
  const snapshotPeriodStart = new Date(
    "2026-01-01T00:00:00.000Z",
  ).toISOString();
  const snapshotPeriodEnd = new Date("2026-01-31T23:59:59.000Z").toISOString();
  const generatedAt = new Date("2026-02-01T00:00:00.000Z").toISOString();
  const rowCount = 17;
  const outputUri = `s3://reports/${RandomGenerator.alphaNumeric(12)}.csv`;
  const outputFormat = "csv";
  const snapshotBody = {
    output_uri: outputUri,
    output_format: outputFormat,
    period_start: snapshotPeriodStart,
    period_end: snapshotPeriodEnd,
    row_count: rowCount,
    generated_at: generatedAt,
  } satisfies IHrmTimeTrackingReportSnapshot.ICreate;
  const snapshot: IHrmTimeTrackingReportSnapshot =
    await generate_random_hrm_time_tracking_reports_snapshots_create(
      actorConnection,
      {
        params: {
          reportId: report.id,
        },
        body: snapshotBody,
      },
    );
  typia.assert(snapshot);
  const detail: IHrmTimeTrackingReportSnapshot =
    await api.functional.hrmTimeTracking.reports.snapshots.at(actorConnection, {
      reportId: report.id,
      snapshotId: snapshot.id,
    });
  typia.assert(detail);
  TestValidator.equals("snapshot id matches", detail.id, snapshot.id);
  TestValidator.equals("linked report id matches", detail.report.id, report.id);
  TestValidator.equals(
    "linked report id matches snapshot",
    detail.report.id,
    snapshot.report.id,
  );
  TestValidator.equals(
    "linked report name matches",
    detail.report.name,
    report.name,
  );
  TestValidator.equals(
    "linked report name matches snapshot",
    detail.report.name,
    snapshot.report.name,
  );
  TestValidator.equals(
    "linked report type matches snapshot",
    detail.report.report_type,
    snapshot.report.report_type,
  );
  TestValidator.equals("output uri preserved", detail.output_uri, outputUri);
  TestValidator.equals(
    "output uri matches persisted snapshot",
    detail.output_uri,
    snapshot.output_uri,
  );
  TestValidator.equals(
    "output format preserved",
    detail.output_format,
    outputFormat,
  );
  TestValidator.equals(
    "output format matches persisted snapshot",
    detail.output_format,
    snapshot.output_format,
  );
  TestValidator.equals(
    "period start preserved",
    detail.period_start,
    snapshotPeriodStart,
  );
  TestValidator.equals(
    "period start matches persisted snapshot",
    detail.period_start,
    snapshot.period_start,
  );
  TestValidator.equals(
    "period end preserved",
    detail.period_end,
    snapshotPeriodEnd,
  );
  TestValidator.equals(
    "period end matches persisted snapshot",
    detail.period_end,
    snapshot.period_end,
  );
  TestValidator.equals(
    "generated at preserved",
    detail.generated_at,
    generatedAt,
  );
  TestValidator.equals(
    "generated at matches persisted snapshot",
    detail.generated_at,
    snapshot.generated_at,
  );
  TestValidator.equals("row count preserved", detail.row_count, rowCount);
  TestValidator.equals(
    "row count matches persisted snapshot",
    detail.row_count,
    snapshot.row_count,
  );
  TestValidator.equals(
    "snapshot created at remains unchanged",
    detail.created_at,
    snapshot.created_at,
  );
  TestValidator.equals(
    "snapshot updated at remains unchanged",
    detail.updated_at,
    snapshot.updated_at,
  );
  TestValidator.equals(
    "snapshot deleted state remains unchanged",
    detail.deleted_at,
    snapshot.deleted_at,
  );
}
