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
 * Test filtering article moderation history by specific moderator who performed
 * the actions.
 *
 * This test validates that moderators can query moderation history filtered by
 * a specific moderator ID to review actions taken by that particular moderator.
 * The test creates a moderator account, then queries the moderation history API
 * with the moderator_id filter to ensure the API accepts the filter parameter
 * and returns a properly structured response.
 *
 * Steps:
 *
 * 1. Create and authenticate a moderator account
 * 2. Query moderation history for a random article with moderator_id filter
 * 3. Validate the response structure is properly typed
 */
export async function test_api_article_moderation_history_filtered_by_moderator(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: "SecurePassword123!",
      username: RandomGenerator.alphaNumeric(8),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Generate a random article ID for testing
  const articleId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Query moderation history filtered by the moderator's ID
  const filteredHistory =
    await api.functional.discussionBoard.moderator.articles.moderationHistory.index(
      connection,
      {
        articleId: articleId,
        body: {
          moderator_id: moderator.id,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardModerationLog.IRequest,
      },
    );
  typia.assert(filteredHistory);
}
