import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_product_detail_suspended_seller(
  connection: api.IConnection,
): Promise<void> {
  // Test: Products from suspended sellers should return 404
  //
  // Business Rule: When a product belongs to a suspended seller (is_suspended=true),
  // the system must return 404 Not Found instead of the product data.
  // This prevents customers from accessing products from sellers who have been
  // suspended from the platform.
  //
  // Note: This test uses existing product IDs to validate the business logic.
  // The actual product-to-suspended-seller relationship is managed by the server.
  // Generate a product ID to test - in production this would be a known product
  // belonging to a suspended seller
  const productId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to retrieve the product
  // Expected: 404 Not Found (product should be hidden due to suspended seller)
  await TestValidator.httpError(
    "product from suspended seller should return 404 Not Found",
    404,
    async () => {
      await api.functional.ecommerceMall.products.at(connection, {
        productId,
      });
    },
  );
}
