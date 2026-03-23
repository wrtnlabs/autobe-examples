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
import { generate_random_ecommerce_mall_customer_refund_requests_create } from "../../../generate/generate_random_ecommerce_mall_customer_refund_requests_create";
import { prepare_random_ecommerce_mall_refund_request } from "../../../prepare/prepare_random_ecommerce_mall_refund_request";

export async function test_api_seller_refund_request_detail_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.Format<"email">>(),
      password: "1234",
      shop_name: RandomGenerator.name(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  // 2. Create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.Format<"email">>(),
      password: "1234",
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  // 3. Login as customer to create order
  await authorize_customer_login(customerConnection, {
    body: {
      email: (customerConnection.headers?.Authorization as string)?.split(" ")?.[1]
        ? typia.random<string & tags.MinLength<1> & tags.Format<"email">>()
        : "unknown@test.com",
      password: "1234",
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
      ip: "127.0.0.1",
    } satisfies IEcommerceMallCustomer.ILogin,
  });
  // 4. Create order
  const order =
    await api.functional.ecommerceMall.customer.orders.create(
      customerConnection,
    );
  typia.assert(order);
  // 5. Create refund request
  const refundRequest =
    await api.functional.ecommerceMall.customer.refund_requests.create(
      customerConnection,
      {
        body: {
          order_item_id: order.order_items[0].id,
          reason: "Not satisfied with the product",
        } satisfies IEcommerceMallRefundRequest.ICreate,
      },
    );
  typia.assert(refundRequest);
  // 6. Login as seller
  await authorize_seller_login(sellerConnection, {
    body: {
      email: (sellerConnection.headers?.Authorization as string)?.split(" ")?.[1]
        ? typia.random<string & tags.MinLength<1> & tags.Format<"email">>()
        : "unknown@test.com",
      password: "1234",
    } satisfies IEcommerceMallSeller.ILogin,
  });
  // 7. Fetch refund request detail by owner
  const sellerIdFromOrder = order.order_items[0].seller.id;
  const refundRequestId = refundRequest.id;
  const result =
    await api.functional.ecommerceMall.seller.sellers.refund_requests.at(
      sellerConnection,
      {
        sellerId: sellerIdFromOrder,
        refundRequestId: refundRequestId,
      },
    );
  typia.assert(result);
  // 8. Validate
  TestValidator.equals("seller matches", result.seller.id, sellerIdFromOrder);
  TestValidator.equals(
    "customer matches",
    result.customer.id,
    order.customer.id,
  );
  TestValidator.equals(
    "order item matches",
    result.orderItem.id,
    order.order_items[0].id,
  );
  TestValidator.equals(
    "reason matches",
    result.reason,
    "Not satisfied with the product",
  );
  TestValidator.equals("status is pending", result.status, "pending");
  TestValidator.predicate(
    "has timestamps",
    result.created_at !== undefined && result.updated_at !== undefined,
  );
}