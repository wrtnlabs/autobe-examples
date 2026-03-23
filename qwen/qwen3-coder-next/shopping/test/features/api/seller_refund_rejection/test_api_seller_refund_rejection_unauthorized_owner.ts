import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
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
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_customer_orders_items_refund_request_refund } from "../../../generate/generate_random_ecommerce_mall_customer_orders_items_refund_request_refund";
import { prepare_random_ecommerce_mall_refund_request } from "../../../prepare/prepare_random_ecommerce_mall_refund_request";

export async function test_api_seller_refund_rejection_unauthorized_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and login as Customer A
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email"> & tags.MinLength<1>>(),
      password: "1234",
      name: RandomGenerator.name(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  // 2. Register and login as Seller A (the seller who fulfilled the order)
  const sellerAConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email"> & tags.MinLength<1>>(),
      password: "1234",
      shop_name: RandomGenerator.name(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  // 3. Create an order (without creating product first - use available API)
  const order =
    await api.functional.ecommerceMall.customer.orders.create(
      customerConnection,
    );
  typia.assert(order);
  // 4. Create refund request for the first order item
  const orderItem = order.order_items[0];
  const refundRequest =
    await api.functional.ecommerceMall.customer.orders.items.refund.requestRefund(
      customerConnection,
      {
        orderId: order.id,
        orderItemId: orderItem.id,
        body: {
          order_item_id: orderItem.id,
          reason: "Item not as described",
        } satisfies IEcommerceMallRefundRequest.ICreate,
      },
    );
  typia.assert(refundRequest);
  // Verify refund request was created with pending status
  TestValidator.equals(
    "refund status is pending",
    refundRequest.status,
    "pending",
  );
  // 5. Register and login as Seller B (different seller trying to reject)
  const sellerBConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email"> & tags.MinLength<1>>(),
      password: "1234",
      shop_name: RandomGenerator.name(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  // 6. Seller B attempts to reject refund for item fulfilled by Seller A
  // Expected: 403 Forbidden because sellers can only reject refunds for their own items
  await TestValidator.error(
    "seller B cannot reject refund for item not fulfilled by them",
    async () => {
      await api.functional.ecommerceMall.seller.orders.items.refund.reject.rejectRefund(
        sellerBConnection,
        {
          orderId: order.id,
          orderItemId: orderItem.id,
          body: {
            reason: "Unjustified rejection attempt",
          } satisfies IEcommerceMallRefundRequest.IUpdate,
        },
      );
    },
  );
}
