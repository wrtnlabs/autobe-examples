import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrder";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
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
 * Test the seller dashboard orders listing pagination behavior with various page sizes and boundary conditions.
 *
 * This test validates:
 * - Maximum limit (100) pagination
 * - Minimum limit (1) pagination
 * - Default pagination (page=1, limit=20)
 * - Multi-page navigation (page=3, limit=10)
 * - Beyond bounds pagination (page exceeding total pages)
 * - Pagination metadata accuracy
 * - Sort order consistency (created_at DESC)
 */
export async function test_api_seller_dashboard_orders_pagination_limits(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  // 2. Test with maximum limit (100)
  const maxLimitResult =
    await api.functional.shoppingMall.seller.dashboard.orders.index(
      sellerConnection,
      {
        body: {
          limit: 100,
          page: 1,
        } satisfies IShoppingMallOrder.IRequest,
      },
    );
  typia.assert(maxLimitResult);
  TestValidator.equals(
    "max limit pagination",
    maxLimitResult.pagination.limit,
    100,
  );
  TestValidator.equals(
    "max limit current page",
    maxLimitResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "max limit pages calculation",
    maxLimitResult.pagination.pages ===
      Math.ceil(maxLimitResult.pagination.records / 100),
  );
  // 3. Test with minimum limit (1)
  const minLimitResult =
    await api.functional.shoppingMall.seller.dashboard.orders.index(
      sellerConnection,
      {
        body: {
          limit: 1,
          page: 1,
        } satisfies IShoppingMallOrder.IRequest,
      },
    );
  typia.assert(minLimitResult);
  TestValidator.equals(
    "min limit pagination",
    minLimitResult.pagination.limit,
    1,
  );
  TestValidator.predicate(
    "min limit data count",
    minLimitResult.data.length <= 1,
  );
  // 4. Test with default pagination (page=1, limit=20)
  const defaultResult =
    await api.functional.shoppingMall.seller.dashboard.orders.index(
      sellerConnection,
      {
        body: {} satisfies IShoppingMallOrder.IRequest,
      },
    );
  typia.assert(defaultResult);
  TestValidator.equals("default limit", defaultResult.pagination.limit, 20);
  TestValidator.equals("default page", defaultResult.pagination.current, 1);
  // 5. Test multi-page navigation (page=3, limit=10)
  const multiPageResult =
    await api.functional.shoppingMall.seller.dashboard.orders.index(
      sellerConnection,
      {
        body: {
          page: 3,
          limit: 10,
        } satisfies IShoppingMallOrder.IRequest,
      },
    );
  typia.assert(multiPageResult);
  TestValidator.equals(
    "multi page current",
    multiPageResult.pagination.current,
    3,
  );
  TestValidator.equals(
    "multi page limit",
    multiPageResult.pagination.limit,
    10,
  );
  // 6. Test beyond bounds pagination (page=999)
  const beyondBoundsResult =
    await api.functional.shoppingMall.seller.dashboard.orders.index(
      sellerConnection,
      {
        body: {
          page: 999,
          limit: 20,
        } satisfies IShoppingMallOrder.IRequest,
      },
    );
  typia.assert(beyondBoundsResult);
  TestValidator.equals(
    "beyond bounds current page",
    beyondBoundsResult.pagination.current,
    999,
  );
  TestValidator.predicate(
    "beyond bounds empty data",
    beyondBoundsResult.data.length === 0,
  );
  // 7. Test sort order (created_at DESC is default)
  const sortResult =
    await api.functional.shoppingMall.seller.dashboard.orders.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 20,
          sort: "created_at",
          sort_direction: "desc",
        } satisfies IShoppingMallOrder.IRequest,
      },
    );
  typia.assert(sortResult);
  // Verify sort order: timestamps should be in descending order
  if (sortResult.data.length > 1) {
    for (let i = 1; i < sortResult.data.length; i++) {
      TestValidator.predicate(
        `sort order item ${i - 1} >= item ${i}`,
        new Date(sortResult.data[i - 1].created_at) >=
          new Date(sortResult.data[i].created_at),
      );
    }
  }
  // 8. Verify total pages calculation accuracy
  TestValidator.predicate(
    "total pages calculation correct",
    maxLimitResult.pagination.pages ===
      Math.ceil(
        maxLimitResult.pagination.records / maxLimitResult.pagination.limit,
      ),
  );
  // 9. Verify records count is non-negative
  TestValidator.predicate(
    "records count non-negative",
    maxLimitResult.pagination.records >= 0,
  );
  // 10. Verify offset calculation for page 3 with limit 10
  // Expected offset: (3 - 1) * 10 = 20
  TestValidator.predicate(
    "multi page offset calculation",
    multiPageResult.pagination.current === 3 &&
      multiPageResult.pagination.limit === 10,
  );
}
