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
 * Validate low-stock statistics behavior when seller has no low-stock data.
 *
 * Business purpose:
 *
 * - Ensure that the seller-facing low-stock statistics endpoint always returns a
 *   well-formed IShoppingMallInventoryLowStockStatistics object, even when
 *   there are no low-stock SKUs or no inventory at all for the seller.
 * - Confirm that clients can rely on `generated_at` and an `items` array that may
 *   legitimately be empty, without special-casing nulls or error responses.
 *
 * Steps:
 *
 * 1. Register a new seller via /auth/seller/join to establish an authenticated
 *    seller context.
 * 2. Immediately call GET /shoppingMall/seller/inventory/statistics/lowStock to
 *    validate behavior when the seller has no inventory at all.
 * 3. Create a single product, SKU, and inventory item whose available quantity is
 *    clearly above its low-stock threshold (so it is _not_ low stock).
 * 4. Call the low-stock statistics endpoint again to verify that the presence of
 *    high-stock inventory still results in an empty `items` array.
 */
export async function test_api_seller_low_stock_statistics_no_data_returns_empty_items(
  connection: api.IConnection,
) {
  // 1. Register a new seller to establish authenticated seller context.
  const joinRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    storeName: RandomGenerator.name(),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: joinRequest,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(seller);

  // 2. Option A: seller has no inventory at all.
  const statsWithoutInventory: IShoppingMallInventoryLowStockStatistics =
    await api.functional.shoppingMall.seller.inventory.statistics.lowStock.index(
      connection,
    );
  typia.assert<IShoppingMallInventoryLowStockStatistics>(statsWithoutInventory);

  TestValidator.equals(
    "low stock statistics without inventory should have empty items",
    statsWithoutInventory.items.length,
    0,
  );

  // 3. Option B preparation: create product, SKU, and non-low-stock inventory.
  // 3-1. Create a product owned by this seller.
  const productCode: string & tags.MinLength<1> = RandomGenerator.alphaNumeric(
    12,
  ) as string & tags.MinLength<1>;

  const productCreateBody = {
    shopping_mall_seller_id: seller.id,
    shopping_mall_brand_id: undefined,
    code: productCode,
    name: RandomGenerator.name(),
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: true,
    primary_image_uri: undefined,
    additional_data: undefined,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert<IShoppingMallProduct>(product);

  // 3-2. Create a SKU under the created product.
  const skuCreateBody = {
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
    listPrice: 10000,
    salePrice: 9000,
    currency: "KRW",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode: product.code,
      body: skuCreateBody,
    });
  typia.assert<IShoppingMallProductSku>(sku);

  // 3-3. Create an inventory item for this SKU that is deliberately not low stock.
  const onHand: number & tags.Type<"int32"> & tags.Minimum<0> = 100 as number &
    tags.Type<"int32"> &
    tags.Minimum<0>;
  const threshold: number & tags.Type<"int32"> & tags.Minimum<0> =
    10 as number & tags.Type<"int32"> & tags.Minimum<0>;

  const inventoryCreateBody = {
    product_sku_id: sku.id,
    on_hand_quantity: onHand,
    low_stock_threshold: threshold,
    backorder_enabled: false,
    preorder_enabled: false,
  } satisfies IShoppingMallInventoryItem.ICreate;

  const inventoryItem: IShoppingMallInventoryItem =
    await api.functional.shoppingMall.seller.inventoryItems.create(connection, {
      body: inventoryCreateBody,
    });
  typia.assert<IShoppingMallInventoryItem>(inventoryItem);

  // 4. Call low-stock statistics again when there is inventory but none is low-stock.
  const statsWithHighStockOnly: IShoppingMallInventoryLowStockStatistics =
    await api.functional.shoppingMall.seller.inventory.statistics.lowStock.index(
      connection,
    );
  typia.assert<IShoppingMallInventoryLowStockStatistics>(
    statsWithHighStockOnly,
  );

  TestValidator.equals(
    "low stock statistics with only high-stock inventory should have empty items",
    statsWithHighStockOnly.items.length,
    0,
  );
}
