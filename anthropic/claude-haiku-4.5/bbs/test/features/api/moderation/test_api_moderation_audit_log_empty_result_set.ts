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
 * Test handling of audit log queries that return empty result sets.
 *
 * This test validates that the audit log API gracefully handles queries with
 * filters that match no entries. A moderator account is created and
 * authenticated, then multiple audit log queries are performed with different
 * filter combinations that should return zero results:
 *
 * 1. Query with action_type that has never occurred in the system
 * 2. Query with date range far in the future
 * 3. Query with non-existent moderator ID
 * 4. Query with non-existent affected contributor ID
 *
 * For each query, the test validates that:
 *
 * - The response data array is empty
 * - Pagination shows records=0 and pages=0
 * - The pagination structure is correctly formed
 * - The API responds successfully without errors
 *
 * This ensures the API properly handles edge cases and empty result sets,
 * providing consistent responses whether results exist or not.
 */
export async function test_api_moderation_audit_log_empty_result_set(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a moderator account
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "TestPassword123!",
        username: RandomGenerator.alphabets(8),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);
  TestValidator.predicate(
    "moderator authenticated successfully",
    !!moderator.token.access,
  );

  // Step 2: Query with action_type that has never occurred
  const emptyByActionType: IPageIDiscussionBoardModeratorAuditLog.ISummary =
    await api.functional.discussionBoard.moderator.moderation.audit_log.index(
      connection,
      {
        body: {
          action_type: "article_pinned",
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardModeratorAuditLog.IRequest,
      },
    );
  typia.assert(emptyByActionType);
  TestValidator.equals(
    "empty result for non-existent action_type has zero data",
    emptyByActionType.data.length,
    0,
  );
  TestValidator.equals(
    "empty result for non-existent action_type shows records=0",
    emptyByActionType.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty result for non-existent action_type shows pages=0",
    emptyByActionType.pagination.pages,
    0,
  );

  // Step 3: Query with future date range (no entries will be before this future date)
  const futureDate = new Date();
  futureDate.setFullYear(futureDate.getFullYear() + 10);
  const emptyByFutureDate: IPageIDiscussionBoardModeratorAuditLog.ISummary =
    await api.functional.discussionBoard.moderator.moderation.audit_log.index(
      connection,
      {
        body: {
          date_from: futureDate.toISOString(),
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardModeratorAuditLog.IRequest,
      },
    );
  typia.assert(emptyByFutureDate);
  TestValidator.equals(
    "empty result for future date range has zero data",
    emptyByFutureDate.data.length,
    0,
  );
  TestValidator.equals(
    "empty result for future date range shows records=0",
    emptyByFutureDate.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty result for future date range shows pages=0",
    emptyByFutureDate.pagination.pages,
    0,
  );

  // Step 4: Query with non-existent moderator ID
  const nonExistentModeratorId = typia.random<string & tags.Format<"uuid">>();
  const emptyByModerator: IPageIDiscussionBoardModeratorAuditLog.ISummary =
    await api.functional.discussionBoard.moderator.moderation.audit_log.index(
      connection,
      {
        body: {
          moderator_id: nonExistentModeratorId,
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardModeratorAuditLog.IRequest,
      },
    );
  typia.assert(emptyByModerator);
  TestValidator.equals(
    "empty result for non-existent moderator has zero data",
    emptyByModerator.data.length,
    0,
  );
  TestValidator.equals(
    "empty result for non-existent moderator shows records=0",
    emptyByModerator.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty result for non-existent moderator shows pages=0",
    emptyByModerator.pagination.pages,
    0,
  );

  // Step 5: Query with non-existent affected contributor ID
  const nonExistentContributorId = typia.random<string & tags.Format<"uuid">>();
  const emptyByContributor: IPageIDiscussionBoardModeratorAuditLog.ISummary =
    await api.functional.discussionBoard.moderator.moderation.audit_log.index(
      connection,
      {
        body: {
          affected_contributor_id: nonExistentContributorId,
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardModeratorAuditLog.IRequest,
      },
    );
  typia.assert(emptyByContributor);
  TestValidator.equals(
    "empty result for non-existent contributor has zero data",
    emptyByContributor.data.length,
    0,
  );
  TestValidator.equals(
    "empty result for non-existent contributor shows records=0",
    emptyByContributor.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty result for non-existent contributor shows pages=0",
    emptyByContributor.pagination.pages,
    0,
  );

  // Step 6: Verify pagination structure consistency
  TestValidator.predicate(
    "pagination current page is valid",
    emptyByContributor.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is non-negative",
    emptyByContributor.pagination.limit >= 0,
  );
  TestValidator.equals(
    "pagination records equals zero for empty result",
    emptyByContributor.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages equals zero for empty result",
    emptyByContributor.pagination.pages,
    0,
  );
}
