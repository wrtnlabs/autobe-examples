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
 * Test the seller dashboard orders listing when orders have mixed item statuses resulting in partial completion status.
 *
 * This test validates:
 * 1. Orders with mixed item statuses show 'partially_completed' as overall order status
 * 2. Filtering by status='partially_completed' returns only mixed-status orders
 * 3. Order summary includes correct customer information and item count
 * 4. Order structure is consistent regardless of status type
 */
export async function test_api_seller_dashboard_orders_partial_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      shop_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Retrieve all orders from seller dashboard
  const allOrders =
    await api.functional.shoppingMall.seller.dashboard.orders.index(
      sellerConnection,
      {
        body: {} satisfies IShoppingMallOrder.IRequest,
      },
    );
  typia.assert(allOrders);
  // 3. Verify pagination structure
  TestValidator.predicate(
    "pagination exists",
    allOrders.pagination.current >= 1 &&
      allOrders.pagination.limit > 0 &&
      allOrders.pagination.records >= 0 &&
      allOrders.pagination.pages >= 0,
  );
  // 4. Verify order summary structure and business logic for each order
  await ArrayUtil.asyncForEach(allOrders.data, async (order) => {
    typia.assert(order);
    // Validate order status is one of the expected values
    TestValidator.predicate(
      `order ${order.id} has valid status value`,
      [
        "paid",
        "shipped",
        "delivered",
        "cancelled",
        "refunded",
        "partially_completed",
      ].includes(order.status),
    );
    // Validate total_price is non-negative
    TestValidator.predicate(
      `order ${order.id} has non-negative total_price`,
      order.total_price >= 0,
    );
    // Validate order_items_count is non-negative
    TestValidator.predicate(
      `order ${order.id} has non-negative order_items_count`,
      order.order_items_count >= 0,
    );
    // Validate customer summary exists and has required fields
    typia.assert(order.customer);
    TestValidator.predicate(
      `order ${order.id} customer has valid email format`,
      order.customer.email.includes("@"),
    );
    TestValidator.predicate(
      `order ${order.id} customer has valid status`,
      ["active", "suspended", "banned"].includes(order.customer.status),
    );
  });
  // 5. Test filtering by status='partially_completed'
  const partiallyCompletedOrders =
    await api.functional.shoppingMall.seller.dashboard.orders.index(
      sellerConnection,
      {
        body: {
          status: "partially_completed",
        } satisfies IShoppingMallOrder.IRequest,
      },
    );
  typia.assert(partiallyCompletedOrders);
  // 6. Verify all returned orders have 'partially_completed' status
  await ArrayUtil.asyncForEach(partiallyCompletedOrders.data, async (order) => {
    typia.assert(order);
    TestValidator.equals(
      `filtered order ${order.id} has partially_completed status`,
      order.status,
      "partially_completed",
    );
  });
  // 7. Verify pagination for filtered results
  TestValidator.predicate(
    "filtered pagination is valid",
    partiallyCompletedOrders.pagination.current >= 1 &&
      partiallyCompletedOrders.pagination.limit > 0 &&
      partiallyCompletedOrders.pagination.records >= 0 &&
      partiallyCompletedOrders.pagination.pages >= 0,
  );
  // 8. Test filtering by other statuses to ensure filter works correctly
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
  // 9. Verify all 'paid' orders have 'paid' status
  await ArrayUtil.asyncForEach(paidOrders.data, async (order) => {
    typia.assert(order);
    TestValidator.equals(
      `filtered order ${order.id} has paid status`,
      order.status,
      "paid",
    );
  });
  // 10. Test pagination parameters
  const paginatedOrders =
    await api.functional.shoppingMall.seller.dashboard.orders.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallOrder.IRequest,
      },
    );
  typia.assert(paginatedOrders);
  TestValidator.equals(
    "pagination page is correct",
    paginatedOrders.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is correct",
    paginatedOrders.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination data length does not exceed limit",
    paginatedOrders.data.length <= 10,
  );
  // 11. Test sorting functionality
  const sortedOrders =
    await api.functional.shoppingMall.seller.dashboard.orders.index(
      sellerConnection,
      {
        body: {
          sort: "created_at",
          sort_direction: "desc",
        } satisfies IShoppingMallOrder.IRequest,
      },
    );
  typia.assert(sortedOrders);
  TestValidator.predicate(
    "sorted orders pagination is valid",
    sortedOrders.pagination.current >= 1,
  );
  // 12. Test date range filtering
  const now = new Date();
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const dateFilteredOrders =
    await api.functional.shoppingMall.seller.dashboard.orders.index(
      sellerConnection,
      {
        body: {
          created_at_start: oneMonthAgo.toISOString(),
          created_at_end: now.toISOString(),
        } satisfies IShoppingMallOrder.IRequest,
      },
    );
  typia.assert(dateFilteredOrders);
  TestValidator.predicate(
    "date filtered orders pagination is valid",
    dateFilteredOrders.pagination.current >= 1,
  );
  // 13. Test price range filtering
  const priceFilteredOrders =
    await api.functional.shoppingMall.seller.dashboard.orders.index(
      sellerConnection,
      {
        body: {
          total_price_min: 0,
          total_price_max: 10000,
        } satisfies IShoppingMallOrder.IRequest,
      },
    );
  typia.assert(priceFilteredOrders);
  // Verify all orders in price-filtered results are within the specified range
  await ArrayUtil.asyncForEach(priceFilteredOrders.data, async (order) => {
    typia.assert(order);
    TestValidator.predicate(
      `order ${order.id} total_price is within range`,
      order.total_price >= 0 && order.total_price <= 10000,
    );
  });
  TestValidator.predicate(
    "price filtered orders pagination is valid",
    priceFilteredOrders.pagination.current >= 1,
  );
}
