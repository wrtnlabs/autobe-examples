import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorPasswordReset";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_administrator_categories_create } from "../../../generate/generate_random_shopping_mall_administrator_categories_create";
import { generate_random_shopping_mall_seller_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_seller_products_create";
import { generate_random_shopping_mall_seller_variants_inventory_adjust } from "../../../generate/generate_random_shopping_mall_seller_variants_inventory_adjust";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

/**
 * Test stock availability filtering and product visibility rules.
 *
 * This test validates the inStockOnly filter behavior:
 * 1. Products with at least one variant having stock > 0 are included when inStockOnly=true
 * 2. Products where all variants are out of stock are excluded when inStockOnly=true
 * 3. All products are visible without the inStockOnly filter
 */
export async function test_api_product_search_stock_availability_filter(
  connection: api.IConnection,
): Promise<void> {
  // ===========================================
  // Setup: Create Administrator and Seller
  // ===========================================
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {});
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // ===========================================
  // Setup: Create Category
  // ===========================================
  const category =
    await generate_random_shopping_mall_administrator_categories_create(
      adminConnection,
      {
        body: {
          name: `Stock Test Category ${Date.now()}`,
          description: "Category for stock availability filtering test",
        },
      },
    );
  typia.assert(category);
  // ===========================================
  // Setup: Create Products with Different Stock Scenarios
  // ===========================================
  // Product A: In-stock product (will add positive inventory)
  const inStockProduct =
    await generate_random_shopping_mall_seller_seller_products_create(
      sellerConnection,
      {
        body: {
          name: `In-Stock Product ${Date.now()}`,
          description: "Product with in-stock variant for testing",
          categoryId: category.id,
          basePrice: typia.random<
            number & tags.Minimum<1000> & tags.Maximum<100000>
          >(),
        },
      },
    );
  typia.assert(inStockProduct);
  // Add positive inventory to first variant
  const inStockVariant = inStockProduct.variants[0];
  if (inStockVariant !== undefined) {
    await generate_random_shopping_mall_seller_variants_inventory_adjust(
      sellerConnection,
      {
        params: { variantId: inStockVariant.id },
        body: {
          quantity_change: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<10> & tags.Maximum<100>
          >(),
          reason: "Initial stock for in-stock test product",
        },
      },
    );
  }
  // Product B: Out-of-stock product (will add zero inventory)
  const outOfStockProduct =
    await generate_random_shopping_mall_seller_seller_products_create(
      sellerConnection,
      {
        body: {
          name: `Out-of-Stock Product ${Date.now()}`,
          description: "Product with out-of-stock variant for testing",
          categoryId: category.id,
          basePrice: typia.random<
            number & tags.Minimum<1000> & tags.Maximum<100000>
          >(),
        },
      },
    );
  typia.assert(outOfStockProduct);
  // Ensure zero stock for first variant
  const outOfStockVariant = outOfStockProduct.variants[0];
  if (outOfStockVariant !== undefined) {
    await generate_random_shopping_mall_seller_variants_inventory_adjust(
      sellerConnection,
      {
        params: { variantId: outOfStockVariant.id },
        body: {
          quantity_change: 0,
          reason: "Zero stock for out-of-stock test product",
        },
      },
    );
  }
  // ===========================================
  // Test 1: Search with inStockOnly=true
  // ===========================================
  const inStockResults = await api.functional.shoppingMall.products.index(
    connection,
    {
      body: {
        categoryId: category.id,
        inStockOnly: true,
      },
    },
  );
  typia.assert(inStockResults);
  // Validate: In-stock products should be included
  TestValidator.predicate(
    "in-stock filter includes products with positive inventory",
    inStockResults.data.some((p) => p.id === inStockProduct.id),
  );
  // Validate: Out-of-stock products should be excluded
  TestValidator.predicate(
    "in-stock filter excludes products with zero inventory",
    !inStockResults.data.some((p) => p.id === outOfStockProduct.id),
  );
  // ===========================================
  // Test 2: Search without inStockOnly filter (default)
  // ===========================================
  const allProductsResults = await api.functional.shoppingMall.products.index(
    connection,
    {
      body: {
        categoryId: category.id,
      },
    },
  );
  typia.assert(allProductsResults);
  // Validate: All products visible without filter
  TestValidator.predicate(
    "without filter, in-stock product is visible",
    allProductsResults.data.some((p) => p.id === inStockProduct.id),
  );
  TestValidator.predicate(
    "without filter, out-of-stock product is visible",
    allProductsResults.data.some((p) => p.id === outOfStockProduct.id),
  );
  // ===========================================
  // Test 3: Verify filtered results <= unfiltered results
  // ===========================================
  TestValidator.predicate(
    "filtered results have fewer or equal products than unfiltered",
    inStockResults.data.length <= allProductsResults.data.length,
  );
  // ===========================================
  // Test 4: Business rule validation
  // Products without any active variants with stock > 0
  // are excluded when inStockOnly filter is applied
  // ===========================================
  const outOfStockIds = new Set(inStockResults.data.map((p) => p.id));
  TestValidator.predicate(
    "out-of-stock product not in filtered results",
    !outOfStockIds.has(outOfStockProduct.id),
  );
}
