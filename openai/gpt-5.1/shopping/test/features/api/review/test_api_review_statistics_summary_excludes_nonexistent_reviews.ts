import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallReviewStatisticsSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewStatisticsSummary";

/**
 * Validate the global review statistics summary for an empty platform state.
 *
 * Business goal: Ensure that when there are no product reviews in the system
 * (or in the current isolated test tenant), the public statistics endpoint
 * returns a well-formed IShoppingMallReviewStatisticsSummary whose aggregate
 * numbers represent the absence of data instead of causing errors or returning
 * malformed aggregates.
 *
 * Scenario:
 *
 * 1. Assume the provided connection points to an isolated test environment
 *    (tenant/schema) with no product reviews yet. We do not create any reviews
 *    in this test; the focus is on the "no data" behavior.
 * 2. Call the public statistics endpoint
 *    api.functional.shoppingMall.reviews.statistics.summary.index once, with
 *    the given connection.
 * 3. Validate that the response conforms to IShoppingMallReviewStatisticsSummary
 *    using typia.assert.
 * 4. Perform additional business logic checks for the empty state:
 *
 *    - TotalReviewCount === 0
 *    - TotalRatedProductCount === 0
 *    - RecentReviewCount === 0
 *    - GlobalAverageRating === 0 (chosen baseline when there are no reviews)
 *    - RatingDistribution is an array where every bucket has reviewCount === 0
 * 5. Confirm that no authentication or special headers are required by simply
 *    using the provided connection as-is (no auth calls, no connection.headers
 *    manipulation). The request should complete without throwing.
 */
export async function test_api_review_statistics_summary_excludes_nonexistent_reviews(
  connection: api.IConnection,
) {
  // 1. Call the public statistics endpoint in an empty-data environment
  const summary: IShoppingMallReviewStatisticsSummary =
    await api.functional.shoppingMall.reviews.statistics.summary.index(
      connection,
    );

  // 2. Structural and runtime type validation
  typia.assert(summary);

  // 3. Business expectations for an empty platform state
  TestValidator.equals(
    "total review count is zero when there are no reviews",
    summary.totalReviewCount,
    0,
  );

  TestValidator.equals(
    "total rated product count is zero when there are no rated products",
    summary.totalRatedProductCount,
    0,
  );

  TestValidator.equals(
    "recent review count is zero when there are no recent reviews",
    summary.recentReviewCount,
    0,
  );

  TestValidator.equals(
    "global average rating baseline is zero when there are no reviews",
    summary.globalAverageRating,
    0,
  );

  // 4. All rating distribution buckets must have zero review counts
  for (const bucket of summary.ratingDistribution) {
    TestValidator.equals(
      `rating bucket for value ${bucket.ratingValue} has zero reviews`,
      bucket.reviewCount,
      0,
    );
  }
}
