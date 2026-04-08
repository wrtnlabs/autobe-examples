import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckout";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import type { IEcommerceMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlist";
import type { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
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
import { generate_random_ecommerce_mall_customer_customers_me_addresses_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_me_addresses_create";
import { generate_random_ecommerce_mall_customer_customers_me_orders_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_me_orders_create";
import { generate_random_ecommerce_mall_customer_customers_me_orders_items_refund_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_me_orders_items_refund_create";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_refund_request } from "../../../prepare/prepare_random_ecommerce_mall_refund_request";
import { prepare_random_ecommerce_mall_shipping_address } from "../../../prepare/prepare_random_ecommerce_mall_shipping_address";

/**
 * Test the seller's ability to reject a pending refund request without providing a rejection reason.
 *
 * This test validates that the seller can successfully reject a customer refund request
 * even when no rejection reason is provided. According to the schema, the reason field is
 * optional (IEcommerceMallRefundRequest.IReject.reason?: string), meaning sellers are not
 * required to explain their rejection decisions.
 *
 * The test flow ensures:
 * 1. Customer and seller accounts are properly registered and authenticated
 * 2. A complete order-to-refund-request workflow is established
 * 3. The seller can reject the refund request with an empty/null reason body
 * 4. The rejection is properly recorded with timestamps and snapshots
 *
 * Special attention is given to verifying that the optional reason field truly allows
 * rejection without explanation, testing the schema constraint that reason is not mandatory.
 */
export async function test_api_refund_rejection_without_reason(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Register and authenticate as a seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 3. Create shipping address for the customer
  const address =
    await api.functional.ecommerceMall.customer.customers.me.addresses.create(
      customerConnection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          street_address: "123 Test Street",
          city: "Test City",
          state: "Test State",
          postal_code: "12345",
          country: "Test Country",
        } satisfies IEcommerceMallShippingAddress.ICreate,
      },
    );
  typia.assert(address);
  // 4. Create order with items
  const order =
    await api.functional.ecommerceMall.customer.customers.me.orders.create(
      customerConnection,
      {
        body: {
          shippingAddressId: address.id,
        } satisfies IEcommerceMallOrder.ICreate,
      },
    );
  typia.assert(order);
  // 5. Get order item for refund request
  const orderItem = order.orderItems[0];
  typia.assert(orderItem);
  // 6. Submit refund request for the delivered order item
  const refundRequest =
    await api.functional.ecommerceMall.customer.customers.me.orders.items.refund.create(
      customerConnection,
      {
        itemId: orderItem.id,
        body: {
          reason: "Product did not meet expectations",
        } satisfies IEcommerceMallRefundRequest.ICreate,
      },
    );
  typia.assert(refundRequest);
  TestValidator.equals(
    "refund request status is pending",
    refundRequest.status,
    "pending",
  );
  // 7. Seller rejects the refund request WITHOUT providing a reason
  const rejectedRequest =
    await api.functional.ecommerceMall.seller.sellers.me.refund_requests.reject(
      sellerConnection,
      {
        requestId: refundRequest.id,
        body: {} satisfies IEcommerceMallRefundRequest.IReject,
      },
    );
  typia.assert(rejectedRequest);
  // 8. Validate the rejection was successful
  TestValidator.equals(
    "refund request status is rejected",
    rejectedRequest.status,
    "rejected",
  );
  TestValidator.predicate(
    "seller_response_at is populated",
    rejectedRequest.sellerResponseAt !== null,
  );
  // 9. Validate the snapshot was created with the rejection details
  TestValidator.predicate(
    "snapshots exist",
    rejectedRequest.snapshots.length > 0,
  );
  const latestSnapshot =
    rejectedRequest.snapshots[rejectedRequest.snapshots.length - 1];
  typia.assert(latestSnapshot);
  // 10. Validate snapshot contents - seller_response_reason should be null/empty
  TestValidator.equals(
    "snapshot status was pending at rejection time",
    latestSnapshot.snapshotStatus,
    "pending",
  );
  TestValidator.equals(
    "seller response is rejected",
    latestSnapshot.sellerResponse,
    "rejected",
  );
  TestValidator.equals(
    "seller response reason is null or empty",
    latestSnapshot.sellerResponseReason ?? "",
    "",
  );
}
