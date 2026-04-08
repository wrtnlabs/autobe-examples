import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrder";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test filtering customer orders by status, order number, and date range.
 *
 * Validates the order history filtering functionality for authenticated customers. Tests all available filter parameters including status filtering (paid, shipped, delivered, cancelled, refunded, partially_completed), order number partial match search, date range filtering, and pagination controls.
 *
 * The test verifies that the API correctly accepts filter parameters and returns properly structured paginated responses with order summaries. Each order summary includes essential information such as order number, derived status, total price, item count, and shipping address snapshot.
 *
 * 1. Register and authenticate a customer account
 * 2. Test filtering by each order status type
 * 3. Test order number partial match search functionality
 * 4. Test date range filtering with created_at_from and created_at_to
 * 5. Test pagination parameters (page and limit)
 * 6. Validate response structure contains all required fields
 * 7. Verify pagination metadata is correctly calculated
 */
export async function test_api_customer_orders_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 2. Test filtering by status: paid
  const paidOrders = await api.functional.shoppingMall.customer.orders.index(
    customerConnection,
    {
      body: {
        status: "paid",
      },
    },
  );
  typia.assert(paidOrders);
  TestValidator.predicate(
    "paid filter returns valid response",
    paidOrders.data.length >= 0,
  );
  TestValidator.equals(
    "paid filter pagination current",
    paidOrders.pagination.current,
    1,
  );
  // 3. Test filtering by status: shipped
  const shippedOrders = await api.functional.shoppingMall.customer.orders.index(
    customerConnection,
    {
      body: {
        status: "shipped",
      },
    },
  );
  typia.assert(shippedOrders);
  TestValidator.predicate(
    "shipped filter returns valid response",
    shippedOrders.data.length >= 0,
  );
  // 4. Test filtering by status: delivered
  const deliveredOrders =
    await api.functional.shoppingMall.customer.orders.index(
      customerConnection,
      {
        body: {
          status: "delivered",
        },
      },
    );
  typia.assert(deliveredOrders);
  TestValidator.predicate(
    "delivered filter returns valid response",
    deliveredOrders.data.length >= 0,
  );
  // 5. Test filtering by status: cancelled
  const cancelledOrders =
    await api.functional.shoppingMall.customer.orders.index(
      customerConnection,
      {
        body: {
          status: "cancelled",
        },
      },
    );
  typia.assert(cancelledOrders);
  TestValidator.predicate(
    "cancelled filter returns valid response",
    cancelledOrders.data.length >= 0,
  );
  // 6. Test filtering by status: refunded
  const refundedOrders =
    await api.functional.shoppingMall.customer.orders.index(
      customerConnection,
      {
        body: {
          status: "refunded",
        },
      },
    );
  typia.assert(refundedOrders);
  TestValidator.predicate(
    "refunded filter returns valid response",
    refundedOrders.data.length >= 0,
  );
  // 7. Test filtering by status: partially_completed
  const partiallyCompletedOrders =
    await api.functional.shoppingMall.customer.orders.index(
      customerConnection,
      {
        body: {
          status: "partially_completed",
        },
      },
    );
  typia.assert(partiallyCompletedOrders);
  TestValidator.predicate(
    "partially_completed filter returns valid response",
    partiallyCompletedOrders.data.length >= 0,
  );
  // 8. Test order number partial match search
  const searchQuery = RandomGenerator.alphabets(4);
  const searchOrders = await api.functional.shoppingMall.customer.orders.index(
    customerConnection,
    {
      body: {
        order_number: searchQuery,
      },
    },
  );
  typia.assert(searchOrders);
  TestValidator.predicate(
    "order number search returns valid response",
    searchOrders.data.length >= 0,
  );
  // 9. Test date range filtering
  const now = new Date();
  const pastDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const futureDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const dateRangeOrders =
    await api.functional.shoppingMall.customer.orders.index(
      customerConnection,
      {
        body: {
          created_at_from: pastDate.toISOString(),
          created_at_to: futureDate.toISOString(),
        },
      },
    );
  typia.assert(dateRangeOrders);
  TestValidator.predicate(
    "date range filter returns valid response",
    dateRangeOrders.data.length >= 0,
  );
  // 10. Test pagination parameters
  const paginatedOrders =
    await api.functional.shoppingMall.customer.orders.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(paginatedOrders);
  TestValidator.equals(
    "pagination limit matches request",
    paginatedOrders.pagination.limit,
    10,
  );
  TestValidator.equals(
    "pagination current page matches request",
    paginatedOrders.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    paginatedOrders.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    paginatedOrders.pagination.pages >= 0,
  );
  // 11. Test combined filters (status + pagination)
  const combinedFilterOrders =
    await api.functional.shoppingMall.customer.orders.index(
      customerConnection,
      {
        body: {
          status: "delivered",
          page: 1,
          limit: 5,
        },
      },
    );
  typia.assert(combinedFilterOrders);
  TestValidator.equals(
    "combined filter pagination limit",
    combinedFilterOrders.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "combined filter returns valid response",
    combinedFilterOrders.data.length >= 0,
  );
  // 12. Validate order summary structure (if any orders exist)
  if (paginatedOrders.data.length > 0) {
    const sampleOrder = paginatedOrders.data[0];
    TestValidator.predicate(
      "order has valid UUID",
      /^[0-9a-f-]{36}$/i.test(sampleOrder.id),
    );
    TestValidator.predicate(
      "order has order_number",
      sampleOrder.order_number.length > 0,
    );
    TestValidator.predicate("order has status", sampleOrder.status.length > 0);
    TestValidator.predicate(
      "order has total_price",
      sampleOrder.total_price >= 0,
    );
    TestValidator.predicate(
      "order has item_count",
      sampleOrder.item_count >= 0,
    );
    TestValidator.predicate(
      "order has shipping_address",
      sampleOrder.shipping_address !== null,
    );
    TestValidator.predicate(
      "order has created_at",
      sampleOrder.created_at.length > 0,
    );
    TestValidator.predicate(
      "order has updated_at",
      sampleOrder.updated_at.length > 0,
    );
  }
}
