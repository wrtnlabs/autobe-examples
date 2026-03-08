import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallReviewAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReviewAnalytic";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_product_review_analytics_no_reviews(
  connection: api.IConnection,
): Promise<void> {
  // 1. Generate a product ID for testing
  // We use a valid UUID format since the analytics endpoint validates the productId format
  const productId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 2. Call analytics endpoint with the generated product ID
  // This endpoint tests behavior for products with no reviews
  const analytics =
    await api.functional.ecommerceMall.products.reviews.analytics(connection, {
      productId,
    });
  typia.assert(analytics);
  // 3. Validate expected default values for "no reviews" scenario
  TestValidator.equals(
    "average_rating should be null",
    analytics.average_rating,
    null,
  );
  TestValidator.equals("total_count should be 0", analytics.total_count, 0);
  TestValidator.equals(
    "rating_1_count should be 0",
    analytics.rating_1_count,
    0,
  );
  TestValidator.equals(
    "rating_2_count should be 0",
    analytics.rating_2_count,
    0,
  );
  TestValidator.equals(
    "rating_3_count should be 0",
    analytics.rating_3_count,
    0,
  );
  TestValidator.equals(
    "rating_4_count should be 0",
    analytics.rating_4_count,
    0,
  );
  TestValidator.equals(
    "rating_5_count should be 0",
    analytics.rating_5_count,
    0,
  );
  // 4. Verify all distribution counts sum to total_count
  const distributionSum =
    analytics.rating_1_count +
    analytics.rating_2_count +
    analytics.rating_3_count +
    analytics.rating_4_count +
    analytics.rating_5_count;
  TestValidator.equals(
    "rating distribution sum equals total_count",
    distributionSum,
    analytics.total_count,
  );
}
