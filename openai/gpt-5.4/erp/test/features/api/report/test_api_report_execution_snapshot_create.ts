import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOwner";
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

import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";
import { generate_random_hrm_time_tracking_owner_reports_executions_create } from "../../../generate/generate_random_hrm_time_tracking_owner_reports_executions_create";
import { generate_random_hrm_time_tracking_reports_create } from "../../../generate/generate_random_hrm_time_tracking_reports_create";
import { prepare_random_hrm_time_tracking_report } from "../../../prepare/prepare_random_hrm_time_tracking_report";
import { prepare_random_hrm_time_tracking_report_employee_filter } from "../../../prepare/prepare_random_hrm_time_tracking_report_employee_filter";
import { prepare_random_hrm_time_tracking_report_project_filter } from "../../../prepare/prepare_random_hrm_time_tracking_report_project_filter";
import { prepare_random_hrm_time_tracking_report_snapshot } from "../../../prepare/prepare_random_hrm_time_tracking_report_snapshot";
import { prepare_random_hrm_time_tracking_report_task_filter } from "../../../prepare/prepare_random_hrm_time_tracking_report_task_filter";

export async function test_api_report_execution_snapshot_create(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmTimeTrackingOwner.IJoin,
  });
  const rangeStartDate = new Date("2026-01-01T00:00:00.000Z").toISOString();
  const rangeEndDate = new Date("2026-01-07T23:59:59.999Z").toISOString();
  const reportBody = {
    name: `weekly-summary-${RandomGenerator.alphaNumeric(8)}`,
    reportType: "weekly_summary_report",
    rangeStartDate,
    rangeEndDate,
    groupBy: "employee",
    billableOnly: false,
    includeNonBillable: true,
  } satisfies IHrmTimeTrackingReport.ICreate;
  const report = await generate_random_hrm_time_tracking_reports_create(
    ownerConnection,
    {
      body: reportBody,
    },
  );
  typia.assert(report);
  const originalReportId = report.id;
  const originalReportName = report.name;
  const originalReportType = report.reportType;
  const originalRangeStartDate = report.rangeStartDate;
  const originalRangeEndDate = report.rangeEndDate;
  const originalGroupBy = report.groupBy;
  const originalBillableOnly = report.billableOnly;
  const originalIncludeNonBillable = report.includeNonBillable;
  const periodStart = new Date("2026-02-01T00:00:00.000Z").toISOString();
  const periodEnd = new Date("2026-02-07T23:59:59.999Z").toISOString();
  const generatedAt = new Date("2026-02-08T00:00:00.000Z").toISOString();
  const rowCount = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<0>
  >();
  const snapshotBody = {
    output_uri: `https://storage.example.com/reports/${RandomGenerator.alphaNumeric(12)}.csv`,
    output_format: "csv",
    period_start: periodStart,
    period_end: periodEnd,
    row_count: rowCount,
    generated_at: generatedAt,
  } satisfies IHrmTimeTrackingReportSnapshot.ICreate;
  const snapshot =
    await generate_random_hrm_time_tracking_owner_reports_executions_create(
      ownerConnection,
      {
        params: {
          reportId: report.id,
        },
        body: snapshotBody,
      },
    );
  typia.assert(snapshot);
  TestValidator.notEquals(
    "snapshot id differs from report id",
    snapshot.id,
    report.id,
  );
  TestValidator.notEquals(
    "snapshot is a distinct resource from parent report summary",
    snapshot.id,
    snapshot.report.id,
  );
  TestValidator.equals(
    "snapshot links to same report id",
    snapshot.report.id,
    report.id,
  );
  TestValidator.equals(
    "snapshot report name preserved",
    snapshot.report.name,
    report.name,
  );
  TestValidator.equals(
    "snapshot report type preserved",
    snapshot.report.report_type,
    report.reportType,
  );
  TestValidator.equals(
    "snapshot report range start preserved",
    snapshot.report.range_start_date,
    report.rangeStartDate,
  );
  TestValidator.equals(
    "snapshot report range end preserved",
    snapshot.report.range_end_date,
    report.rangeEndDate,
  );
  TestValidator.equals(
    "snapshot report group preserved",
    snapshot.report.group_by,
    report.groupBy,
  );
  TestValidator.equals(
    "snapshot report billableOnly preserved",
    snapshot.report.billable_only,
    report.billableOnly,
  );
  TestValidator.equals(
    "snapshot report includeNonBillable preserved",
    snapshot.report.include_non_billable,
    report.includeNonBillable,
  );
  TestValidator.equals(
    "snapshot output format preserved",
    snapshot.output_format,
    snapshotBody.output_format,
  );
  TestValidator.equals(
    "snapshot output uri preserved",
    snapshot.output_uri,
    snapshotBody.output_uri,
  );
  TestValidator.equals(
    "snapshot period start preserved",
    snapshot.period_start,
    snapshotBody.period_start,
  );
  TestValidator.equals(
    "snapshot period end preserved",
    snapshot.period_end,
    snapshotBody.period_end,
  );
  TestValidator.equals(
    "snapshot generated at preserved",
    snapshot.generated_at,
    snapshotBody.generated_at,
  );
  TestValidator.equals(
    "snapshot row count preserved",
    snapshot.row_count,
    snapshotBody.row_count,
  );
  TestValidator.equals("report id unchanged", report.id, originalReportId);
  TestValidator.equals(
    "report name unchanged",
    report.name,
    originalReportName,
  );
  TestValidator.equals(
    "report type unchanged",
    report.reportType,
    originalReportType,
  );
  TestValidator.equals(
    "report range start unchanged",
    report.rangeStartDate,
    originalRangeStartDate,
  );
  TestValidator.equals(
    "report range end unchanged",
    report.rangeEndDate,
    originalRangeEndDate,
  );
  TestValidator.equals(
    "report group unchanged",
    report.groupBy,
    originalGroupBy,
  );
  TestValidator.equals(
    "report billableOnly unchanged",
    report.billableOnly,
    originalBillableOnly,
  );
  TestValidator.equals(
    "report includeNonBillable unchanged",
    report.includeNonBillable,
    originalIncludeNonBillable,
  );
}
