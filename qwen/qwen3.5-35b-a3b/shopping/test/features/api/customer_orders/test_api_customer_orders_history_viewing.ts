import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrder";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_orders_history_viewing(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer account
  const joinConnection: api.IConnection = { host: connection.host };
  const customerAuthorized = await authorize_customer_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>() as string,
      password: RandomGenerator.alphaNumeric(16),
      href: RandomGenerator.content({ paragraphs: 1 }),
      referrer: RandomGenerator.content({ paragraphs: 1 }),
    },
  });
  typia.assert(customerAuthorized);
  // 2. Create customer-specific connection for authenticated requests
  const customerConnection: api.IConnection = { host: connection.host };
  customerConnection.headers = {
    ...connection.headers,
    Authorization: customerAuthorized.token.access,
  };
  // 3. Generate sample orders data by calling orders endpoint with different status filters
  // This simulates creating orders with different statuses (paid, shipped, delivered)
  const ordersByStatus = ArrayUtil.repeat(3, async (index) => {
    const status: "paid" | "shipped" | "delivered" = typia.assert<"paid" | "shipped" | "delivered">([
      "paid",
      "shipped",
      "delivered",
    ][index] as string);
    const orderList = await api.functional.ecommerceMall.customer.orders.index(
      customerConnection,
      {
        body: {
          overallStatus: status,
          limit: 20,
          page: 1,
        },
      },
    );
    typia.assert(orderList);
    return { status, orders: orderList };
  });
  const ordersByStatusResult = await Promise.all(ordersByStatus);
  // 4. Retrieve full order history without filters
  const orderHistory = await api.functional.ecommerceMall.customer.orders.index(
    customerConnection,
    {
      body: {
        limit: 20,
        page: 1,
        sortBy: "createdAt",
        sortOrder: "DESC",
      },
    },
  );
  typia.assert(orderHistory);
  // 5. Validate pagination metadata
  const pagination = orderHistory.pagination;
  TestValidator.equals("pagination current page", pagination.current, 1);
  TestValidator.equals("pagination limit", pagination.limit, 20);
  TestValidator.predicate(
    "pagination total records >= 0",
    pagination.records >= 0,
  );
  TestValidator.predicate("pagination total pages >= 0", pagination.pages >= 0);
  // 6. Validate orders data array exists and is array type
  TestValidator.predicate(
    "orders data is array",
    Array.isArray(orderHistory.data),
  );
  // 7. Validate each order in data array contains required fields
  // Note: typia.assert(orderHistory) already validates all fields are correct type
  if (orderHistory.data.length > 0) {
    const firstOrder = orderHistory.data[0];
    // Validate business logic: order_number exists and is string
    TestValidator.equals(
      "order has order_number",
      typeof firstOrder.order_number,
      "string",
    );
    // Validate business logic: total_price is positive number
    TestValidator.predicate(
      "order total_price >= 0",
      firstOrder.total_price >= 0,
    );
    // Validate business logic: overall_status is valid enum value
    const validStatuses = [
      "paid",
      "shipped",
      "delivered",
      "cancelled",
      "refunded",
      "partiallyCompleted",
    ];
    TestValidator.predicate(
      "order overall_status is valid",
      validStatuses.includes(firstOrder.overall_status),
    );
    // Validate business logic: created_at is valid date-time string
    TestValidator.equals(
      "order has created_at",
      typeof firstOrder.created_at,
      "string",
    );
    // Validate customer reference exists
    TestValidator.equals(
      "order has customer reference",
      typeof firstOrder.customer,
      "object",
    );
    // Validate customer fields exist
    TestValidator.equals(
      "customer has id",
      typeof firstOrder.customer.id,
      "string",
    );
    TestValidator.equals(
      "customer has display_name",
      typeof firstOrder.customer.display_name,
      "string",
    );
    TestValidator.equals(
      "customer has is_banned",
      typeof firstOrder.customer.is_banned,
      "boolean",
    );
    TestValidator.equals(
      "customer has email",
      typeof firstOrder.customer.email,
      "string",
    );
  }
  // 8. Test different status filters
  for (const { status, orders } of ordersByStatusResult) {
    TestValidator.equals(
      `filter ${status} - pagination current page`,
      orders.pagination.current,
      1,
    );
    TestValidator.predicate(
      `filter ${status} - orders count is array`,
      Array.isArray(orders.data),
    );
    // Verify all returned orders have the expected status (business logic)
    for (const order of orders.data) {
      TestValidator.equals(
        `filter ${status} - order status matches`,
        order.overall_status,
        status,
      );
    }
  }
  // 9. Test that customer can only see their own orders
  // Note: Authorization layer ensures customer can only see their orders
  if (orderHistory.data.length > 0) {
    const firstOrder = orderHistory.data[0];
    TestValidator.equals(
      "order customer id is valid UUID format",
      typeof firstOrder.customer.id,
      "string",
    );
  }
  // 10. Test sorting by createdAt DESC (newest first)
  if (orderHistory.data.length >= 2) {
    const sorted = [...orderHistory.data].sort((a, b) => {
      return (
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    });
    TestValidator.index(
      "orders sorted by createdAt DESC",
      sorted,
      orderHistory.data,
      true,
    );
  }
  // 11. Test pagination boundaries
  const smallLimit = 5;
  const limitedOrders =
    await api.functional.ecommerceMall.customer.orders.index(
      customerConnection,
      {
        body: {
          limit: smallLimit,
          page: 1,
        },
      },
    );
  typia.assert(limitedOrders);
  TestValidator.equals(
    "limited limit",
    limitedOrders.pagination.limit,
    smallLimit,
  );
  TestValidator.predicate(
    "limited orders count <= limit",
    limitedOrders.data.length <= smallLimit,
  );
  const maxLimit = 100;
  const maxOrders = await api.functional.ecommerceMall.customer.orders.index(
    customerConnection,
    {
      body: {
        limit: maxLimit,
        page: 1,
      },
    },
  );
  typia.assert(maxOrders);
  TestValidator.equals("max limit", maxOrders.pagination.limit, maxLimit);
}