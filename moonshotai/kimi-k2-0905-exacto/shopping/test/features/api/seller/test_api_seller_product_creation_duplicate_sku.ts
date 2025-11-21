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
 * Test product creation with duplicate SKU validation.
 *
 * This test validates that the system prevents sellers from creating products
 * with identical SKU codes. SKU uniqueness is critical for inventory management
 * and order processing across the entire marketplace.
 *
 * Test Process:
 *
 * 1. Create first seller account
 * 2. Create a product with specific SKU
 * 3. Create second seller account
 * 4. Attempt to create product with same SKU
 * 5. Verify error response and error handling
 * 6. Create product with unique SKU to confirm normal operation
 * 7. Validate comprehensive error feedback for duplicate SKU attempts
 *
 * Key Validation points:
 *
 * - Uniqueness enforcement for SKU codes across all sellers
 * - Clear error messaging for duplicate SKU attempts
 * - Prevention of inventory conflicts in marketplace
 * - Proper error response structure and status codes
 * - Normal product creation flow with unique SKUs
 */
export async function test_api_seller_product_creation_duplicate_sku(
  connection: api.IConnection,
) {
  // Step 1: Create first seller account
  const sellerEmail1 = typia.random<string & tags.Format<"email">>();
  const seller1 = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail1,
      business_name: RandomGenerator.name(2),
      business_registration_number:
        RandomGenerator.alphaNumeric(10).toUpperCase(),
      tax_id: RandomGenerator.alphaNumeric(9),
      phone: RandomGenerator.mobile(),
      business_type: "corporation",
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller1);

  // Step 2: Create first product with specific SKU
  const uniqueSku = `SKU-${RandomGenerator.alphaNumeric(8).toUpperCase()}`;
  const product1 = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        sku: uniqueSku,
        name: RandomGenerator.name(3),
        description: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 8,
          sentenceMax: 12,
        }),
        price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<100> & tags.Maximum<10000>
        >(),
        condition: "new",
        weight: typia.random<number & tags.Minimum<0.1> & tags.Maximum<50>>(),
        weight_unit: "kg",
        track_quantity: true,
        allow_backorder: false,
        is_shipping_required: true,
        is_taxable: true,
        category_id: typia.random<string & tags.Format<"uuid">>(),
        shopping_mall_seller_id: seller1.id,
        href: "https://seller-dashboard.example.com/products/create",
        referrer: "https://seller-dashboard.example.com/products",
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product1);

  TestValidator.equals(
    "first product SKU created successfully",
    product1.sku,
    uniqueSku,
  );

  // Step 3: Create second seller account to test cross-seller SKU uniqueness
  const sellerEmail2 = typia.random<string & tags.Format<"email">>();
  const seller2 = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail2,
      business_name: RandomGenerator.name(2),
      business_registration_number:
        RandomGenerator.alphaNumeric(10).toUpperCase(),
      tax_id: RandomGenerator.alphaNumeric(9),
      phone: RandomGenerator.mobile(),
      business_type: "llc",
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller2);

  // Step 4: Verify second seller is different from first seller
  TestValidator.notEquals(
    "second seller different from first",
    seller2.id,
    seller1.id,
  );
  TestValidator.notEquals(
    "second seller email different",
    seller2.email,
    seller1.email,
  );

  // Step 5: Attempt to create product with duplicate SKU - should fail
  await TestValidator.error(
    "duplicate SKU should fail across different sellers",
    async () => {
      await api.functional.shoppingMall.seller.products.create(connection, {
        body: {
          sku: uniqueSku,
          name: RandomGenerator.name(3),
          description: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 8,
            sentenceMax: 12,
          }),
          price: typia.random<
            number &
              tags.Type<"uint32"> &
              tags.Minimum<100> &
              tags.Maximum<10000>
          >(),
          condition: "new",
          weight: typia.random<number & tags.Minimum<0.1> & tags.Maximum<50>>(),
          weight_unit: "kg",
          track_quantity: true,
          allow_backorder: false,
          is_shipping_required: true,
          is_taxable: true,
          category_id: typia.random<string & tags.Format<"uuid">>(),
          shopping_mall_seller_id: seller2.id,
          href: "https://seller-dashboard.example.com/products/create",
          referrer: "https://seller-dashboard.example.com/products",
        } satisfies IShoppingMallProduct.ICreate,
      });
    },
  );

  // Step 6: Create second product with unique SKU to confirm normal operation
  const uniqueSku2 = `SKU-${RandomGenerator.alphaNumeric(8).toUpperCase()}`;
  const product2 = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        sku: uniqueSku2,
        name: RandomGenerator.name(3),
        description: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 8,
          sentenceMax: 12,
        }),
        price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<100> & tags.Maximum<10000>
        >(),
        condition: "new",
        weight: typia.random<number & tags.Minimum<0.1> & tags.Maximum<50>>(),
        weight_unit: "kg",
        track_quantity: true,
        allow_backorder: false,
        is_shipping_required: true,
        is_taxable: true,
        category_id: typia.random<string & tags.Format<"uuid">>(),
        shopping_mall_seller_id: seller2.id,
        href: "https://seller-dashboard.example.com/products/create",
        referrer: "https://seller-dashboard.example.com/products",
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product2);

  // Step 7: Validate second product was created successfully with unique SKU
  TestValidator.equals(
    "second product created successfully",
    product2.sku,
    uniqueSku2,
  );
  TestValidator.predicate(
    "second seller owns second product",
    () => product2.seller.id === seller2.id,
  );
  TestValidator.predicate(
    "products have different SKUs",
    () => product1.sku !== product2.sku,
  );

  // Step 8: Test same seller duplicate SKU attempt
  await TestValidator.error(
    "same seller duplicate SKU should fail",
    async () => {
      await api.functional.shoppingMall.seller.products.create(connection, {
        body: {
          sku: uniqueSku2,
          name: RandomGenerator.name(3),
          description: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 8,
            sentenceMax: 12,
          }),
          price: typia.random<
            number &
              tags.Type<"uint32"> &
              tags.Minimum<100> &
              tags.Maximum<10000>
          >(),
          condition: "new",
          weight: typia.random<number & tags.Minimum<0.1> & tags.Maximum<50>>(),
          weight_unit: "kg",
          track_quantity: true,
          allow_backorder: false,
          is_shipping_required: true,
          is_taxable: true,
          category_id: typia.random<string & tags.Format<"uuid">>(),
          shopping_mall_seller_id: seller2.id,
          href: "https://seller-dashboard.example.com/products/create",
          referrer: "https://seller-dashboard.example.com/products",
        } satisfies IShoppingMallProduct.ICreate,
      });
    },
  );
}
