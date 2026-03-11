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

export async function test_api_seller_rejection_of_already_approved_cancellation_request(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer and seller accounts
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  // 2. Login as customer and seller with required fields
  const customerAuth = await authorize_customer_login(customerConnection, {
    body: {
      email: "customer@example.com",
      password: "password123",
      href: "http://localhost:3000/login",
      referrer: "http://localhost:3000/",
      ip: "127.0.0.1",
    } satisfies IEcommerceMallCustomer.ILogin,
  });
  typia.assert(customerAuth);
  const sellerAuth = await authorize_seller_login(sellerConnection, {
    body: {
      email: "seller@example.com",
      password: "password123",
    } satisfies IEcommerceMallSeller.ILogin,
  });
  typia.assert(sellerAuth);
  // 3. Use mock IDs since actual product creation APIs don't exist in seller endpoints
  const productId = typia.random<string & tags.Format<"uuid">>();
  const variantId = typia.random<string & tags.Format<"uuid">>();
  const sellerId = sellerAuth.id;
  // 4. Create order from customer using customer-specific API
  const order =
    await api.functional.ecommerceMall.customer.orders.create(
      customerConnection,
    );
  typia.assert(order);
  const orderId = order.id;
  const orderItemId = order.order_items[0].id;
  // 5. Customer requests cancellation
  const cancellationRequest =
    await api.functional.ecommerceMall.customer.orders.items.cancel(
      customerConnection,
      {
        orderId: orderId,
        orderItemId: orderItemId,
        body: {
          reason: RandomGenerator.paragraph({ sentences: 2 }),
          status: "pending",
          order_item_id: orderItemId,
          seller_id: sellerId,
          customer_id: customerAuth.customer.id,
        } satisfies IEcommerceMallCancellationRequest.ICreate,
      },
    );
  typia.assert(cancellationRequest);
  // 6. Seller approves cancellation
  await api.functional.ecommerceMall.seller.orders.items.cancel.approve.approveCancellation(
    sellerConnection,
    {
      orderId: orderId,
      orderItemId: orderItemId,
    },
  );
  // 7. Seller attempts to reject already-approved cancellation (should fail)
  await TestValidator.error(
    "reject already-approved cancellation",
    async () => {
      await api.functional.ecommerceMall.seller.orders.items.cancel.reject(
        sellerConnection,
        {
          orderId: orderId,
          orderItemId: orderItemId,
          body: {
            reason: "Changed my mind",
          } satisfies IEcommerceMallCancellationRequest.IUpdate,
        },
      );
    },
  );
}
