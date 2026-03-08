import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductSnapshotSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSnapshotSku";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallProductSnapshotSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotSku";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_product_snapshot_sku_filtering_capabilities(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {});
  // Generate random IDs for testing (since no creation API available)
  const productId = typia.random<string & tags.Format<"uuid">>();
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  // 2. Test basic request without filters
  const basicResult =
    await api.functional.shoppingMall.administrator.products.snapshots.skus.index(
      adminConnection,
      {
        productId,
        snapshotId,
        body: {} satisfies IShoppingMallProductSnapshotSku.IRequest,
      },
    );
  typia.assert(basicResult);
  // 3. Test SKU code partial matching filter
  const skuCodeFilter = "SKU";
  const skuFilterResult =
    await api.functional.shoppingMall.administrator.products.snapshots.skus.index(
      adminConnection,
      {
        productId,
        snapshotId,
        body: {
          sku_code: skuCodeFilter,
        } satisfies IShoppingMallProductSnapshotSku.IRequest,
      },
    );
  typia.assert(skuFilterResult);
  // If results exist, verify SKU code contains filter (case-insensitive)
  if (skuFilterResult.data.length > 0) {
    TestValidator.predicate(
      "all SKU codes contain filter string",
      skuFilterResult.data.every((sku) =>
        sku.sku_code.toLowerCase().includes(skuCodeFilter.toLowerCase()),
      ),
    );
  }
  // 4. Test stock availability filter - in stock
  const inStockResult =
    await api.functional.shoppingMall.administrator.products.snapshots.skus.index(
      adminConnection,
      {
        productId,
        snapshotId,
        body: {
          in_stock: true,
        } satisfies IShoppingMallProductSnapshotSku.IRequest,
      },
    );
  typia.assert(inStockResult);
  // Verify all results have stock > 0
  if (inStockResult.data.length > 0) {
    TestValidator.predicate(
      "all SKU snapshots have stock > 0",
      inStockResult.data.every((sku) => sku.stock_quantity > 0),
    );
  }
  // 5. Test stock availability filter - out of stock
  const outOfStockResult =
    await api.functional.shoppingMall.administrator.products.snapshots.skus.index(
      adminConnection,
      {
        productId,
        snapshotId,
        body: {
          in_stock: false,
        } satisfies IShoppingMallProductSnapshotSku.IRequest,
      },
    );
  typia.assert(outOfStockResult);
  // Verify all results have stock = 0
  if (outOfStockResult.data.length > 0) {
    TestValidator.predicate(
      "all SKU snapshots have stock = 0",
      outOfStockResult.data.every((sku) => sku.stock_quantity === 0),
    );
  }
  // 6. Test minimum price filter
  const minPrice = 1000;
  const minPriceResult =
    await api.functional.shoppingMall.administrator.products.snapshots.skus.index(
      adminConnection,
      {
        productId,
        snapshotId,
        body: {
          min_price: minPrice,
        } satisfies IShoppingMallProductSnapshotSku.IRequest,
      },
    );
  typia.assert(minPriceResult);
  // Verify all results have price >= min_price (using price or base_price)
  if (minPriceResult.data.length > 0) {
    TestValidator.predicate(
      "all SKU snapshots have price >= min_price",
      minPriceResult.data.every((sku) => {
        const effectivePrice = (sku.price ??
          sku.snapshot.base_price) satisfies number;
        return effectivePrice >= minPrice;
      }),
    );
  }
  // 7. Test maximum price filter
  const maxPrice = 10000;
  const maxPriceResult =
    await api.functional.shoppingMall.administrator.products.snapshots.skus.index(
      adminConnection,
      {
        productId,
        snapshotId,
        body: {
          max_price: maxPrice,
        } satisfies IShoppingMallProductSnapshotSku.IRequest,
      },
    );
  typia.assert(maxPriceResult);
  // Verify all results have price <= max_price
  if (maxPriceResult.data.length > 0) {
    TestValidator.predicate(
      "all SKU snapshots have price <= max_price",
      maxPriceResult.data.every((sku) => {
        const effectivePrice = (sku.price ??
          sku.snapshot.base_price) satisfies number;
        return effectivePrice <= maxPrice;
      }),
    );
  }
  // 8. Test combined price range filter
  const priceRangeResult =
    await api.functional.shoppingMall.administrator.products.snapshots.skus.index(
      adminConnection,
      {
        productId,
        snapshotId,
        body: {
          min_price: 500,
          max_price: 5000,
        } satisfies IShoppingMallProductSnapshotSku.IRequest,
      },
    );
  typia.assert(priceRangeResult);
  // Verify all results fall within price range
  if (priceRangeResult.data.length > 0) {
    TestValidator.predicate(
      "all SKU snapshots within price range",
      priceRangeResult.data.every((sku) => {
        const effectivePrice = (sku.price ??
          sku.snapshot.base_price) satisfies number;
        return effectivePrice >= 500 && effectivePrice <= 5000;
      }),
    );
  }
  // 9. Test pagination with small limit
  const limitValue = 3;
  const page1Result =
    await api.functional.shoppingMall.administrator.products.snapshots.skus.index(
      adminConnection,
      {
        productId,
        snapshotId,
        body: {
          page: 1,
          limit: limitValue,
        } satisfies IShoppingMallProductSnapshotSku.IRequest,
      },
    );
  typia.assert(page1Result);
  // Validate pagination metadata accuracy
  TestValidator.equals(
    "limit matches request",
    page1Result.pagination.limit,
    limitValue,
  );
  TestValidator.equals("current page is 1", page1Result.pagination.current, 1);
  TestValidator.predicate(
    "pages calculated correctly",
    page1Result.pagination.pages ===
      Math.ceil(page1Result.pagination.records / limitValue),
  );
  TestValidator.predicate(
    "data length does not exceed limit",
    page1Result.data.length <= limitValue,
  );
  // 10. Test page 2 if multiple pages exist
  if (page1Result.pagination.pages > 1) {
    const page2Result =
      await api.functional.shoppingMall.administrator.products.snapshots.skus.index(
        adminConnection,
        {
          productId,
          snapshotId,
          body: {
            page: 2,
            limit: limitValue,
          } satisfies IShoppingMallProductSnapshotSku.IRequest,
        },
      );
    typia.assert(page2Result);
    TestValidator.equals(
      "current page is 2",
      page2Result.pagination.current,
      2,
    );
    TestValidator.equals(
      "total records consistent",
      page2Result.pagination.records,
      page1Result.pagination.records,
    );
    TestValidator.equals(
      "total pages consistent",
      page2Result.pagination.pages,
      page1Result.pagination.pages,
    );
  }
  // 11. Test combined filters
  const combinedResult =
    await api.functional.shoppingMall.administrator.products.snapshots.skus.index(
      adminConnection,
      {
        productId,
        snapshotId,
        body: {
          sku_code: "TEST",
          in_stock: true,
          min_price: 100,
          max_price: 10000,
          page: 1,
          limit: 10,
        } satisfies IShoppingMallProductSnapshotSku.IRequest,
      },
    );
  typia.assert(combinedResult);
  // Verify all combined filters are applied
  if (combinedResult.data.length > 0) {
    TestValidator.predicate(
      "all combined filters applied correctly",
      combinedResult.data.every((sku) => {
        const effectivePrice = (sku.price ??
          sku.snapshot.base_price) satisfies number;
        return (
          sku.sku_code.toLowerCase().includes("test") &&
          sku.stock_quantity > 0 &&
          effectivePrice >= 100 &&
          effectivePrice <= 10000
        );
      }),
    );
  }
}
