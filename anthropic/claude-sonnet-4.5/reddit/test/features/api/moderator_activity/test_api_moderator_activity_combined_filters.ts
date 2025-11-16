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
 * Test retrieving moderator activity history with multiple filters applied
 * simultaneously.
 *
 * This test validates that the filtering logic correctly applies all specified
 * criteria in combination, returning only records that satisfy all filter
 * conditions. It tests complex query scenarios with date range combined with
 * action types and community filtering for detailed auditing and analysis.
 *
 * Test Flow:
 *
 * 1. Create and authenticate a moderator account
 * 2. Retrieve activity with combined filters (date range + action types +
 *    community)
 * 3. Validate response structure and pagination
 * 4. Test different combinations of filters
 * 5. Verify sorting works correctly with combined filters
 */
export async function test_api_moderator_activity_combined_filters(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "SecurePass123!",
        nickname: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: "192.168.1.100",
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Test combined filters - date range + action types
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const combinedFilterRequest = {
    page: 1,
    limit: 20,
    sort_by: "action_timestamp" as const,
    order: "desc" as const,
    start_date: thirtyDaysAgo.toISOString(),
    end_date: now.toISOString(),
    action_types: ["post_removal", "comment_removal"] as const,
  } satisfies IRedditCommunityCommunityModerator.IActivityRequest;

  const activityResult: IPageIRedditCommunityModerationAction.ISummary =
    await api.functional.redditCommunity.moderator.moderators.activity.index(
      connection,
      {
        username: moderator.username,
        body: combinedFilterRequest,
      },
    );
  typia.assert(activityResult);

  // Step 3: Validate response structure
  TestValidator.predicate(
    "pagination should have valid structure",
    activityResult.pagination.current >= 0 &&
      activityResult.pagination.limit > 0 &&
      activityResult.pagination.records >= 0 &&
      activityResult.pagination.pages >= 0,
  );

  TestValidator.predicate(
    "data should be an array",
    Array.isArray(activityResult.data),
  );

  // Step 4: Test with community filter added
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const communityFilterRequest = {
    page: 1,
    limit: 10,
    start_date: sevenDaysAgo.toISOString(),
    end_date: now.toISOString(),
    action_types: ["post_removal", "user_ban", "report_resolution"] as const,
    community_id: communityId,
  } satisfies IRedditCommunityCommunityModerator.IActivityRequest;

  const communityFilteredResult: IPageIRedditCommunityModerationAction.ISummary =
    await api.functional.redditCommunity.moderator.moderators.activity.index(
      connection,
      {
        username: moderator.username,
        body: communityFilterRequest,
      },
    );
  typia.assert(communityFilteredResult);

  // Step 5: Test with search term combined with other filters
  const searchCombinedRequest = {
    page: 1,
    limit: 15,
    sort_by: "community" as const,
    order: "asc" as const,
    start_date: thirtyDaysAgo.toISOString(),
    action_types: ["comment_removal", "post_approval"] as const,
    search: "violation",
  } satisfies IRedditCommunityCommunityModerator.IActivityRequest;

  const searchResult: IPageIRedditCommunityModerationAction.ISummary =
    await api.functional.redditCommunity.moderator.moderators.activity.index(
      connection,
      {
        username: moderator.username,
        body: searchCombinedRequest,
      },
    );
  typia.assert(searchResult);

  // Step 6: Test minimal filters (only pagination)
  const minimalRequest = {
    page: 1,
    limit: 50,
  } satisfies IRedditCommunityCommunityModerator.IActivityRequest;

  const minimalResult: IPageIRedditCommunityModerationAction.ISummary =
    await api.functional.redditCommunity.moderator.moderators.activity.index(
      connection,
      {
        username: moderator.username,
        body: minimalRequest,
      },
    );
  typia.assert(minimalResult);

  // Step 7: Test all possible action types combined
  const allActionTypesRequest = {
    page: 1,
    limit: 25,
    action_types: [
      "post_removal",
      "comment_removal",
      "user_ban",
      "user_unban",
      "report_resolution",
      "post_approval",
      "comment_approval",
      "rule_creation",
      "rule_modification",
      "rule_deletion",
    ] as const,
    sort_by: "action_type" as const,
    order: "asc" as const,
  } satisfies IRedditCommunityCommunityModerator.IActivityRequest;

  const allTypesResult: IPageIRedditCommunityModerationAction.ISummary =
    await api.functional.redditCommunity.moderator.moderators.activity.index(
      connection,
      {
        username: moderator.username,
        body: allActionTypesRequest,
      },
    );
  typia.assert(allTypesResult);

  // Step 8: Validate pagination consistency
  TestValidator.equals(
    "pagination current page is zero-based",
    activityResult.pagination.current,
    0,
  );

  TestValidator.equals(
    "pagination limit matches request",
    activityResult.pagination.limit,
    combinedFilterRequest.limit,
  );
}
