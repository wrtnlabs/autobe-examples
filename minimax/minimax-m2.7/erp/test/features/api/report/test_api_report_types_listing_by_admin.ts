import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_report_types_listing_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const randomSuffix = Math.random().toString(36).substring(2, 12);
  const credentials = {
    body: {
      email: `admin_${randomSuffix}@test.com` as string & tags.Format<"email">,
      password: "TestPassword123!",
    },
  };
  const authorized = await authorize_admin_join(adminConnection, credentials);
  typia.assert(authorized);
  // Create authenticated connection with token
  const authenticatedConnection: api.IConnection = { host: connection.host };
  authenticatedConnection.headers ??= {};
  authenticatedConnection.headers.Authorization = authorized.token.access;
  // 2. Call GET /erpHrm/admin/organizations/{organizationId}/reports/types
  const organizationId = authorized.id;
  const reportType =
    await api.functional.erpHrm.admin.organizations.reports.types.listTypes(
      authenticatedConnection,
      {
        organizationId: organizationId,
      },
    );
  // 3. Validate response with typia.assert for complete type validation
  typia.assert(reportType);
  // 4. Validate report type has required properties
  TestValidator.predicate(
    "report_type is valid string",
    typeof reportType.report_type === "string" &&
      reportType.report_type.length > 0,
  );
  TestValidator.predicate(
    "description is valid string",
    typeof reportType.description === "string" &&
      reportType.description.length > 0,
  );
  // 5. Verify report_type is one of expected values
  const expectedReportTypes = [
    "time_report",
    "project_budget_report",
    "weekly_summary_report",
  ];
  TestValidator.equals(
    "report_type is one of expected values",
    expectedReportTypes.includes(reportType.report_type),
    true,
  );
}
