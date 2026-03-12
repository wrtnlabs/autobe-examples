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
 * Test the seller dashboard orders listing functionality with various filter criteria.
 *
 * This test validates:
 * 1. Basic orders listing with default pagination
 * 2. Status filtering (paid, shipped, delivered, cancelled, refunded)
 * 3. Date range filtering (created_at_start, created_at_end)
 * 4. Price range filtering (total_price_min, total_price_max)
 * 5. Pagination (page, limit parameters)
 * 6. Sorting (sort field and sort_direction)
 * 7. Response structure validation
 */
export async function test_api_seller_dashboard_orders_list_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as seller using utility function
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
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
  typia.assert(sellerAuth);
  // 2. Test orders listing with no filters (default pagination)
  const allOrders =
    await api.functional.shoppingMall.seller.dashboard.orders.index(
      sellerConnection,
      {
        body: {} satisfies IShoppingMallOrder.IRequest,
      },
    );
  typia.assert(allOrders);
  // Validate response structure
  TestValidator.predicate(
    "pagination exists",
    allOrders.pagination !== undefined,
  );
  TestValidator.predicate(
    "pagination current is positive",
    allOrders.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    allOrders.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    allOrders.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    allOrders.pagination.pages >= 0,
  );
  TestValidator.predicate("data is array", Array.isArray(allOrders.data));
  // Validate each order summary structure
  await ArrayUtil.asyncForEach(allOrders.data, async (order) => {
    typia.assert(order);
    TestValidator.predicate("order has id", order.id !== undefined);
    TestValidator.predicate("order has status", order.status !== undefined);
    TestValidator.predicate(
      "order has total_price",
      order.total_price !== undefined,
    );
    TestValidator.predicate(
      "order has order_items_count",
      order.order_items_count !== undefined,
    );
    TestValidator.predicate("order has customer", order.customer !== undefined);
    TestValidator.predicate(
      "order has created_at",
      order.created_at !== undefined,
    );
  });
  // 3. Test filtering by status
  const paidOrders =
    await api.functional.shoppingMall.seller.dashboard.orders.index(
      sellerConnection,
      {
        body: {
          status: "paid",
        } satisfies IShoppingMallOrder.IRequest,
      },
    );
  typia.assert(paidOrders);
  // Validate all returned orders have status 'paid'
  await ArrayUtil.asyncForEach(paidOrders.data, async (order) => {
    typia.assert(order);
    TestValidator.equals("order status is paid", order.status, "paid");
  });
  // 4. Test date range filtering
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
  const today = new Date();
  const recentOrders =
    await api.functional.shoppingMall.seller.dashboard.orders.index(
      sellerConnection,
      {
        body: {
          created_at_start: oneMonthAgo.toISOString(),
          created_at_end: today.toISOString(),
        } satisfies IShoppingMallOrder.IRequest,
      },
    );
  typia.assert(recentOrders);
  // Validate all orders are within date range
  await ArrayUtil.asyncForEach(recentOrders.data, async (order) => {
    typia.assert(order);
    const orderDate = new Date(order.created_at);
    TestValidator.predicate(
      "order created after start date",
      orderDate >= oneMonthAgo,
    );
    TestValidator.predicate(
      "order created before end date",
      orderDate <= today,
    );
  });
  // 5. Test price range filtering
  const priceFilteredOrders =
    await api.functional.shoppingMall.seller.dashboard.orders.index(
      sellerConnection,
      {
        body: {
          total_price_min: 100,
          total_price_max: 1000,
        } satisfies IShoppingMallOrder.IRequest,
      },
    );
  typia.assert(priceFilteredOrders);
  // Validate all orders are within price range
  await ArrayUtil.asyncForEach(priceFilteredOrders.data, async (order) => {
    typia.assert(order);
    TestValidator.predicate("order price >= min", order.total_price >= 100);
    TestValidator.predicate("order price <= max", order.total_price <= 1000);
  });
  // 6. Test pagination - page 1 with limit 10
  const page1 = await api.functional.shoppingMall.seller.dashboard.orders.index(
    sellerConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IShoppingMallOrder.IRequest,
    },
  );
  typia.assert(page1);
  TestValidator.equals("page 1 current", page1.pagination.current, 1);
  TestValidator.equals("page 1 limit", page1.pagination.limit, 10);
  // 7. Test pagination - page 2 with limit 10
  const page2 = await api.functional.shoppingMall.seller.dashboard.orders.index(
    sellerConnection,
    {
      body: {
        page: 2,
        limit: 10,
      } satisfies IShoppingMallOrder.IRequest,
    },
  );
  typia.assert(page2);
  TestValidator.equals("page 2 current", page2.pagination.current, 2);
  TestValidator.equals("page 2 limit", page2.pagination.limit, 10);
  // 8. Test sorting by created_at descending (default)
  const sortedByDateDesc =
    await api.functional.shoppingMall.seller.dashboard.orders.index(
      sellerConnection,
      {
        body: {
          sort: "created_at",
          sort_direction: "desc",
        } satisfies IShoppingMallOrder.IRequest,
      },
    );
  typia.assert(sortedByDateDesc);
  // Validate descending order
  for (let i = 1; i < sortedByDateDesc.data.length; i++) {
    const prevOrder = sortedByDateDesc.data[i - 1];
    const currOrder = sortedByDateDesc.data[i];
    TestValidator.predicate(
      `order ${i} created_at <= order ${i - 1} created_at`,
      new Date(currOrder.created_at) <= new Date(prevOrder.created_at),
    );
  }
  // 9. Test sorting by total_price ascending
  const sortedByPriceAsc =
    await api.functional.shoppingMall.seller.dashboard.orders.index(
      sellerConnection,
      {
        body: {
          sort: "total_price",
          sort_direction: "asc",
        } satisfies IShoppingMallOrder.IRequest,
      },
    );
  typia.assert(sortedByPriceAsc);
  // Validate ascending order
  for (let i = 1; i < sortedByPriceAsc.data.length; i++) {
    const prevOrder = sortedByPriceAsc.data[i - 1];
    const currOrder = sortedByPriceAsc.data[i];
    TestValidator.predicate(
      `order ${i} total_price >= order ${i - 1} total_price`,
      currOrder.total_price >= prevOrder.total_price,
    );
  }
  // 10. Test sorting by status descending
  const sortedByStatusDesc =
    await api.functional.shoppingMall.seller.dashboard.orders.index(
      sellerConnection,
      {
        body: {
          sort: "status",
          sort_direction: "desc",
        } satisfies IShoppingMallOrder.IRequest,
      },
    );
  typia.assert(sortedByStatusDesc);
  // 11. Test combined filters (status + price range + pagination)
  const combinedFilterOrders =
    await api.functional.shoppingMall.seller.dashboard.orders.index(
      sellerConnection,
      {
        body: {
          status: "paid",
          total_price_min: 50,
          total_price_max: 500,
          page: 1,
          limit: 20,
          sort: "created_at",
          sort_direction: "desc",
        } satisfies IShoppingMallOrder.IRequest,
      },
    );
  typia.assert(combinedFilterOrders);
  // Validate combined filters
  await ArrayUtil.asyncForEach(combinedFilterOrders.data, async (order) => {
    typia.assert(order);
    TestValidator.equals("order status is paid", order.status, "paid");
    TestValidator.predicate("order price >= 50", order.total_price >= 50);
    TestValidator.predicate("order price <= 500", order.total_price <= 500);
  });
  TestValidator.equals(
    "pagination current",
    combinedFilterOrders.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    combinedFilterOrders.pagination.limit,
    20,
  );
}
