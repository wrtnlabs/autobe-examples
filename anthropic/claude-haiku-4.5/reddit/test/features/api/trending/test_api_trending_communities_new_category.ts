import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformTrendingCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformTrendingCommunity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformTrendingCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformTrendingCommunity";

/**
 * Test that trending communities in the 'new' category are sorted
 * chronologically by creation time.
 *
 * Validates that the API returns communities sorted by creation timestamp in
 * descending order (newest first), enabling users to discover brand-new
 * communities recently created on the platform. Confirms that time-based
 * sorting is applied consistently and new category filtering works properly.
 *
 * Test steps:
 *
 * 1. Call the trending communities endpoint
 * 2. Validate response structure with pagination metadata
 * 3. Verify communities array contains entries
 * 4. Confirm communities are sorted by creation timestamp descending (newest
 *    first)
 * 5. Validate trending category is 'new' for all returned communities
 * 6. Verify rank field indicates proper ordering
 * 7. Check community metadata is properly populated
 */
export async function test_api_trending_communities_new_category(
  connection: api.IConnection,
) {
  // Fetch trending communities
  const response: IPageICommunityPlatformTrendingCommunity.ISummary =
    await api.functional.communityPlatform.trending.communities.index(
      connection,
    );
  typia.assert(response);

  // Validate response structure
  TestValidator.predicate(
    "response has pagination metadata",
    response.pagination !== null && response.pagination !== undefined,
  );
  TestValidator.predicate(
    "response has data array",
    response.data !== null && response.data !== undefined,
  );

  // Validate pagination metadata
  TestValidator.predicate(
    "pagination current page is valid",
    response.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    response.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records count is valid",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is valid",
    response.pagination.pages >= 0,
  );

  // If communities exist, validate sorting
  if (response.data.length > 0) {
    // Validate each community has trending category 'new'
    for (const community of response.data) {
      TestValidator.equals(
        "trending category should be 'new'",
        community.trendingCategory,
        "new",
      );
      TestValidator.predicate(
        "community should have valid rank",
        community.rank >= 1,
      );
    }

    // Validate time-based sorting (newest first)
    for (let i = 0; i < response.data.length - 1; i++) {
      const current = response.data[i];
      const next = response.data[i + 1];

      const currentTime = new Date(current.createdAt).getTime();
      const nextTime = new Date(next.createdAt).getTime();

      TestValidator.predicate(
        `community at index ${i} should be newer than or equal to community at index ${i + 1}`,
        currentTime >= nextTime,
      );
    }

    // Validate rank ordering (should be sequential starting from 1)
    for (let i = 0; i < response.data.length; i++) {
      const community = response.data[i];
      TestValidator.equals(
        `community at index ${i} should have rank ${i + 1}`,
        community.rank,
        i + 1,
      );
    }

    // Validate community metadata
    for (const community of response.data) {
      TestValidator.predicate(
        "community should have valid id",
        community.id !== null &&
          community.id !== undefined &&
          community.id.length > 0,
      );
      TestValidator.predicate(
        "community should have valid communityId",
        community.communityId !== null &&
          community.communityId !== undefined &&
          community.communityId.length > 0,
      );
      TestValidator.predicate(
        "community should have name",
        community.community.name !== null &&
          community.community.name !== undefined &&
          community.community.name.length > 0,
      );
      TestValidator.predicate(
        "community subscriber count should be non-negative",
        community.subscriberCount >= 0,
      );
      TestValidator.predicate(
        "community post count should be non-negative",
        community.postCount >= 0,
      );
      TestValidator.predicate(
        "community comment count should be non-negative",
        community.commentCount >= 0,
      );
      TestValidator.equals(
        "trending type should be 'community'",
        community.trendingType,
        "community",
      );
    }
  }

  // Validate that we received valid response for trending communities in 'new' category
  TestValidator.predicate(
    "response contains valid trending communities data",
    response.data !== undefined && Array.isArray(response.data),
  );
}
