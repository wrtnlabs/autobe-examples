import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallReviewAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReviewAnalytic";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test product review analytics endpoint for successful aggregation of customer ratings.
 * 
 * Tests that the analytics endpoint correctly calculates:
 * - Average rating rounded to 1 decimal place
 * - Total review count
 * - Rating distribution across 1-5 stars
 * 
 * Verifies mathematical consistency: total_count equals sum of all rating counts.
 */
export async function test_api_product_review_analytics_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Generate random product ID for testing
  const productId: string & typia.tags.Format<"uuid"> = typia.random<
    string & typia.tags.Format<"uuid">
  >();

  // 2. Call the analytics endpoint
  // Note: This endpoint has no auth requirements (auth actor is null)
  // So we can use the base connection directly
  const analytics = await api.functional.ecommerceMall.products.reviews.analytics(
    connection,
    { productId },
  );
  typia.assert<IEcommerceMallReviewAnalytic>(analytics);

  // 3. Validate response structure matches IEcommerceMallReviewAnalytic
  // typia.assert() already validates all properties exist and have correct types
  // Just need to verify business logic consistency

  // 4. Verify mathematical consistency: total_count must equal sum of all rating counts
  const calculatedTotal =
    analytics.rating_1_count +
    analytics.rating_2_count +
    analytics.rating_3_count +
    analytics.rating_4_count +
    analytics.rating_5_count;

  TestValidator.equals(
    "total_count matches sum of rating distribution counts",
    analytics.total_count,
    calculatedTotal,
  );

  // 5. Verify average_rating is null when no reviews exist
  if (analytics.total_count === 0) {
    TestValidator.equals("average_rating is null when no reviews", analytics.average_rating, null);
  } else {
    // 6. When reviews exist, verify average_rating is a number (not null)
    TestValidator.predicate(
      "average_rating is a number when reviews exist",
      analytics.average_rating !== null,
    );

    // 7. Verify average_rating has at most 1 decimal place precision
    if (analytics.average_rating !== null) {
      const roundedTo1Decimal = Number(analytics.average_rating.toFixed(1));
      TestValidator.equals(
        "average_rating rounded to 1 decimal place",
        analytics.average_rating,
        roundedTo1Decimal,
      );
    }
  }

  // 8. Verify all counts are non-negative integers
  TestValidator.predicate(
    "total_count is non-negative",
    analytics.total_count >= 0,
  );

  TestValidator.predicate(
    "rating_1_count is non-negative",
    analytics.rating_1_count >= 0,
  );

  TestValidator.predicate(
    "rating_2_count is non-negative",
    analytics.rating_2_count >= 0,
  );

  TestValidator.predicate(
    "rating_3_count is non-negative",
    analytics.rating_3_count >= 0,
  );

  TestValidator.predicate(
    "rating_4_count is non-negative",
    analytics.rating_4_count >= 0,
  );

  TestValidator.predicate(
    "rating_5_count is non-negative",
    analytics.rating_5_count >= 0,
  );
}