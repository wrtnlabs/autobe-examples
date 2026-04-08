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
import { generate_random_erp_hrm_admin_reports_create } from "../../../generate/generate_random_erp_hrm_admin_reports_create";
import { prepare_random_erp_hrm_report } from "../../../prepare/prepare_random_erp_hrm_report";

export async function test_api_report_parameters_update_existing(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IErpHrmAdmin.IJoin,
  });
  // 2. Create initial report with parameters
  const initialStartDate = new Date("2024-01-01");
  const initialEndDate = new Date("2024-01-31");
  const initialReport = await generate_random_erp_hrm_admin_reports_create(
    adminConnection,
    {
      body: {
        reportType: "time_report",
        startDate: initialStartDate.toISOString().split("T")[0],
        endDate: initialEndDate.toISOString().split("T")[0],
        groupBy: "employee",
        billable: null,
      } satisfies IErpHrmReport.ICreate,
    },
  );
  typia.assert(initialReport);
  // Store initial timestamps for comparison
  const initialReportUpdatedAt = initialReport.updatedAt;
  const initialParameterUpdatedAt = initialReport.parameter.updated_at;
  // 3. Update report parameters with new values
  const newStartDate = new Date("2024-06-01");
  const newEndDate = new Date("2024-06-30");
  const updatedReport =
    await api.functional.erpHrm.admin.reports.parameters.update(
      adminConnection,
      {
        reportId: initialReport.id,
        body: {
          startDate: newStartDate.toISOString(),
          endDate: newEndDate.toISOString(),
          groupBy: "project",
          billable: true,
        } satisfies IErpHrmReportParameter.IUpdate,
      },
    );
  typia.assert(updatedReport);
  // 4. Validate updated parameter values
  TestValidator.equals(
    "group_by updated to project",
    updatedReport.parameter.group_by,
    "project",
  );
  TestValidator.equals(
    "billable updated to true",
    updatedReport.parameter.billable,
    true,
  );
  TestValidator.equals(
    "start_date updated",
    updatedReport.parameter.start_date.startsWith("2024-06-01"),
    true,
  );
  TestValidator.equals(
    "end_date updated",
    updatedReport.parameter.end_date.startsWith("2024-06-30"),
    true,
  );
  // 5. Verify updated_at timestamps are refreshed
  TestValidator.predicate(
    "report updatedAt refreshed",
    updatedReport.updatedAt > initialReportUpdatedAt,
  );
  TestValidator.predicate(
    "parameter updated_at refreshed",
    updatedReport.parameter.updated_at > initialParameterUpdatedAt,
  );
}
