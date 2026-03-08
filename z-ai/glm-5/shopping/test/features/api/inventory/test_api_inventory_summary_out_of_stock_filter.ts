import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductVariant";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_inventory_summary_out_of_stock_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller account and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // 2. Query inventory with out_of_stock filter
  const outOfStockResult =
    await api.functional.shoppingMall.seller.inventory.summary.index(
      sellerConnection,
      {
        body: {
          stockStatus: "out_of_stock",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallProductVariant.IRequest,
      },
    );
  typia.assert(outOfStockResult);
  // 3. Verify out_of_stock filter returns valid pagination structure
  TestValidator.predicate(
    "out_of_stock pagination current >= 1",
    outOfStockResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "out_of_stock pagination limit > 0",
    outOfStockResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "out_of_stock pagination records >= 0",
    outOfStockResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "out_of_stock pagination pages >= 0",
    outOfStockResult.pagination.pages >= 0,
  );
  // 4. Verify all returned variants have stock_quantity <= 0 (out of stock)
  for (const variant of outOfStockResult.data) {
    TestValidator.predicate(
      `variant ${variant.id} is out_of_stock`,
      variant.stock_quantity === 0,
    );
  }
  // 5. Query inventory with in_stock filter
  const inStockResult =
    await api.functional.shoppingMall.seller.inventory.summary.index(
      sellerConnection,
      {
        body: {
          stockStatus: "in_stock",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallProductVariant.IRequest,
      },
    );
  typia.assert(inStockResult);
  // 6. Verify in_stock filter returns valid pagination structure
  TestValidator.predicate(
    "in_stock pagination current >= 1",
    inStockResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "in_stock pagination limit > 0",
    inStockResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "in_stock pagination records >= 0",
    inStockResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "in_stock pagination pages >= 0",
    inStockResult.pagination.pages >= 0,
  );
  // 7. Verify all returned variants have stock_quantity > 0 (in stock)
  for (const variant of inStockResult.data) {
    TestValidator.predicate(
      `variant ${variant.id} is in_stock`,
      variant.stock_quantity > 0,
    );
  }
  // 8. Query without filter to get all inventory
  const allInventoryResult =
    await api.functional.shoppingMall.seller.inventory.summary.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallProductVariant.IRequest,
      },
    );
  typia.assert(allInventoryResult);
  // 9. Verify pagination works correctly with filter
  // Total records should equal sum of in_stock + out_of_stock filtered results
  const totalFilteredRecords =
    outOfStockResult.pagination.records + inStockResult.pagination.records;
  TestValidator.equals(
    "total records match sum of filtered results",
    allInventoryResult.pagination.records,
    totalFilteredRecords,
  );
}
