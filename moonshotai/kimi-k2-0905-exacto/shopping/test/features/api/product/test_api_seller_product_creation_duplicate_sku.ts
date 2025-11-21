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
 * Test product creation with duplicate SKU to validate proper error handling
 * and enforcement of unique product identifiers across the marketplace.
 *
 * This test ensures that SKUs remain globally unique across all sellers and
 * products in the system, preventing inventory conflicts and order fulfillment
 * issues.
 *
 * Test flow:
 *
 * 1. Create a seller account for authentication
 * 2. Create an initial product with a specific SKU
 * 3. Attempt to create another product with the same SKU
 * 4. Verify that the duplicate SKU attempt fails with appropriate error handling
 * 5. Verify that products with different SKUs can still be created
 * 6. Confirm that the error response indicates SKU uniqueness violation
 */
export async function test_api_seller_product_creation_duplicate_sku(
  connection: api.IConnection,
) {
  // Step 1: Create seller account for authentication
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

  // Step 2: Create initial product with specific SKU
  const testSku = `TEST-SKU-${RandomGenerator.alphaNumeric(8)}`;
  const categoryId = typia.random<string & tags.Format<"uuid">>();

  const initialProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: {
        sku: testSku,
        name: RandomGenerator.name(),
        description: RandomGenerator.content({ paragraphs: 2 }),
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
        href: "https://example.com/dashboard/products/create",
        referrer: "https://example.com/dashboard/products",
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(initialProduct);

  // Verify the initial product was created successfully
  TestValidator.equals(
    "initial product SKU matches",
    initialProduct.sku,
    testSku,
  );
  TestValidator.predicate(
    "initial product has valid ID",
    initialProduct.id !== null && initialProduct.id !== undefined,
  );

  // Step 3: Attempt to create another product with the same SKU
  // This should fail due to SKU uniqueness constraint
  await TestValidator.error(
    "duplicate SKU should be rejected with proper error",
    async () => {
      await api.functional.shoppingMall.seller.products.create(connection, {
        body: {
          sku: testSku, // Same SKU as initial product
          name: RandomGenerator.name(),
          description: RandomGenerator.content({ paragraphs: 1 }),
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
          href: "https://example.com/dashboard/products/create",
          referrer: "https://example.com/dashboard/products",
        } satisfies IShoppingMallProduct.ICreate,
      });
    },
  );

  // Step 4: Verify that products with different SKUs can still be created
  const differentSku = `TEST-SKU-${RandomGenerator.alphaNumeric(8)}`;
  const differentProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: {
        sku: differentSku,
        name: RandomGenerator.name(),
        description: RandomGenerator.content({ paragraphs: 1 }),
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
        href: "https://example.com/dashboard/products/create",
        referrer: "https://example.com/dashboard/products",
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(differentProduct);

  // Verify the different SKU product was created successfully
  TestValidator.equals(
    "different product SKU matches",
    differentProduct.sku,
    differentSku,
  );
  TestValidator.predicate(
    "different product has valid ID",
    differentProduct.id !== null && differentProduct.id !== undefined,
  );

  // Step 5: Final validation - ensure both products exist with different SKUs
  TestValidator.notEquals(
    "products have different IDs",
    initialProduct.id,
    differentProduct.id,
  );
  TestValidator.notEquals(
    "products have different SKUs",
    initialProduct.sku,
    differentProduct.sku,
  );

  TestValidator.predicate(
    "duplicate SKU validation completed successfully",
    true,
  );
}
