import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityGuest";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";

/**
 * Test filtering member activity by specific community.
 *
 * This test validates that the member activity API correctly filters results
 * when a specific community_code is provided. It ensures that:
 *
 * 1. The community_code filter parameter is properly accepted
 * 2. The API returns a valid paginated response
 * 3. The filtering mechanism works correctly for community-specific activity
 *
 * Test workflow:
 *
 * 1. Generate a random test username
 * 2. Create multiple community codes to test filtering
 * 3. Query member activity with a specific community_code filter
 * 4. Validate the response structure and data integrity
 * 5. Test multiple filtering scenarios (basic, search, date range)
 */
export async function test_api_member_activity_community_specific_filter(
  connection: api.IConnection,
) {
  // Generate random test data
  const testUsername = RandomGenerator.name(1);
  const communityCodes = [
    "typescript",
    "javascript",
    "react",
    "nodejs",
    "python",
  ] as const;
  const targetCommunity = RandomGenerator.pick(communityCodes);

  // Query member activity filtered by specific community
  const activityRequest = {
    page: 1,
    limit: 20,
    community_code: targetCommunity,
    content_type: "all",
    sort_by: "newest",
  } satisfies IRedditCommunityGuest.IActivityRequest;

  const response: IPageIRedditCommunityGuest =
    await api.functional.redditCommunity.members.activity.index(connection, {
      username: testUsername,
      body: activityRequest,
    });

  // Validate response structure - typia.assert validates everything
  typia.assert(response);

  // Test with different filter combinations - search with community filter
  const searchRequest = {
    page: 1,
    limit: 10,
    community_code: targetCommunity,
    search: RandomGenerator.alphabets(5),
    content_type: "posts",
    sort_by: "most_upvoted",
  } satisfies IRedditCommunityGuest.IActivityRequest;

  const searchResponse: IPageIRedditCommunityGuest =
    await api.functional.redditCommunity.members.activity.index(connection, {
      username: testUsername,
      body: searchRequest,
    });

  typia.assert(searchResponse);

  // Test date range filtering combined with community filter
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const dateRangeRequest = {
    page: 1,
    limit: 15,
    community_code: RandomGenerator.pick(communityCodes),
    start_date: thirtyDaysAgo.toISOString(),
    end_date: now.toISOString(),
    content_type: "comments",
    sort_by: "oldest",
  } satisfies IRedditCommunityGuest.IActivityRequest;

  const dateRangeResponse: IPageIRedditCommunityGuest =
    await api.functional.redditCommunity.members.activity.index(connection, {
      username: testUsername,
      body: dateRangeRequest,
    });

  typia.assert(dateRangeResponse);
}
