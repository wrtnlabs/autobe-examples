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

export async function test_api_customer_order_detail_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup customer connection and join
  const customerJoinConnection: api.IConnection = { host: connection.host };
  const authorizedCustomer = await authorize_customer_join(
    customerJoinConnection,
    {},
  );
  typia.assert(authorizedCustomer);
  // Create an authenticated connection for subsequent calls
  const customerConnection: api.IConnection = { host: connection.host };
  customerConnection.headers = {
    Authorization: authorizedCustomer.token.access,
  };
  // 2. Create an order for the authenticated customer
  const createdOrder =
    await generate_random_shopping_mall_customer_orders_create(
      customerConnection,
      {},
    );
  typia.assert(createdOrder);
  // 3. Retrieve detailed order by order id
  const retrievedOrder = await api.functional.shoppingMall.customer.orders.at(
    customerConnection,
    { orderId: createdOrder.id },
  );
  typia.assert(retrievedOrder);
  // Validate main order fields
  TestValidator.equals(
    "order totalPrice",
    retrievedOrder.totalPrice,
    createdOrder.totalPrice,
  );
  TestValidator.equals(
    "order totalQuantity",
    retrievedOrder.totalQuantity,
    createdOrder.totalQuantity,
  );
  TestValidator.equals(
    "order orderStatus",
    retrievedOrder.orderStatus,
    createdOrder.orderStatus,
  );
  // Validate customer summary
  TestValidator.equals(
    "order customer id",
    retrievedOrder.customer.id,
    authorizedCustomer.id,
  );
  TestValidator.equals(
    "order customer email",
    retrievedOrder.customer.email,
    authorizedCustomer.email,
  );
  // Validate that order items, snapshots and order snapshots are arrays
  TestValidator.predicate(
    "order has orderItems",
    Array.isArray(retrievedOrder.orderItems) &&
      retrievedOrder.orderItems.length > 0,
  );
  TestValidator.predicate(
    "order has orderItemSnapshots",
    Array.isArray(retrievedOrder.orderItemSnapshots) &&
      retrievedOrder.orderItemSnapshots.length > 0,
  );
  TestValidator.predicate(
    "order has orderSnapshots",
    Array.isArray(retrievedOrder.orderSnapshots) &&
      retrievedOrder.orderSnapshots.length > 0,
  );
  // Authorization test: ensure other customers cannot access this order
  const otherCustomerJoinConnection: api.IConnection = {
    host: connection.host,
  };
  const otherAuthorizedCustomer = await authorize_customer_join(
    otherCustomerJoinConnection,
    {},
  );
  typia.assert(otherAuthorizedCustomer);
  const otherCustomerConnection: api.IConnection = { host: connection.host };
  otherCustomerConnection.headers = {
    Authorization: otherAuthorizedCustomer.token.access,
  };
  await TestValidator.error(
    "access denied for other customer's order",
    async () => {
      await api.functional.shoppingMall.customer.orders.at(
        otherCustomerConnection,
        {
          orderId: createdOrder.id,
        },
      );
    },
  );
}
