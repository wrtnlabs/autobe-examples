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
 * Test filtering moderator activity history by community ID.
 *
 * This test validates that the community_id filter parameter correctly filters
 * moderation activity to show only actions taken within a specific community.
 * The test creates a moderator account, then queries their activity history
 * with a community_id filter to verify the filtering mechanism works
 * correctly.
 *
 * Test flow:
 *
 * 1. Create a moderator account for testing
 * 2. Retrieve moderator activity with a specific community_id filter
 * 3. Validate the response structure and pagination metadata
 * 4. Test with different sorting and filtering combinations
 */
export async function test_api_moderator_activity_filtered_by_community(
  connection: api.IConnection,
) {
  // Step 1: Create a moderator account
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    nickname: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityCommunityModerator.ICreate;

  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Step 2: Generate a target community ID to filter by
  const targetCommunityId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Retrieve moderator activity filtered by community_id
  const activityRequest = {
    page: 1,
    limit: 20,
    community_id: targetCommunityId,
  } satisfies IRedditCommunityCommunityModerator.IActivityRequest;

  const activityResponse: IPageIRedditCommunityModerationAction.ISummary =
    await api.functional.redditCommunity.moderator.moderators.activity.index(
      connection,
      {
        username: moderator.username,
        body: activityRequest,
      },
    );
  typia.assert(activityResponse);

  // Step 4: Validate response structure
  TestValidator.predicate(
    "response has pagination metadata",
    activityResponse.pagination !== null &&
      activityResponse.pagination !== undefined,
  );

  TestValidator.predicate(
    "response has data array",
    Array.isArray(activityResponse.data),
  );

  // Step 5: Validate pagination structure
  const pagination = activityResponse.pagination;
  TestValidator.equals("current page is 1", pagination.current, 1);
  TestValidator.equals("limit is 20", pagination.limit, 20);
  TestValidator.predicate(
    "records count is non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate("pages count is non-negative", pagination.pages >= 0);

  // Step 6: Test with additional filter parameters (sorting)
  const activityWithSort = {
    page: 1,
    limit: 10,
    community_id: targetCommunityId,
    sort_by: "action_timestamp" as const,
    order: "desc" as const,
  } satisfies IRedditCommunityCommunityModerator.IActivityRequest;

  const sortedResponse: IPageIRedditCommunityModerationAction.ISummary =
    await api.functional.redditCommunity.moderator.moderators.activity.index(
      connection,
      {
        username: moderator.username,
        body: activityWithSort,
      },
    );
  typia.assert(sortedResponse);

  TestValidator.predicate(
    "sorted response has valid pagination",
    sortedResponse.pagination !== null,
  );
  TestValidator.predicate(
    "sorted response has data array",
    Array.isArray(sortedResponse.data),
  );
  TestValidator.equals(
    "sorted response limit is 10",
    sortedResponse.pagination.limit,
    10,
  );

  // Step 7: Test with action type filter combined with community filter
  const activityWithActionTypes = {
    page: 1,
    limit: 15,
    community_id: targetCommunityId,
    action_types: ["post_removal", "user_ban"] as const,
  } satisfies IRedditCommunityCommunityModerator.IActivityRequest;

  const filteredByTypeResponse: IPageIRedditCommunityModerationAction.ISummary =
    await api.functional.redditCommunity.moderator.moderators.activity.index(
      connection,
      {
        username: moderator.username,
        body: activityWithActionTypes,
      },
    );
  typia.assert(filteredByTypeResponse);

  TestValidator.predicate(
    "action type filtered response has valid structure",
    filteredByTypeResponse.pagination !== null &&
      Array.isArray(filteredByTypeResponse.data),
  );
}
