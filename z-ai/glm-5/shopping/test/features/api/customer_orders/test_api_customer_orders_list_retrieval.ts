import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrder";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderAddress";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemVariantOption";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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
 * Test that an authenticated customer can successfully retrieve their order
 * history with proper pagination and sorting.
 *
 * **Test Steps:**
 * 1. Register and authenticate a new customer
 * 2. Create an order so the customer has at least one order in history
 * 3. Call the order list endpoint with default pagination (no filters)
 * 4. Verify the response includes pagination object with current page, limit, total records, and total pages
 * 5. Verify the data array contains the previously created order with correct fields
 * 6. Verify orders are sorted by createdAt in descending order (newest first)
 * 7. Verify the customer object in each order matches the authenticated customer's information
 *
 * **Business Logic Validation:**
 * - Customer can only see their own orders (data isolation)
 * - Pagination metadata correctly reflects the total order count
 * - Order summaries contain all required fields for list display
 * - Sorting ensures customers see their most recent orders first
 */
export async function test_api_customer_orders_list_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a new customer
  const customerConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_customer_join(customerConnection, {});
  typia.assert(authResult);
  // 2. Create an order so the customer has at least one order in history
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {},
  );
  typia.assert(order);
  // 3. Call the order list endpoint with default pagination (no filters)
  const orderList = await api.functional.shoppingMall.customer.orders.index(
    customerConnection,
    {
      body: {} satisfies IShoppingMallOrder.IRequest,
    },
  );
  typia.assert(orderList);
  // 4. Verify the response includes pagination object
  TestValidator.predicate(
    "pagination has current page",
    orderList.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination has limit",
    orderList.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination has records count",
    orderList.pagination.records >= 1,
  );
  TestValidator.predicate(
    "pagination has pages count",
    orderList.pagination.pages >= 1,
  );
  // 5. Verify the data array contains the previously created order
  TestValidator.predicate(
    "order list has at least one order",
    orderList.data.length >= 1,
  );
  const foundOrder = orderList.data.find((summary) => summary.id === order.id);
  TestValidator.predicate(
    "created order is found in list",
    foundOrder !== undefined,
  );
  // Verify order summary contains required fields
  if (foundOrder !== undefined) {
    TestValidator.equals(
      "order number matches",
      foundOrder.orderNumber,
      order.order_number,
    );
    TestValidator.equals(
      "total price matches",
      foundOrder.totalPrice,
      order.total_price,
    );
    TestValidator.equals(
      "order status matches",
      foundOrder.status,
      order.status,
    );
    TestValidator.equals(
      "customer id matches",
      foundOrder.customer.id,
      authResult.id,
    );
    TestValidator.equals(
      "customer email matches",
      foundOrder.customer.email,
      authResult.email,
    );
  }
  // 6. Verify orders are sorted by createdAt in descending order (newest first)
  if (orderList.data.length >= 2) {
    for (let i = 0; i < orderList.data.length - 1; i++) {
      const currentCreatedAt = new Date(orderList.data[i].createdAt).getTime();
      const nextCreatedAt = new Date(orderList.data[i + 1].createdAt).getTime();
      TestValidator.predicate(
        "orders are sorted by createdAt descending",
        currentCreatedAt >= nextCreatedAt,
      );
    }
  }
  // 7. Verify customer isolation - all orders belong to the authenticated customer
  for (const orderSummary of orderList.data) {
    TestValidator.equals(
      "order belongs to authenticated customer",
      orderSummary.customer.id,
      authResult.id,
    );
  }
}
