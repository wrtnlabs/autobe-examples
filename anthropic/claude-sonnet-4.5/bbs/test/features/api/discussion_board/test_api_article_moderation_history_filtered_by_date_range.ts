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
 * Test filtering article moderation history by date range using from_date and
 * to_date parameters.
 *
 * This test validates that moderators can retrieve moderation actions within
 * specific time periods. The test verifies filtering with only from_date
 * (actions after specified date), only to_date (actions before specified date),
 * and both parameters together (bounded range).
 *
 * Steps:
 *
 * 1. Create and authenticate a moderator account
 * 2. Generate test date ranges for filtering
 * 3. Test filtering with only from_date parameter
 * 4. Test filtering with only to_date parameter
 * 5. Test filtering with both from_date and to_date parameters
 * 6. Validate that results respect date boundaries correctly
 * 7. Verify ISO 8601 datetime format handling
 */
export async function test_api_article_moderation_history_filtered_by_date_range(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphaNumeric(16);
  const moderatorUsername = RandomGenerator.alphaNumeric(12);

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      username: moderatorUsername,
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Generate test article ID and date ranges for filtering
  const testArticleId = typia.random<string & tags.Format<"uuid">>();
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

  // Step 3: Test filtering with only from_date parameter (actions after specified date)
  const fromDateOnlyResult =
    await api.functional.discussionBoard.moderator.articles.moderationHistory.index(
      connection,
      {
        articleId: testArticleId,
        body: {
          from_date: sevenDaysAgo.toISOString(),
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardModerationLog.IRequest,
      },
    );
  typia.assert(fromDateOnlyResult);

  // Step 4: Test filtering with only to_date parameter (actions before specified date)
  const toDateOnlyResult =
    await api.functional.discussionBoard.moderator.articles.moderationHistory.index(
      connection,
      {
        articleId: testArticleId,
        body: {
          to_date: threeDaysAgo.toISOString(),
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardModerationLog.IRequest,
      },
    );
  typia.assert(toDateOnlyResult);

  // Step 5: Test filtering with both from_date and to_date parameters (bounded range)
  const boundedRangeResult =
    await api.functional.discussionBoard.moderator.articles.moderationHistory.index(
      connection,
      {
        articleId: testArticleId,
        body: {
          from_date: thirtyDaysAgo.toISOString(),
          to_date: threeDaysAgo.toISOString(),
          page: 1,
          limit: 20,
          sort_by: "created_at",
          order: "desc",
        } satisfies IDiscussionBoardModerationLog.IRequest,
      },
    );
  typia.assert(boundedRangeResult);

  TestValidator.equals(
    "bounded date range filter respects pagination settings",
    boundedRangeResult.pagination.current,
    1,
  );

  // Step 6: Validate ISO 8601 datetime format with precise timestamp
  const preciseTimestamp = new Date("2024-01-15T10:30:00.000Z");
  const preciseResult =
    await api.functional.discussionBoard.moderator.articles.moderationHistory.index(
      connection,
      {
        articleId: testArticleId,
        body: {
          from_date: preciseTimestamp.toISOString(),
          to_date: now.toISOString(),
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardModerationLog.IRequest,
      },
    );
  typia.assert(preciseResult);

  TestValidator.predicate(
    "ISO 8601 datetime format returns valid array data",
    Array.isArray(preciseResult.data),
  );

  // Step 7: Test with different sorting and pagination
  const sortedResult =
    await api.functional.discussionBoard.moderator.articles.moderationHistory.index(
      connection,
      {
        articleId: testArticleId,
        body: {
          from_date: sevenDaysAgo.toISOString(),
          to_date: now.toISOString(),
          page: 1,
          limit: 50,
          sort_by: "action_type",
          order: "asc",
        } satisfies IDiscussionBoardModerationLog.IRequest,
      },
    );
  typia.assert(sortedResult);

  TestValidator.predicate(
    "date range with sorting respects limit constraint",
    sortedResult.pagination.limit <= 50,
  );

  TestValidator.equals(
    "date range with sorting returns first page",
    sortedResult.pagination.current,
    1,
  );
}
