import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformTrendingCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformTrendingCommunity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformTrendingCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformTrendingCommunity";

/**
 * Test pagination through trending communities list.
 *
 * This test validates the pagination functionality of the trending communities
 * endpoint. It verifies that:
 *
 * 1. Default pagination returns first page with appropriate number of communities
 * 2. Pagination metadata (current page, limit, total records, total pages) is
 *    accurate
 * 3. Communities maintain consistent ranking across pages
 * 4. Pages calculation is correct based on total records and limit
 * 5. Edge cases are handled properly (empty results)
 *
 * Workflow:
 *
 * 1. Fetch first page with default parameters
 * 2. Validate pagination structure consistency
 * 3. Validate community data structure and integrity
 * 4. Verify consistent ranking within page
 * 5. Validate pages calculation accuracy
 */
export async function test_api_trending_communities_pagination(
  connection: api.IConnection,
) {
  // Step 1: Fetch first page with default pagination
  const firstPageResponse: IPageICommunityPlatformTrendingCommunity.ISummary =
    await api.functional.communityPlatform.trending.communities.index(
      connection,
    );
  typia.assert(firstPageResponse);

  const { pagination, data } = firstPageResponse;

  // Step 2: Validate pagination metadata consistency
  TestValidator.predicate(
    "data count should not exceed limit",
    data.length <= pagination.limit,
  );

  // Step 3: Validate community data integrity
  if (data.length > 0) {
    // Verify all communities have required fields and valid data
    const firstCommunity = data[0];
    TestValidator.predicate(
      "first community should have valid rank",
      firstCommunity.rank >= 1,
    );

    TestValidator.predicate(
      "first community should have non-negative subscriber count",
      firstCommunity.subscriberCount >= 0,
    );

    TestValidator.predicate(
      "first community should have non-negative post count",
      firstCommunity.postCount >= 0,
    );

    TestValidator.predicate(
      "first community should have non-negative comment count",
      firstCommunity.commentCount >= 0,
    );

    TestValidator.predicate(
      "community nested object should exist",
      firstCommunity.community !== null &&
        firstCommunity.community !== undefined,
    );

    TestValidator.predicate(
      "community name should not be empty",
      firstCommunity.community.name.length > 0,
    );

    // Step 4: Verify consistent ranking within the page
    const ranks = data.map((c) => c.rank);
    for (let i = 1; i < ranks.length; i++) {
      TestValidator.predicate(
        `ranks should be in ascending order at position ${i}`,
        ranks[i] >= ranks[i - 1],
      );
    }
  }

  // Step 5: Validate pages calculation accuracy
  const expectedPages =
    pagination.limit > 0 ? Math.ceil(pagination.records / pagination.limit) : 0;

  TestValidator.equals(
    "calculated pages should match pagination.pages",
    expectedPages,
    pagination.pages,
  );

  // Step 6: Validate current page is within valid range
  TestValidator.predicate(
    "current page should be within valid range",
    pagination.current < pagination.pages || pagination.pages === 0,
  );

  // Step 7: Handle empty results edge case
  if (pagination.records === 0) {
    TestValidator.predicate(
      "empty results should have zero data items",
      data.length === 0,
    );

    TestValidator.predicate(
      "empty results should indicate zero pages",
      pagination.pages === 0,
    );
  } else {
    // Step 8: Validate data consistency when results exist
    TestValidator.predicate(
      "non-empty results should have at least one item",
      data.length > 0,
    );

    TestValidator.predicate(
      "pages should be at least one for non-empty results",
      pagination.pages >= 1,
    );
  }
}
