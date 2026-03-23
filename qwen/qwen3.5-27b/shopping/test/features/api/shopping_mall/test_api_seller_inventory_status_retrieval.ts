import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallProductInventoryStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductInventoryStatus";
import type { IShoppingMallProductInventoryStatusItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductInventoryStatusItem";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test seller inventory status retrieval with comprehensive statistics validation.
 * 1. Register and authenticate seller account
 * 2. Query inventory status with pagination
 * 3. Validate summary statistics match items array data
 * 4. Verify pagination metadata correctness
 * 5. Validate item-level inventory details
 */
export async function test_api_seller_inventory_status_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(2),
      shop_description: RandomGenerator.paragraph({ sentences: 3 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);
  // 2. Query inventory status with pagination
  const status =
    await api.functional.shoppingMall.seller.products.inventory.status.inventoryStatus(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 20,
          sort: "stock_quantity",
          sortOrder: "desc",
        } satisfies IShoppingMallProductInventoryStatus.IRequest,
      },
    );
  typia.assert(status);
  // 3. Validate summary statistics match items array
  const actualInStockCount = status.items.filter(
    (item) => item.current_stock > 0,
  ).length;
  const actualOutOfStockCount = status.items.filter(
    (item) => item.current_stock === 0,
  ).length;
  const actualLowStockCount = status.items.filter(
    (item) => item.current_stock < 10,
  ).length;
  const actualTotalStockQuantity = status.items.reduce(
    (sum, item) => sum + item.current_stock,
    0,
  );
  TestValidator.equals(
    "totalVariants matches items length",
    status.summary.totalVariants,
    status.items.length,
  );
  TestValidator.equals(
    "inStockCount is accurate",
    status.summary.inStockCount,
    actualInStockCount,
  );
  TestValidator.equals(
    "outOfStockCount is accurate",
    status.summary.outOfStockCount,
    actualOutOfStockCount,
  );
  TestValidator.equals(
    "lowStockCount is accurate",
    status.summary.lowStockCount,
    actualLowStockCount,
  );
  TestValidator.equals(
    "totalStockQuantity is accurate",
    status.summary.totalStockQuantity,
    actualTotalStockQuantity,
  );
  // 4. Validate pagination metadata
  TestValidator.equals("page matches request", status.pagination.page, 1);
  TestValidator.equals("limit matches request", status.pagination.limit, 20);
  TestValidator.predicate(
    "total is non-negative",
    status.pagination.total >= 0,
  );
  TestValidator.predicate(
    "totalPages is non-negative",
    status.pagination.totalPages >= 0,
  );
  // 5. Validate item-level business logic (types already validated by typia.assert)
  await ArrayUtil.asyncForEach(status.items, async (item) => {
    TestValidator.predicate(
      "current_stock is non-negative",
      item.current_stock >= 0,
    );
    TestValidator.predicate("price is positive", item.price > 0);
    TestValidator.predicate(
      "seller_id matches authenticated seller",
      item.seller_id === seller.id,
    );
  });
}