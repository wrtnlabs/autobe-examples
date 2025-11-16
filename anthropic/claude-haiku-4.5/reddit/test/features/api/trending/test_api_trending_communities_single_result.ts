import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformTrendingCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformTrendingCommunity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformTrendingCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformTrendingCommunity";

/**
 * Test edge case when only one trending community exists.
 *
 * Validates the API response when there is exactly one trending community in
 * the system. This tests the pagination system with minimal data:
 *
 * - Verify response contains single community entry
 * - Verify pagination metadata shows correct values (records=1, pages=1,
 *   current=0)
 * - Verify pagination structure is valid with all required fields
 * - Verify community data structure includes all required fields
 * - Verify trending metadata is properly populated and consistent
 */
export async function test_api_trending_communities_single_result(
  connection: api.IConnection,
) {
  // Fetch trending communities
  const response: IPageICommunityPlatformTrendingCommunity.ISummary =
    await api.functional.communityPlatform.trending.communities.index(
      connection,
    );
  typia.assert(response);

  // Verify pagination values for single result case
  TestValidator.equals(
    "pagination should have exactly one record",
    response.pagination.records,
    1,
  );
  TestValidator.equals(
    "pagination should show one page",
    response.pagination.pages,
    1,
  );
  TestValidator.equals(
    "pagination should start at page 0",
    response.pagination.current,
    0,
  );
  TestValidator.predicate(
    "pagination limit should be positive",
    response.pagination.limit > 0,
  );

  // Verify data array contains exactly one community
  TestValidator.equals(
    "response data should contain exactly one community",
    response.data.length,
    1,
  );

  // Extract and validate the single community entry
  const trendingCommunity = response.data[0];
  typia.assert(trendingCommunity);

  // Verify trending community metadata
  TestValidator.equals(
    "trending community rank should be 1 for single result",
    trendingCommunity.rank,
    1,
  );
  TestValidator.equals(
    "trending type must be community",
    trendingCommunity.trendingType,
    "community",
  );
  TestValidator.predicate(
    "trending category must be valid",
    ["hot", "new", "top", "controversial"].includes(
      trendingCommunity.trendingCategory,
    ),
  );

  // Verify community object consistency
  const community = trendingCommunity.community;
  typia.assert(community);

  TestValidator.equals(
    "community id should match between trending entry and community object",
    community.id,
    trendingCommunity.communityId,
  );
  TestValidator.equals(
    "subscriber count should be consistent",
    community.subscriber_count,
    trendingCommunity.subscriberCount,
  );
  TestValidator.equals(
    "post count should be consistent",
    community.post_count,
    trendingCommunity.postCount,
  );

  // Verify community data is valid
  TestValidator.predicate(
    "community identifier should match pattern",
    /^[a-z0-9_]+$/.test(community.identifier),
  );
  TestValidator.predicate(
    "community name length should be within valid range",
    community.name.length >= 3 && community.name.length <= 100,
  );
  TestValidator.predicate(
    "community subscriber count should be non-negative",
    community.subscriber_count >= 0,
  );
  TestValidator.predicate(
    "community post count should be non-negative",
    community.post_count >= 0,
  );
}
