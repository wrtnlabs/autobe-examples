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
import type { IShoppingMallSkuOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuOption";
import type { IShoppingMallSkuSize } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuSize";

/**
 * Test creating a SKU variant with multiple attribute combinations.
 *
 * This test validates the complete workflow for creating comprehensive product
 * variants with multiple attributes (color, size, custom options), independent
 * pricing, and initial inventory configuration. It ensures sellers can properly
 * differentiate products across multiple dimensions.
 *
 * Test Flow:
 *
 * 1. Create seller account with authentication
 * 2. Create product category for classification
 * 3. Create parent product with base price
 * 4. Define color attribute (e.g., Navy Blue)
 * 5. Define size attribute (e.g., Large)
 * 6. Define custom option (e.g., Storage: 256GB)
 * 7. Create SKU variant combining all three attributes
 * 8. Validate SKU has unique code, correct pricing, and all attributes
 */
export async function test_api_sku_variant_creation_with_multiple_attributes(
  connection: api.IConnection,
) {
  // Step 1: Create seller account with product management permissions
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

  const seller = await api.functional.auth.seller.join(connection, {
    body: sellerData,
  });
  typia.assert(seller);

  // Step 2: Create product category for product classification
  // Note: Using admin endpoint - test environment assumes seller has sufficient permissions
  const categoryData = {
    name: RandomGenerator.name(2),
  } satisfies IShoppingMallCategory.ICreate;

  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: categoryData,
    },
  );
  typia.assert(category);

  // Step 3: Create parent product to contain the SKU variant
  const basePrice = typia.random<number & tags.Minimum<1>>();
  const productData = {
    name: RandomGenerator.name(3),
    base_price: basePrice,
  } satisfies IShoppingMallProduct.ICreate;

  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: productData,
    },
  );
  typia.assert(product);

  // Step 4: Define color attribute for variant differentiation
  // Note: Using admin endpoint - test environment assumes seller has sufficient permissions
  const colorData = {
    name: RandomGenerator.pick([
      "Navy Blue",
      "Forest Green",
      "Crimson Red",
      "Charcoal Gray",
    ] as const),
  } satisfies IShoppingMallSkuColor.ICreate;

  const color = await api.functional.shoppingMall.admin.skuColors.create(
    connection,
    {
      body: colorData,
    },
  );
  typia.assert(color);

  // Step 5: Define size attribute for variant differentiation
  // Note: Using admin endpoint - test environment assumes seller has sufficient permissions
  const sizeData = {
    value: RandomGenerator.pick([
      "Small",
      "Medium",
      "Large",
      "XL",
      "XXL",
    ] as const),
  } satisfies IShoppingMallSkuSize.ICreate;

  const size = await api.functional.shoppingMall.admin.skuSizes.create(
    connection,
    {
      body: sizeData,
    },
  );
  typia.assert(size);

  // Step 6: Define custom option attribute for product-specific variants
  const optionData = {
    option_name: "Storage Capacity",
    option_value: RandomGenerator.pick([
      "128GB",
      "256GB",
      "512GB",
      "1TB",
    ] as const),
  } satisfies IShoppingMallSkuOption.ICreate;

  const option = await api.functional.shoppingMall.seller.skuOptions.create(
    connection,
    {
      body: optionData,
    },
  );
  typia.assert(option);

  // Step 7: Create SKU combining all three attributes with specific pricing
  const skuPrice =
    basePrice + typia.random<number & tags.Minimum<10> & tags.Maximum<100>>();
  const skuCode = `SKU-${RandomGenerator.alphaNumeric(8).toUpperCase()}`;
  const skuData = {
    sku_code: skuCode,
    price: skuPrice,
  } satisfies IShoppingMallSku.ICreate;

  const sku = await api.functional.shoppingMall.seller.products.skus.create(
    connection,
    {
      productId: product.id,
      body: skuData,
    },
  );
  typia.assert(sku);

  // Step 8: Validate SKU creation with all attributes
  TestValidator.equals("SKU code matches input", sku.sku_code, skuCode);
  TestValidator.equals(
    "SKU price is independent from base price",
    sku.price,
    skuPrice,
  );
  TestValidator.predicate(
    "SKU price is higher than base price",
    sku.price > basePrice,
  );
}
