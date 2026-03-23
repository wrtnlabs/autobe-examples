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

export async function test_api_seller_refund_rejection_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customerInfo = await api.functional.ecommerceMall.auth.customer.join(
    customerConnection,
    {
      body: {
        email: typia.assert<string & tags.MinLength<1> & tags.Format<"email">>(typia.random<string & tags.Format<"email">>()),
        password: RandomGenerator.alphaNumeric(16),
        name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        href: connection.host,
        referrer: connection.host,
        ip: "127.0.0.1",
      } satisfies IEcommerceMallCustomer.IJoin,
    },
  );
  typia.assert(customerInfo);
  // 2. Create seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerInfo = await api.functional.ecommerceMall.auth.seller.join(
    sellerConnection,
    {
      body: {
        email: typia.assert<string & tags.MinLength<1> & tags.Format<"email">>(typia.random<string & tags.Format<"email">>()),
        password: RandomGenerator.alphaNumeric(16),
        shop_name: RandomGenerator.name(),
      } satisfies IEcommerceMallSeller.IJoin,
    },
  );
  typia.assert(sellerInfo);
  // 3. Login as customer to create order
  const customerLogin = await api.functional.ecommerceMall.auth.customer.login(
    customerConnection,
    {
      body: {
        email: customerInfo.customer.email,
        password: "password123",
        href: connection.host,
        referrer: connection.host,
        ip: "127.0.0.1",
      } satisfies IEcommerceMallCustomer.ILogin,
    },
  );
  typia.assert(customerLogin);
  // 4. Create customer order with delivered item
  const order =
    await api.functional.ecommerceMall.customer.orders.create(
      customerConnection,
    );
  typia.assert(order);
  // 5. Login as seller who fulfilled the order item
  const sellerLogin = await api.functional.ecommerceMall.auth.seller.login(
    sellerConnection,
    {
      body: {
        email: sellerInfo.email,
        password: "password123",
      } satisfies IEcommerceMallSeller.ILogin,
    },
  );
  typia.assert(sellerLogin);
  // 6. Submit refund request for delivered item
  const refundRequest =
    await api.functional.ecommerceMall.customer.orders.items.refund.requestRefund(
      customerConnection,
      {
        orderId: order.id,
        orderItemId: order.order_items[0].id,
        body: {
          order_item_id: order.order_items[0].id,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IEcommerceMallRefundRequest.ICreate,
      },
    );
  typia.assert(refundRequest);
  TestValidator.equals(
    "refund status is pending",
    refundRequest.status,
    "pending",
  );
  // 7. Reject refund request as seller
  const updatedRequest =
    await api.functional.ecommerceMall.seller.orders.items.refund.reject.rejectRefund(
      sellerConnection,
      {
        orderId: order.id,
        orderItemId: order.order_items[0].id,
        body: {
          reason: "Not eligible for refund according to policy",
        } satisfies IEcommerceMallRefundRequest.IUpdate,
      },
    );
  typia.assert(updatedRequest);
  TestValidator.equals(
    "refund status changed to rejected",
    updatedRequest.status,
    "rejected",
  );
  TestValidator.equals(
    "seller matches",
    updatedRequest.seller.id,
    sellerInfo.id,
  );
}