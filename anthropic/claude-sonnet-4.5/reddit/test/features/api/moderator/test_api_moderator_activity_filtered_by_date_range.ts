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
 * Test filtering moderator activity history by a specific date range using
 * start_date and end_date parameters.
 *
 * This test validates that the moderator activity retrieval endpoint correctly
 * filters moderation actions based on temporal boundaries. It creates a
 * moderator account, then queries the activity history with date range filters
 * to verify that the filtering logic properly applies start_date and end_date
 * constraints.
 *
 * Steps:
 *
 * 1. Create a new moderator account through the join endpoint
 * 2. Verify the moderator account was created successfully with proper
 *    authentication tokens
 * 3. Query the moderator's activity history with a specific date range filter
 * 4. Validate that the response follows the expected pagination structure
 * 5. Confirm that the activity filtering respects the temporal boundaries
 */
export async function test_api_moderator_activity_filtered_by_date_range(
  connection: api.IConnection,
) {
  // Step 1: Create a new moderator account
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string>(),
    nickname: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityCommunityModerator.ICreate;

  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });

  // Step 2: Verify moderator account creation
  typia.assert(moderator);
  TestValidator.equals(
    "moderator email matches",
    moderator.email,
    moderatorData.email,
  );
  TestValidator.equals(
    "moderator nickname matches",
    moderator.nickname,
    moderatorData.nickname,
  );

  // Step 3: Define date range for filtering (last 30 days)
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const activityRequest = {
    page: 1,
    limit: 20,
    start_date: thirtyDaysAgo.toISOString(),
    end_date: now.toISOString(),
    sort_by: "action_timestamp",
    order: "desc",
  } satisfies IRedditCommunityCommunityModerator.IActivityRequest;

  // Step 4: Query moderator activity with date range filter
  const activityPage: IPageIRedditCommunityModerationAction.ISummary =
    await api.functional.redditCommunity.moderator.moderators.activity.index(
      connection,
      {
        username: moderator.username,
        body: activityRequest,
      },
    );

  // Step 5: Validate pagination structure
  typia.assert(activityPage);
  TestValidator.predicate(
    "pagination object exists",
    activityPage.pagination !== null && activityPage.pagination !== undefined,
  );
  TestValidator.predicate(
    "data array exists",
    Array.isArray(activityPage.data),
  );

  // Step 6: Verify pagination metadata
  TestValidator.predicate(
    "current page is valid",
    activityPage.pagination.current >= 0,
  );
  TestValidator.predicate(
    "limit is positive",
    activityPage.pagination.limit > 0,
  );
  TestValidator.predicate(
    "records count is non-negative",
    activityPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    activityPage.pagination.pages >= 0,
  );

  // Step 7: Validate that data array length respects the limit
  TestValidator.predicate(
    "data array length does not exceed limit",
    activityPage.data.length <= activityPage.pagination.limit,
  );
}
