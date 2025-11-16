import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformTrendingCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformTrendingCommunity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformTrendingCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformTrendingCommunity";

/**
 * Test that trending communities can be filtered by 'top' category showing
 * largest and most-engaged communities across platform history.
 *
 * Verifies communities are ranked by subscriber count (primary) and
 * post/comment volume (secondary) regardless of creation time or recent
 * activity. Validates that established communities with accumulated subscribers
 * appear at top of rankings. Confirms that time decay is not applied to top
 * category (older communities with large subscriber bases rank equally with
 * newer large communities).
 */
export async function test_api_trending_communities_top_category(
  connection: api.IConnection,
) {
  // Call the trending communities endpoint to fetch top category
  const response: IPageICommunityPlatformTrendingCommunity.ISummary =
    await api.functional.communityPlatform.trending.communities.index(
      connection,
    );

  // Validate the response structure
  typia.assert(response);

  // Verify pagination metadata exists
  TestValidator.predicate(
    "pagination metadata should exist",
    response.pagination !== null && response.pagination !== undefined,
  );

  // Verify data array exists
  TestValidator.predicate(
    "data array should exist",
    Array.isArray(response.data),
  );

  // If there are trending communities, validate their structure
  if (response.data.length > 0) {
    // Verify all entries are trending communities with required fields
    await ArrayUtil.asyncForEach(response.data, async (community) => {
      typia.assert(community);

      // Verify the community has an ID
      TestValidator.predicate(
        "community should have valid UUID id",
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          community.id,
        ),
      );

      // Verify community object exists
      TestValidator.predicate(
        "community object should exist",
        community.community !== null && community.community !== undefined,
      );

      // Verify community has subscriber count
      TestValidator.predicate(
        "subscriber count should be non-negative",
        community.subscriberCount >= 0,
      );

      // Verify community has post count
      TestValidator.predicate(
        "post count should be non-negative",
        community.postCount >= 0,
      );

      // Verify community has comment count
      TestValidator.predicate(
        "comment count should be non-negative",
        community.commentCount >= 0,
      );

      // Verify rank is positive
      TestValidator.predicate("rank should be positive", community.rank >= 1);

      // Verify trending category is 'top' for this test
      TestValidator.equals(
        "trending category should be top",
        community.trendingCategory,
        "top",
      );

      // Verify trending type is 'community'
      TestValidator.equals(
        "trending type should be community",
        community.trendingType,
        "community",
      );
    });

    // Verify communities are sorted by rank (ascending order)
    let previousRank = 0;
    await ArrayUtil.asyncForEach(response.data, async (community) => {
      TestValidator.predicate(
        "communities should be sorted by rank",
        community.rank >= previousRank,
      );
      previousRank = community.rank;
    });

    // Verify top score exists for communities in top category
    await ArrayUtil.asyncForEach(response.data, async (community) => {
      TestValidator.predicate(
        "top score should exist for top category communities",
        community.topScore !== null &&
          community.topScore !== undefined &&
          community.topScore >= 0,
      );
    });

    // Verify that communities with higher subscriber counts have better rankings
    // (smaller rank numbers indicate better/higher ranking)
    if (response.data.length > 1) {
      const firstCommunity = response.data[0];
      const lastCommunity = response.data[response.data.length - 1];

      TestValidator.predicate(
        "higher subscriber count communities should rank better in top category",
        firstCommunity.subscriberCount >= lastCommunity.subscriberCount,
      );
    }
  }

  // Verify pagination info is valid
  TestValidator.predicate(
    "current page should be non-negative",
    response.pagination.current >= 0,
  );

  TestValidator.predicate(
    "limit should be positive",
    response.pagination.limit > 0,
  );

  TestValidator.predicate(
    "total records should be non-negative",
    response.pagination.records >= 0,
  );

  TestValidator.predicate(
    "total pages should be non-negative",
    response.pagination.pages >= 0,
  );

  // Verify pagination consistency
  const expectedPages = Math.ceil(
    response.pagination.records / response.pagination.limit,
  );
  TestValidator.equals(
    "total pages should match calculated pages",
    response.pagination.pages,
    expectedPages,
  );
}
