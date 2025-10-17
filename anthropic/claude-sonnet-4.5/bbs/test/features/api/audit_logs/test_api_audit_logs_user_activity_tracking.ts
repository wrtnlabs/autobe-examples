import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuditLog";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAuditLog";

/**
 * Test user-specific activity tracking through audit logs.
 *
 * This test validates that administrators can query audit logs with user_id
 * filters and receive properly structured responses. The test creates an
 * administrator account, authenticates, and queries audit logs with various
 * filter parameters including user_id to verify the API's filtering and
 * pagination mechanisms work correctly.
 *
 * This functionality supports critical administrative operations including:
 *
 * - User activity analysis and behavior pattern monitoring
 * - Investigating user complaints and dispute resolution
 * - Monitoring for suspicious behavior patterns
 * - Forensic data collection for platform governance
 *
 * Test workflow:
 *
 * 1. Create and authenticate administrator account
 * 2. Query audit logs with user_id filter to test filtering mechanism
 * 3. Validate response structure and pagination metadata
 * 4. Query audit logs without filters to test general retrieval
 * 5. Verify API handles empty results gracefully
 */
export async function test_api_audit_logs_user_activity_tracking(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for accessing audit logs
  const adminCredentials = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IDiscussionBoardAdministrator.ICreate;

  const authorizedAdmin: IDiscussionBoardAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminCredentials,
    });
  typia.assert(authorizedAdmin);

  // Step 2: Query audit logs with user_id filter to test filtering mechanism
  const targetUserId = typia.random<string & tags.Format<"uuid">>();

  const userFilteredRequest = {
    user_id: targetUserId,
    page: 1,
    limit: 50,
    sort_by: "created_at",
    sort_order: "desc" as const,
  } satisfies IDiscussionBoardAuditLog.IRequest;

  const userFilteredLogs: IPageIDiscussionBoardAuditLog =
    await api.functional.discussionBoard.administrator.audit.logs.index(
      connection,
      {
        body: userFilteredRequest,
      },
    );
  typia.assert(userFilteredLogs);

  // Step 3: Validate pagination structure for filtered results
  TestValidator.predicate(
    "filtered logs pagination should have valid structure",
    userFilteredLogs.pagination.current >= 0 &&
      userFilteredLogs.pagination.limit >= 0 &&
      userFilteredLogs.pagination.records >= 0 &&
      userFilteredLogs.pagination.pages >= 0,
  );

  // Step 4: If there are results, verify they match the filter
  userFilteredLogs.data.forEach((logEntry, index) => {
    typia.assert(logEntry);

    // Only validate user_id match if the entry has a user_id
    if (logEntry.user_id !== null && logEntry.user_id !== undefined) {
      TestValidator.equals(
        `audit log entry ${index} user_id should match filter when present`,
        logEntry.user_id,
        targetUserId,
      );
    }
  });

  // Step 5: Query audit logs without user filter to test general retrieval
  const generalRequest = {
    page: 1,
    limit: 25,
    sort_by: "created_at",
    sort_order: "desc" as const,
  } satisfies IDiscussionBoardAuditLog.IRequest;

  const generalLogs: IPageIDiscussionBoardAuditLog =
    await api.functional.discussionBoard.administrator.audit.logs.index(
      connection,
      {
        body: generalRequest,
      },
    );
  typia.assert(generalLogs);

  // Step 6: Validate general query pagination structure
  TestValidator.predicate(
    "general logs pagination should have valid structure",
    generalLogs.pagination.current >= 0 &&
      generalLogs.pagination.limit >= 0 &&
      generalLogs.pagination.records >= 0 &&
      generalLogs.pagination.pages >= 0,
  );

  // Step 7: Validate all returned audit log entries structure
  generalLogs.data.forEach((logEntry) => {
    typia.assert(logEntry);
  });

  // Step 8: Test multiple filter combinations
  const multiFilterRequest = {
    action_type: "user_registered",
    page: 1,
    limit: 10,
  } satisfies IDiscussionBoardAuditLog.IRequest;

  const multiFilteredLogs: IPageIDiscussionBoardAuditLog =
    await api.functional.discussionBoard.administrator.audit.logs.index(
      connection,
      {
        body: multiFilterRequest,
      },
    );
  typia.assert(multiFilteredLogs);

  // Step 9: Validate pagination metadata consistency
  TestValidator.predicate(
    "multi-filtered logs should have consistent pagination",
    multiFilteredLogs.pagination.limit === 10,
  );
}
