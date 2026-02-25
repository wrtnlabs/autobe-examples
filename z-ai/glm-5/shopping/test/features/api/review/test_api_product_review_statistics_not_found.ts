import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallReviewStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewStatistic";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test retrieving review statistics for a non-existent product.
 *
 * This test validates proper error handling when querying statistics
 * for a product that does not exist in the system. The API should return
 * an HTTP 404 error with an appropriate message indicating the product
 * was not found.
 *
 * Steps:
 * 1. Generate a random UUID that does not correspond to any product
 * 2. Call GET /shoppingMall/products/{productId}/reviews/statistics
 * 3. Validate that HTTP 404 error is returned
 */
export async function test_api_product_review_statistics_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random UUID for a non-existent product
  const nonExistentProductId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to retrieve review statistics for non-existent product
  // Should return HTTP 404 error
  await TestValidator.httpError(
    "should return 404 for non-existent product",
    404,
    async () => {
      await api.functional.shoppingMall.products.reviews.statistics(
        connection,
        {
          productId: nonExistentProductId,
        },
      );
    },
  );
}
