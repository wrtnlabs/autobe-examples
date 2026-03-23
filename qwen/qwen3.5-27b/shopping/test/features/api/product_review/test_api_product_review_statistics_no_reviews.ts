import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallProductReviewStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReviewStatistic";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_product_review_statistics_no_reviews(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test the edge case where a product has no reviews yet.
   * This validates that the API correctly handles products with zero reviews
   * by returning appropriate default values (0 counts, null average rating).
   */
  // 1. Generate a valid product UUID for testing
  const productId = typia.random<string & tags.Format<"uuid">>();
  // 2. Call the review statistics endpoint (unauthenticated)
  const statistics =
    await api.functional.shoppingMall.products.reviews.statistics.getReviewStatistics(
      connection,
      { productId },
    );
  // 3. Validate response type
  typia.assert(statistics);
  // 4. Verify totalCount is 0 (no reviews exist)
  TestValidator.equals("totalCount should be 0", statistics.totalCount, 0);
  // 5. Verify averageRating is null (cannot calculate average with no reviews)
  TestValidator.equals(
    "averageRating should be null",
    statistics.averageRating,
    null,
  );
  // 6. Verify all rating distribution values are 0
  TestValidator.equals(
    "rating 1 count should be 0",
    statistics.ratingDistribution["1"],
    0,
  );
  TestValidator.equals(
    "rating 2 count should be 0",
    statistics.ratingDistribution["2"],
    0,
  );
  TestValidator.equals(
    "rating 3 count should be 0",
    statistics.ratingDistribution["3"],
    0,
  );
  TestValidator.equals(
    "rating 4 count should be 0",
    statistics.ratingDistribution["4"],
    0,
  );
  TestValidator.equals(
    "rating 5 count should be 0",
    statistics.ratingDistribution["5"],
    0,
  );
  // 7. Verify hasCustomerReviewed is not present (unauthenticated request)
  TestValidator.predicate(
    "hasCustomerReviewed should not be present for unauthenticated requests",
    statistics.hasCustomerReviewed === undefined,
  );
}
