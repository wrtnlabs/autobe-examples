import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingManager";
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

import { authorize_manager_join } from "../../../authorize/authorize_manager_join";
import { authorize_manager_login } from "../../../authorize/authorize_manager_login";
import { authorize_manager_refresh } from "../../../authorize/authorize_manager_refresh";
import { generate_random_hrm_time_tracking_manager_reports_executions_create } from "../../../generate/generate_random_hrm_time_tracking_manager_reports_executions_create";
import { generate_random_hrm_time_tracking_reports_create } from "../../../generate/generate_random_hrm_time_tracking_reports_create";
import { prepare_random_hrm_time_tracking_report } from "../../../prepare/prepare_random_hrm_time_tracking_report";
import { prepare_random_hrm_time_tracking_report_employee_filter } from "../../../prepare/prepare_random_hrm_time_tracking_report_employee_filter";
import { prepare_random_hrm_time_tracking_report_project_filter } from "../../../prepare/prepare_random_hrm_time_tracking_report_project_filter";
import { prepare_random_hrm_time_tracking_report_snapshot } from "../../../prepare/prepare_random_hrm_time_tracking_report_snapshot";
import { prepare_random_hrm_time_tracking_report_task_filter } from "../../../prepare/prepare_random_hrm_time_tracking_report_task_filter";

export async function test_api_report_execution_snapshot_history_append_only(
  connection: api.IConnection,
): Promise<void> {
  const managerConnection: api.IConnection = { host: connection.host };
  await authorize_manager_join(managerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  const rangeStartDate = "2026-01-01T00:00:00.000Z";
  const rangeEndDate = "2026-01-31T23:59:59.000Z";
  const generatedAtFirst = "2026-02-01T00:00:00.000Z";
  const generatedAtSecond = "2026-02-02T00:00:00.000Z";
  const report = await generate_random_hrm_time_tracking_reports_create(
    managerConnection,
    {
      body: {
        name: `report-${RandomGenerator.alphaNumeric(8)}`,
        reportType: "time_report",
        rangeStartDate,
        rangeEndDate,
        groupBy: null,
        billableOnly: true,
        includeNonBillable: false,
      } satisfies IHrmTimeTrackingReport.ICreate,
    },
  );
  typia.assert(report);
  TestValidator.equals(
    "report type is persisted",
    report.reportType,
    "time_report",
  );
  TestValidator.equals(
    "report billableOnly is persisted",
    report.billableOnly,
    true,
  );
  TestValidator.equals(
    "report includeNonBillable is persisted",
    report.includeNonBillable,
    false,
  );
  TestValidator.equals(
    "report rangeStartDate is persisted",
    report.rangeStartDate,
    rangeStartDate,
  );
  TestValidator.equals(
    "report rangeEndDate is persisted",
    report.rangeEndDate,
    rangeEndDate,
  );
  const firstSnapshot =
    await generate_random_hrm_time_tracking_manager_reports_executions_create(
      managerConnection,
      {
        params: {
          reportId: report.id,
        },
        body: {
          output_uri: `https://storage.example.com/reports/${report.id}/snapshot-${RandomGenerator.alphaNumeric(8)}.csv`,
          output_format: "csv",
          period_start: rangeStartDate,
          period_end: rangeEndDate,
          row_count: 10,
          generated_at: generatedAtFirst,
        } satisfies IHrmTimeTrackingReportSnapshot.ICreate,
      },
    );
  typia.assert(firstSnapshot);
  const firstSnapshotId = firstSnapshot.id;
  const firstSnapshotOutputUri = firstSnapshot.output_uri;
  const firstSnapshotOutputFormat = firstSnapshot.output_format;
  const firstSnapshotGeneratedAt = firstSnapshot.generated_at;
  const firstSnapshotPeriodStart = firstSnapshot.period_start;
  const firstSnapshotPeriodEnd = firstSnapshot.period_end;
  const firstSnapshotReportId = firstSnapshot.report.id;
  const secondSnapshot =
    await generate_random_hrm_time_tracking_manager_reports_executions_create(
      managerConnection,
      {
        params: {
          reportId: report.id,
        },
        body: {
          output_uri: `https://storage.example.com/reports/${report.id}/snapshot-${RandomGenerator.alphaNumeric(8)}.pdf`,
          output_format: "pdf",
          period_start: rangeStartDate,
          period_end: rangeEndDate,
          row_count: 10,
          generated_at: generatedAtSecond,
        } satisfies IHrmTimeTrackingReportSnapshot.ICreate,
      },
    );
  typia.assert(secondSnapshot);
  TestValidator.notEquals(
    "snapshot ids are distinct",
    firstSnapshotId,
    secondSnapshot.id,
  );
  TestValidator.equals(
    "first snapshot belongs to saved report",
    firstSnapshotReportId,
    report.id,
  );
  TestValidator.equals(
    "second snapshot belongs to saved report",
    secondSnapshot.report.id,
    report.id,
  );
  TestValidator.equals(
    "first snapshot period_start matches saved report range",
    firstSnapshotPeriodStart,
    rangeStartDate,
  );
  TestValidator.equals(
    "first snapshot period_end matches saved report range",
    firstSnapshotPeriodEnd,
    rangeEndDate,
  );
  TestValidator.equals(
    "second snapshot period_start matches saved report range",
    secondSnapshot.period_start,
    rangeStartDate,
  );
  TestValidator.equals(
    "second snapshot period_end matches saved report range",
    secondSnapshot.period_end,
    rangeEndDate,
  );
  TestValidator.notEquals(
    "output uris differ across executions",
    firstSnapshotOutputUri,
    secondSnapshot.output_uri,
  );
  TestValidator.notEquals(
    "output formats differ across executions",
    firstSnapshotOutputFormat,
    secondSnapshot.output_format,
  );
  TestValidator.notEquals(
    "generated_at values are independently recorded",
    firstSnapshotGeneratedAt,
    secondSnapshot.generated_at,
  );
  TestValidator.equals(
    "earlier snapshot output uri remains unchanged after later execution",
    firstSnapshot.output_uri,
    firstSnapshotOutputUri,
  );
  TestValidator.equals(
    "earlier snapshot output format remains unchanged after later execution",
    firstSnapshot.output_format,
    firstSnapshotOutputFormat,
  );
  TestValidator.equals(
    "earlier snapshot generated_at remains unchanged after later execution",
    firstSnapshot.generated_at,
    firstSnapshotGeneratedAt,
  );
  TestValidator.equals(
    "earlier snapshot period_start remains unchanged after later execution",
    firstSnapshot.period_start,
    firstSnapshotPeriodStart,
  );
  TestValidator.equals(
    "earlier snapshot period_end remains unchanged after later execution",
    firstSnapshot.period_end,
    firstSnapshotPeriodEnd,
  );
}
