import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrder";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import type { IShoppingMallOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderSnapshot";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
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
import { prepare_random_shopping_mall_order_item } from "../../../prepare/prepare_random_shopping_mall_order_item";

export async function test_api_customer_orders_index_filter_by_status_and_date(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer sign up and get authorized connection
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(connection, {});
  customerConnection.headers = { Authorization: customer.token.access };
  // 2. Create multiple orders with varying createdAt and status
  // We'll create orders with 'paid' status inside the date range and another outside,
  // and some with different statuses to test filtering
  // We rely on generate_random_shopping_mall_customer_orders_create utility to create orders
  // but it doesn't support setting status or createdAt directly. So we will create orders normally,
  // then filter by date range with the index endpoint.
  const orders: IShoppingMallOrder[] = [];
  // Create 5 orders, assuming they have current createdAt clustered
  for (let i = 0; i < 5; i++) {
    const order = await generate_random_shopping_mall_customer_orders_create(
      customerConnection,
      {
        body: {},
      },
    );
    typia.assert(order);
    orders.push(order);
  }
  // Introduce a small delay to ensure createdAt range for next orders
  await new Promise((resolve) => setTimeout(resolve, 1000));
  // Create more orders to make sure createdAt spans
  for (let i = 0; i < 2; i++) {
    const order = await generate_random_shopping_mall_customer_orders_create(
      customerConnection,
      {
        body: {},
      },
    );
    typia.assert(order);
    orders.push(order);
  }
  // 3. Define filter parameters: last 1 day from now, orderStatus "paid"
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const nowISOString = now.toISOString();
  // 4. Call index endpoint with pagination and filters
  const page1 = await api.functional.shoppingMall.customer.orders.index(
    customerConnection,
    {
      body: {
        page: 1,
        limit: 10,
        orderStatus: "paid",
        createdAtFrom: oneDayAgo,
        createdAtTo: nowISOString,
      } satisfies IShoppingMallOrder.IRequest,
    },
  );
  typia.assert(page1);
  // 5. Validate that all returned orders have 'paid' status and createdAt within the range
  for (const order of page1.data) {
    typia.assert(order);
    TestValidator.equals(
      "order status must be paid",
      order.orderStatus,
      "paid",
    );
    TestValidator.predicate(
      "order createdAt within range",
      order.createdAt >= oneDayAgo && order.createdAt <= nowISOString,
    );
    // Also ensure the order customer matches this customer
    TestValidator.equals(
      "order belongs to customer",
      order.customer.id,
      customer.id,
    );
  }
  // 6. Validate pagination metadata correctness
  TestValidator.predicate(
    "pagination page number is 1",
    page1.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is 10",
    page1.pagination.limit === 10,
  );
  TestValidator.predicate(
    "pagination records count non-negative",
    page1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count non-negative",
    page1.pagination.pages >= 0,
  );
  // 7. Optionally test that pagination pages count and records count are coherent
  TestValidator.predicate(
    "pagination coherence",
    page1.pagination.pages ===
      Math.ceil(page1.pagination.records / page1.pagination.limit),
  );
}
