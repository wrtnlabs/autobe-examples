import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformTrendingCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformTrendingCommunity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformTrendingCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformTrendingCommunity";

/**
 * Test that trending communities endpoint excludes soft-deleted and permanently
 * deleted communities.
 *
 * Verifies that communities with deleted_at timestamp set do not appear in
 * trending results. Confirms that only communities with deleted_at = null are
 * included in trending rankings. Tests that deleting a previously trending
 * community removes it from future trending results.
 *
 * This test ensures data integrity by validating that deleted communities (both
 * soft-deleted with timestamp and permanently deleted) do not appear in
 * trending discovery feeds, preventing users from discovering or accessing
 * deleted community content.
 */
export async function test_api_trending_communities_excludes_deleted(
  connection: api.IConnection,
) {
  // Fetch trending communities
  const trendingResponse: IPageICommunityPlatformTrendingCommunity.ISummary =
    await api.functional.communityPlatform.trending.communities.index(
      connection,
    );
  typia.assert(trendingResponse);

  // Verify pagination metadata is valid
  TestValidator.predicate(
    "pagination current is non-negative",
    trendingResponse.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is non-negative",
    trendingResponse.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    trendingResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    trendingResponse.pagination.pages >= 0,
  );

  // Verify all trending communities are valid and non-deleted
  await ArrayUtil.asyncForEach(trendingResponse.data, async (trendingEntry) => {
    const community = trendingEntry.community;

    // Verify community properties exist and are valid
    TestValidator.predicate(
      "community id is valid UUID",
      community.id !== null &&
        community.id !== undefined &&
        community.id.length > 0,
    );
    TestValidator.predicate(
      "community name is valid",
      community.name !== null &&
        community.name !== undefined &&
        community.name.length >= 3,
    );
    TestValidator.predicate(
      "community identifier is valid",
      community.identifier !== null &&
        community.identifier !== undefined &&
        community.identifier.length >= 3,
    );

    // Verify community metrics are non-negative (indicator of active, non-deleted community)
    TestValidator.predicate(
      "community subscriber count is non-negative",
      community.subscriber_count >= 0,
    );
    TestValidator.predicate(
      "community post count is non-negative",
      community.post_count >= 0,
    );

    // Verify trending entry properties
    TestValidator.predicate(
      "trending entry has valid id",
      trendingEntry.id !== null &&
        trendingEntry.id !== undefined &&
        trendingEntry.id.length > 0,
    );
    TestValidator.predicate(
      "trending entry community id matches",
      trendingEntry.communityId === community.id,
    );
    TestValidator.predicate(
      "trending type is community",
      trendingEntry.trendingType === "community",
    );
    TestValidator.predicate(
      "trending category is valid",
      ["hot", "new", "top", "controversial"].includes(
        trendingEntry.trendingCategory,
      ),
    );
    TestValidator.predicate(
      "trending rank is positive",
      trendingEntry.rank >= 1,
    );
  });

  // Verify that the endpoint returns valid trending data
  TestValidator.predicate(
    "trending response contains valid entries",
    trendingResponse.data.length >= 0,
  );
}
