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
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
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
import { generate_random_ecommerce_mall_customer_orders_items_refund_request_refund } from "../../../generate/generate_random_ecommerce_mall_customer_orders_items_refund_request_refund";
import { prepare_random_ecommerce_mall_cancellation_request } from "../../../prepare/prepare_random_ecommerce_mall_cancellation_request";
import { prepare_random_ecommerce_mall_refund_request } from "../../../prepare/prepare_random_ecommerce_mall_refund_request";

export async function test_api_customer_refund_request_for_cancelled_item_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email"> & tags.MinLength<1>>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Create order with product
  const orders =
    await api.functional.ecommerceMall.customer.orders.create(
      customerConnection,
    );
  typia.assert(orders);
  if (!orders.order_items || orders.order_items.length === 0) {
    throw new Error("No order items found");
  }
  const orderItem = orders.order_items[0];
  // 3. Cancel the order item
  const cancellation =
    await api.functional.ecommerceMall.customer.orders.items.cancel(
      customerConnection,
      {
        orderId: orders.id,
        orderItemId: orderItem.id,
        body: {
          reason: "Customer changed mind",
          status: "pending" as const,
          order_item_id: orderItem.id,
          seller_id: orderItem.seller.id,
          customer_id: customer.customer.id,
        } satisfies IEcommerceMallCancellationRequest.ICreate,
      },
    );
  typia.assert(cancellation);
  // Verify cancellation was created
  TestValidator.equals("cancellation created", cancellation.status, "pending");
  // 4. Attempt refund request for cancelled item
  // Refund should be rejected because item is already cancelled
  await TestValidator.error("refund rejected for cancelled item", async () => {
    await api.functional.ecommerceMall.customer.orders.items.refund.requestRefund(
      customerConnection,
      {
        orderId: orders.id,
        orderItemId: orderItem.id,
        body: {
          order_item_id: orderItem.id,
          reason: "Refund request for cancelled item",
        } satisfies IEcommerceMallRefundRequest.ICreate,
      },
    );
  });
}
