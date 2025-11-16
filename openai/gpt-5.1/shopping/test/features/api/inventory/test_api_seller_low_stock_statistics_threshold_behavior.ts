import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallInventoryItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryItem";
import type { IShoppingMallInventoryLowStockStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryLowStockStatistics";
import type { IShoppingMallInventoryLowStockStatisticsItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryLowStockStatisticsItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";

/**
 * Validate seller low-stock inventory statistics threshold behavior.
 *
 * This E2E test verifies that the seller-facing low-stock statistics endpoint
 * correctly classifies SKUs as low stock when their effective available
 * quantity is less than or equal to the configured low_stock_threshold, and
 * excludes SKUs whose available quantity is above that threshold.
 *
 * Business workflow under test:
 *
 * 1. Register a seller account via /auth/seller/join to obtain an authenticated
 *    seller context (token handled automatically by SDK).
 * 2. Create a product owned by this seller via /shoppingMall/seller/products.
 * 3. Under that product, create two SKUs via
 *    /shoppingMall/seller/products/{productCode}/skus:
 *
 *    - SkuLow: to be configured as low stock (available_quantity == threshold).
 *    - SkuOk: to remain above the low-stock threshold.
 * 4. For each SKU, create a corresponding inventory item via
 *    /shoppingMall/seller/inventoryItems:
 *
 *    - SkuLow inventory: on_hand_quantity = 5, low_stock_threshold = 5.
 *    - SkuOk inventory: on_hand_quantity = 20, low_stock_threshold = 5.
 *         reserved_quantity is implicitly 0 at creation, so available_quantity
 *         equals on_hand_quantity.
 * 5. Call GET /shoppingMall/seller/inventory/statistics/lowStock.
 * 6. Assert that:
 *
 *    - The statistics response contains an item for skuLow that is marked
 *         is_low_stock === true, with low_stock_threshold equal to 5 and
 *         available_quantity <= low_stock_threshold.
 *    - No statistics item exists for skuOk that is flagged as low stock for this
 *         seller (i.e., either it is absent or, if present, is_low_stock is
 *         false). To keep the test strict and simple, we require that no
 *         low-stock entry exists for skuOk.
 *    - All returned statistic items belong to the authenticated seller (their
 *         seller_id matches the seller.id from join).
 */
export async function test_api_seller_low_stock_statistics_threshold_behavior(
  connection: api.IConnection,
) {
  // 1. Register a seller and obtain authenticated context.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    storeName: RandomGenerator.paragraph({ sentences: 2 }),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAuthorized);

  const sellerId = sellerAuthorized.id;

  // 2. Create a product for this seller.
  const productCode = `prod-${RandomGenerator.alphaNumeric(8)}`;

  const productCreateBody = {
    shopping_mall_seller_id: sellerId,
    shopping_mall_brand_id: undefined,
    code: productCode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: undefined,
    additional_data: undefined,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert<IShoppingMallProduct>(product);

  // 3. Create two SKUs under this product: skuLow and skuOk.
  const skuLowBody = {
    code: "sku-low",
    name: RandomGenerator.paragraph({ sentences: 2 }),
    listPrice: 100,
    salePrice: 80,
    currency: "USD",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const skuLow: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode: product.code,
      body: skuLowBody,
    });
  typia.assert<IShoppingMallProductSku>(skuLow);

  const skuOkBody = {
    code: "sku-ok",
    name: RandomGenerator.paragraph({ sentences: 2 }),
    listPrice: 100,
    salePrice: 90,
    currency: "USD",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const skuOk: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode: product.code,
      body: skuOkBody,
    });
  typia.assert<IShoppingMallProductSku>(skuOk);

  // 4. Create inventory items for each SKU with different thresholds.
  const threshold = 5;

  const inventoryLowBody = {
    product_sku_id: skuLow.id,
    on_hand_quantity: 5,
    low_stock_threshold: threshold,
    backorder_enabled: false,
    preorder_enabled: false,
  } satisfies IShoppingMallInventoryItem.ICreate;

  const inventoryLow: IShoppingMallInventoryItem =
    await api.functional.shoppingMall.seller.inventoryItems.create(connection, {
      body: inventoryLowBody,
    });
  typia.assert<IShoppingMallInventoryItem>(inventoryLow);

  const inventoryOkBody = {
    product_sku_id: skuOk.id,
    on_hand_quantity: 20,
    low_stock_threshold: threshold,
    backorder_enabled: false,
    preorder_enabled: false,
  } satisfies IShoppingMallInventoryItem.ICreate;

  const inventoryOk: IShoppingMallInventoryItem =
    await api.functional.shoppingMall.seller.inventoryItems.create(connection, {
      body: inventoryOkBody,
    });
  typia.assert<IShoppingMallInventoryItem>(inventoryOk);

  // 5. Fetch low-stock statistics for the authenticated seller.
  const stats: IShoppingMallInventoryLowStockStatistics =
    await api.functional.shoppingMall.seller.inventory.statistics.lowStock.index(
      connection,
    );
  typia.assert<IShoppingMallInventoryLowStockStatistics>(stats);

  // 6. Basic invariants: generated_at is a valid date-time string and items is an array.
  TestValidator.predicate(
    "generated_at should be a non-empty ISO date-time string",
    stats.generated_at.length > 0,
  );

  // 7. Find statistics entries for skuLow and skuOk.
  const lowEntries: IShoppingMallInventoryLowStockStatisticsItem[] =
    stats.items.filter(
      (item) => item.sku_id === skuLow.id || item.sku_code === skuLow.code,
    );

  const okEntries: IShoppingMallInventoryLowStockStatisticsItem[] =
    stats.items.filter(
      (item) => item.sku_id === skuOk.id || item.sku_code === skuOk.code,
    );

  // Assert that at least one low-stock entry exists for skuLow.
  TestValidator.predicate(
    "statistics must contain at least one entry for skuLow",
    lowEntries.length > 0,
  );

  // For each skuLow entry, verify low-stock classification and threshold behavior.
  for (const entry of lowEntries) {
    typia.assert<IShoppingMallInventoryLowStockStatisticsItem>(entry);

    TestValidator.equals(
      "skuLow statistics entry has is_low_stock === true",
      entry.is_low_stock,
      true,
    );

    TestValidator.equals(
      "skuLow statistics entry low_stock_threshold should equal configured threshold",
      entry.low_stock_threshold,
      inventoryLow.low_stock_threshold ?? threshold,
    );

    TestValidator.predicate(
      "skuLow available_quantity should be less than or equal to low_stock_threshold",
      entry.available_quantity <= entry.low_stock_threshold,
    );

    TestValidator.equals(
      "skuLow statistics seller_id should match authenticated seller id",
      entry.seller_id,
      sellerId,
    );
  }

  // Assert that there is no low-stock entry for skuOk.
  const okLowEntries = okEntries.filter((item) => item.is_low_stock === true);

  TestValidator.equals(
    "no low-stock statistics entries should exist for skuOk",
    okLowEntries.length,
    0,
  );

  // Additionally, all statistics entries should belong to the authenticated seller.
  for (const item of stats.items) {
    TestValidator.equals(
      "all statistics items should belong to the authenticated seller",
      item.seller_id,
      sellerId,
    );
  }
}
