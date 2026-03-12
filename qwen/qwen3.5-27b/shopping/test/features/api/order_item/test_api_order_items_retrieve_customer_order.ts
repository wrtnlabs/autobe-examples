import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItem";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
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
import { generate_random_shopping_mall_customer_customers_me_orders_create } from "../../../generate/generate_random_shopping_mall_customer_customers_me_orders_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";

/**
 * Test the primary success path for retrieving order items from a customer's order.
 * 1. Customer registers and authenticates
 * 2. Customer creates an order with multiple items
 * 3. Customer retrieves order items from their order
 * 4. Validate response structure, pagination, and order item fields
 */
export async function test_api_order_items_retrieve_customer_order(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer authentication
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  // 2. Create an order with multiple items
  const order =
    await generate_random_shopping_mall_customer_customers_me_orders_create(
      customerConnection,
      {},
    );
  typia.assert(order);
  // 3. Retrieve order items from the created order
  const orderItems =
    await api.functional.shoppingMall.customer.orders.items.index(
      customerConnection,
      {
        orderId: order.id,
        body: {} satisfies IShoppingMallOrderItem.IRequest,
      },
    );
  typia.assert(orderItems);
  // 4. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    orderItems.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    orderItems.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records count is positive",
    orderItems.pagination.records > 0,
  );
  TestValidator.predicate(
    "pagination pages is positive",
    orderItems.pagination.pages > 0,
  );
  // 5. Validate order items data
  TestValidator.predicate(
    "order items array is not empty",
    orderItems.data.length > 0,
  );
  // 6. Validate each order item has expected fields
  await ArrayUtil.asyncForEach(orderItems.data, async (item) => {
    // Validate orderId matches the parent order
    TestValidator.equals(
      "order item belongs to correct order",
      item.orderId,
      order.id,
    );
    // Validate status is one of valid values
    TestValidator.predicate(
      "order item has valid status",
      ["paid", "shipped", "delivered", "cancelled", "refunded"].includes(
        item.status,
      ),
    );
    // Validate quantity is positive
    TestValidator.predicate(
      "order item quantity is positive",
      item.quantity > 0,
    );
    // Validate price is non-negative
    TestValidator.predicate(
      "order item price is non-negative",
      item.price >= 0,
    );
  });
  // 7. Verify order items are sorted by created_at DESC (default)
  if (orderItems.data.length > 1) {
    TestValidator.predicate("order items are sorted by created_at DESC", () => {
      for (let i = 1; i < orderItems.data.length; i++) {
        if (
          new Date(orderItems.data[i].createdAt).getTime() >
          new Date(orderItems.data[i - 1].createdAt).getTime()
        ) {
          return false;
        }
      }
      return true;
    });
  }
}
