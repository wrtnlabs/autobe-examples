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
 * Test the out_of_stock_only filter functionality for seller inventory status.
 *
 * This test validates that the out_of_stock_only filter correctly identifies
 * product variants with zero stock, enabling sellers to prioritize restocking.
 * The test verifies that all returned items have current_stock=0 and that
 * summary statistics accurately reflect out-of-stock conditions.
 */
export async function test_api_seller_inventory_status_out_of_stock_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(2),
      shop_description: RandomGenerator.paragraph({ sentences: 3 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);
  // 2. Query inventory status with out_of_stock_only filter
  const outOfStockQuery =
    await api.functional.shoppingMall.seller.products.inventory.status.inventoryStatus(
      sellerConnection,
      {
        body: {
          out_of_stock_only: true,
          page: 1,
          limit: 20,
        } satisfies IShoppingMallProductInventoryStatus.IRequest,
      },
    );
  typia.assert(outOfStockQuery);
  // 3. Validate that all returned items have current_stock = 0
  TestValidator.predicate(
    "all items should be out of stock",
    outOfStockQuery.items.every((item) => item.current_stock === 0),
  );
  // 4. Validate summary statistics reflect out-of-stock conditions
  TestValidator.equals(
    "outOfStockCount should equal totalVariants",
    outOfStockQuery.summary.outOfStockCount,
    outOfStockQuery.summary.totalVariants,
  );
  TestValidator.equals(
    "inStockCount should be 0",
    outOfStockQuery.summary.inStockCount,
    0,
  );
  // 5. Validate pagination metadata
  TestValidator.predicate(
    "pagination page should be 1",
    outOfStockQuery.pagination.page === 1,
  );
  TestValidator.predicate(
    "pagination limit should be 20",
    outOfStockQuery.pagination.limit === 20,
  );
  // 6. Test without filter to compare mixed inventory states
  const allInventoryQuery =
    await api.functional.shoppingMall.seller.products.inventory.status.inventoryStatus(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IShoppingMallProductInventoryStatus.IRequest,
      },
    );
  typia.assert(allInventoryQuery);
  // 7. Validate that unfiltered query may have different stock distribution
  TestValidator.predicate(
    "unfiltered query should have valid summary",
    allInventoryQuery.summary.totalVariants >=
      outOfStockQuery.summary.totalVariants,
  );
  // 8. Validate that outOfStockCount in unfiltered query matches filtered query
  TestValidator.equals(
    "outOfStockCount should match between filtered and unfiltered",
    allInventoryQuery.summary.outOfStockCount,
    outOfStockQuery.summary.outOfStockCount,
  );
}
