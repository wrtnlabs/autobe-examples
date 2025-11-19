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
 * Test retrieving moderation logs filtered by a specific article ID.
 *
 * This test validates that moderators can view the complete moderation history
 * of a particular piece of content by filtering logs using article_id. The
 * moderator authenticates and requests logs filtered to show only actions
 * affecting a specific article (edits, deletions, attachment removals).
 *
 * The test verifies that the API correctly accepts and processes the article_id
 * filter parameter, returning a properly structured response with pagination.
 *
 * Note: This test uses a randomly generated article ID to verify the filtering
 * mechanism itself. In a real scenario with existing moderation logs, the
 * filter would return logs associated with that specific article.
 *
 * Test steps:
 *
 * 1. Create and authenticate a moderator account
 * 2. Generate a test article ID for filtering
 * 3. Request moderation logs filtered by the article ID
 * 4. Validate the response structure and pagination metadata
 */
export async function test_api_moderation_logs_filtering_by_article(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a moderator account
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    username: RandomGenerator.alphaNumeric(10),
    display_name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });

  typia.assert(moderator);

  // Step 2: Generate a test article ID for filtering
  const testArticleId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Request moderation logs filtered by the article ID
  const filterRequest = {
    article_id: testArticleId,
    page: 1,
    limit: 20,
  } satisfies IDiscussionBoardModerationLog.IRequest;

  const logsResponse: IPageIDiscussionBoardModerationLog.ISummary =
    await api.functional.discussionBoard.moderator.moderationLogs.index(
      connection,
      {
        body: filterRequest,
      },
    );

  typia.assert(logsResponse);

  // Step 4: Validate the response structure and pagination metadata
  TestValidator.predicate(
    "response should have pagination metadata",
    logsResponse.pagination !== null && logsResponse.pagination !== undefined,
  );

  TestValidator.predicate(
    "response should have data array",
    Array.isArray(logsResponse.data),
  );

  TestValidator.equals(
    "pagination current page should match request",
    logsResponse.pagination.current,
    1,
  );

  TestValidator.equals(
    "pagination limit should match request",
    logsResponse.pagination.limit,
    20,
  );

  // Validate pagination consistency
  TestValidator.predicate(
    "data length should not exceed pagination limit",
    logsResponse.data.length <= logsResponse.pagination.limit,
  );

  TestValidator.predicate(
    "pagination pages should be calculated correctly",
    logsResponse.pagination.pages >= 0,
  );

  TestValidator.predicate(
    "pagination records should be non-negative",
    logsResponse.pagination.records >= 0,
  );
}
