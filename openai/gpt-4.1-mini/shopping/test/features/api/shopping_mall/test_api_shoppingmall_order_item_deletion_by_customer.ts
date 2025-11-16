import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";

/**
 * Test deletion of a specific order item within an order by the owning
 * customer.
 *
 * This test ensures that only the owning customer can delete items from their
 * order. It covers the scenario of customers registering, creating orders,
 * adding items, deleting one item, and verifying the consistency and
 * authorization checks.
 *
 * Steps:
 *
 * 1. Customer registers and authenticates.
 * 2. Customer creates a new order.
 * 3. Customer adds order items to the created order.
 * 4. Customer deletes one of the order items.
 * 5. Validate the deleted item is removed and order integrity is intact.
 * 6. Attempt deletion of an order item by a different customer and expect failure.
 */
export async function test_api_shoppingmall_order_item_deletion_by_customer(
  connection: api.IConnection,
) {
  // 1. Register and authenticate customer A
  const customerEmailA: string = typia.random<string & tags.Format<"email">>();
  const customerA: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmailA,
        password: "1234",
        full_name: RandomGenerator.name(),
        ip: null,
        href: "https://example.com/signup",
        referrer: "https://example.com",
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customerA);

  // 2. Customer A creates a new shopping mall order
  const orderCreateBody = {
    order_number: RandomGenerator.alphaNumeric(10),
    status: "pending",
    payment_status: "pending",
    total_amount: 1000,
  } satisfies IShoppingMallOrder.ICreate;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.shoppingMallOrders.create(
      connection,
      {
        body: orderCreateBody,
      },
    );
  typia.assert(order);

  // 3. Customer A adds two order items to the order
  const orderItemBody1 = {
    product_sku_id: typia.random<string & tags.Format<"uuid">>(),
    quantity: 1,
    unit_price: 600,
    status: "pending",
  } satisfies IShoppingMallOrderItem.ICreate;

  const orderItem1: IShoppingMallOrderItem =
    await api.functional.shoppingMall.customer.shoppingMallOrders.orderItems.createOrderItem(
      connection,
      {
        orderId: order.id,
        body: orderItemBody1,
      },
    );
  typia.assert(orderItem1);

  const orderItemBody2 = {
    product_sku_id: typia.random<string & tags.Format<"uuid">>(),
    quantity: 2,
    unit_price: 200,
    status: "pending",
  } satisfies IShoppingMallOrderItem.ICreate;

  const orderItem2: IShoppingMallOrderItem =
    await api.functional.shoppingMall.customer.shoppingMallOrders.orderItems.createOrderItem(
      connection,
      {
        orderId: order.id,
        body: orderItemBody2,
      },
    );
  typia.assert(orderItem2);

  // 4. Customer A deletes orderItem1
  await api.functional.shoppingMall.customer.shoppingMallOrders.orderItems.erase(
    connection,
    {
      orderId: order.id,
      orderItemId: orderItem1.id,
    },
  );

  // 5. Confirm orderItem1 is deleted by trying to delete again (expect error)
  await TestValidator.error(
    "deleting already deleted order item should fail",
    async () => {
      await api.functional.shoppingMall.customer.shoppingMallOrders.orderItems.erase(
        connection,
        {
          orderId: order.id,
          orderItemId: orderItem1.id,
        },
      );
    },
  );

  // 6. Register and authenticate customer B
  const customerEmailB: string = typia.random<string & tags.Format<"email">>();
  const customerB: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmailB,
        password: "1234",
        full_name: RandomGenerator.name(),
        ip: null,
        href: "https://example.com/signup2",
        referrer: "https://example.com",
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customerB);

  // 7. Attempt customer B deleting orderItem2 - should fail
  await TestValidator.error(
    "customer B cannot delete order item of customer A",
    async () => {
      await api.functional.shoppingMall.customer.shoppingMallOrders.orderItems.erase(
        connection,
        {
          orderId: order.id,
          orderItemId: orderItem2.id,
        },
      );
    },
  );

  // 8. Customer A deletes orderItem2
  await api.functional.shoppingMall.customer.shoppingMallOrders.orderItems.erase(
    connection,
    {
      orderId: order.id,
      orderItemId: orderItem2.id,
    },
  );

  // 9. Validate attempting to delete orderItem2 again fails
  await TestValidator.error("deleting a second time should fail", async () => {
    await api.functional.shoppingMall.customer.shoppingMallOrders.orderItems.erase(
      connection,
      {
        orderId: order.id,
        orderItemId: orderItem2.id,
      },
    );
  });
}
