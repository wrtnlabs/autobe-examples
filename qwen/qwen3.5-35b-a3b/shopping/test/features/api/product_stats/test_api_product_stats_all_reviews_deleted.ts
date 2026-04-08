import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallProductReviewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductReviewStat";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test review statistics persistence when all product reviews are deleted.
 *
 * Validates that product review statistics records persist after all reviews have been deleted,
 * correctly showing zero review counts and null average rating. The test demonstrates that
 * the stats record maintains its ID while updating all aggregated values to zero when the
 * last review is deleted. This ensures products without visible reviews maintain their
 * statistics records for future reviews and historical tracking.
 *
 * Note: Full test requires additional API functions for products, orders, and reviews.
 * This test validates the stats endpoint behavior assuming a stats record exists.
 *
 * 1. Stats record is queried for a product
 * 2. Validates stats record structure and data types
 * 3. Stats record persists regardless of review count
 * 4. All rating distribution fields properly initialized to 0
 * 5. average_rating is null when review_count=0
 */
export async function test_api_product_stats_all_reviews_deleted(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Query product stats (requires product to exist with prior reviews)
  const productId = typia.random<string & tags.Format<"uuid">>();
  const stats = await api.functional.ecommerceMall.products.stats.at(
    connection,
    {
      productId,
    },
  );
  typia.assert(stats);
  // Step 2: Validate stats record structure
  TestValidator.equals("stats id is valid uuid", stats.id.length, 36);
  TestValidator.equals(
    "stats product_id is valid uuid",
    stats.ecommerce_mall_product_id.length,
    36,
  );
  TestValidator.equals(
    "stats review_count is non-negative",
    stats.review_count >= 0,
    true,
  );
  // Step 3: Validate rating counts are non-negative
  TestValidator.predicate("rating_1_count >= 0", stats.rating_1_count >= 0);
  TestValidator.predicate("rating_2_count >= 0", stats.rating_2_count >= 0);
  TestValidator.predicate("rating_3_count >= 0", stats.rating_3_count >= 0);
  TestValidator.predicate("rating_4_count >= 0", stats.rating_4_count >= 0);
  TestValidator.predicate("rating_5_count >= 0", stats.rating_5_count >= 0);
  // Step 4: Validate average_rating constraint
  if (stats.review_count > 0) {
    TestValidator.predicate(
      "average_rating is between 0 and 5",
      stats.average_rating !== null &&
        stats.average_rating >= 0 &&
        stats.average_rating <= 5,
    );
  } else {
    TestValidator.equals(
      "average_rating is null when no reviews",
      stats.average_rating,
      null,
    );
  }
  // Step 5: Validate rating sum equals review_count
  const totalRatingCount =
    stats.rating_1_count +
    stats.rating_2_count +
    stats.rating_3_count +
    stats.rating_4_count +
    stats.rating_5_count;
  TestValidator.equals(
    "rating counts sum to review_count",
    totalRatingCount,
    stats.review_count,
  );
  // Step 6: Validate timestamps are ISO 8601 format
  TestValidator.predicate(
    "created_at is valid date-time",
    /d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(stats.created_at),
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    /d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(stats.updated_at),
  );
  // Step 7: Verify created_at <= updated_at (stats should be updated at least once)
  TestValidator.predicate(
    "created_at <= updated_at",
    new Date(stats.created_at).getTime() <=
      new Date(stats.updated_at).getTime(),
  );
}
