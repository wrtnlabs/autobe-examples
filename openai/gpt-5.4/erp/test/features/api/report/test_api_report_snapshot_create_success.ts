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

export async function test_api_report_snapshot_create_success(
  connection: api.IConnection,
): Promise<void> {
  const userConnection: api.IConnection = { host: connection.host };
  const reportBody = {
    name: `report-${RandomGenerator.alphabets(8)}`,
    reportType: "time_report",
    rangeStartDate: new Date("2026-01-01T00:00:00.000Z").toISOString(),
    rangeEndDate: new Date("2026-01-31T23:59:59.999Z").toISOString(),
    groupBy: "employee",
    billableOnly: false,
    includeNonBillable: true,
  } satisfies IHrmTimeTrackingReport.ICreate;
  const report: IHrmTimeTrackingReport =
    await generate_random_hrm_time_tracking_reports_create(userConnection, {
      body: reportBody,
    });
  typia.assert(report);
  const parentDefinition = {
    id: report.id,
    name: report.name,
    reportType: report.reportType,
    rangeStartDate: report.rangeStartDate,
    rangeEndDate: report.rangeEndDate,
    groupBy: report.groupBy,
    billableOnly: report.billableOnly,
    includeNonBillable: report.includeNonBillable,
    organizationId: report.organization.id,
  };
  const snapshotBody = {
    output_uri: `https://storage.example.com/reports/${report.id}/snapshot-${RandomGenerator.alphabets(6)}.csv`,
    output_format: "csv",
    period_start: new Date("2026-01-01T00:00:00.000Z").toISOString(),
    period_end: new Date("2026-01-31T23:59:59.999Z").toISOString(),
    row_count: 0,
    generated_at: new Date("2026-02-01T00:00:00.000Z").toISOString(),
  } satisfies IHrmTimeTrackingReportSnapshot.ICreate;
  const snapshot: IHrmTimeTrackingReportSnapshot =
    await generate_random_hrm_time_tracking_reports_snapshots_create(
      userConnection,
      {
        params: { reportId: report.id },
        body: snapshotBody,
      },
    );
  typia.assert(snapshot);
  TestValidator.notEquals(
    "snapshot id differs from parent report id",
    snapshot.id,
    report.id,
  );
  TestValidator.equals(
    "snapshot linked report id",
    snapshot.report.id,
    report.id,
  );
  TestValidator.equals(
    "snapshot linked report name",
    snapshot.report.name,
    parentDefinition.name,
  );
  TestValidator.equals(
    "snapshot linked report type",
    snapshot.report.report_type,
    parentDefinition.reportType,
  );
  TestValidator.equals(
    "snapshot linked report range start",
    snapshot.report.range_start_date,
    parentDefinition.rangeStartDate,
  );
  TestValidator.equals(
    "snapshot linked report range end",
    snapshot.report.range_end_date,
    parentDefinition.rangeEndDate,
  );
  TestValidator.equals(
    "snapshot linked report group by",
    snapshot.report.group_by,
    parentDefinition.groupBy,
  );
  TestValidator.equals(
    "snapshot linked report billable only",
    snapshot.report.billable_only,
    parentDefinition.billableOnly,
  );
  TestValidator.equals(
    "snapshot linked report include non billable",
    snapshot.report.include_non_billable,
    parentDefinition.includeNonBillable,
  );
  TestValidator.equals(
    "snapshot output uri preserved",
    snapshot.output_uri,
    snapshotBody.output_uri,
  );
  TestValidator.equals(
    "snapshot output format preserved",
    snapshot.output_format,
    snapshotBody.output_format,
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
    "snapshot row count preserved",
    snapshot.row_count,
    snapshotBody.row_count,
  );
  TestValidator.equals(
    "snapshot generated at preserved",
    snapshot.generated_at,
    snapshotBody.generated_at,
  );
  TestValidator.equals(
    "snapshot deleted at is null",
    snapshot.deleted_at,
    null,
  );
  TestValidator.equals(
    "parent report name unchanged",
    report.name,
    reportBody.name,
  );
  TestValidator.equals(
    "parent report type unchanged",
    report.reportType,
    reportBody.reportType,
  );
  TestValidator.equals(
    "parent report range start unchanged",
    report.rangeStartDate,
    reportBody.rangeStartDate ?? null,
  );
  TestValidator.equals(
    "parent report range end unchanged",
    report.rangeEndDate,
    reportBody.rangeEndDate ?? null,
  );
  TestValidator.equals(
    "parent report group by unchanged",
    report.groupBy,
    reportBody.groupBy ?? null,
  );
  TestValidator.equals(
    "parent report billable only unchanged",
    report.billableOnly,
    reportBody.billableOnly ?? null,
  );
  TestValidator.equals(
    "parent report include non billable unchanged",
    report.includeNonBillable,
    reportBody.includeNonBillable ?? null,
  );
  TestValidator.equals(
    "parent organization unchanged",
    report.organization.id,
    parentDefinition.organizationId,
  );
}
