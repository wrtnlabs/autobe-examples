import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformErrorLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformErrorLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformErrorLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformErrorLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test that an admin can search and filter error logs by severity level to identify critical system issues.
 */
export async function test_api_error_log_admin_search_filter_severity(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Test filtering by 'error' severity
  const errorResponse =
    await api.functional.communityPlatform.admin.error_logs.index(
      adminConnection,
      {
        body: {
          severity: "error",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformErrorLog.IRequest,
      },
    );
  typia.assert(errorResponse);
  // Validate pagination metadata
  TestValidator.equals(
    "current page is 1",
    errorResponse.pagination.current,
    1,
  );
  TestValidator.equals("limit is 10", errorResponse.pagination.limit, 10);
  TestValidator.predicate(
    "records count is valid",
    errorResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is valid",
    errorResponse.pagination.pages >= 0,
  );
  // Validate each error log item has severity='error'
  for (const errorLog of errorResponse.data) {
    TestValidator.equals("severity matches filter", errorLog.severity, "error");
  }
  // Test filtering by other severity levels
  const severityLevels = ["critical", "warning", "info", "debug"] as const;
  for (const severity of severityLevels) {
    const severityResponse =
      await api.functional.communityPlatform.admin.error_logs.index(
        adminConnection,
        {
          body: {
            severity,
            page: 1,
            limit: 5,
          } satisfies ICommunityPlatformErrorLog.IRequest,
        },
      );
    typia.assert(severityResponse);
    // Validate each item has the correct severity
    for (const errorLog of severityResponse.data) {
      TestValidator.equals(
        `severity matches ${severity} filter`,
        errorLog.severity,
        severity,
      );
    }
  }
}
