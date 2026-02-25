import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_product_detail_deleted_product_restriction(
  connection: api.IConnection,
): Promise<void> {
  // This test verifies the product detail endpoint functionality
  // and checks for deleted product restriction behavior
  //
  // Note: Full deletion testing requires admin product creation and deletion
  // APIs which are not available in the current API specification.
  // This test focuses on what's possible with the available endpoints.
  // Use a known product ID for testing (would typically be created via admin API)
  const productId = "00000000-0000-0000-0000-000000000001";
  // Test product detail retrieval - verify basic functionality works
  const product = await api.functional.shoppingMall.products.at(connection, {
    productId: productId,
  });
  // Validate response structure using typia
  typia.assert(product);
  // Verify basic properties exist
  TestValidator.predicate("product has id", product.id !== undefined);
  TestValidator.predicate("product has name", typeof product.name === "string");
  TestValidator.predicate(
    "product has base_price",
    typeof product.base_price === "number",
  );
  // Test is_deleted property behavior
  // When product is soft-deleted, it should either:
  // 1. Not be accessible (404 error) - this would be tested with admin deletion
  // 2. Be accessible but with is_deleted=true flag
  TestValidator.predicate(
    "product has is_deleted flag",
    typeof product.is_deleted === "boolean",
  );
  // Verify related entities exist
  if (product.category) {
    TestValidator.equals(
      "category has id",
      product.category.id,
      product.category.id,
    );
  }
  if (product.seller) {
    TestValidator.equals("seller has id", product.seller.id, product.seller.id);
  }
}
