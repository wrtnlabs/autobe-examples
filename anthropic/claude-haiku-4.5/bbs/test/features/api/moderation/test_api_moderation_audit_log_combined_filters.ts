import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardModeratorAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModeratorAuditLog";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardModeratorAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModeratorAuditLog";

/**
 * Test complex filtering combining multiple criteria on moderation audit log.
 *
 * A moderator authenticates and retrieves audit log entries filtered by:
 *
 * - Action_type='user_suspended'
 * - Moderator_id (specific moderator who performed the action)
 * - Date_from and date_to (time range for the actions)
 *
 * The test validates that the API returns only entries matching ALL filter
 * criteria simultaneously, demonstrating sophisticated multi-dimensional
 * filtering capabilities for audit trail analysis and compliance review.
 *
 * Steps:
 *
 * 1. Create a moderator account for authentication
 * 2. Build filter criteria combining action type, moderator ID, and date range
 * 3. Query audit log with combined filters
 * 4. Validate all returned entries match the combined filter criteria
 * 5. Verify pagination and sorting work correctly with filtered results
 */
export async function test_api_moderation_audit_log_combined_filters(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "SecurePass123!";
  const moderatorUsername = RandomGenerator.alphaNumeric(8);

  const authenticatedModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        username: moderatorUsername,
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(authenticatedModerator);

  // The SDK automatically sets the Authorization header with the access token
  TestValidator.equals(
    "moderator should be authenticated",
    authenticatedModerator.account_status,
    "active",
  );

  // Step 2: Build filter criteria combining multiple dimensions
  // Define a date range for filtering (e.g., last 30 days)
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const dateFrom = thirtyDaysAgo.toISOString();
  const dateTo = now.toISOString();

  const moderatorId = authenticatedModerator.id;
  const actionType = "user_suspended" as const;

  // Step 3: Query audit log with combined filters
  const auditLogResponse: IPageIDiscussionBoardModeratorAuditLog.ISummary =
    await api.functional.discussionBoard.moderator.moderation.audit_log.index(
      connection,
      {
        body: {
          action_type: actionType,
          moderator_id: moderatorId,
          date_from: dateFrom,
          date_to: dateTo,
          page: 1,
          limit: 20,
          order_by: "created_at",
          order_direction: "desc",
        } satisfies IDiscussionBoardModeratorAuditLog.IRequest,
      },
    );
  typia.assert(auditLogResponse);

  // Step 4: Validate all returned entries match the combined filter criteria
  TestValidator.predicate(
    "audit log should contain data array",
    () =>
      auditLogResponse.data !== undefined &&
      Array.isArray(auditLogResponse.data),
  );

  if (auditLogResponse.data.length > 0) {
    // Validate each entry matches ALL filter criteria
    for (const entry of auditLogResponse.data) {
      TestValidator.equals(
        "entry action_type should match filter",
        entry.action_type,
        actionType,
      );

      TestValidator.equals(
        "entry moderator_id should match filter",
        entry.moderator.id,
        moderatorId,
      );

      // Verify created_at is within the specified date range
      const entryDate = new Date(entry.created_at);
      const fromDate = new Date(dateFrom);
      const toDate = new Date(dateTo);

      TestValidator.predicate(
        "entry created_at should be >= date_from",
        () => entryDate.getTime() >= fromDate.getTime(),
      );

      TestValidator.predicate(
        "entry created_at should be <= date_to",
        () => entryDate.getTime() <= toDate.getTime(),
      );
    }
  }

  // Step 5: Validate pagination information
  TestValidator.predicate(
    "pagination current should be positive",
    () => auditLogResponse.pagination.current >= 0,
  );

  TestValidator.predicate(
    "pagination limit should match request",
    () => auditLogResponse.pagination.limit === 20,
  );

  TestValidator.predicate(
    "pagination records should be non-negative",
    () => auditLogResponse.pagination.records >= 0,
  );

  TestValidator.predicate(
    "pagination pages calculation should be correct",
    () => {
      const expectedPages = Math.ceil(
        auditLogResponse.pagination.records / auditLogResponse.pagination.limit,
      );
      return auditLogResponse.pagination.pages === expectedPages;
    },
  );

  // Verify that data length does not exceed limit
  TestValidator.predicate(
    "returned data count should not exceed limit",
    () => auditLogResponse.data.length <= auditLogResponse.pagination.limit,
  );
}
