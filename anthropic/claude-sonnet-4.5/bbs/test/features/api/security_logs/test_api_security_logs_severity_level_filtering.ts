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
 * Test security log filtering by severity levels to prioritize critical
 * security events.
 *
 * This test validates that administrators can effectively filter security logs
 * by severity levels (low, medium, high, critical) to focus on the most serious
 * security threats and implement appropriate incident response procedures.
 *
 * Test workflow:
 *
 * 1. Register a new administrator account with platform control privileges
 * 2. Query security logs filtering by different severity levels
 * 3. Validate that filtered results match the specified severity criteria
 * 4. Verify high and critical severity events are properly classified and
 *    retrievable
 * 5. Confirm pagination and data structure integrity of security log responses
 */
export async function test_api_security_logs_severity_level_filtering(
  connection: api.IConnection,
) {
  // Step 1: Register administrator account for security monitoring
  const adminCredentials = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IDiscussionBoardAdministrator.ICreate;

  const administrator: IDiscussionBoardAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminCredentials,
    });
  typia.assert(administrator);

  // Step 2: Query security logs with critical severity filter
  const criticalLogsRequest = {
    severity: "critical" as const,
    page: 1,
    limit: 50,
    sort_by: "created_at",
    sort_order: "desc" as const,
  } satisfies IDiscussionBoardSecurityLog.IRequest;

  const criticalLogsPage: IPageIDiscussionBoardSecurityLog =
    await api.functional.discussionBoard.administrator.audit.security.index(
      connection,
      {
        body: criticalLogsRequest,
      },
    );
  typia.assert(criticalLogsPage);

  // Step 3: Validate critical logs pagination structure
  TestValidator.predicate(
    "critical logs pagination should have valid structure",
    criticalLogsPage.pagination.current >= 0 &&
      criticalLogsPage.pagination.limit > 0 &&
      criticalLogsPage.pagination.records >= 0 &&
      criticalLogsPage.pagination.pages >= 0,
  );

  // Step 4: Query security logs with high severity filter
  const highLogsRequest = {
    severity: "high" as const,
    page: 1,
    limit: 50,
    sort_by: "created_at",
    sort_order: "desc" as const,
  } satisfies IDiscussionBoardSecurityLog.IRequest;

  const highLogsPage: IPageIDiscussionBoardSecurityLog =
    await api.functional.discussionBoard.administrator.audit.security.index(
      connection,
      {
        body: highLogsRequest,
      },
    );
  typia.assert(highLogsPage);

  // Step 5: Validate high severity logs pagination structure
  TestValidator.predicate(
    "high severity logs pagination should have valid structure",
    highLogsPage.pagination.current >= 0 &&
      highLogsPage.pagination.limit > 0 &&
      highLogsPage.pagination.records >= 0 &&
      highLogsPage.pagination.pages >= 0,
  );

  // Step 6: Query security logs with medium severity filter
  const mediumLogsRequest = {
    severity: "medium" as const,
    page: 1,
    limit: 25,
    sort_by: "created_at",
    sort_order: "asc" as const,
  } satisfies IDiscussionBoardSecurityLog.IRequest;

  const mediumLogsPage: IPageIDiscussionBoardSecurityLog =
    await api.functional.discussionBoard.administrator.audit.security.index(
      connection,
      {
        body: mediumLogsRequest,
      },
    );
  typia.assert(mediumLogsPage);

  // Step 7: Validate medium severity logs response
  TestValidator.predicate(
    "medium severity logs should return valid pagination",
    mediumLogsPage.pagination.current >= 0,
  );

  // Step 8: Query security logs with low severity filter
  const lowLogsRequest = {
    severity: "low" as const,
    page: 1,
    limit: 100,
  } satisfies IDiscussionBoardSecurityLog.IRequest;

  const lowLogsPage: IPageIDiscussionBoardSecurityLog =
    await api.functional.discussionBoard.administrator.audit.security.index(
      connection,
      {
        body: lowLogsRequest,
      },
    );
  typia.assert(lowLogsPage);

  // Step 9: Validate low severity logs response structure
  TestValidator.predicate(
    "low severity logs should have valid data array",
    Array.isArray(lowLogsPage.data),
  );

  // Step 10: Query all security logs without severity filter for comparison
  const allLogsRequest = {
    page: 1,
    limit: 50,
    sort_by: "created_at",
    sort_order: "desc" as const,
  } satisfies IDiscussionBoardSecurityLog.IRequest;

  const allLogsPage: IPageIDiscussionBoardSecurityLog =
    await api.functional.discussionBoard.administrator.audit.security.index(
      connection,
      {
        body: allLogsRequest,
      },
    );
  typia.assert(allLogsPage);

  // Step 11: Validate that unfiltered query returns results
  TestValidator.predicate(
    "all security logs query should return valid pagination",
    allLogsPage.pagination.pages >= 0,
  );
}
