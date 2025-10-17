import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardSecurityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSecurityLog";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSecurityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSecurityLog";

/**
 * Test analysis of permission denial events to identify unauthorized access
 * attempts.
 *
 * This test validates the security audit log filtering functionality
 * specifically for permission denial events. It ensures that administrators can
 * effectively monitor and investigate instances where users attempted to access
 * resources or perform actions beyond their authorization level.
 *
 * Steps:
 *
 * 1. Register administrator account for security monitoring access
 * 2. Query security logs filtered by 'permission_denied' event type
 * 3. Validate paginated response structure
 * 4. Verify filtering works correctly by checking event types
 */
export async function test_api_security_logs_permission_denial_analysis(
  connection: api.IConnection,
) {
  // Step 1: Register administrator account
  const adminCredentials = {
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IDiscussionBoardAdministrator.ICreate;

  const administrator: IDiscussionBoardAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminCredentials,
    });
  typia.assert(administrator);

  // Step 2: Query security logs with permission_denied filter
  const searchRequest = {
    event_type: "permission_denied",
    page: 1,
    limit: 50,
    sort_by: "created_at",
    sort_order: "desc" as const,
  } satisfies IDiscussionBoardSecurityLog.IRequest;

  const securityLogsPage: IPageIDiscussionBoardSecurityLog =
    await api.functional.discussionBoard.administrator.audit.security.index(
      connection,
      {
        body: searchRequest,
      },
    );
  typia.assert(securityLogsPage);

  // Step 3: Validate pagination structure
  TestValidator.predicate(
    "pagination should have valid structure",
    securityLogsPage.pagination.current === 1 &&
      securityLogsPage.pagination.limit === 50 &&
      securityLogsPage.pagination.current <= securityLogsPage.pagination.pages,
  );

  // Step 4: Verify all entries match the permission_denied filter
  if (securityLogsPage.data.length > 0) {
    TestValidator.predicate(
      "all security log entries should be permission_denied events",
      securityLogsPage.data.every(
        (log) => log.event_type === "permission_denied",
      ),
    );
  }
}
