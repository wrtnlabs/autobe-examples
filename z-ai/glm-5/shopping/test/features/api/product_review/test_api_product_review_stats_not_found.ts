import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test retrieving review statistics for a non-existent product ID.
 *
 * This test validates that the API correctly handles requests for review statistics
 * when the specified product does not exist. The system should verify product existence
 * before attempting to calculate review statistics and return a 404 error for non-existent products.
 */
export async function test_api_product_review_stats_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random UUID that does not exist in the database
  const nonExistentProductId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to retrieve review stats for a non-existent product
  // Should throw HTTP 404 error
  await TestValidator.httpError(
    "should return 404 for non-existent product",
    404,
    async () => {
      await api.functional.shoppingMall.products.review_stats.get(connection, {
        productId: nonExistentProductId,
      });
    },
  );
}
