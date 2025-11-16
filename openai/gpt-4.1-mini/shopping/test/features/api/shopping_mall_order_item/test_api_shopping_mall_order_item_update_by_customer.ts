import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";

export async function test_api_shopping_mall_order_item_update_by_customer(
  connection: api.IConnection,
) {
  // Step 1: Customer joins to obtain authenticated session
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: "strong_password_123",
        full_name: RandomGenerator.name(),
        ip: null,
        href: "https://shopping.test/join",
        referrer: "https://shopping.test/referrer",
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customer);

  // Step 2: Create a shopping mall order
  const orderNumber = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 5,
    wordMax: 10,
  });
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.shoppingMallOrders.create(
      connection,
      {
        body: {
          order_number: orderNumber,
          status: "pending",
          payment_status: "unpaid",
          total_amount: 10000.5,
        } satisfies IShoppingMallOrder.ICreate,
      },
    );
  typia.assert(order);

  // Step 3: Create an order item under the order
  const productSkuId = typia.random<string & tags.Format<"uuid">>();
  const initialQuantity = 2;
  const initialUnitPrice = 4999.99;
  const initialStatus = "pending" as const;

  const orderItem: IShoppingMallOrderItem =
    await api.functional.shoppingMall.customer.shoppingMallOrders.orderItems.createOrderItem(
      connection,
      {
        orderId: order.id,
        body: {
          product_sku_id: productSkuId,
          quantity: initialQuantity,
          unit_price: initialUnitPrice,
          status: initialStatus,
        } satisfies IShoppingMallOrderItem.ICreate,
      },
    );
  typia.assert(orderItem);

  // Step 4: Update the order item with valid data
  const updatedQuantity = initialQuantity + 3;
  const updatedUnitPrice = initialUnitPrice - 999.99;
  const updatedStatus = "confirmed";

  const orderItemUpdated: IShoppingMallOrderItem =
    await api.functional.shoppingMall.customer.shoppingMallOrders.orderItems.updateOrderItem(
      connection,
      {
        orderId: order.id,
        orderItemId: orderItem.id,
        body: {
          quantity: updatedQuantity,
          unit_price: updatedUnitPrice,
          status: updatedStatus,
        } satisfies IShoppingMallOrderItem.IUpdate,
      },
    );
  typia.assert(orderItemUpdated);

  TestValidator.equals(
    "quantity updated correctly",
    orderItemUpdated.quantity,
    updatedQuantity,
  );
  TestValidator.equals(
    "unit price updated correctly",
    orderItemUpdated.unit_price,
    updatedUnitPrice,
  );
  TestValidator.equals(
    "status updated correctly",
    orderItemUpdated.status,
    updatedStatus,
  );

  // Step 5: Attempt to update with invalid quantity (negative) and expect error
  await TestValidator.error("reject negative quantity update", async () => {
    await api.functional.shoppingMall.customer.shoppingMallOrders.orderItems.updateOrderItem(
      connection,
      {
        orderId: order.id,
        orderItemId: orderItem.id,
        body: {
          quantity: -5, // invalid negative quantity
        } satisfies IShoppingMallOrderItem.IUpdate,
      },
    );
  });

  // Step 6: Attempt to update order item with non-existent order id, expect error
  const fakeOrderId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "reject update with non-existent order",
    async () => {
      await api.functional.shoppingMall.customer.shoppingMallOrders.orderItems.updateOrderItem(
        connection,
        {
          orderId: fakeOrderId,
          orderItemId: orderItem.id,
          body: {
            quantity: 1,
          } satisfies IShoppingMallOrderItem.IUpdate,
        },
      );
    },
  );

  // Step 7: Attempt to update order item with non-existent order item id, expect error
  const fakeOrderItemId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "reject update with non-existent order item",
    async () => {
      await api.functional.shoppingMall.customer.shoppingMallOrders.orderItems.updateOrderItem(
        connection,
        {
          orderId: order.id,
          orderItemId: fakeOrderItemId,
          body: {
            quantity: 1,
          } satisfies IShoppingMallOrderItem.IUpdate,
        },
      );
    },
  );

  // Step 8: Attempt to update order item without authentication (empty headers) expect failure
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error("unauthenticated update rejected", async () => {
    await api.functional.shoppingMall.customer.shoppingMallOrders.orderItems.updateOrderItem(
      unauthenticatedConnection,
      {
        orderId: order.id,
        orderItemId: orderItem.id,
        body: {
          status: "shipped",
        } satisfies IShoppingMallOrderItem.IUpdate,
      },
    );
  });
}
