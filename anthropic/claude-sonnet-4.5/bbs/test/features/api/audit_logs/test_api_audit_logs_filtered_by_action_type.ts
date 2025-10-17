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
 * Test audit log retrieval with specific action type filtering.
 *
 * This test validates that administrators can query audit logs filtering by
 * specific action types such as 'topic_created', 'reply_posted', 'vote_cast',
 * 'profile_updated', or 'content_deleted'. The test ensures that filtered
 * results only contain log entries matching the specified action type and that
 * pagination and sorting work correctly with filtered results.
 *
 * Workflow:
 *
 * 1. Register administrator account for audit log access
 * 2. Query audit logs with specific action_type filter
 * 3. Validate response structure and pagination metadata
 * 4. Verify all returned entries match the specified action type
 */
export async function test_api_audit_logs_filtered_by_action_type(
  connection: api.IConnection,
) {
  // Step 1: Register administrator account
  const adminData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IDiscussionBoardAdministrator.ICreate;

  const admin: IDiscussionBoardAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminData,
    });
  typia.assert(admin);

  // Step 2: Query audit logs with action_type filter
  const actionTypes = [
    "topic_created",
    "reply_posted",
    "vote_cast",
    "profile_updated",
    "content_deleted",
  ] as const;
  const selectedActionType = RandomGenerator.pick(actionTypes);

  const auditLogRequest = {
    action_type: selectedActionType,
    page: 1,
    limit: 20,
    sort_by: "created_at",
    sort_order: "desc" as const,
  } satisfies IDiscussionBoardAuditLog.IRequest;

  const auditLogsPage: IPageIDiscussionBoardAuditLog =
    await api.functional.discussionBoard.administrator.audit.logs.index(
      connection,
      {
        body: auditLogRequest,
      },
    );
  typia.assert(auditLogsPage);

  // Step 3: Validate response structure and pagination
  TestValidator.predicate(
    "pagination metadata should be valid",
    auditLogsPage.pagination.current === 1 &&
      auditLogsPage.pagination.limit === 20 &&
      auditLogsPage.pagination.records >= 0 &&
      auditLogsPage.pagination.pages >= 0,
  );

  // Step 4: Verify all returned entries match the action type filter
  if (auditLogsPage.data.length > 0) {
    for (const logEntry of auditLogsPage.data) {
      TestValidator.equals(
        "audit log entry action_type matches filter",
        logEntry.action_type,
        selectedActionType,
      );
    }
  }
}
