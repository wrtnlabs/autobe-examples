import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallProductReviewStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReviewStatistic";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test product review statistics retrieval with multiple reviews.
 *
 * Validates that the statistics endpoint returns correctly aggregated review
 * data including total count, average rating, and rating distribution.
 * Verifies mathematical consistency of the returned statistics.
 */
export async function test_api_product_review_statistics_with_multiple_reviews(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random product UUID for the test
  const productId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Call the review statistics endpoint
  const statistics =
    await api.functional.shoppingMall.products.reviews.statistics.getReviewStatistics(
      connection,
      { productId },
    );
  // Validate response type
  typia.assert(statistics);
  // Verify totalCount is non-negative
  TestValidator.predicate(
    "totalCount is non-negative",
    statistics.totalCount >= 0,
  );
  // Verify averageRating is either null or within valid range (1.0 - 5.0)
  if (statistics.averageRating !== null) {
    TestValidator.predicate(
      "averageRating is between 1.0 and 5.0",
      statistics.averageRating >= 1 && statistics.averageRating <= 5,
    );
    // Verify averageRating is rounded to 1 decimal place (multiple of 0.1)
    TestValidator.predicate(
      "averageRating is rounded to 1 decimal place",
      Math.abs(
        statistics.averageRating -
          Math.round(statistics.averageRating * 10) / 10,
      ) < 0.001,
    );
  }
  // Verify all rating distribution keys exist
  TestValidator.equals(
    "ratingDistribution has 5-star keys",
    Object.keys(statistics.ratingDistribution).length,
    5,
  );
  // Verify each rating distribution value is non-negative
  TestValidator.predicate(
    "rating 1 count is non-negative",
    statistics.ratingDistribution["1"] >= 0,
  );
  TestValidator.predicate(
    "rating 2 count is non-negative",
    statistics.ratingDistribution["2"] >= 0,
  );
  TestValidator.predicate(
    "rating 3 count is non-negative",
    statistics.ratingDistribution["3"] >= 0,
  );
  TestValidator.predicate(
    "rating 4 count is non-negative",
    statistics.ratingDistribution["4"] >= 0,
  );
  TestValidator.predicate(
    "rating 5 count is non-negative",
    statistics.ratingDistribution["5"] >= 0,
  );
  // Verify sum of rating distribution equals totalCount
  const distributionSum =
    statistics.ratingDistribution["1"] +
    statistics.ratingDistribution["2"] +
    statistics.ratingDistribution["3"] +
    statistics.ratingDistribution["4"] +
    statistics.ratingDistribution["5"];
  TestValidator.equals(
    "rating distribution sum equals total count",
    distributionSum,
    statistics.totalCount,
  );
  // Verify averageRating calculation when reviews exist
  if (statistics.totalCount > 0 && statistics.averageRating !== null) {
    const calculatedAverage =
      (statistics.ratingDistribution["1"] * 1 +
        statistics.ratingDistribution["2"] * 2 +
        statistics.ratingDistribution["3"] * 3 +
        statistics.ratingDistribution["4"] * 4 +
        statistics.ratingDistribution["5"] * 5) /
      statistics.totalCount;
    const roundedAverage = Math.round(calculatedAverage * 10) / 10;
    TestValidator.equals(
      "averageRating matches calculated value",
      statistics.averageRating,
      roundedAverage,
    );
  }
  // Verify hasCustomerReviewed is undefined for unauthenticated request
  TestValidator.equals(
    "hasCustomerReviewed is undefined for unauthenticated request",
    statistics.hasCustomerReviewed,
    undefined,
  );
}
