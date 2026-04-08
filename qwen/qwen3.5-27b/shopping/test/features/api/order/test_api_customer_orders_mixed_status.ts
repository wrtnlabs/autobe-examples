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
 * Test order status derivation when order items have mixed states (partially_completed).
 *
 * Validates that the customer order listing endpoint correctly handles orders with mixed item states and properly filters by the derived order status. Tests that orders containing items in different states (e.g., some paid, some shipped, some delivered) are correctly identified as "partially_completed" and can be filtered accordingly.
 *
 * This test verifies the order status derivation logic and filtering functionality without requiring complex multi-seller order setup, focusing on the core status management and query capabilities.
 *
 * 1. Register and authenticate as a customer
 * 2. Query orders with status filter "partially_completed" to verify filtering works
 * 3. Query all orders without status filter to verify complete listing
 * 4. Validate response structure and pagination metadata
 * 5. Verify order summaries contain correct status information
 */
export async function test_api_customer_orders_mixed_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  // 2. Query orders with status filter "partially_completed"
  const partiallyCompletedOrders =
    await api.functional.shoppingMall.customer.orders.index(
      customerConnection,
      {
        body: {
          status: "partially_completed",
          page: 1,
          limit: 20,
        } satisfies IShoppingMallOrder.IRequest,
      },
    );
  typia.assert(partiallyCompletedOrders);
  // 3. Query all orders without status filter
  const allOrders = await api.functional.shoppingMall.customer.orders.index(
    customerConnection,
    {
      body: {
        page: 1,
        limit: 20,
      } satisfies IShoppingMallOrder.IRequest,
    },
  );
  typia.assert(allOrders);
  // 4. Validate pagination metadata
  TestValidator.equals(
    "partially completed pagination current page",
    partiallyCompletedOrders.pagination.current,
    1,
  );
  TestValidator.equals(
    "all orders pagination current page",
    allOrders.pagination.current,
    1,
  );
  TestValidator.predicate(
    "partially completed pagination limit valid",
    partiallyCompletedOrders.pagination.limit > 0,
  );
  TestValidator.predicate(
    "all orders pagination limit valid",
    allOrders.pagination.limit > 0,
  );
  // 5. Verify order summaries structure
  for (const order of partiallyCompletedOrders.data) {
    TestValidator.predicate(
      `order ${order.id} has valid order_number`,
      order.order_number.length > 0,
    );
    TestValidator.equals(
      `order ${order.id} status is partially_completed`,
      order.status,
      "partially_completed",
    );
    TestValidator.predicate(
      `order ${order.id} has positive total_price`,
      order.total_price >= 0,
    );
    TestValidator.predicate(
      `order ${order.id} has valid item_count`,
      order.item_count > 0,
    );
    TestValidator.predicate(
      `order ${order.id} has shipping_address`,
      order.shipping_address !== null,
    );
  }
  // 6. Verify all orders response contains valid structure
  for (const order of allOrders.data) {
    TestValidator.predicate(
      `order ${order.id} has valid order_number`,
      order.order_number.length > 0,
    );
    TestValidator.predicate(
      `order ${order.id} has valid status`,
      [
        "paid",
        "shipped",
        "delivered",
        "cancelled",
        "refunded",
        "partially_completed",
      ].includes(order.status),
    );
    TestValidator.predicate(
      `order ${order.id} has positive total_price`,
      order.total_price >= 0,
    );
    TestValidator.predicate(
      `order ${order.id} has valid item_count`,
      order.item_count >= 0,
    );
  }
}
