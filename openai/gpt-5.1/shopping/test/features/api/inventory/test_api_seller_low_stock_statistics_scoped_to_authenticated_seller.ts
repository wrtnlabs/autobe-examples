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

export async function test_api_seller_low_stock_statistics_scoped_to_authenticated_seller(
  connection: api.IConnection,
) {
  // 1. Register seller A and keep its authorized session info
  const sellerAJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    storeName: RandomGenerator.name(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerA: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerAJoinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerA);

  // 2. Create a product for seller A
  const productACode: string = RandomGenerator.alphaNumeric(12);
  const productABody = {
    shopping_mall_seller_id: sellerA.id,
    shopping_mall_brand_id: undefined,
    code: productACode,
    name: RandomGenerator.name(),
    short_description: undefined,
    description: undefined,
    status: "active",
    is_multi_sku: true,
    primary_image_uri: undefined,
    additional_data: undefined,
  } satisfies IShoppingMallProduct.ICreate;

  const productA: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productABody,
    });
  typia.assert<IShoppingMallProduct>(productA);

  // 3. Create a low-stock SKU for seller A's product
  const skuABody = {
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
    listPrice: 100,
    salePrice: 80,
    currency: "USD",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const skuA: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode: productA.code,
      body: skuABody,
    });
  typia.assert<IShoppingMallProductSku>(skuA);

  // 4. Create a low-stock inventory item for seller A's SKU
  const inventoryALowStockBody = {
    product_sku_id: skuA.id,
    on_hand_quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 3 as number & tags.Type<"int32"> & tags.Minimum<0>,
    backorder_enabled: false,
    preorder_enabled: false,
  } satisfies IShoppingMallInventoryItem.ICreate;

  const inventoryALow: IShoppingMallInventoryItem =
    await api.functional.shoppingMall.seller.inventoryItems.create(connection, {
      body: inventoryALowStockBody,
    });
  typia.assert<IShoppingMallInventoryItem>(inventoryALow);

  // 5. Fetch low-stock statistics as seller A and validate
  const statsForA: IShoppingMallInventoryLowStockStatistics =
    await api.functional.shoppingMall.seller.inventory.statistics.lowStock.index(
      connection,
    );
  typia.assert<IShoppingMallInventoryLowStockStatistics>(statsForA);

  // Filter items belonging to seller A
  const sellerAItems: IShoppingMallInventoryLowStockStatisticsItem[] =
    statsForA.items.filter((item) => item.seller_id === sellerA.id);

  TestValidator.predicate(
    "low stock statistics should contain at least one item for seller A",
    sellerAItems.length > 0,
  );

  for (const item of sellerAItems) {
    TestValidator.predicate(
      "seller A items must be flagged as low stock",
      item.is_low_stock === true,
    );

    TestValidator.predicate(
      "available_quantity must be less than or equal to low_stock_threshold for seller A",
      item.available_quantity <= item.low_stock_threshold,
    );
  }

  // 6. Register seller B (this will switch connection context to seller B)
  const sellerBJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    storeName: RandomGenerator.name(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerB: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerBJoinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerB);

  // 7. Create a product for seller B
  const productBCode: string = RandomGenerator.alphaNumeric(12);
  const productBBody = {
    shopping_mall_seller_id: sellerB.id,
    shopping_mall_brand_id: undefined,
    code: productBCode,
    name: RandomGenerator.name(),
    short_description: undefined,
    description: undefined,
    status: "active",
    is_multi_sku: true,
    primary_image_uri: undefined,
    additional_data: undefined,
  } satisfies IShoppingMallProduct.ICreate;

  const productB: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBBody,
    });
  typia.assert<IShoppingMallProduct>(productB);

  // 8. Create a non-low-stock SKU for seller B's product
  const skuBBody = {
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
    listPrice: 200,
    salePrice: 150,
    currency: "USD",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const skuB: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode: productB.code,
      body: skuBBody,
    });
  typia.assert<IShoppingMallProductSku>(skuB);

  // 9. Create a non-low-stock inventory item for seller B's SKU
  const inventoryBBody = {
    product_sku_id: skuB.id,
    on_hand_quantity: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 2 as number & tags.Type<"int32"> & tags.Minimum<0>,
    backorder_enabled: false,
    preorder_enabled: false,
  } satisfies IShoppingMallInventoryItem.ICreate;

  const inventoryB: IShoppingMallInventoryItem =
    await api.functional.shoppingMall.seller.inventoryItems.create(connection, {
      body: inventoryBBody,
    });
  typia.assert<IShoppingMallInventoryItem>(inventoryB);

  // 10. Fetch low-stock statistics as seller B and validate scoping
  const statsForB: IShoppingMallInventoryLowStockStatistics =
    await api.functional.shoppingMall.seller.inventory.statistics.lowStock.index(
      connection,
    );
  typia.assert<IShoppingMallInventoryLowStockStatistics>(statsForB);

  const sellerBItems: IShoppingMallInventoryLowStockStatisticsItem[] =
    statsForB.items.filter((item) => item.seller_id === sellerB.id);

  // Ensure we do not see seller A's items in seller B's statistics
  const anySellerAItemVisibleForB = statsForB.items.some(
    (item) => item.seller_id === sellerA.id,
  );

  TestValidator.predicate(
    "seller B statistics must not include seller A items",
    anySellerAItemVisibleForB === false,
  );

  // If any items are present for seller B, validate consistency of low-stock flag
  for (const item of sellerBItems) {
    TestValidator.predicate(
      "low-stock flag for seller B items must match available_quantity <= low_stock_threshold",
      item.is_low_stock === item.available_quantity <= item.low_stock_threshold,
    );
  }
}
