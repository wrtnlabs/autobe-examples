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
import type { IShoppingMallSkuSize } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuSize";

/**
 * Test creating a SKU variant in inactive state for preparation workflow.
 *
 * This test validates the seller's ability to create product SKU variants and
 * prepare them before making them available to customers. The test follows the
 * complete dependency chain:
 *
 * 1. Register seller account for authentication context
 * 2. Create product category for catalog organization
 * 3. Create base product under seller's account
 * 4. Create color and size variant attributes
 * 5. Create SKU variant with proper configuration
 * 6. Validate successful SKU creation with all relationships
 */
export async function test_api_sku_variant_creation_inactive_for_preparation(
  connection: api.IConnection,
) {
  // Step 1: Create seller account for variant management
  const sellerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    business_name: RandomGenerator.name(2),
    business_type: RandomGenerator.pick([
      "Individual",
      "LLC",
      "Corporation",
      "Partnership",
    ] as const),
    contact_person_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    business_address: `${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<9999>>()} ${RandomGenerator.name(1)} Street`,
    tax_id: RandomGenerator.alphaNumeric(10),
  } satisfies IShoppingMallSeller.ICreate;

  const seller = await api.functional.auth.seller.join(connection, {
    body: sellerData,
  });
  typia.assert(seller);

  // Step 2: Create category for product organization
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

  // Step 3: Create base product for SKU variants
  const productData = {
    name: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 8 }),
    base_price: typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<100> & tags.Maximum<100000>
    >(),
  } satisfies IShoppingMallProduct.ICreate;

  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: productData,
    },
  );
  typia.assert(product);

  // Step 4: Create color attribute for variant differentiation
  const colorData = {
    name: RandomGenerator.pick([
      "Navy Blue",
      "Forest Green",
      "Crimson Red",
      "Charcoal Gray",
      "Pearl White",
    ] as const),
  } satisfies IShoppingMallSkuColor.ICreate;

  const color = await api.functional.shoppingMall.admin.skuColors.create(
    connection,
    {
      body: colorData,
    },
  );
  typia.assert(color);

  // Step 5: Create size attribute for variant configuration
  const sizeData = {
    value: RandomGenerator.pick(["XS", "S", "M", "L", "XL", "XXL"] as const),
  } satisfies IShoppingMallSkuSize.ICreate;

  const size = await api.functional.shoppingMall.admin.skuSizes.create(
    connection,
    {
      body: sizeData,
    },
  );
  typia.assert(size);

  // Step 6: Create SKU variant with proper pricing and code
  const skuData = {
    sku_code: `SKU-${RandomGenerator.alphaNumeric(8).toUpperCase()}`,
    price: typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<100> & tags.Maximum<100000>
    >(),
  } satisfies IShoppingMallSku.ICreate;

  const sku = await api.functional.shoppingMall.seller.products.skus.create(
    connection,
    {
      productId: product.id,
      body: skuData,
    },
  );
  typia.assert(sku);

  // Step 7: Validate SKU creation with proper attributes
  TestValidator.equals(
    "SKU code matches input",
    sku.sku_code,
    skuData.sku_code,
  );
  TestValidator.equals("SKU price matches input", sku.price, skuData.price);
}
