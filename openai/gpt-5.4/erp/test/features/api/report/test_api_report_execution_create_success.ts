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

export async function test_api_report_execution_create_success(
  connection: api.IConnection,
): Promise<void> {
  const managerConnection: api.IConnection = { host: connection.host };
  const manager = await authorize_manager_join(managerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(manager);
  const savedRangeStart = new Date("2026-01-01T00:00:00.000Z").toISOString();
  const savedRangeEnd = new Date("2026-01-31T23:59:59.000Z").toISOString();
  const reportBody = {
    name: `report-${RandomGenerator.alphaNumeric(8)}`,
    reportType: "weekly_summary_report",
    rangeStartDate: savedRangeStart,
    rangeEndDate: savedRangeEnd,
    groupBy: "employee",
    billableOnly: false,
    includeNonBillable: true,
  } satisfies IHrmTimeTrackingReport.ICreate;
  const report = await generate_random_hrm_time_tracking_reports_create(
    managerConnection,
    {
      body: reportBody,
    },
  );
  typia.assert(report);
  const executionBody = {
    output_uri: `https://storage.example.com/reports/${RandomGenerator.alphaNumeric(12)}.csv`,
    output_format: "csv",
    period_start: savedRangeStart,
    period_end: savedRangeEnd,
    generated_at: new Date("2026-02-01T00:00:00.000Z").toISOString(),
    row_count: 12,
  } satisfies IHrmTimeTrackingReportSnapshot.ICreate;
  const snapshot =
    await generate_random_hrm_time_tracking_manager_reports_executions_create(
      managerConnection,
      {
        params: {
          reportId: report.id,
        },
        body: executionBody,
      },
    );
  typia.assert(snapshot);
  TestValidator.notEquals(
    "snapshot id differs from report id",
    snapshot.id,
    report.id,
  );
  TestValidator.equals(
    "snapshot references saved report id",
    snapshot.report.id,
    report.id,
  );
  TestValidator.equals(
    "snapshot report name matches saved report",
    snapshot.report.name,
    report.name,
  );
  TestValidator.equals(
    "snapshot report type matches saved report",
    snapshot.report.report_type,
    report.reportType,
  );
  TestValidator.equals(
    "output uri preserved",
    snapshot.output_uri,
    executionBody.output_uri,
  );
  TestValidator.equals(
    "output format preserved",
    snapshot.output_format,
    executionBody.output_format,
  );
  TestValidator.equals(
    "period start preserved",
    snapshot.period_start,
    executionBody.period_start,
  );
  TestValidator.equals(
    "period end preserved",
    snapshot.period_end,
    executionBody.period_end,
  );
  TestValidator.equals(
    "generated at preserved",
    snapshot.generated_at,
    executionBody.generated_at,
  );
  TestValidator.equals(
    "row count preserved",
    snapshot.row_count,
    executionBody.row_count ?? null,
  );
  TestValidator.equals(
    "saved report name remains reusable",
    report.name,
    reportBody.name,
  );
  TestValidator.equals(
    "saved report type remains reusable",
    report.reportType,
    reportBody.reportType,
  );
  TestValidator.equals(
    "saved report range start remains unchanged",
    report.rangeStartDate,
    reportBody.rangeStartDate ?? null,
  );
  TestValidator.equals(
    "saved report range end remains unchanged",
    report.rangeEndDate,
    reportBody.rangeEndDate ?? null,
  );
  TestValidator.equals(
    "saved report group by remains unchanged",
    report.groupBy,
    reportBody.groupBy ?? null,
  );
  TestValidator.equals(
    "saved report billable flag remains unchanged",
    report.billableOnly,
    reportBody.billableOnly ?? null,
  );
  TestValidator.equals(
    "saved report include non-billable remains unchanged",
    report.includeNonBillable,
    reportBody.includeNonBillable ?? null,
  );
}
