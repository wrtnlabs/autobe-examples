import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModerationAction";

/**
 * Test moderation actions endpoint behavior when search criteria match no
 * records.
 *
 * Validates that moderators can search for moderation actions with various
 * filters and receive properly formatted empty result sets when no matching
 * records exist. This ensures the endpoint handles edge cases gracefully and
 * maintains pagination structure even when results are empty.
 *
 * Test workflow:
 *
 * 1. Authenticate as moderator (required for accessing moderation endpoints)
 * 2. Search with non-existent moderator ID filter
 * 3. Search with non-existent affected member ID filter
 * 4. Search within future date range
 * 5. Search with uncommon keyword that matches nothing
 * 6. Validate pagination structure in all empty results
 */
export async function test_api_moderation_actions_empty_search_results(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as moderator
  const moderatorAuth: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphabets(10),
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderatorAuth);
  TestValidator.predicate(
    "moderator authenticated successfully",
    !!moderatorAuth.token.access,
  );

  // Step 2: Search by non-existent moderator ID
  const nonExistentModeratorResult: IPageIDiscussionBoardModerationAction.ISummary =
    await api.functional.discussionBoard.moderator.moderation.actions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          moderatorId: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IDiscussionBoardModerationAction.IRequest,
      },
    );
  typia.assert(nonExistentModeratorResult);
  TestValidator.equals(
    "empty search by non-existent moderator - records count",
    nonExistentModeratorResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty search by non-existent moderator - data array empty",
    nonExistentModeratorResult.data.length,
    0,
  );
  TestValidator.predicate(
    "empty search by non-existent moderator - valid pagination",
    nonExistentModeratorResult.pagination.pages === 0 ||
      nonExistentModeratorResult.pagination.pages === 1,
  );

  // Step 3: Search by non-existent affected member ID
  const nonExistentMemberResult: IPageIDiscussionBoardModerationAction.ISummary =
    await api.functional.discussionBoard.moderator.moderation.actions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          affectedMemberId: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IDiscussionBoardModerationAction.IRequest,
      },
    );
  typia.assert(nonExistentMemberResult);
  TestValidator.equals(
    "empty search by non-existent member - records count",
    nonExistentMemberResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty search by non-existent member - data array empty",
    nonExistentMemberResult.data.length,
    0,
  );
  TestValidator.predicate(
    "empty search by non-existent member - valid pagination",
    nonExistentMemberResult.pagination.pages === 0 ||
      nonExistentMemberResult.pagination.pages === 1,
  );

  // Step 4: Search within future date range
  const futureDate: Date = new Date();
  futureDate.setDate(futureDate.getDate() + 30);
  const futureDate2: Date = new Date(futureDate);
  futureDate2.setDate(futureDate2.getDate() + 30);

  const futureRangeResult: IPageIDiscussionBoardModerationAction.ISummary =
    await api.functional.discussionBoard.moderator.moderation.actions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          dateFrom: futureDate.toISOString(),
          dateTo: futureDate2.toISOString(),
        } satisfies IDiscussionBoardModerationAction.IRequest,
      },
    );
  typia.assert(futureRangeResult);
  TestValidator.equals(
    "empty search with future date range - records count",
    futureRangeResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty search with future date range - data array empty",
    futureRangeResult.data.length,
    0,
  );
  TestValidator.predicate(
    "empty search with future date range - valid pagination",
    futureRangeResult.pagination.pages === 0 ||
      futureRangeResult.pagination.pages === 1,
  );

  // Step 5: Search with uncommon keyword
  const uncommonKeywordResult: IPageIDiscussionBoardModerationAction.ISummary =
    await api.functional.discussionBoard.moderator.moderation.actions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          search: RandomGenerator.alphaNumeric(20),
        } satisfies IDiscussionBoardModerationAction.IRequest,
      },
    );
  typia.assert(uncommonKeywordResult);
  TestValidator.equals(
    "empty search with uncommon keyword - records count",
    uncommonKeywordResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty search with uncommon keyword - data array empty",
    uncommonKeywordResult.data.length,
    0,
  );
  TestValidator.predicate(
    "empty search with uncommon keyword - valid pagination",
    uncommonKeywordResult.pagination.pages === 0 ||
      uncommonKeywordResult.pagination.pages === 1,
  );

  // Step 6: Validate pagination structure consistency
  TestValidator.equals(
    "pagination current page is valid",
    nonExistentModeratorResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is set",
    nonExistentModeratorResult.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    nonExistentModeratorResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    nonExistentModeratorResult.pagination.pages >= 0,
  );
}
