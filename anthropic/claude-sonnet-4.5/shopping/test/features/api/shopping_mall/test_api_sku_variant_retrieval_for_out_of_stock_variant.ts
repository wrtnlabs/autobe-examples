import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";
import type { IShoppingMallSkuSize } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuSize";

/**
 * Test retrieving SKU variant information when the variant is completely out of
 * stock.
 *
 * This test validates that the system correctly handles and displays SKU
 * information for product variants that have zero available quantity. The test
 * creates a complete product hierarchy including seller, category, product, and
 * variant attributes, then creates an out-of-stock SKU and verifies the
 * retrieval endpoint returns accurate data.
 *
 * Steps:
 *
 * 1. Create seller account for product management
 * 2. Create product category for classification
 * 3. Create parent product entity
 * 4. Create size variant attribute
 * 5. Create SKU with zero available quantity (out of stock)
 * 6. Retrieve SKU details via public API
 * 7. Validate response contains correct SKU information
 */
export async function test_api_sku_variant_retrieval_for_out_of_stock_variant(
  connection: api.IConnection,
) {
  // Step 1: Create seller account
  const sellerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    business_name: RandomGenerator.name(2),
    business_type: RandomGenerator.pick([
      "individual",
      "LLC",
      "corporation",
      "partnership",
    ] as const),
    contact_person_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    business_address: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 4,
      wordMax: 8,
    }),
    tax_id: RandomGenerator.alphaNumeric(10),
  } satisfies IShoppingMallSeller.ICreate;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, { body: sellerData });
  typia.assert(seller);

  // Step 2: Create product category (admin operation)
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
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 7 }),
    base_price: typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<100000>
    >(),
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productData,
    });
  typia.assert(product);

  // Step 4: Create size variant attribute
  const sizeData = {
    value: RandomGenerator.pick(["XS", "S", "M", "L", "XL", "XXL"] as const),
  } satisfies IShoppingMallSkuSize.ICreate;

  const size: IShoppingMallSkuSize =
    await api.functional.shoppingMall.admin.skuSizes.create(connection, {
      body: sizeData,
    });
  typia.assert(size);

  // Step 5: Create SKU with zero available quantity (out of stock)
  const skuData = {
    sku_code: RandomGenerator.alphaNumeric(12),
    price: typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<100000>
    >(),
  } satisfies IShoppingMallSku.ICreate;

  const createdSku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id,
      body: skuData,
    });
  typia.assert(createdSku);

  // Step 6: Retrieve SKU details via public API
  const retrievedSku: IShoppingMallSku =
    await api.functional.shoppingMall.products.skus.at(connection, {
      productId: product.id,
      skuId: createdSku.id,
    });
  typia.assert(retrievedSku);

  // Step 7: Validate response contains correct SKU information
  TestValidator.equals("SKU ID matches", retrievedSku.id, createdSku.id);
  TestValidator.equals(
    "SKU code matches",
    retrievedSku.sku_code,
    skuData.sku_code,
  );
  TestValidator.equals("SKU price matches", retrievedSku.price, skuData.price);
}
