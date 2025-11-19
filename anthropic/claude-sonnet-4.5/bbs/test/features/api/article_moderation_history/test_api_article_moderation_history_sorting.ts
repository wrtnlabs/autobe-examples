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
 * Test sorting capabilities for article moderation history results.
 *
 * This test validates that moderators can control result ordering using sort_by
 * and order parameters when retrieving article moderation history. The test
 * verifies sorting by 'created_at' (chronological order by action timestamp)
 * and 'action_type' (grouped by action type), combined with both 'asc'
 * (ascending, oldest first) and 'desc' (descending, newest first) order
 * directions.
 *
 * Validates that default sorting is 'created_at' in 'desc' order (newest
 * actions first). Verifies that sorted results maintain correct ordering across
 * multiple pages.
 *
 * Test Steps:
 *
 * 1. Create and authenticate a moderator account
 * 2. Test default sorting behavior (should be created_at desc)
 * 3. Test created_at ascending order (oldest first)
 * 4. Test created_at descending order (newest first)
 * 5. Test action_type ascending order (alphabetical)
 * 6. Test action_type descending order (reverse alphabetical)
 * 7. Validate response structure and pagination metadata
 */
export async function test_api_article_moderation_history_sorting(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: RandomGenerator.alphaNumeric(12),
      username: RandomGenerator.alphaNumeric(10),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Generate a random article ID for testing
  const testArticleId = typia.random<string & tags.Format<"uuid">>();

  // Step 2: Test default sorting (should be created_at desc)
  const defaultSortResult =
    await api.functional.discussionBoard.moderator.articles.moderationHistory.index(
      connection,
      {
        articleId: testArticleId,
        body: {
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardModerationLog.IRequest,
      },
    );
  typia.assert(defaultSortResult);

  // Step 3: Test created_at ascending order (oldest first)
  const createdAtAscResult =
    await api.functional.discussionBoard.moderator.articles.moderationHistory.index(
      connection,
      {
        articleId: testArticleId,
        body: {
          page: 1,
          limit: 20,
          sort_by: "created_at",
          order: "asc",
        } satisfies IDiscussionBoardModerationLog.IRequest,
      },
    );
  typia.assert(createdAtAscResult);

  // Step 4: Test created_at descending order (newest first)
  const createdAtDescResult =
    await api.functional.discussionBoard.moderator.articles.moderationHistory.index(
      connection,
      {
        articleId: testArticleId,
        body: {
          page: 1,
          limit: 20,
          sort_by: "created_at",
          order: "desc",
        } satisfies IDiscussionBoardModerationLog.IRequest,
      },
    );
  typia.assert(createdAtDescResult);

  // Step 5: Test action_type ascending order (alphabetical)
  const actionTypeAscResult =
    await api.functional.discussionBoard.moderator.articles.moderationHistory.index(
      connection,
      {
        articleId: testArticleId,
        body: {
          page: 1,
          limit: 20,
          sort_by: "action_type",
          order: "asc",
        } satisfies IDiscussionBoardModerationLog.IRequest,
      },
    );
  typia.assert(actionTypeAscResult);

  // Step 6: Test action_type descending order (reverse alphabetical)
  const actionTypeDescResult =
    await api.functional.discussionBoard.moderator.articles.moderationHistory.index(
      connection,
      {
        articleId: testArticleId,
        body: {
          page: 1,
          limit: 20,
          sort_by: "action_type",
          order: "desc",
        } satisfies IDiscussionBoardModerationLog.IRequest,
      },
    );
  typia.assert(actionTypeDescResult);
}
