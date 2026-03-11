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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_mall_customer_orders_items_refund_request_refund } from "../../../generate/generate_random_ecommerce_mall_customer_orders_items_refund_request_refund";
import { prepare_random_ecommerce_mall_refund_request } from "../../../prepare/prepare_random_ecommerce_mall_refund_request";

export async function test_api_customer_refund_request_within_window(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer account for refund request
  const customerConnection: api.IConnection = { host: connection.host };
  const customerData = {
    email: typia.random<string & tags.MinLength<1> & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IEcommerceMallCustomer.IJoin;
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: customerData,
  });
  typia.assert(customerAuth);
  // 2. Create order with delivered item for refund
  const order =
    await api.functional.ecommerceMall.customer.orders.create(
      customerConnection,
    );
  typia.assert(order);
  typia.assert(order.order_items.length > 0);
  // 3. Find delivered order item for refund
  const orderItems =
    await api.functional.ecommerceMall.customer.orders.items.at(
      customerConnection,
      { orderId: order.id },
    );
  typia.assert(orderItems);
  const deliveredItem = orderItems.data.find(
    (item) => item.item_status === "delivered",
  );
  TestValidator.predicate("has delivered item", deliveredItem !== undefined);
  // 4. Submit refund request
  const refundReason = RandomGenerator.paragraph({ sentences: 2 });
  const refundRequest =
    await api.functional.ecommerceMall.customer.orders.items.refund.requestRefund(
      customerConnection,
      {
        orderId: order.id,
        orderItemId: deliveredItem!.id,
        body: {
          order_item_id: deliveredItem!.id,
          reason: refundReason,
        } satisfies IEcommerceMallRefundRequest.ICreate,
      },
    );
  typia.assert(refundRequest);
  // 5. Validate refund request
  TestValidator.equals(
    "customer matches",
    refundRequest.customer.id,
    customerAuth.customer.id,
  );
  TestValidator.equals(
    "seller matches",
    refundRequest.seller.id,
    deliveredItem!.seller.id,
  );
  TestValidator.equals(
    "order item matches",
    refundRequest.order_item_id,
    deliveredItem!.id,
  );
  TestValidator.equals("reason matches", refundRequest.reason, refundReason);
  TestValidator.equals("status is pending", refundRequest.status, "pending");
  TestValidator.predicate(
    "created_at exists",
    refundRequest.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at exists",
    refundRequest.updated_at !== undefined,
  );
  TestValidator.equals(
    "order_item status",
    refundRequest.orderItem.item_status,
    "delivered",
  );
  TestValidator.equals(
    "order_item product_id",
    refundRequest.orderItem.product.id,
    deliveredItem!.product.id,
  );
  TestValidator.equals(
    "order_item variant_id",
    refundRequest.orderItem.variant.id,
    deliveredItem!.variant.id,
  );
  TestValidator.equals(
    "order_item seller_id",
    refundRequest.orderItem.seller.id,
    deliveredItem!.seller.id,
  );
  TestValidator.equals(
    "order_item product_name",
    refundRequest.orderItem.product_name,
    deliveredItem!.product_name,
  );
  TestValidator.equals(
    "order_item variant_options",
    refundRequest.orderItem.variant_options,
    deliveredItem!.variant_options,
  );
  TestValidator.equals(
    "order_item product_price",
    refundRequest.orderItem.product_price,
    deliveredItem!.product_price,
  );
  TestValidator.equals(
    "order_item quantity",
    refundRequest.orderItem.quantity,
    deliveredItem!.quantity,
  );
}
