import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_mall_customer_orders_items_cancel } from "../../../generate/generate_random_ecommerce_mall_customer_orders_items_cancel";
import { prepare_random_ecommerce_mall_cancellation_request } from "../../../prepare/prepare_random_ecommerce_mall_cancellation_request";

export async function test_api_customer_order_item_cancellation_rejection_for_shipped_item(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and login customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerCredentials = {
    email: typia.random<string & tags.Format<"email"> & tags.MinLength<1>>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
  } satisfies IEcommerceMallCustomer.IJoin;
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: customerCredentials,
  });
  typia.assert(customerAuth);
  // 2. Create an order (this will have items with status 'paid')
  const order =
    await api.functional.ecommerceMall.customer.orders.create(
      customerConnection,
    );
  typia.assert(order);
  TestValidator.predicate("order has items", order.order_items.length > 0);
  // 3. Get the first order item (should be 'paid' status)
  const orderItem = order.order_items[0];
  TestValidator.equals("item status is paid", orderItem.item_status, "paid");
  // 4. Test rejection for cancellation request with invalid customer ID
  const invalidCancellationRequest: IEcommerceMallCancellationRequest.ICreate =
    {
      reason: "Changed my mind",
      status: "pending",
      order_item_id: orderItem.id,
      seller_id: orderItem.seller.id,
      customer_id: typia.random<string & tags.Format<"uuid">>(), // Use invalid customer ID
    } satisfies IEcommerceMallCancellationRequest.ICreate;
  await TestValidator.error("rejection for invalid customer ID", async () => {
    await api.functional.ecommerceMall.customer.orders.items.cancel(
      customerConnection,
      {
        orderId: order.id,
        orderItemId: orderItem.id,
        body: invalidCancellationRequest,
      },
    );
  });
  // 5. Test rejection for cancellation request with non-existent order
  await TestValidator.error("rejection for non-existent order", async () => {
    await api.functional.ecommerceMall.customer.orders.items.cancel(
      customerConnection,
      {
        orderId: typia.random<string & tags.Format<"uuid">>(),
        orderItemId: orderItem.id,
        body: invalidCancellationRequest,
      },
    );
  });
  // 6. Test rejection for cancellation request with non-existent order item
  await TestValidator.error(
    "rejection for non-existent order item",
    async () => {
      await api.functional.ecommerceMall.customer.orders.items.cancel(
        customerConnection,
        {
          orderId: order.id,
          orderItemId: typia.random<string & tags.Format<"uuid">>(),
          body: invalidCancellationRequest,
        },
      );
    },
  );
}
