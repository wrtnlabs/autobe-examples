import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";

export async function test_api_shopping_mall_order_item_creation_by_customer(
  connection: api.IConnection,
) {
  // 1. Customer registration via join endpoint for authentication
  const email = typia.random<string & tags.Format<"email">>();
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email,
        password: "P@ssw0rd!",
        full_name: RandomGenerator.name(),
        ip: null,
        href: "https://example.com/signup",
        referrer: "https://example.com",
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customer);

  // 2. Create a shopping mall order
  const orderNumber = `ORD-${Date.now()}-${RandomGenerator.alphaNumeric(5)}`;
  const orderCreateBody = {
    order_number: orderNumber,
    status: "pending",
    payment_status: "pending",
    total_amount: Number((Math.random() * 1000 + 10).toFixed(2)),
  } satisfies IShoppingMallOrder.ICreate;
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.shoppingMallOrders.create(
      connection,
      {
        body: orderCreateBody,
      },
    );
  typia.assert(order);
  TestValidator.equals("order number matches", order.order_number, orderNumber);
  TestValidator.equals("order status is pending", order.status, "pending");

  // 3. Add an order item to the created order with valid SKU, quantity, price, and status
  const quantityValue = Math.floor(Math.random() * 10) + 1;
  const orderItemCreateBody = {
    product_sku_id: typia.random<string & tags.Format<"uuid">>(),
    quantity: quantityValue,
    unit_price: 99.99,
    status: "pending",
  } satisfies IShoppingMallOrderItem.ICreate;

  const orderItem: IShoppingMallOrderItem =
    await api.functional.shoppingMall.customer.shoppingMallOrders.orderItems.createOrderItem(
      connection,
      {
        orderId: order.id,
        body: orderItemCreateBody,
      },
    );
  typia.assert(orderItem);

  TestValidator.equals(
    "order item linked to correct order",
    orderItem.shopping_mall_order_id,
    order.id,
  );
  TestValidator.equals(
    "order item quantity matches",
    orderItem.quantity,
    quantityValue,
  );
  TestValidator.equals(
    "order item unit price matches",
    orderItem.unit_price,
    99.99,
  );
  TestValidator.equals(
    "order item status matches",
    orderItem.status,
    "pending",
  );

  // 4. Test adding order item to non-existing order should fail
  const fakeOrderId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "adding order item to non-existing order should fail",
    async () => {
      await api.functional.shoppingMall.customer.shoppingMallOrders.orderItems.createOrderItem(
        connection,
        {
          orderId: fakeOrderId,
          body: {
            product_sku_id: typia.random<string & tags.Format<"uuid">>(),
            quantity: 1,
            unit_price: 99.99,
            status: "pending",
          } satisfies IShoppingMallOrderItem.ICreate,
        },
      );
    },
  );

  // 5. Test quantity validation: zero or negative quantities should be rejected
  await TestValidator.error(
    "creating order item with zero quantity should fail",
    async () => {
      await api.functional.shoppingMall.customer.shoppingMallOrders.orderItems.createOrderItem(
        connection,
        {
          orderId: order.id,
          body: {
            product_sku_id: typia.random<string & tags.Format<"uuid">>(),
            quantity: 0,
            unit_price: 99.99,
            status: "pending",
          } satisfies IShoppingMallOrderItem.ICreate,
        },
      );
    },
  );

  await TestValidator.error(
    "creating order item with negative quantity should fail",
    async () => {
      await api.functional.shoppingMall.customer.shoppingMallOrders.orderItems.createOrderItem(
        connection,
        {
          orderId: order.id,
          body: {
            product_sku_id: typia.random<string & tags.Format<"uuid">>(),
            quantity: -5,
            unit_price: 99.99,
            status: "pending",
          } satisfies IShoppingMallOrderItem.ICreate,
        },
      );
    },
  );
}
