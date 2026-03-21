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

export async function test_api_cancellation_request_already_processed(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  // 2. Create and authenticate customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  // 3. Customer creates shipping address for checkout
  const address =
    await generate_random_ecommerce_mall_customer_customers_addresses_create(
      customerConnection,
      {},
    );
  typia.assert(address);
  // 4. Customer adds item to cart (using existing product variant)
  const cartItem =
    await generate_random_ecommerce_mall_customer_cart_items_create(
      customerConnection,
      {},
    );
  typia.assert(cartItem);
  // 5. Customer places order via checkout
  const order =
    await api.functional.ecommerceMall.customer.checkout.confirm.create(
      customerConnection,
      {
        body: {
          payment_token: "test_payment_token_" + RandomGenerator.alphabets(10),
          address_id: address.id,
        } satisfies IEcommerceMallCheckoutConfirm.IRequest,
      },
    );
  typia.assert(order);
  // Get the order item ID for cancellation request
  const orderItem = order.orderItems[0];
  const orderItemId = orderItem.id;
  // 6. Customer creates cancellation request for the order item
  const cancellationList =
    await api.functional.ecommerceMall.customer.cancellation_requests.index(
      customerConnection,
      {
        body: {
          customer_id: customer.id,
          status: "pending",
        } satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(cancellationList);
  // Find the cancellation request for our order item
  const cancellationRequest = cancellationList.data.find(
    (cr) => cr.orderItem.id === orderItemId,
  );
  if (!cancellationRequest) {
    throw new Error("Cancellation request not found");
  }
  typia.assert(cancellationRequest);
  // 7. Seller approves the cancellation request
  const approvedRequest =
    await api.functional.ecommerceMall.seller.cancellation_requests.approve(
      sellerConnection,
      {
        requestId: cancellationRequest.id,
      },
    );
  typia.assert(approvedRequest);
  // Verify the cancellation request is now approved
  TestValidator.equals(
    "cancellation request status is approved",
    approvedRequest.status,
    "approved",
  );
  // 8. Attempt to update the already approved cancellation request (should fail)
  await TestValidator.error(
    "cannot update already processed cancellation request",
    async () => {
      await api.functional.ecommerceMall.seller.cancellation_requests.update(
        sellerConnection,
        {
          requestId: approvedRequest.id,
          body: {
            status: "rejected",
          } satisfies IEcommerceMallCancellationRequest.IUpdate,
        },
      );
    },
  );
  // 9. Verify the cancellation request still shows 'approved' status
  const finalCancellationList =
    await api.functional.ecommerceMall.customer.cancellation_requests.index(
      customerConnection,
      {
        body: {
          customer_id: customer.id,
        } satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(finalCancellationList);
  const finalRequest = finalCancellationList.data.find(
    (cr) => cr.id === approvedRequest.id,
  );
  if (!finalRequest) {
    throw new Error("Cancellation request not found after update attempt");
  }
  TestValidator.equals(
    "cancellation request remains approved",
    finalRequest.status,
    "approved",
  );
}
