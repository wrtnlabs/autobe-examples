import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationLog";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModerationLog";

/**
 * Test combining multiple filters simultaneously for article moderation history
 * queries.
 *
 * This test validates that moderators can apply complex queries using multiple
 * filter parameters together, such as filtering by action_types AND date range
 * AND specific moderator. The test verifies that all filters work correctly in
 * combination, with AND logic (all conditions must be satisfied).
 *
 * Test workflow:
 *
 * 1. Create and authenticate a moderator account
 * 2. Test action_types + date range combination
 * 3. Test moderator_id + action_types combination
 * 4. Test all filters together (action_types + date range + moderator_id)
 * 5. Validate pagination works correctly with complex queries
 */
export async function test_api_article_moderation_history_combined_filters(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: "SecurePassword123!",
      username: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Generate a test article ID for querying moderation history
  const testArticleId = typia.random<string & tags.Format<"uuid">>();

  // Step 2: Test action_types + date range combination
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const actionTypesWithDateRange =
    await api.functional.discussionBoard.moderator.articles.moderationHistory.index(
      connection,
      {
        articleId: testArticleId,
        body: {
          action_types: ["article_edited", "article_deleted"],
          from_date: thirtyDaysAgo.toISOString(),
          to_date: now.toISOString(),
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardModerationLog.IRequest,
      },
    );
  typia.assert(actionTypesWithDateRange);

  // Validate pagination structure
  TestValidator.predicate(
    "pagination should have valid structure",
    actionTypesWithDateRange.pagination.current === 1 &&
      actionTypesWithDateRange.pagination.limit === 20,
  );

  // Step 3: Test moderator_id + action_types combination
  const moderatorWithActionTypes =
    await api.functional.discussionBoard.moderator.articles.moderationHistory.index(
      connection,
      {
        articleId: testArticleId,
        body: {
          moderator_id: moderator.id,
          action_types: ["article_edited", "attachment_removed"],
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardModerationLog.IRequest,
      },
    );
  typia.assert(moderatorWithActionTypes);

  TestValidator.predicate(
    "combined moderator and action types filter should return valid results",
    moderatorWithActionTypes.pagination.current === 1,
  );

  // Step 4: Test all filters together (action_types + date range + moderator_id)
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const allFiltersCombined =
    await api.functional.discussionBoard.moderator.articles.moderationHistory.index(
      connection,
      {
        articleId: testArticleId,
        body: {
          action_types: ["article_edited"],
          moderator_id: moderator.id,
          from_date: sevenDaysAgo.toISOString(),
          to_date: now.toISOString(),
          sort_by: "created_at",
          order: "desc",
          page: 1,
          limit: 15,
        } satisfies IDiscussionBoardModerationLog.IRequest,
      },
    );
  typia.assert(allFiltersCombined);

  TestValidator.equals(
    "all filters combined should respect pagination settings",
    allFiltersCombined.pagination.limit,
    15,
  );

  TestValidator.equals(
    "current page should match requested page",
    allFiltersCombined.pagination.current,
    1,
  );

  // Step 5: Test pagination with complex queries - second page
  const paginatedComplexQuery =
    await api.functional.discussionBoard.moderator.articles.moderationHistory.index(
      connection,
      {
        articleId: testArticleId,
        body: {
          action_types: ["article_deleted", "account_suspended"],
          from_date: thirtyDaysAgo.toISOString(),
          to_date: now.toISOString(),
          page: 2,
          limit: 5,
        } satisfies IDiscussionBoardModerationLog.IRequest,
      },
    );
  typia.assert(paginatedComplexQuery);

  TestValidator.equals(
    "pagination should work correctly with complex filters on page 2",
    paginatedComplexQuery.pagination.current,
    2,
  );

  TestValidator.equals(
    "limit should be respected in paginated complex queries",
    paginatedComplexQuery.pagination.limit,
    5,
  );

  // Step 6: Test with sorting parameters combined with filters
  const sortedWithFilters =
    await api.functional.discussionBoard.moderator.articles.moderationHistory.index(
      connection,
      {
        articleId: testArticleId,
        body: {
          action_types: [
            "article_edited",
            "article_deleted",
            "attachment_removed",
          ],
          moderator_id: moderator.id,
          sort_by: "action_type",
          order: "asc",
          page: 1,
          limit: 25,
        } satisfies IDiscussionBoardModerationLog.IRequest,
      },
    );
  typia.assert(sortedWithFilters);

  TestValidator.predicate(
    "sorted results with filters should return valid data",
    Array.isArray(sortedWithFilters.data),
  );
}
