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
 * Test filtering audit log entries by specific moderator ID.
 *
 * This test validates that moderators can retrieve and filter audit log entries
 * by a specific moderator ID. The audit log is an immutable, append-only record
 * of all moderation actions performed on the platform. By filtering by
 * moderator_id, the system enables moderator performance review, consistency
 * analysis of individual moderator decisions, and accountability tracking.
 *
 * The test workflow:
 *
 * 1. Create first moderator account (will be used as the moderator to filter by)
 * 2. Create second moderator account (authenticated user making the query)
 * 3. Query audit log with filter for the first moderator's ID
 * 4. Validate pagination structure
 * 5. Verify that filtering correctly isolates records by moderator ID
 * 6. Confirm audit log entries contain correct moderator identification
 */
export async function test_api_moderation_audit_log_filter_by_moderator(
  connection: api.IConnection,
) {
  // Step 1: Create first moderator account
  const moderator1Email: string = typia.random<string & tags.Format<"email">>();
  const moderator1 = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderator1Email,
      password: "SecurePass123!",
      username: RandomGenerator.alphabets(8),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator1);
  TestValidator.predicate(
    "moderator 1 created successfully",
    () => moderator1.id !== undefined,
  );

  // Step 2: Create second moderator account
  const moderator2Email: string = typia.random<string & tags.Format<"email">>();
  const moderator2 = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderator2Email,
      password: "SecurePass123!",
      username: RandomGenerator.alphabets(8),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator2);
  TestValidator.predicate(
    "moderator 2 created successfully",
    () => moderator2.id !== undefined,
  );

  // Step 3: Query audit log with filter for moderator1's ID
  const auditLogResponse: IPageIDiscussionBoardModeratorAuditLog.ISummary =
    await api.functional.discussionBoard.moderator.moderation.audit_log.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          moderator_id: moderator1.id,
        } satisfies IDiscussionBoardModeratorAuditLog.IRequest,
      },
    );
  typia.assert(auditLogResponse);

  // Step 4: Validate pagination structure
  TestValidator.predicate(
    "pagination current page should be valid",
    () => auditLogResponse.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit should be valid",
    () => auditLogResponse.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination total records should be valid",
    () => auditLogResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination total pages should be valid",
    () => auditLogResponse.pagination.pages >= 0,
  );

  // Step 5: Verify that data array exists and is an array
  TestValidator.predicate("audit log data should be an array", () =>
    Array.isArray(auditLogResponse.data),
  );

  // Step 6: Confirm audit log entries contain correct moderator identification
  // For each entry in the response, verify the moderator ID matches the filter
  if (auditLogResponse.data.length > 0) {
    for (const entry of auditLogResponse.data) {
      typia.assert(entry);
      TestValidator.equals(
        "audit log entry should have moderator property",
        entry.moderator !== undefined,
        true,
      );
      TestValidator.equals(
        "audit log entry moderator ID should match filter",
        entry.moderator.id,
        moderator1.id,
      );
    }
  }

  // Step 7: Test with different pagination parameters
  const secondPageResponse: IPageIDiscussionBoardModeratorAuditLog.ISummary =
    await api.functional.discussionBoard.moderator.moderation.audit_log.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          moderator_id: moderator1.id,
        } satisfies IDiscussionBoardModeratorAuditLog.IRequest,
      },
    );
  typia.assert(secondPageResponse);
  TestValidator.predicate(
    "audit log should return consistent pagination with different limit",
    () => secondPageResponse.pagination.limit === 10,
  );

  // Step 8: Test filtering works by comparing results with and without moderator_id filter
  const unFilteredResponse: IPageIDiscussionBoardModeratorAuditLog.ISummary =
    await api.functional.discussionBoard.moderator.moderation.audit_log.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardModeratorAuditLog.IRequest,
      },
    );
  typia.assert(unFilteredResponse);
  TestValidator.predicate(
    "filtered results should have equal or fewer records than unfiltered",
    () =>
      auditLogResponse.pagination.records <=
      unFilteredResponse.pagination.records,
  );
}
