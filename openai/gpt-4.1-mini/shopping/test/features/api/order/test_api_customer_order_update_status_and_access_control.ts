import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function test_api_customer_order_update_status_and_access_control(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successful update of an existing customer order by the authenticated customer.
  {
    // Create first customer and authorize
    const customer1Connection: api.IConnection = { host: connection.host };
    const customer1Authorized = await authorize_customer_join(
      customer1Connection,
      { body: undefined },
    );
    customer1Connection.headers ??= {};
    customer1Connection.headers.Authorization =
      customer1Authorized.token.access;
    // Create an order for the first customer
    const createdOrder =
      await generate_random_shopping_mall_customer_orders_create(
        customer1Connection,
        { body: undefined },
      );
    typia.assert(createdOrder);
    // Prepare update payload - change totalPrice, totalQuantity, orderStatus
    const newTotalPrice = createdOrder.totalPrice + 100;
    const newTotalQuantity = (createdOrder.totalQuantity + 1) satisfies number &
      tags.Type<"int32">;
    const newOrderStatus =
      createdOrder.orderStatus === "paid" ? "shipped" : "paid";
    const updateBody: IShoppingMallOrder.IUpdate = {
      totalPrice: newTotalPrice,
      totalQuantity: newTotalQuantity,
      orderStatus: newOrderStatus,
    };
    // Update the order
    const updatedOrder =
      await api.functional.shoppingMall.customer.orders.updateOrder(
        customer1Connection,
        {
          orderId: createdOrder.id,
          body: updateBody,
        },
      );
    typia.assert(updatedOrder);
    // Validate updated fields
    TestValidator.equals(
      "updated totalPrice",
      updatedOrder.totalPrice,
      newTotalPrice,
    );
    TestValidator.equals(
      "updated totalQuantity",
      updatedOrder.totalQuantity,
      newTotalQuantity,
    );
    TestValidator.equals(
      "updated orderStatus",
      updatedOrder.orderStatus,
      newOrderStatus,
    );
    TestValidator.equals(
      "order id unchanged",
      updatedOrder.id,
      createdOrder.id,
    );
  }
  // Scenario 2: Attempt to update a non-existent order.
  {
    // Create a customer and authorize
    const customer2Connection: api.IConnection = { host: connection.host };
    const customer2Authorized = await authorize_customer_join(
      customer2Connection,
      { body: undefined },
    );
    customer2Connection.headers ??= {};
    customer2Connection.headers.Authorization =
      customer2Authorized.token.access;
    // Use a random invalid orderId
    const invalidOrderId = typia.random<string & tags.Format<"uuid">>();
    await TestValidator.error("update non-existent order fails", async () => {
      await api.functional.shoppingMall.customer.orders.updateOrder(
        customer2Connection,
        {
          orderId: invalidOrderId,
          body: {
            orderStatus: "shipped",
          } satisfies IShoppingMallOrder.IUpdate,
        },
      );
    });
  }
  // Scenario 3: Unauthorized customer tries to update another customer's order.
  {
    // Create two customers and authorize
    const customer3Connection: api.IConnection = { host: connection.host };
    const customer3Authorized = await authorize_customer_join(
      customer3Connection,
      { body: undefined },
    );
    customer3Connection.headers ??= {};
    customer3Connection.headers.Authorization =
      customer3Authorized.token.access;
    const customer4Connection: api.IConnection = { host: connection.host };
    const customer4Authorized = await authorize_customer_join(
      customer4Connection,
      { body: undefined },
    );
    customer4Connection.headers ??= {};
    customer4Connection.headers.Authorization =
      customer4Authorized.token.access;
    // Customer 3 creates an order
    const orderByCustomer3 =
      await generate_random_shopping_mall_customer_orders_create(
        customer3Connection,
        { body: undefined },
      );
    typia.assert(orderByCustomer3);
    // Customer 4 attempts to update Customer 3's order - should fail
    await TestValidator.error(
      "unauthorized update attempt forbidden",
      async () => {
        await api.functional.shoppingMall.customer.orders.updateOrder(
          customer4Connection,
          {
            orderId: orderByCustomer3.id,
            body: {
              orderStatus: "shipped",
            } satisfies IShoppingMallOrder.IUpdate,
          },
        );
      },
    );
  }
}
