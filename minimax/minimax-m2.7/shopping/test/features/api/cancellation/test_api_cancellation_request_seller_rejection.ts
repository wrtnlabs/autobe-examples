import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequestSnapshot";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCheckoutConfirm } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckoutConfirm";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import type { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCancellationRequest";
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
import { generate_random_ecommerce_mall_customer_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_cart_items_create";
import { generate_random_ecommerce_mall_customer_customers_addresses_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_addresses_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_shipping_address } from "../../../prepare/prepare_random_ecommerce_mall_shipping_address";

export async function test_api_cancellation_request_seller_rejection(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register and authenticate seller
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      password: sellerPassword,
    },
  });
  typia.assert(sellerAuth);
  // Step 2: Register and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  typia.assert(customerAuth);
  // Step 3: Customer creates shipping address
  const address =
    await generate_random_ecommerce_mall_customer_customers_addresses_create(
      customerConnection,
      {},
    );
  typia.assert(address);
  // Step 4: Customer adds item to cart
  const cartItem =
    await generate_random_ecommerce_mall_customer_cart_items_create(
      customerConnection,
      {},
    );
  typia.assert(cartItem);
  // Step 5: Customer checkout to create order with paid order item
  const order =
    await api.functional.ecommerceMall.customer.checkout.confirm.create(
      customerConnection,
      {
        body: {
          payment_token: typia.random<string>(),
          address_id: address.id,
        } satisfies IEcommerceMallCheckoutConfirm.IRequest,
      },
    );
  typia.assert(order);
  // Step 6: Get the order item
  const orderItem = order.orderItems[0];
  // Step 7: Seller authenticates (seller may need approval in real system)
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  const sellerLogin = await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerAuth.email,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.ILogin,
  });
  typia.assert(sellerLogin);
  // Step 8: Get pending cancellation requests for this customer
  const cancellationList =
    await api.functional.ecommerceMall.customer.cancellation_requests.index(
      customerConnection,
      {
        body: {
          customer_id: customerAuth.id,
          status: "pending",
        } satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(cancellationList);
  const pendingCancellation = cancellationList.data[0];
  const cancellationRequestId = pendingCancellation?.id;
  // Step 9: Seller rejects the cancellation request
  const rejection =
    await api.functional.ecommerceMall.seller.cancellation_requests.update(
      sellerLoginConnection,
      {
        requestId: cancellationRequestId,
        body: {
          status: "rejected",
        } satisfies IEcommerceMallCancellationRequest.IUpdate,
      },
    );
  typia.assert(rejection);
  // Step 10: Validate rejection response
  TestValidator.equals(
    "cancellation status is rejected",
    rejection.status,
    "rejected",
  );
  // Verify snapshot was created with rejection status
  TestValidator.predicate(
    "cancellation has snapshots",
    rejection.snapshots.length > 0,
  );
  const latestSnapshot = rejection.snapshots[rejection.snapshots.length - 1];
  TestValidator.equals(
    "snapshot status is rejected",
    latestSnapshot.status,
    "rejected",
  );
  // Verify immutable audit trail - snapshot preserves the reason
  TestValidator.equals(
    "snapshot preserves reason",
    latestSnapshot.reason,
    rejection.reason,
  );
  // Step 11: Verify customer can see the rejection
  const customerCancellationList =
    await api.functional.ecommerceMall.customer.cancellation_requests.index(
      customerConnection,
      {
        body: {
          customer_id: customerAuth.id,
        } satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(customerCancellationList);
  // Find the rejected cancellation in customer's list
  const rejectedCancellation = customerCancellationList.data.find(
    (c) => c.id === cancellationRequestId,
  );
  TestValidator.equals(
    "customer sees rejected status",
    rejectedCancellation?.status,
    "rejected",
  );
}
