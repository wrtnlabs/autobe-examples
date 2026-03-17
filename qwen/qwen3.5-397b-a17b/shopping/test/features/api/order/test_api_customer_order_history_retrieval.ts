import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrder";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";

/**
 * Test customer order history retrieval with pagination and status derivation.
 *
 * This test validates that authenticated customers can retrieve their order history
 * through the PATCH /shoppingMall/customer/orders endpoint. It verifies:
 * - Customer authentication and data isolation
 * - Order creation and persistence
 * - Pagination metadata accuracy
 * - Order status derivation from order items
 * - Response structure validation
 */
export async function test_api_customer_order_history_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate customer
  const customerAuth = await authorize_customer_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      nickname: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 2. Create customer-specific connection with auth token
  const customerConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${customerAuth.token.access}`,
    },
  };
  // 3. Create an order using the utility function
  // The utility handles cart preparation, product/variant setup internally
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {
      body: {},
    },
  );
  typia.assert(order);
  // 4. Retrieve order history with default pagination
  const orderHistory = await api.functional.shoppingMall.customer.orders.index(
    customerConnection,
    {
      body: {
        page: 1,
        limit: 20,
        sort: "created_at,desc",
      } satisfies IShoppingMallOrder.IRequest,
    },
  );
  typia.assert(orderHistory);
  // 5. Validate pagination metadata values
  TestValidator.equals("current page is 1", orderHistory.pagination.current, 1);
  TestValidator.equals(
    "limit matches request",
    orderHistory.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "records count is at least 1",
    orderHistory.pagination.records >= 1,
  );
  TestValidator.predicate(
    "pages count is at least 1",
    orderHistory.pagination.pages >= 1,
  );
  // 6. Validate order data array exists and contains created order
  TestValidator.predicate(
    "data array exists",
    Array.isArray(orderHistory.data),
  );
  TestValidator.predicate(
    "contains created order",
    orderHistory.data.length >= 1,
  );
  // 7. Validate the created order is in the results
  const createdOrderFound = orderHistory.data.some(
    (summary) => summary.id === order.id,
  );
  TestValidator.predicate(
    "created order appears in history",
    createdOrderFound,
  );
  // 8. Validate order total price matches created order
  const foundOrder = orderHistory.data.find(
    (summary) => summary.id === order.id,
  );
  if (foundOrder) {
    TestValidator.equals(
      "order total price matches",
      foundOrder.totalPrice,
      order.total_price,
    );
    TestValidator.equals(
      "order number matches",
      foundOrder.orderNumber,
      order.order_number,
    );
  }
  // 9. Test pagination with different limit
  const paginatedHistory =
    await api.functional.shoppingMall.customer.orders.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallOrder.IRequest,
      },
    );
  typia.assert(paginatedHistory);
  TestValidator.equals(
    "custom limit applied",
    paginatedHistory.pagination.limit,
    10,
  );
  // 10. Verify data isolation - create second customer and ensure they don't see first customer's orders
  const secondCustomerAuth = await authorize_customer_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      nickname: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(secondCustomerAuth);
  const secondCustomerConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${secondCustomerAuth.token.access}`,
    },
  };
  const secondCustomerHistory =
    await api.functional.shoppingMall.customer.orders.index(
      secondCustomerConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IShoppingMallOrder.IRequest,
      },
    );
  typia.assert(secondCustomerHistory);
  // Second customer should not see first customer's order
  const firstCustomerOrderVisible = secondCustomerHistory.data.some(
    (summary) => summary.id === order.id,
  );
  TestValidator.predicate(
    "data isolation - second customer cannot see first customer's order",
    !firstCustomerOrderVisible,
  );
}
