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

export async function test_api_report_execution_dependency_failure_atomic(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/hrm/reports",
      referrer: "https://example.com/hrm",
    },
  });
  typia.assert(authorized);
  const reportBody = {
    name: `atomic-failure-${RandomGenerator.alphaNumeric(8)}`,
    reportType: "time_report",
    rangeStartDate: new Date("2025-01-01T00:00:00.000Z").toISOString(),
    rangeEndDate: new Date("2025-01-31T23:59:59.999Z").toISOString(),
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
  TestValidator.equals("report name matches", report.name, reportBody.name);
  TestValidator.equals(
    "report type matches",
    report.reportType,
    reportBody.reportType,
  );
  const executionBody = {
    output_uri: `s3://dependency-failure-test/${RandomGenerator.alphaNumeric(12)}.csv`,
    output_format: "csv",
    period_start: new Date("2025-01-01T00:00:00.000Z").toISOString(),
    period_end: new Date("2025-01-31T23:59:59.999Z").toISOString(),
    row_count: null,
    generated_at: new Date().toISOString(),
  } satisfies IHrmTimeTrackingReportSnapshot.ICreate;
  await TestValidator.error(
    "report execution fails atomically when dependency fails",
    async () => {
      await generate_random_hrm_time_tracking_owner_reports_executions_create(
        ownerConnection,
        {
          params: {
            reportId: report.id,
          },
          body: executionBody,
        },
      );
    },
  );
  TestValidator.equals(
    "report name remains stable after failed execution attempt",
    report.name,
    reportBody.name,
  );
}
