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
 * Test retrieving the complete moderation history for a specific article.
 *
 * This test validates that moderators can successfully retrieve moderation
 * history for discussion board articles through the moderation history API. The
 * test creates a moderator account, authenticates, and then queries the
 * moderation history endpoint for a randomly generated article ID.
 *
 * Validation points:
 *
 * 1. Moderator can successfully authenticate
 * 2. Moderation history API returns proper paginated response structure
 * 3. Response contains valid pagination metadata and data array
 *
 * Test workflow:
 *
 * 1. Create and authenticate a moderator account using the join endpoint
 * 2. Generate a random article ID for testing
 * 3. Retrieve moderation history with basic pagination parameters
 * 4. Validate the complete response structure using typia.assert
 */
export async function test_api_article_moderation_history_retrieval(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: RandomGenerator.alphaNumeric(12),
        username: RandomGenerator.name(1),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Generate a random article ID to query moderation history
  const articleId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Retrieve moderation history for the article with basic pagination
  const moderationHistory: IPageIDiscussionBoardModerationLog.ISummary =
    await api.functional.discussionBoard.moderator.articles.moderationHistory.index(
      connection,
      {
        articleId: articleId,
        body: {
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardModerationLog.IRequest,
      },
    );
  typia.assert(moderationHistory);
}
