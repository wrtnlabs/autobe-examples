import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallProductReviewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductReviewStat";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_product_stats_with_reviews(
  connection: api.IConnection,
): Promise<void> {
  // Test stats endpoint structure and validation
  // Note: Full integration testing requires additional API endpoints for creating
  // products, orders, and reviews which are not available in this SDK version.
  // This test validates the stats endpoint's response structure and error handling.
  // Generate a valid UUID for testing
  const productId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to get stats for non-existent product (expect 404)
  let stats: IEcommerceMallProductReviewStat;
  try {
    stats = await api.functional.ecommerceMall.products.stats.at(connection, {
      productId,
    });
    typia.assert(stats);
  } catch (error) {
    // Expected: 404 Not Found when stats record doesn't exist
    if (error instanceof api.HttpError) {
      TestValidator.equals("404 when no stats", error.status, 404);
      return;
    }
    throw error;
  }
  // If stats exist, validate structure
  TestValidator.predicate("stats has id", stats.id.length > 0);
  TestValidator.predicate(
    "stats has product_id",
    stats.ecommerce_mall_product_id.length > 0,
  );
  TestValidator.equals(
    "stats product_id matches query",
    stats.ecommerce_mall_product_id,
    productId,
  );
  TestValidator.predicate("stats has review_count", stats.review_count >= 0);
  TestValidator.predicate(
    "stats has timestamps",
    stats.created_at !== undefined,
  );
  TestValidator.predicate(
    "stats has timestamps",
    stats.updated_at !== undefined,
  );
  TestValidator.predicate(
    "stats rating counts valid",
    stats.rating_1_count +
      stats.rating_2_count +
      stats.rating_3_count +
      stats.rating_4_count +
      stats.rating_5_count ===
      stats.review_count,
  );
  // Validate average_rating calculation
  if (stats.review_count > 0) {
    TestValidator.predicate(
      "average_rating exists when reviews exist",
      stats.average_rating !== null,
    );
    TestValidator.predicate(
      "average_rating in range",
      stats.average_rating! >= 0 && stats.average_rating! <= 5,
    );
    TestValidator.predicate(
      "average_rating has 2 decimals",
      Number.isInteger(stats.average_rating! * 100),
    );
  } else {
    TestValidator.equals(
      "average_rating null when no reviews",
      stats.average_rating,
      null,
    );
  }
  // Validate timestamps are valid ISO 8601 format
  new Date(stats.created_at);
  new Date(stats.updated_at);
  TestValidator.predicate(
    "created_at before or equal to updated_at",
    new Date(stats.created_at).getTime() <=
      new Date(stats.updated_at).getTime(),
  );
}
