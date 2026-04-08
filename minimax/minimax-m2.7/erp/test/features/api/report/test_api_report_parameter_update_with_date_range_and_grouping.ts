import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmReport";
import type { IErpHrmReportParameter } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmReportParameter";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_admin_reports_create } from "../../../generate/generate_random_erp_hrm_admin_reports_create";
import { prepare_random_erp_hrm_report } from "../../../prepare/prepare_random_erp_hrm_report";

export async function test_api_report_parameter_update_with_date_range_and_grouping(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create a report with initial parameters
  const report = await generate_random_erp_hrm_admin_reports_create(
    adminConnection,
    {
      body: {
        reportType: "time_report",
        startDate: "2026-03-01",
        endDate: "2026-03-31",
        groupBy: "employee",
      },
    },
  );
  typia.assert(report);
  // Store initial timestamps for comparison
  const initialReportUpdatedAt = report.updatedAt;
  const initialParameterUpdatedAt = report.parameter.updated_at;
  // 3. Update the report parameters with new date range, grouping, and billable filter
  const updatedReport =
    await api.functional.erpHrm.member.reports.parameters.update(
      adminConnection,
      {
        reportId: report.id,
        body: {
          startDate: "2026-04-01T00:00:00.000Z",
          endDate: "2026-04-30T23:59:59.999Z",
          groupBy: "project",
          billable: true,
        },
      },
    );
  typia.assert(updatedReport);
  // 4. Validate the response returns the report with updated parameters
  TestValidator.equals("report id preserved", updatedReport.id, report.id);
  TestValidator.equals(
    "report type preserved",
    updatedReport.reportType,
    "time_report",
  );
  // 5. Validate updated parameters reflect new values
  TestValidator.equals(
    "startDate updated to April",
    updatedReport.parameter.start_date,
    "2026-04-01T00:00:00.000Z",
  );
  TestValidator.equals(
    "endDate updated to April 30",
    updatedReport.parameter.end_date,
    "2026-04-30T23:59:59.999Z",
  );
  TestValidator.equals(
    "groupBy changed to project",
    updatedReport.parameter.group_by,
    "project",
  );
  TestValidator.equals(
    "billable set to true",
    updatedReport.parameter.billable,
    true,
  );
  // 6. Verify updatedAt timestamps are refreshed
  TestValidator.predicate(
    "report updatedAt refreshed",
    updatedReport.updatedAt > initialReportUpdatedAt,
  );
  TestValidator.predicate(
    "parameter updatedAt refreshed",
    updatedReport.parameter.updated_at > initialParameterUpdatedAt,
  );
}
