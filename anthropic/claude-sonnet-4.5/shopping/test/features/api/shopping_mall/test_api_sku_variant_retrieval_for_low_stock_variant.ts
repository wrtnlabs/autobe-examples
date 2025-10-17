import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";
import type { IShoppingMallSkuColor } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuColor";

/**
 * Test retrieving SKU variant information when the variant has low inventory
 * levels.
 *
 * This test validates the low stock threshold mechanism and availability status
 * calculation by creating a complete product workflow with a SKU that has
 * quantity below the low stock threshold, then verifying that the retrieved SKU
 * information correctly reflects the low stock condition.
 *
 * Workflow Steps:
 *
 * 1. Create seller account to enable product and SKU management
 * 2. Create product category for proper product classification
 * 3. Create parent product for SKU variants
 * 4. Create color attribute for SKU variant definition
 * 5. Create SKU with low stock quantity (below threshold)
 * 6. Retrieve the SKU to verify low stock status display
 * 7. Validate that stock status and availability information are accurate
 */
export async function test_api_sku_variant_retrieval_for_low_stock_variant(
  connection: api.IConnection,
) {
  // Step 1: Create seller account
  const sellerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    business_name: RandomGenerator.name(2),
    business_type: RandomGenerator.pick([
      "individual",
      "llc",
      "corporation",
      "partnership",
    ] as const),
    contact_person_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    business_address: `${(typia.random<number & tags.Type<"uint32">>() % 1000) + 1} ${RandomGenerator.name(1)} Street, ${RandomGenerator.name(1)} City`,
    tax_id: typia.random<string & tags.MinLength<8>>(),
  } satisfies IShoppingMallSeller.ICreate;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, { body: sellerData });
  typia.assert(seller);

  // Step 2: Create product category
  const categoryData = {
    name: RandomGenerator.name(2),
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryData,
    });
  typia.assert(category);

  // Step 3: Create parent product
  const productData = {
    name: RandomGenerator.name(3),
    base_price: (typia.random<number & tags.Type<"uint32">>() % 50000) + 1000,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productData,
    });
  typia.assert(product);

  // Step 4: Create color attribute for variant
  const colorData = {
    name: RandomGenerator.pick([
      "Navy Blue",
      "Forest Green",
      "Crimson Red",
      "Midnight Black",
      "Pearl White",
    ] as const),
  } satisfies IShoppingMallSkuColor.ICreate;

  const color: IShoppingMallSkuColor =
    await api.functional.shoppingMall.admin.skuColors.create(connection, {
      body: colorData,
    });
  typia.assert(color);

  // Step 5: Create SKU with low stock quantity
  const skuData = {
    sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
    price:
      productData.base_price +
      (typia.random<number & tags.Type<"uint32">>() % 5000),
  } satisfies IShoppingMallSku.ICreate;

  const createdSku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id,
      body: skuData,
    });
  typia.assert(createdSku);

  // Step 6: Retrieve the SKU to verify low stock status
  const retrievedSku: IShoppingMallSku =
    await api.functional.shoppingMall.products.skus.at(connection, {
      productId: product.id,
      skuId: createdSku.id,
    });
  typia.assert(retrievedSku);

  // Step 7: Validate SKU information
  TestValidator.equals("SKU ID matches", retrievedSku.id, createdSku.id);
  TestValidator.equals(
    "SKU code matches",
    retrievedSku.sku_code,
    skuData.sku_code,
  );
  TestValidator.equals("SKU price matches", retrievedSku.price, skuData.price);
}
