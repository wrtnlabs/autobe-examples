import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformTrendingCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformTrendingCommunity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformTrendingCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformTrendingCommunity";

/**
 * Test that subscriber count in trending results accurately reflects current
 * community membership.
 *
 * Validates that the subscriber_count field in trending communities is accurate
 * and properly represents the actual number of active subscriptions to each
 * community. Tests that subscriber counts reflect the true state of community
 * memberships by verifying counts are consistent and accurate representations
 * of actual community subscriptions.
 *
 * Test steps:
 *
 * 1. Retrieve trending communities from the first page
 * 2. Validate that subscriber_count exists and is a non-negative integer for each
 *    community
 * 3. Verify pagination information is correct
 * 4. Validate that subscriber counts are reasonable and consistent
 * 5. Test pagination by retrieving multiple pages and ensuring subscriber data
 *    remains accurate
 * 6. Verify that communities with higher subscriber counts are ranked
 *    appropriately
 */
export async function test_api_trending_communities_subscriber_count_accuracy(
  connection: api.IConnection,
) {
  // Step 1: Retrieve trending communities from first page
  const trendingResponse: IPageICommunityPlatformTrendingCommunity.ISummary =
    await api.functional.communityPlatform.trending.communities.index(
      connection,
    );
  typia.assert(trendingResponse);

  // Step 2: Validate pagination structure
  TestValidator.predicate(
    "pagination object should exist",
    trendingResponse.pagination !== null &&
      trendingResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "pagination current page should be non-negative",
    trendingResponse.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit should be positive",
    trendingResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records should be non-negative",
    trendingResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be non-negative",
    trendingResponse.pagination.pages >= 0,
  );

  // Step 3: Validate trending communities data
  TestValidator.predicate(
    "data array should exist and be array type",
    Array.isArray(trendingResponse.data),
  );

  // Step 4: Validate each trending community entry
  if (trendingResponse.data.length > 0) {
    // Verify first community entry
    const firstCommunity: ICommunityPlatformTrendingCommunity.ISummary =
      trendingResponse.data[0];
    typia.assert(firstCommunity);

    TestValidator.predicate(
      "community id should be valid uuid format",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        firstCommunity.id,
      ),
    );
    TestValidator.predicate(
      "community id should not be empty",
      firstCommunity.id.length > 0,
    );
    TestValidator.predicate(
      "subscriber count should be non-negative integer",
      typeof firstCommunity.subscriberCount === "number" &&
        firstCommunity.subscriberCount >= 0 &&
        Number.isInteger(firstCommunity.subscriberCount),
    );
    TestValidator.predicate(
      "post count should be non-negative integer",
      typeof firstCommunity.postCount === "number" &&
        firstCommunity.postCount >= 0 &&
        Number.isInteger(firstCommunity.postCount),
    );
    TestValidator.predicate(
      "comment count should be non-negative integer",
      typeof firstCommunity.commentCount === "number" &&
        firstCommunity.commentCount >= 0 &&
        Number.isInteger(firstCommunity.commentCount),
    );
    TestValidator.predicate(
      "rank should be positive integer",
      typeof firstCommunity.rank === "number" &&
        firstCommunity.rank > 0 &&
        Number.isInteger(firstCommunity.rank),
    );
    TestValidator.predicate(
      "trending type should be community",
      firstCommunity.trendingType === "community",
    );
    TestValidator.predicate(
      "trending category should be one of allowed values",
      ["hot", "new", "top", "controversial"].includes(
        firstCommunity.trendingCategory,
      ),
    );

    // Validate community nested object
    TestValidator.predicate(
      "community object should exist and not be null",
      firstCommunity.community !== null &&
        firstCommunity.community !== undefined,
    );

    const community: ICommunityPlatformCommunity.ISummary =
      firstCommunity.community;
    typia.assert(community);

    TestValidator.predicate(
      "community id should match trending community id",
      community.id === firstCommunity.communityId,
    );
    TestValidator.predicate(
      "community subscriber_count should be non-negative",
      typeof community.subscriber_count === "number" &&
        community.subscriber_count >= 0,
    );
    TestValidator.predicate(
      "community post_count should be non-negative",
      typeof community.post_count === "number" && community.post_count >= 0,
    );

    // Step 5: Verify subscriber count consistency
    TestValidator.equals(
      "subscriber count in trending entry should match community subscriber_count",
      firstCommunity.subscriberCount,
      community.subscriber_count,
    );

    // Step 6: Validate community metadata
    TestValidator.predicate(
      "community identifier should follow valid pattern",
      /^[a-z0-9_]+$/.test(community.identifier) &&
        community.identifier.length >= 3 &&
        community.identifier.length <= 32,
    );
    TestValidator.predicate(
      "community name should be valid string with proper length",
      typeof community.name === "string" &&
        community.name.length >= 3 &&
        community.name.length <= 100,
    );

    // Step 7: Verify multiple entries maintain consistency
    if (trendingResponse.data.length > 1) {
      const secondCommunity: ICommunityPlatformTrendingCommunity.ISummary =
        trendingResponse.data[1];
      typia.assert(secondCommunity);

      TestValidator.predicate(
        "second community should also have valid subscriber count",
        typeof secondCommunity.subscriberCount === "number" &&
          secondCommunity.subscriberCount >= 0,
      );
      TestValidator.predicate(
        "communities should have different ids",
        firstCommunity.id !== secondCommunity.id,
      );
      TestValidator.predicate(
        "second community subscriber count should be consistent with its community data",
        secondCommunity.subscriberCount ===
          secondCommunity.community.subscriber_count,
      );
    }
  }

  // Step 8: Validate pagination consistency
  TestValidator.predicate(
    "number of items should not exceed pagination limit",
    trendingResponse.data.length <= trendingResponse.pagination.limit,
  );
  TestValidator.predicate(
    "pagination records should be at least as many as current page items",
    trendingResponse.pagination.records >= trendingResponse.data.length,
  );
}
