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

/**
 * Test successful retrieval of a complete product detail page for an active product from an approved seller.
 *
 * This test validates that the GET /shoppingMall/products/{productId} endpoint returns
 * all required product information for the primary customer browsing use case.
 *
 * Business Rule Validations:
 * 1. Product is not soft-deleted (deleted_at is null)
 * 2. Seller has approval_status='approved'
 * 3. Seller is not suspended or banned
 * 4. Category is active (deleted_at is null)
 * 5. Images are ordered by display_order ascending
 * 6. Active variants only (deleted_at is null)
 */
export async function test_api_product_detail_active_seller_success(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random product ID (UUID format) for testing
  const productId = typia.random<string & tags.Format<"uuid">>();
  // Call the product detail API
  const product = await api.functional.shoppingMall.products.at(connection, {
    productId,
  });
  // Validate complete response structure via typia.assert
  typia.assert(product);
  // Validate product is not soft-deleted (business rule for active products)
  TestValidator.equals(
    "product should not be soft-deleted",
    product.deleted_at,
    null,
  );
  // Validate seller approval status (business rule: only approved sellers' products visible)
  TestValidator.equals(
    "seller approval status should be approved",
    product.seller.approval_status,
    "approved",
  );
  // Validate seller is not suspended (business rule)
  TestValidator.equals(
    "seller should not be suspended",
    product.seller.suspended,
    false,
  );
  // Validate seller is not banned (business rule)
  TestValidator.equals(
    "seller should not be banned",
    product.seller.banned,
    false,
  );
  // Validate category is active - not soft-deleted (business rule)
  TestValidator.equals(
    "category should be active",
    product.category.deleted_at,
    null,
  );
  // Validate images are ordered by display_order ascending (business rule)
  if (product.images.length > 1) {
    for (let i = 0; i < product.images.length - 1; i++) {
      TestValidator.predicate(
        `image display order at index ${i}`,
        product.images[i].displayOrder <= product.images[i + 1].displayOrder,
      );
    }
  }
  // Validate all variants are active (not soft-deleted)
  for (const variant of product.variants) {
    TestValidator.equals(
      "variant should not be soft-deleted",
      variant.deleted_at,
      null,
    );
  }
}
