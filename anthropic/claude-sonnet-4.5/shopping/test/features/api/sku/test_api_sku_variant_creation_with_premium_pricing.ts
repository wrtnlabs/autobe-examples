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
 * Test creating a SKU variant with pricing different from the base product
 * price.
 *
 * This test validates that sellers can charge different amounts for different
 * variants, enabling flexible pricing strategies such as premium pricing for
 * larger sizes or special colors. The test ensures that SKU prices are stored
 * independently and not constrained to match the base product price.
 *
 * Test workflow:
 *
 * 1. Create a seller account for product and pricing management
 * 2. Create an admin-defined category for product organization
 * 3. Create a parent product with a base price
 * 4. Define a size attribute that will have premium pricing
 * 5. Create a SKU variant with a price higher than the base product price
 * 6. Validate that the SKU price is stored independently from the base price
 * 7. Confirm flexible pricing strategies are supported
 */
export async function test_api_sku_variant_creation_with_premium_pricing(
  connection: api.IConnection,
) {
  // Step 1: Create seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: typia.random<string & tags.MinLength<8>>(),
        business_name: RandomGenerator.name(),
        business_type: RandomGenerator.pick([
          "individual",
          "llc",
          "corporation",
        ] as const),
        contact_person_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        business_address: RandomGenerator.paragraph({ sentences: 3 }),
        tax_id: RandomGenerator.alphaNumeric(10),
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // Step 2: Create category for product organization
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        name: RandomGenerator.name(),
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(category);

  // Step 3: Create product with base price
  const basePrice = 100.0;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        base_price: basePrice,
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(product);

  // Step 4: Define size attribute for premium pricing
  const skuSize: IShoppingMallSkuSize =
    await api.functional.shoppingMall.admin.skuSizes.create(connection, {
      body: {
        value: RandomGenerator.pick([
          "Small",
          "Medium",
          "Large",
          "XL",
        ] as const),
      } satisfies IShoppingMallSkuSize.ICreate,
    });
  typia.assert(skuSize);

  // Step 5: Create SKU variant with premium price (higher than base price)
  const premiumPrice = 150.0;
  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id,
      body: {
        sku_code: RandomGenerator.alphaNumeric(12),
        price: premiumPrice,
      } satisfies IShoppingMallSku.ICreate,
    });
  typia.assert(sku);

  // Step 6: Validate that SKU price is stored independently
  TestValidator.predicate(
    "SKU price should be different from base product price",
    sku.price !== basePrice,
  );

  TestValidator.equals(
    "SKU price should match the premium price",
    sku.price,
    premiumPrice,
  );

  // Step 7: Confirm SKU price is higher than base price (premium pricing strategy)
  TestValidator.predicate(
    "SKU premium price should be higher than base product price",
    sku.price > basePrice,
  );
}
