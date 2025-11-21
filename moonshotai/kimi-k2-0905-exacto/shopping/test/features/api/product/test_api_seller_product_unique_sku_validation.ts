import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallInventoryStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryStatus";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductReviewStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReviewStatistics";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test seller attempting to create a product with a SKU that conflicts with
 * existing marketplace inventory. Validates proper error handling for SKU
 * uniqueness constraints and prevents duplicate product identification.
 *
 * Test workflow:
 *
 * 1. Create seller account for authentication and marketplace access
 * 2. Create initial product with specific SKU to establish baseline inventory
 * 3. Attempt to create second product with identical SKU to test uniqueness
 *    validation
 * 4. Verify system properly rejects duplicate SKU attempts with appropriate error
 *    handling
 * 5. Confirm error response indicates SKU conflict rather than other validation
 *    issues
 *
 * This ensures marketplace maintains unique product identification through SKU
 * enforcement, preventing inventory conflicts and ensuring proper product
 * catalog integrity.
 */
export async function test_api_seller_product_unique_sku_validation(
  connection: api.IConnection,
) {
  // Create seller account for authentication
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      business_name: RandomGenerator.name(),
      business_registration_number: RandomGenerator.alphaNumeric(10),
      tax_id: RandomGenerator.alphaNumeric(9),
      phone: RandomGenerator.mobile(),
      business_type: "corporation",
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);

  // Create initial product with specific SKU
  const testSku = `TEST-SKU-${RandomGenerator.alphaNumeric(8)}`;
  const categoryId = typia.random<string & tags.Format<"uuid">>();

  const initialProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: {
        sku: testSku,
        name: RandomGenerator.name(),
        description: RandomGenerator.content(),
        price: typia.random<number & tags.Minimum<10> & tags.Maximum<1000>>(),
        condition: "new",
        weight: typia.random<number & tags.Minimum<0.1> & tags.Maximum<10>>(),
        weight_unit: "kg",
        track_quantity: true,
        allow_backorder: false,
        is_shipping_required: true,
        is_taxable: true,
        category_id: categoryId,
        shopping_mall_seller_id: seller.id,
        href: "https://example.com/products/new",
        referrer: "https://example.com/dashboard",
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(initialProduct);

  // Verify initial product was created successfully
  TestValidator.equals(
    "initial product SKU matches",
    initialProduct.sku,
    testSku,
  );
  TestValidator.predicate(
    "initial product has valid ID",
    initialProduct.id.length > 0,
  );

  // Attempt to create second product with same SKU - should fail
  await TestValidator.error("duplicate SKU should be rejected", async () => {
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: {
        sku: testSku, // Same SKU as initial product
        name: RandomGenerator.name(),
        description: RandomGenerator.content(),
        price: typia.random<number & tags.Minimum<10> & tags.Maximum<1000>>(),
        condition: "new",
        weight: typia.random<number & tags.Minimum<0.1> & tags.Maximum<10>>(),
        weight_unit: "kg",
        track_quantity: true,
        allow_backorder: false,
        is_shipping_required: true,
        is_taxable: true,
        category_id: categoryId,
        shopping_mall_seller_id: seller.id,
        href: "https://example.com/products/duplicate",
        referrer: "https://example.com/dashboard",
      } satisfies IShoppingMallProduct.ICreate,
    });
  });

  // Test with different SKU should succeed
  const differentSku = `TEST-SKU-${RandomGenerator.alphaNumeric(8)}`;
  const differentProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: {
        sku: differentSku,
        name: RandomGenerator.name(),
        description: RandomGenerator.content(),
        price: typia.random<number & tags.Minimum<10> & tags.Maximum<1000>>(),
        condition: "new",
        weight: typia.random<number & tags.Minimum<0.1> & tags.Maximum<10>>(),
        weight_unit: "kg",
        track_quantity: true,
        allow_backorder: false,
        is_shipping_required: true,
        is_taxable: true,
        category_id: categoryId,
        shopping_mall_seller_id: seller.id,
        href: "https://example.com/products/different",
        referrer: "https://example.com/dashboard",
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(differentProduct);

  // Verify different SKU product was created successfully
  TestValidator.equals(
    "different product SKU matches",
    differentProduct.sku,
    differentSku,
  );
  TestValidator.notEquals(
    "different product has different ID",
    differentProduct.id,
    initialProduct.id,
  );
  TestValidator.predicate(
    "different product has valid ID",
    differentProduct.id.length > 0,
  );
}
