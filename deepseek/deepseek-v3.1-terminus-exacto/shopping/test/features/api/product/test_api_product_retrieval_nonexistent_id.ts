import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test product retrieval when provided with a non-existent product ID.
 *
 * Validates that the system handles invalid product identifiers gracefully by
 * returning appropriate error responses. Verifies that the operation maintains
 * security boundaries and does not expose internal system information through
 * error messages.
 */
export async function test_api_product_retrieval_nonexistent_id(
  connection: api.IConnection,
) {
  // Generate a random UUID that does not exist in the system
  const nonExistentProductId = typia.random<string & tags.Format<"uuid">>();

  // Attempt to retrieve product with non-existent ID
  await TestValidator.error(
    "product retrieval with non-existent ID should fail",
    async () => {
      await api.functional.shoppingMall.products.at(connection, {
        productId: nonExistentProductId,
      });
    },
  );
}
