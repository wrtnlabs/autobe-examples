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

export async function test_api_report_execution_cross_organization_rejected(
  connection: api.IConnection,
): Promise<void> {
  const ownerAConnection: api.IConnection = {
    host: connection.host,
  };
  const ownerA = await authorize_owner_join(ownerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(ownerA);
  const reportName = `cross-org-report-${RandomGenerator.alphaNumeric(8)}`;
  const rangeStartDate = new Date(
    Date.now() - 1000 * 60 * 60 * 24,
  ).toISOString();
  const rangeEndDate = new Date().toISOString();
  const report = await generate_random_hrm_time_tracking_reports_create(
    ownerAConnection,
    {
      body: {
        name: reportName,
        reportType: "time_report",
        rangeStartDate,
        rangeEndDate,
        groupBy: null,
        billableOnly: null,
        includeNonBillable: null,
      },
    },
  );
  typia.assert(report);
  TestValidator.equals("report name matches input", report.name, reportName);
  TestValidator.equals(
    "report type matches input",
    report.reportType,
    "time_report",
  );
  const ownerBConnection: api.IConnection = {
    host: connection.host,
  };
  const ownerB = await authorize_owner_join(ownerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(ownerB);
  TestValidator.notEquals("owners must differ", ownerA.id, ownerB.id);
  await TestValidator.httpError(
    "cross-organization report execution must be rejected",
    [403, 404],
    async () => {
      await generate_random_hrm_time_tracking_owner_reports_executions_create(
        ownerBConnection,
        {
          params: {
            reportId: report.id,
          },
          body: {
            output_uri: `${connection.host}/artifacts/${RandomGenerator.alphaNumeric(12)}.csv`,
            output_format: "csv",
            period_start: rangeStartDate,
            period_end: rangeEndDate,
            row_count: 0,
            generated_at: new Date().toISOString(),
          },
        },
      );
    },
  );
}
