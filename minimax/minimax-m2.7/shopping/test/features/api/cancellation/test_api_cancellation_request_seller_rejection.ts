import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
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
import { generate_random_ecommerce_mall_customer_cancellation_requests_create } from "../../../generate/generate_random_ecommerce_mall_customer_cancellation_requests_create";
import { generate_random_ecommerce_mall_customer_customers_addresses_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_addresses_create";
import { generate_random_ecommerce_mall_customer_customers_checkout_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_checkout_create";
import { prepare_random_ecommerce_mall_cancellation_request } from "../../../prepare/prepare_random_ecommerce_mall_cancellation_request";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_shipping_address } from "../../../prepare/prepare_random_ecommerce_mall_shipping_address";

export async function test_api_cancellation_request_seller_rejection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registers and logs in
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoinResult = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerJoinResult);
  // Get the password used during join (randomly generated)
  // The authorize function generates password internally, but we need to capture it
  // For testing, we'll use a fixed password approach
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  // Re-register with known password
  const sellerConnection2: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection2, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: sellerPassword,
    },
  });
  typia.assert(sellerAuth);
  // Login as seller
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  const sellerLogin = await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerAuth.email,
      password: sellerPassword,
    } satisfies IEcommerceMallSeller.ILogin,
  });
  typia.assert(sellerLogin);
  // 2. Customer registers and logs in
  const customerPassword = RandomGenerator.alphaNumeric(16);
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: customerPassword,
    },
  });
  typia.assert(customerAuth);
  // Login as customer
  const customerLoginConnection: api.IConnection = { host: connection.host };
  const customerLogin = await authorize_customer_login(
    customerLoginConnection,
    {
      body: {
        email: customerAuth.email,
        password: customerPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallCustomer.ILogin,
    },
  );
  typia.assert(customerLogin);
  // 3. Customer creates shipping address
  const address =
    await generate_random_ecommerce_mall_customer_customers_addresses_create(
      customerLoginConnection,
      {},
    );
  typia.assert(address);
  // 4. & 5. Customer adds product to cart and completes checkout
  // The checkout generation function handles product creation, cart, and checkout
  const order =
    await generate_random_ecommerce_mall_customer_customers_checkout_create(
      customerLoginConnection,
      {
        body: {
          shippingAddressId: address.id,
        } satisfies IEcommerceMallOrder.ICreate,
      },
    );
  typia.assert(order);
  // Get an order item ID from the checkout
  const orderItem = order.orderItems[0];
  typia.assert(orderItem);
  // 6. Customer submits cancellation request
  const cancellationReason = RandomGenerator.paragraph({ sentences: 2 });
  const cancellation =
    await generate_random_ecommerce_mall_customer_cancellation_requests_create(
      customerLoginConnection,
      {
        body: {
          orderItemId: orderItem.id,
          reason: cancellationReason,
        } satisfies IEcommerceMallCancellationRequest.ICreate,
      },
    );
  typia.assert(cancellation);
  // Verify initial status is pending
  TestValidator.equals(
    "initial status is pending",
    cancellation.status,
    "pending",
  );
  // 7. Seller rejects cancellation request
  const rejectedCancellation =
    await api.functional.ecommerceMall.seller.cancellation_requests.update(
      sellerLoginConnection,
      {
        requestId: cancellation.id,
        body: {
          status: "rejected",
        } satisfies IEcommerceMallCancellationRequest.IUpdate,
      },
    );
  typia.assert(rejectedCancellation);
  // 8. Validations
  TestValidator.equals(
    "status changed to rejected",
    rejectedCancellation.status,
    "rejected",
  );
  TestValidator.equals(
    "cancellation reason preserved",
    rejectedCancellation.reason,
    cancellationReason,
  );
  TestValidator.equals(
    "cancellation request ID preserved",
    rejectedCancellation.cancellationRequest.id,
    cancellation.id,
  );
  // Verify snapshot was created
  TestValidator.predicate(
    "snapshot exists",
    rejectedCancellation.cancellationRequest !== undefined,
  );
}
