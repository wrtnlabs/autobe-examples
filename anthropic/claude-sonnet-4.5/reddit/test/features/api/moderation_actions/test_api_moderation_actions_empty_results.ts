import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityModerationAction";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerationAction";

/**
 * Test the response when no moderation actions match the filter criteria.
 *
 * This test validates that the moderation actions search API returns a properly
 * structured empty response when filters match no records. It ensures the API
 * maintains valid pagination metadata even when the data array is empty.
 *
 * Test scenarios:
 *
 * 1. Search with non-existent moderator ID
 * 2. Search with non-existent community ID
 * 3. Search with date range containing no actions
 * 4. Verify empty data array in all cases
 * 5. Verify pagination shows 0 records and 0 pages
 */
export async function test_api_moderation_actions_empty_results(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as a moderator
  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        nickname: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Search with non-existent moderator ID
  const nonExistentModeratorId = typia.random<string & tags.Format<"uuid">>();
  const resultByModerator: IPageIRedditCommunityModerationAction.ISummary =
    await api.functional.redditCommunity.moderator.moderationActions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          moderator_id: nonExistentModeratorId,
        } satisfies IRedditCommunityModerationAction.IRequest,
      },
    );
  typia.assert(resultByModerator);

  // Validate empty results with non-existent moderator
  TestValidator.equals(
    "data array should be empty for non-existent moderator",
    resultByModerator.data.length,
    0,
  );
  TestValidator.equals(
    "records count should be 0 for non-existent moderator",
    resultByModerator.pagination.records,
    0,
  );
  TestValidator.equals(
    "pages count should be 0 for non-existent moderator",
    resultByModerator.pagination.pages,
    0,
  );
  TestValidator.equals(
    "current page should be 1",
    resultByModerator.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit should match request",
    resultByModerator.pagination.limit,
    10,
  );

  // Step 3: Search with non-existent community ID
  const nonExistentCommunityId = typia.random<string & tags.Format<"uuid">>();
  const resultByCommunity: IPageIRedditCommunityModerationAction.ISummary =
    await api.functional.redditCommunity.moderator.moderationActions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          community_id: nonExistentCommunityId,
        } satisfies IRedditCommunityModerationAction.IRequest,
      },
    );
  typia.assert(resultByCommunity);

  // Validate empty results with non-existent community
  TestValidator.equals(
    "data array should be empty for non-existent community",
    resultByCommunity.data.length,
    0,
  );
  TestValidator.equals(
    "records count should be 0 for non-existent community",
    resultByCommunity.pagination.records,
    0,
  );
  TestValidator.equals(
    "pages count should be 0 for non-existent community",
    resultByCommunity.pagination.pages,
    0,
  );
  TestValidator.equals(
    "limit should match request for community search",
    resultByCommunity.pagination.limit,
    20,
  );

  // Step 4: Search with date range in the distant past (no actions should exist)
  const distantPastStart = new Date("2000-01-01T00:00:00Z").toISOString();
  const distantPastEnd = new Date("2000-01-02T00:00:00Z").toISOString();
  const resultByDateRange: IPageIRedditCommunityModerationAction.ISummary =
    await api.functional.redditCommunity.moderator.moderationActions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 50,
          from_date: distantPastStart,
          to_date: distantPastEnd,
        } satisfies IRedditCommunityModerationAction.IRequest,
      },
    );
  typia.assert(resultByDateRange);

  // Validate empty results with date range containing no actions
  TestValidator.equals(
    "data array should be empty for date range with no actions",
    resultByDateRange.data.length,
    0,
  );
  TestValidator.equals(
    "records count should be 0 for empty date range",
    resultByDateRange.pagination.records,
    0,
  );
  TestValidator.equals(
    "pages count should be 0 for empty date range",
    resultByDateRange.pagination.pages,
    0,
  );

  // Step 5: Search with multiple filters that guarantee no results
  const resultMultipleFilters: IPageIRedditCommunityModerationAction.ISummary =
    await api.functional.redditCommunity.moderator.moderationActions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100,
          moderator_id: nonExistentModeratorId,
          community_id: nonExistentCommunityId,
          action_type: "non_existent_action_type",
          from_date: distantPastStart,
          to_date: distantPastEnd,
        } satisfies IRedditCommunityModerationAction.IRequest,
      },
    );
  typia.assert(resultMultipleFilters);

  // Validate empty results with multiple filters
  TestValidator.equals(
    "data array should be empty with multiple non-matching filters",
    resultMultipleFilters.data.length,
    0,
  );
  TestValidator.equals(
    "records count should be 0 with multiple filters",
    resultMultipleFilters.pagination.records,
    0,
  );
  TestValidator.equals(
    "pages count should be 0 with multiple filters",
    resultMultipleFilters.pagination.pages,
    0,
  );
  TestValidator.equals(
    "pagination structure should be valid with empty results",
    resultMultipleFilters.pagination.limit,
    100,
  );

  // Step 6: Verify pagination structure remains valid for different page numbers
  const resultHighPageNumber: IPageIRedditCommunityModerationAction.ISummary =
    await api.functional.redditCommunity.moderator.moderationActions.index(
      connection,
      {
        body: {
          page: 5,
          limit: 25,
          moderator_id: nonExistentModeratorId,
        } satisfies IRedditCommunityModerationAction.IRequest,
      },
    );
  typia.assert(resultHighPageNumber);

  TestValidator.equals(
    "data array should be empty even for high page number",
    resultHighPageNumber.data.length,
    0,
  );
  TestValidator.equals(
    "current page should reflect request even with no results",
    resultHighPageNumber.pagination.current,
    5,
  );
  TestValidator.equals(
    "pages should be 0 when no records exist",
    resultHighPageNumber.pagination.pages,
    0,
  );
}
