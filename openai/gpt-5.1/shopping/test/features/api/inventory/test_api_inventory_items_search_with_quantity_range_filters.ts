import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallInventoryItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallInventoryItem";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallInventoryItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";

export async function test_api_inventory_items_search_with_quantity_range_filters(
  connection: api.IConnection,
) {
  // 1. Seller joins to obtain an authorized seller session.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    storeName: RandomGenerator.name(),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: joinBody,
    });
  typia.assert(sellerAuthorized);

  // 2. Create a product owned by this seller.
  const productCode: string = RandomGenerator.alphaNumeric(12);

  const productBody = {
    shopping_mall_seller_id: sellerAuthorized.id,
    shopping_mall_brand_id: null,
    code: productCode as string & tags.MinLength<1>,
    name: RandomGenerator.name(3) as string & tags.MinLength<1>,
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: true,
    primary_image_uri: null,
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert(product);

  // 3. Create two SKUs under the product.
  const lowStockSkuBody = {
    code: `${product.code}-LOW`,
    name: `${product.name}-LowStock`,
    listPrice: 10000,
    salePrice: 9000,
    currency: "KRW",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const highStockSkuBody = {
    code: `${product.code}-HIGH`,
    name: `${product.name}-HighStock`,
    listPrice: 15000,
    salePrice: 14000,
    currency: "KRW",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const lowStockSku: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode: product.code,
      body: lowStockSkuBody,
    });
  typia.assert(lowStockSku);

  const highStockSku: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode: product.code,
      body: highStockSkuBody,
    });
  typia.assert(highStockSku);

  // 4. Create inventory items with distinct on_hand_quantity values.
  const lowInventoryBody = {
    product_sku_id: lowStockSku.id,
    on_hand_quantity: 5 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 2 as number & tags.Type<"int32"> & tags.Minimum<0>,
    backorder_enabled: false,
    preorder_enabled: false,
  } satisfies IShoppingMallInventoryItem.ICreate;

  const highInventoryBody = {
    product_sku_id: highStockSku.id,
    on_hand_quantity: 20 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 3 as number & tags.Type<"int32"> & tags.Minimum<0>,
    backorder_enabled: false,
    preorder_enabled: false,
  } satisfies IShoppingMallInventoryItem.ICreate;

  const lowInventory: IShoppingMallInventoryItem =
    await api.functional.shoppingMall.seller.inventoryItems.create(connection, {
      body: lowInventoryBody,
    });
  typia.assert(lowInventory);

  const highInventory: IShoppingMallInventoryItem =
    await api.functional.shoppingMall.seller.inventoryItems.create(connection, {
      body: highInventoryBody,
    });
  typia.assert(highInventory);

  // 5. Call PATCH /shoppingMall/inventoryItems with a narrow on_hand range
  // that should include only the lowInventory item.
  const minOnHandLowRange = 1 as number & tags.Type<"int32">;
  const maxOnHandLowRange = 10 as number & tags.Type<"int32">;

  const searchLowRangeBody = {
    page: 0 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
    product_sku_id: null,
    stock_status: null,
    min_on_hand_quantity: minOnHandLowRange,
    max_on_hand_quantity: maxOnHandLowRange,
    min_reserved_quantity: 0 as number & tags.Type<"int32">,
    max_reserved_quantity: 0 as number & tags.Type<"int32">,
    order_by: "on_hand_quantity",
    order_direction: "asc",
  } satisfies IShoppingMallInventoryItem.IRequest;

  const lowRangePage = await api.functional.shoppingMall.inventoryItems.index(
    connection,
    {
      body: searchLowRangeBody,
    },
  );
  typia.assert(lowRangePage);

  const lowRangePagination = lowRangePage.pagination;
  const lowRangeData = lowRangePage.data;

  // We expect exactly one matching record (the lowInventory item).
  TestValidator.equals(
    "low range pagination.records matches expected count",
    lowRangePagination.records,
    1,
  );
  TestValidator.equals(
    "low range data length matches pagination.records",
    lowRangeData.length,
    lowRangePagination.records,
  );

  // Verify each item is within the on_hand and reserved quantity ranges.
  for (const item of lowRangeData) {
    TestValidator.predicate(
      "item.on_hand_quantity within low range",
      item.on_hand_quantity >= minOnHandLowRange &&
        item.on_hand_quantity <= maxOnHandLowRange,
    );
    TestValidator.predicate(
      "item.reserved_quantity equals 0 in low range",
      item.reserved_quantity >= 0 && item.reserved_quantity <= 0,
    );
  }

  // Verify ascending sort order by on_hand_quantity.
  for (let i = 1; i < lowRangeData.length; i++) {
    TestValidator.predicate(
      "low range sorted ascending by on_hand_quantity",
      lowRangeData[i - 1].on_hand_quantity <= lowRangeData[i].on_hand_quantity,
    );
  }

  // 6. Call PATCH /shoppingMall/inventoryItems with a broader range that
  // matches both inventory records and request descending order.
  const minOnHandBroadRange = 0 as number & tags.Type<"int32">;
  const maxOnHandBroadRange = 100 as number & tags.Type<"int32">;

  const searchBroadRangeBody = {
    page: 0 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
    product_sku_id: null,
    stock_status: null,
    min_on_hand_quantity: minOnHandBroadRange,
    max_on_hand_quantity: maxOnHandBroadRange,
    min_reserved_quantity: 0 as number & tags.Type<"int32">,
    max_reserved_quantity: 0 as number & tags.Type<"int32">,
    order_by: "on_hand_quantity",
    order_direction: "desc",
  } satisfies IShoppingMallInventoryItem.IRequest;

  const broadRangePage = await api.functional.shoppingMall.inventoryItems.index(
    connection,
    {
      body: searchBroadRangeBody,
    },
  );
  typia.assert(broadRangePage);

  const broadPagination = broadRangePage.pagination;
  const broadData = broadRangePage.data;

  // In the broad range we expect at least the two created items, but there may
  // be other inventory items in the database. Instead of asserting an exact
  // count, we validate that all returned items satisfy the filter and sort
  // conditions.

  TestValidator.predicate(
    "broad range data length equals pagination.records",
    broadData.length === broadPagination.records,
  );

  for (const item of broadData) {
    TestValidator.predicate(
      "item.on_hand_quantity within broad range",
      item.on_hand_quantity >= minOnHandBroadRange &&
        item.on_hand_quantity <= maxOnHandBroadRange,
    );
    TestValidator.predicate(
      "item.reserved_quantity equals 0 in broad range",
      item.reserved_quantity >= 0 && item.reserved_quantity <= 0,
    );
  }

  for (let i = 1; i < broadData.length; i++) {
    TestValidator.predicate(
      "broad range sorted descending by on_hand_quantity",
      broadData[i - 1].on_hand_quantity >= broadData[i].on_hand_quantity,
    );
  }
}
