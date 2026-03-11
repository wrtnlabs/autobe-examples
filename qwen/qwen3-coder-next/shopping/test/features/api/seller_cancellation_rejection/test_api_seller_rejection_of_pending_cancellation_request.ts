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
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_customer_orders_items_cancel } from "../../../generate/generate_random_ecommerce_mall_customer_orders_items_cancel";
import { prepare_random_ecommerce_mall_cancellation_request } from "../../../prepare/prepare_random_ecommerce_mall_cancellation_request";

export async function test_api_seller_rejection_of_pending_cancellation_request(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create multiple actors
  const customerConnection: api.IConnection = { host: connection.host };
  const seller1Connection: api.IConnection = { host: connection.host };
  const seller2Connection: api.IConnection = { host: connection.host };
  // 2. Register and login customer
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  // 3. Register sellers
  const seller1 = await authorize_seller_join(seller1Connection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  const seller2 = await authorize_seller_join(seller2Connection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  // 4. Customer places first order (paid item)
  const order =
    await api.functional.ecommerceMall.customer.orders.create(
      customerConnection,
    );
  typia.assert(order);
  const orderItem = order.order_items[0];
  // 5. Customer requests cancellation for a paid item
  const cancelRequest =
    await api.functional.ecommerceMall.customer.orders.items.cancel(
      customerConnection,
      {
        orderId: order.id,
        orderItemId: orderItem.id,
        body: {
          reason: RandomGenerator.paragraph({ sentences: 2 }),
          status: "pending" as const,
          order_item_id: orderItem.id,
          seller_id: seller1.id,
          customer_id: order.customer.id,
        } satisfies IEcommerceMallCancellationRequest.ICreate,
      },
    );
  typia.assert(cancelRequest);
  TestValidator.equals(
    "initial status is pending",
    cancelRequest.status,
    "pending",
  );
  // 6. Seller1 rejects the pending request
  const rejectedRequest =
    await api.functional.ecommerceMall.seller.orders.items.cancel.reject(
      seller1Connection,
      {
        orderId: order.id,
        orderItemId: orderItem.id,
        body: {
          reason: "Customer changed mind after verification",
        } satisfies IEcommerceMallCancellationRequest.IUpdate,
      },
    );
  typia.assert(rejectedRequest);
  TestValidator.equals(
    "status changed to rejected",
    rejectedRequest.status,
    "rejected",
  );
  TestValidator.predicate(
    "rejection timestamp exists",
    () => !!rejectedRequest.responded_at,
  );
  // 7. Test: Rejection of already-approved request should fail
  await TestValidator.error("already approved rejection fails", async () => {
    await api.functional.ecommerceMall.seller.orders.items.cancel.reject(
      seller1Connection,
      {
        orderId: order.id,
        orderItemId: orderItem.id,
        body: {
          reason: "Cannot reject approved request",
        } satisfies IEcommerceMallCancellationRequest.IUpdate,
      },
    );
  });
  // 8. Test: Wrong seller rejection should fail
  await TestValidator.error("wrong seller rejection fails", async () => {
    await api.functional.ecommerceMall.seller.orders.items.cancel.reject(
      seller2Connection,
      {
        orderId: order.id,
        orderItemId: orderItem.id,
        body: {
          reason: "Seller2 cannot reject seller1's order",
        } satisfies IEcommerceMallCancellationRequest.IUpdate,
      },
    );
  });
  // 9. Customer places second order for shipped item test
  const shippedOrder =
    await api.functional.ecommerceMall.customer.orders.create(
      customerConnection,
    );
  typia.assert(shippedOrder);
  const shippedItem = shippedOrder.order_items[0];
  // 10. Test: Rejection of shipped item should fail
  await TestValidator.error("shipped item rejection fails", async () => {
    await api.functional.ecommerceMall.seller.orders.items.cancel.reject(
      seller1Connection,
      {
        orderId: shippedOrder.id,
        orderItemId: shippedItem.id,
        body: {
          reason: "Cannot reject shipped item",
        } satisfies IEcommerceMallCancellationRequest.IUpdate,
      },
    );
  });
}
