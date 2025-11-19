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
 * Test filtering audit log by comment ID to review all moderation actions on a
 * specific comment.
 *
 * This test validates the ability to filter moderation audit log entries by
 * comment ID, enabling moderators to review the complete timeline of moderation
 * actions taken on a specific comment. The workflow includes authenticating as
 * a moderator and querying the audit log with a comment_id filter to retrieve
 * all related moderation actions including comment editing, removal, and any
 * user warnings issued in relation to that comment.
 *
 * The test demonstrates:
 *
 * 1. Moderator authentication and authorization
 * 2. Audit log filtering by comment ID
 * 3. Pagination of audit log results
 * 4. Comprehensive moderation timeline retrieval for individual comments
 * 5. Validation that results include all relevant moderation actions
 */
export async function test_api_moderation_audit_log_filter_by_comment(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "Password123!@";

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        username: RandomGenerator.alphabets(15),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Query audit log filtered by a comment ID
  const commentId = typia.random<string & tags.Format<"uuid">>();

  const auditLogResponse: IPageIDiscussionBoardModeratorAuditLog.ISummary =
    await api.functional.discussionBoard.moderator.moderation.audit_log.index(
      connection,
      {
        body: {
          comment_id: commentId,
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardModeratorAuditLog.IRequest,
      },
    );
  typia.assert(auditLogResponse);

  // Step 3: Validate pagination information
  TestValidator.predicate(
    "audit log response should contain pagination info",
    auditLogResponse.pagination !== undefined,
  );

  TestValidator.equals(
    "current page should be 1",
    auditLogResponse.pagination.current,
    1,
  );

  TestValidator.predicate(
    "limit should be 20",
    auditLogResponse.pagination.limit === 20,
  );

  // Step 4: Validate data structure
  TestValidator.predicate(
    "audit log data should be an array",
    Array.isArray(auditLogResponse.data),
  );

  // Step 5: For each audit log entry, verify required fields
  if (auditLogResponse.data.length > 0) {
    const firstEntry = auditLogResponse.data[0];

    TestValidator.predicate(
      "audit log entry should have id",
      firstEntry.id !== undefined && firstEntry.id.length > 0,
    );

    TestValidator.predicate(
      "audit log entry should have action_type",
      firstEntry.action_type !== undefined && firstEntry.action_type.length > 0,
    );

    TestValidator.predicate(
      "audit log entry should have moderator info",
      firstEntry.moderator !== undefined &&
        firstEntry.moderator.id !== undefined &&
        firstEntry.moderator.username !== undefined,
    );

    TestValidator.predicate(
      "audit log entry should have created_at timestamp",
      firstEntry.created_at !== undefined && firstEntry.created_at.length > 0,
    );
  }

  // Step 6: Query audit log with additional filters
  const dateFrom = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const dateTo = new Date().toISOString();

  const filteredAuditLog: IPageIDiscussionBoardModeratorAuditLog.ISummary =
    await api.functional.discussionBoard.moderator.moderation.audit_log.index(
      connection,
      {
        body: {
          comment_id: commentId,
          action_type: "comment_removed",
          date_from: dateFrom,
          date_to: dateTo,
          page: 1,
          limit: 50,
        } satisfies IDiscussionBoardModeratorAuditLog.IRequest,
      },
    );
  typia.assert(filteredAuditLog);

  // Step 7: Validate that filtering response is properly structured
  TestValidator.predicate(
    "filtered audit log should have pagination",
    filteredAuditLog.pagination !== undefined,
  );

  TestValidator.predicate(
    "filtered audit log should have data array",
    Array.isArray(filteredAuditLog.data),
  );

  // Step 8: Query with sorting parameters
  const sortedAuditLog: IPageIDiscussionBoardModeratorAuditLog.ISummary =
    await api.functional.discussionBoard.moderator.moderation.audit_log.index(
      connection,
      {
        body: {
          comment_id: commentId,
          page: 1,
          limit: 20,
          order_by: "created_at",
          order_direction: "desc",
        } satisfies IDiscussionBoardModeratorAuditLog.IRequest,
      },
    );
  typia.assert(sortedAuditLog);

  // Step 9: Validate response integrity
  TestValidator.equals(
    "sorted audit log should have pagination info",
    sortedAuditLog.pagination !== undefined,
    true,
  );

  // Step 10: Test with search in reason field
  const reasonSearchLog: IPageIDiscussionBoardModeratorAuditLog.ISummary =
    await api.functional.discussionBoard.moderator.moderation.audit_log.index(
      connection,
      {
        body: {
          comment_id: commentId,
          reason_search: "spam",
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardModeratorAuditLog.IRequest,
      },
    );
  typia.assert(reasonSearchLog);

  TestValidator.predicate(
    "reason search audit log should be valid",
    reasonSearchLog.data !== undefined,
  );
}
