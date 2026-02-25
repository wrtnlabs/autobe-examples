import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderAddress";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemVariantOption";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";

export async function test_api_order_force_refund_delivered_order(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup admin account and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      name: RandomGenerator.name(),
    },
  });
  typia.assert(admin);
  // 2. Setup customer account and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  typia.assert(customer);
  // 3. Create an order that will be force-refunded
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {},
  );
  typia.assert(order);
  // Store original order item statuses for verification
  const originalStatuses = order.orderItems.map((item) => item.status);
  // 4. Admin performs force-refund on the order
  const refundReason = "Customer dispute resolution - order delivery issue";
  const refundedOrder =
    await api.functional.shoppingMall.admin.orders.force_refund.forceRefund(
      adminConnection,
      {
        orderId: order.id,
        body: {
          reason: refundReason,
        } satisfies IShoppingMallOrder.IForceRefund,
      },
    );
  typia.assert(refundedOrder);
  // 5. Validate response - order ID matches
  TestValidator.equals("order id matches", refundedOrder.id, order.id);
  // 6. Validate order status is refunded
  TestValidator.equals(
    "order status is refunded",
    refundedOrder.status,
    "refunded",
  );
  // 7. Validate all order items have refunded status
  TestValidator.predicate(
    "all order items have refunded status",
    refundedOrder.orderItems.every((item) => item.status === "refunded"),
  );
  // 8. Validate order item count preserved
  TestValidator.equals(
    "order item count preserved",
    refundedOrder.orderItems.length,
    order.orderItems.length,
  );
  // 9. Validate order number preserved
  TestValidator.equals(
    "order number preserved",
    refundedOrder.order_number,
    order.order_number,
  );
  // 10. Validate customer info preserved
  TestValidator.equals(
    "customer id preserved",
    refundedOrder.customer.id,
    order.customer.id,
  );
}
