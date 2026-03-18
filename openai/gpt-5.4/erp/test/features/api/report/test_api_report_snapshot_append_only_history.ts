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

export async function test_api_report_snapshot_append_only_history(
  connection: api.IConnection,
): Promise<void> {
  const userConnection: api.IConnection = {
    host: connection.host,
  };
  const report = await generate_random_hrm_time_tracking_reports_create(
    userConnection,
    {
      body: {
        name: `report-${RandomGenerator.alphabets(8)}`,
        reportType: "time_report",
        rangeStartDate: new Date("2026-01-01T00:00:00.000Z").toISOString(),
        rangeEndDate: new Date("2026-01-31T23:59:59.999Z").toISOString(),
      },
    },
  );
  typia.assert(report);
  const firstGeneratedAt = new Date("2026-02-01T09:00:00.000Z").toISOString();
  const secondGeneratedAt = new Date("2026-02-02T09:00:00.000Z").toISOString();
  const periodStart = new Date("2026-01-01T00:00:00.000Z").toISOString();
  const periodEnd = new Date("2026-01-31T23:59:59.999Z").toISOString();
  const firstBody = {
    output_uri: `s3://reports/${report.id}/snapshot-${RandomGenerator.alphaNumeric(8)}.csv`,
    output_format: "csv",
    period_start: periodStart,
    period_end: periodEnd,
    row_count: 10,
    generated_at: firstGeneratedAt,
  } satisfies IHrmTimeTrackingReportSnapshot.ICreate;
  const secondBody = {
    output_uri: `s3://reports/${report.id}/snapshot-${RandomGenerator.alphaNumeric(8)}.csv`,
    output_format: "csv",
    period_start: periodStart,
    period_end: periodEnd,
    row_count: 12,
    generated_at: secondGeneratedAt,
  } satisfies IHrmTimeTrackingReportSnapshot.ICreate;
  const firstSnapshot =
    await generate_random_hrm_time_tracking_reports_snapshots_create(
      userConnection,
      {
        params: {
          reportId: report.id,
        },
        body: firstBody,
      },
    );
  typia.assert(firstSnapshot);
  const secondSnapshot =
    await generate_random_hrm_time_tracking_reports_snapshots_create(
      userConnection,
      {
        params: {
          reportId: report.id,
        },
        body: secondBody,
      },
    );
  typia.assert(secondSnapshot);
  TestValidator.notEquals(
    "snapshot ids must differ for append-only history",
    firstSnapshot.id,
    secondSnapshot.id,
  );
  TestValidator.equals(
    "first snapshot belongs to parent report",
    firstSnapshot.report.id,
    report.id,
  );
  TestValidator.equals(
    "second snapshot belongs to parent report",
    secondSnapshot.report.id,
    report.id,
  );
  TestValidator.equals(
    "first snapshot keeps first output uri",
    firstSnapshot.output_uri,
    firstBody.output_uri,
  );
  TestValidator.equals(
    "first snapshot keeps first output format",
    firstSnapshot.output_format,
    firstBody.output_format,
  );
  TestValidator.equals(
    "first snapshot keeps first period start",
    firstSnapshot.period_start,
    firstBody.period_start,
  );
  TestValidator.equals(
    "first snapshot keeps first period end",
    firstSnapshot.period_end,
    firstBody.period_end,
  );
  TestValidator.equals(
    "first snapshot keeps first row count",
    firstSnapshot.row_count,
    firstBody.row_count,
  );
  TestValidator.equals(
    "first snapshot keeps first generated at",
    firstSnapshot.generated_at,
    firstBody.generated_at,
  );
  TestValidator.equals(
    "second snapshot keeps second output uri",
    secondSnapshot.output_uri,
    secondBody.output_uri,
  );
  TestValidator.equals(
    "second snapshot keeps second output format",
    secondSnapshot.output_format,
    secondBody.output_format,
  );
  TestValidator.equals(
    "second snapshot keeps second period start",
    secondSnapshot.period_start,
    secondBody.period_start,
  );
  TestValidator.equals(
    "second snapshot keeps second period end",
    secondSnapshot.period_end,
    secondBody.period_end,
  );
  TestValidator.equals(
    "second snapshot keeps second row count",
    secondSnapshot.row_count,
    secondBody.row_count,
  );
  TestValidator.equals(
    "second snapshot keeps second generated at",
    secondSnapshot.generated_at,
    secondBody.generated_at,
  );
  TestValidator.equals(
    "first snapshot output uri remains unchanged after second creation",
    firstSnapshot.output_uri,
    firstBody.output_uri,
  );
  TestValidator.equals(
    "first snapshot generated at remains unchanged after second creation",
    firstSnapshot.generated_at,
    firstBody.generated_at,
  );
  TestValidator.notEquals(
    "snapshot output uris should differ across generations",
    firstSnapshot.output_uri,
    secondSnapshot.output_uri,
  );
  TestValidator.notEquals(
    "snapshot generated times should differ across generations",
    firstSnapshot.generated_at,
    secondSnapshot.generated_at,
  );
}
