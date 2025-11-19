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
 * Test retrieving moderation logs with multiple filters applied simultaneously.
 *
 * This test validates the complex query capabilities of the moderation logs API
 * by combining action type, date range, moderator, and pagination filters. It
 * demonstrates that the system can handle sophisticated audit queries like
 * "Show me all suspension actions by moderator X in the past month" or filter
 * by multiple action types within a specific date range.
 *
 * The test performs the following steps:
 *
 * 1. Create and authenticate a moderator account
 * 2. Construct a complex filter request with multiple criteria
 * 3. Retrieve moderation logs with combined filters
 * 4. Validate the response structure and pagination metadata
 */
export async function test_api_moderation_logs_combined_filters(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphaNumeric(12);
  const moderatorUsername = RandomGenerator.alphaNumeric(8);

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      username: moderatorUsername,
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Construct a complex filter request with multiple criteria
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const actionTypes = [
    "article_edited",
    "article_deleted",
    "account_suspended",
  ] as const;
  const selectedActionTypes = RandomGenerator.sample([...actionTypes], 2);

  const filterRequest = {
    page: 1,
    limit: 20,
    action_types: selectedActionTypes,
    moderator_id: moderator.id,
    from_date: thirtyDaysAgo.toISOString(),
    to_date: now.toISOString(),
    sort_by: RandomGenerator.pick(["created_at", "action_type"] as const),
    order: RandomGenerator.pick(["asc", "desc"] as const),
  } satisfies IDiscussionBoardModerationLog.IRequest;

  // Step 3: Retrieve moderation logs with combined filters
  const logsPage =
    await api.functional.discussionBoard.moderator.moderationLogs.index(
      connection,
      {
        body: filterRequest,
      },
    );
  typia.assert(logsPage);

  // Step 4: Validate the response structure and pagination metadata
  TestValidator.predicate(
    "pagination metadata exists",
    logsPage.pagination !== null && logsPage.pagination !== undefined,
  );

  TestValidator.predicate(
    "pagination current page is valid",
    logsPage.pagination.current >= 0,
  );

  TestValidator.predicate(
    "pagination limit matches request",
    logsPage.pagination.limit === filterRequest.limit,
  );

  TestValidator.predicate(
    "pagination records count is non-negative",
    logsPage.pagination.records >= 0,
  );

  TestValidator.predicate(
    "pagination pages count is non-negative",
    logsPage.pagination.pages >= 0,
  );

  TestValidator.predicate(
    "data array is defined",
    Array.isArray(logsPage.data),
  );
}
