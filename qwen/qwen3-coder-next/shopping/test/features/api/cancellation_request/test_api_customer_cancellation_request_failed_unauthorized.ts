import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { generate_random_shopping_mall_customer_orders_items_cancellation_requests_create_cancellation_request } from "../../../generate/generate_random_shopping_mall_customer_orders_items_cancellation_requests_create_cancellation_request";
import { prepare_random_shopping_mall_cancellation_request } from "../../../prepare/prepare_random_shopping_mall_cancellation_request";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";

export async function test_api_customer_cancellation_request_failed_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer A session
  const customerAConnection: api.IConnection = { host: connection.host };
  await api.functional.shoppingMall.auth.customer.join(customerAConnection, {
    body: typia.random<IShoppingMallCustomer.IJoin>(),
  });
  // 2. Create customer B session
  const customerBConnection: api.IConnection = { host: connection.host };
  await api.functional.shoppingMall.auth.customer.join(customerBConnection, {
    body: typia.random<IShoppingMallCustomer.IJoin>(),
  });
  // 3. Customer B places an order
  const order = await api.functional.shoppingMall.customer.orders.create(
    customerBConnection,
    {
      body: typia.random<IShoppingMallOrder.ICreate>(),
    },
  );
  typia.assert(order);
  // 4. Get the first order item from the created order
  const orderItem = (order as any).items?.[0];
  if (!orderItem) {
    throw new Error("Order has no items");
  }
  // 5. Customer A attempts to request cancellation for Customer B's order item
  await TestValidator.error(
    "customer A unauthorized cancellation request",
    async () => {
      await api.functional.shoppingMall.customer.orders.items.cancellation_requests.createCancellationRequest(
        customerAConnection,
        {
          orderId: (order as any).id,
          itemId: orderItem.id,
          body: typia.random<IShoppingMallCancellationRequest.ICreate>(),
        },
      );
    },
  );
}