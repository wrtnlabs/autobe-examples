import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductVariant";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductInventoryHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductInventoryHistory";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_sellers_me_variants_inventory_add_add_inventory } from "../../../generate/generate_random_shopping_mall_seller_sellers_me_variants_inventory_add_add_inventory";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_inventory_history } from "../../../prepare/prepare_random_shopping_mall_product_inventory_history";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option } from "../../../prepare/prepare_random_shopping_mall_product_variant_option";

/**
 * Test filtering product variants by stock availability status.
 *
 * This test validates the inStock filter functionality on the product variants endpoint.
 * It verifies that:
 * - Filtering with inStock: true returns only variants with stock > 0
 * - Filtering with inStock: false/omitted returns all variants
 * - Combined filtering with options works correctly
 *
 * Setup:
 * 1. Create and authenticate admin
 * 2. Create seller account and get approved
 * 3. Create product with two variants
 * 4. Add inventory to only the first variant
 *
 * Test scenarios:
 * - Filter by inStock: true
 * - Filter by inStock: false
 * - Combined filter with options
 */
export async function test_api_product_variant_filter_by_stock_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {});
  typia.assert(adminAuth);
  // 2. Create seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      shop_name: RandomGenerator.name(),
    },
  });
  typia.assert(sellerAuth);
  // 3. Admin approves seller
  const approvedSeller =
    await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
      sellerId: sellerAuth.id,
    });
  typia.assert(approvedSeller);
  // 4. Seller creates a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 5. Create first variant (will be in-stock)
  const inStockVariant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: `SKU-IN-${RandomGenerator.alphaNumeric(8)}`,
          optionValues: [
            { key: "color", value: "Red" },
            { key: "size", value: "Large" },
          ],
          price: 10000,
          stockQuantity: 0, // Will add inventory separately
        },
      },
    );
  typia.assert(inStockVariant);
  // 6. Create second variant (will remain out-of-stock)
  const outOfStockVariant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: `SKU-OUT-${RandomGenerator.alphaNumeric(8)}`,
          optionValues: [
            { key: "color", value: "Blue" },
            { key: "size", value: "Small" },
          ],
          price: 8000,
          stockQuantity: 0,
        },
      },
    );
  typia.assert(outOfStockVariant);
  // 7. Add inventory to first variant only
  const inventoryRecord =
    await generate_random_shopping_mall_seller_sellers_me_variants_inventory_add_add_inventory(
      sellerConnection,
      {
        params: { variantId: inStockVariant.id },
        body: {
          quantity: 50,
          reason: "Initial restock for testing",
        },
      },
    );
  typia.assert(inventoryRecord);
  // ========== TEST 1: Filter with inStock: true ==========
  const inStockResponse =
    await api.functional.shoppingMall.seller.products.variants.index(
      sellerConnection,
      {
        productId: product.id,
        body: { inStock: true } satisfies IShoppingMallProductVariant.IRequest,
      },
    );
  typia.assert(inStockResponse);
  // Verify only in-stock variant is returned
  TestValidator.equals(
    "inStock filter returns only variants with stock",
    1,
    inStockResponse.data.length,
  );
  TestValidator.equals(
    "returned variant matches in-stock variant",
    inStockVariant.id,
    inStockResponse.data[0].id,
  );
  TestValidator.predicate(
    "returned variant has in_stock = true",
    inStockResponse.data[0].in_stock === true,
  );
  TestValidator.predicate(
    "returned variant has stock_quantity > 0",
    inStockResponse.data[0].stock_quantity > 0,
  );
  // ========== TEST 2: Filter with inStock: false (returns all) ==========
  const allVariantsResponse =
    await api.functional.shoppingMall.seller.products.variants.index(
      sellerConnection,
      {
        productId: product.id,
        body: { inStock: false } satisfies IShoppingMallProductVariant.IRequest,
      },
    );
  typia.assert(allVariantsResponse);
  // Verify all variants are returned
  TestValidator.equals(
    "inStock: false returns all variants",
    2,
    allVariantsResponse.data.length,
  );
  // Find each variant and verify stock status
  const foundInStock = allVariantsResponse.data.find(
    (v) => v.id === inStockVariant.id,
  );
  const foundOutOfStock = allVariantsResponse.data.find(
    (v) => v.id === outOfStockVariant.id,
  );
  TestValidator.predicate("in-stock variant found", foundInStock !== undefined);
  TestValidator.predicate(
    "out-of-stock variant found",
    foundOutOfStock !== undefined,
  );
  if (foundInStock) {
    TestValidator.equals(
      "in-stock variant has in_stock = true",
      true,
      foundInStock.in_stock,
    );
    TestValidator.predicate(
      "in-stock variant has stock_quantity > 0",
      foundInStock.stock_quantity > 0,
    );
  }
  if (foundOutOfStock) {
    TestValidator.equals(
      "out-of-stock variant has in_stock = false",
      false,
      foundOutOfStock.in_stock,
    );
    TestValidator.equals(
      "out-of-stock variant has stock_quantity = 0",
      0,
      foundOutOfStock.stock_quantity,
    );
  }
  // ========== TEST 3: No inStock filter (returns all) ==========
  const noFilterResponse =
    await api.functional.shoppingMall.seller.products.variants.index(
      sellerConnection,
      {
        productId: product.id,
        body: {} satisfies IShoppingMallProductVariant.IRequest,
      },
    );
  typia.assert(noFilterResponse);
  // Verify all variants are returned when no filter
  TestValidator.equals(
    "no filter returns all variants",
    2,
    noFilterResponse.data.length,
  );
  // ========== TEST 4: Combined filter (inStock + options) ==========
  const combinedFilterResponse =
    await api.functional.shoppingMall.seller.products.variants.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          inStock: true,
          options: { color: "Red" },
        } satisfies IShoppingMallProductVariant.IRequest,
      },
    );
  typia.assert(combinedFilterResponse);
  // Verify only the Red in-stock variant is returned
  TestValidator.equals(
    "combined filter returns matching variant",
    1,
    combinedFilterResponse.data.length,
  );
  TestValidator.equals(
    "returned variant is the in-stock Red variant",
    inStockVariant.id,
    combinedFilterResponse.data[0].id,
  );
  // Verify the returned variant has Red color option
  const redOption = combinedFilterResponse.data[0].options.find(
    (opt) => opt.key === "color",
  );
  TestValidator.predicate("variant has color option", redOption !== undefined);
  if (redOption) {
    TestValidator.equals("color option is Red", "Red", redOption.value);
  }
  // ========== TEST 5: Combined filter with non-matching options ==========
  const nonMatchingResponse =
    await api.functional.shoppingMall.seller.products.variants.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          inStock: true,
          options: { color: "Blue" },
        } satisfies IShoppingMallProductVariant.IRequest,
      },
    );
  typia.assert(nonMatchingResponse);
  // Blue variant is out of stock, so should return empty
  TestValidator.equals(
    "Blue in-stock filter returns empty",
    0,
    nonMatchingResponse.data.length,
  );
}
