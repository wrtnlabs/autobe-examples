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
 * Test that a customer can retrieve a refund request snapshot after seller approval.
 *
 * This test validates the complete audit trail functionality for dispute resolution.
 * When a seller approves a refund request, an immutable snapshot is created capturing
 * the state at the moment of approval. This snapshot includes the customer's original
 * reason, the status at that time (pending), and the seller's response (approved).
 *
 * The test flow involves:
 * 1. Customer registration and login
 * 2. Shipping address creation
 * 3. Order creation (which requires a seller to have products)
 * 4. Refund request creation for a delivered order item
 * 5. Seller approval of the refund request (creates snapshot)
 * 6. Customer retrieving the snapshot to verify audit trail
 *
 * Key validations include verifying snapshot_reason matches original refund reason,
 * snapshot_status is 'pending', seller_response is 'approved', and seller_response_reason
 * is null (only populated for rejections). The snapshot also includes nested customer
 * and seller summary objects for complete audit information.
 */
export async function test_api_refund_request_snapshot_retrieval_after_approval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  typia.assert(customerAuth);
  // 2. Create shipping address
  const address =
    await generate_random_ecommerce_mall_customer_customers_me_addresses_create(
      customerConnection,
      {},
    );
  typia.assert(address);
  // 3. Create an order
  const order =
    await generate_random_ecommerce_mall_customer_customers_me_orders_create(
      customerConnection,
      {
        body: {
          shippingAddressId: address.id,
        },
      },
    );
  typia.assert(order);
  // Get an order item to request refund
  const orderItem = order.orderItems?.[0];
  if (!orderItem) {
    throw new Error("No order items found in the created order");
  }
  // 4. Create a refund request for a delivered order item
  const refundRequest =
    await generate_random_ecommerce_mall_customer_customers_me_orders_items_refund_create(
      customerConnection,
      {
        params: {
          itemId: orderItem.id,
        },
        body: {
          reason: "Product did not match description",
        },
      },
    );
  typia.assert(refundRequest);
  // Store the original reason for validation
  const originalReason = refundRequest.reason;
  // 5. Register and authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 6. Approve the refund request to create the snapshot
  const approvedRefund =
    await api.functional.ecommerceMall.seller.sellers.me.refund_requests.approve(
      sellerConnection,
      {
        requestId: refundRequest.id,
      },
    );
  typia.assert(approvedRefund);
  // Get the snapshot ID from the approved refund request
  const snapshot = approvedRefund.snapshots?.[0];
  if (!snapshot) {
    throw new Error("No snapshot was created after approval");
  }
  // 7. Re-authenticate as customer to retrieve the snapshot
  const customerConnection2: api.IConnection = { host: connection.host };
  await authorize_customer_login(customerConnection2, {
    body: {
      email: customerAuth.email,
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 8. Retrieve the snapshot and validate
  const retrievedSnapshot =
    await api.functional.ecommerceMall.customer.refund_requests.snapshots.at(
      customerConnection2,
      {
        requestId: refundRequest.id,
        snapshotId: snapshot.id,
      },
    );
  typia.assert(retrievedSnapshot);
  // Validate snapshot fields
  TestValidator.equals(
    "snapshot_reason matches original",
    retrievedSnapshot.snapshotReason,
    originalReason,
  );
  TestValidator.equals(
    "snapshot_status is pending",
    retrievedSnapshot.snapshotStatus,
    "pending",
  );
  TestValidator.equals(
    "seller_response is approved",
    retrievedSnapshot.sellerResponse,
    "approved",
  );
  TestValidator.equals(
    "seller_response_reason is null for approval",
    retrievedSnapshot.sellerResponseReason,
    null,
  );
  TestValidator.predicate(
    "customer object exists",
    !!retrievedSnapshot.customer,
  );
  TestValidator.predicate("seller object exists", !!retrievedSnapshot.seller);
  TestValidator.predicate(
    "created_at is valid ISO 8601",
    !isNaN(Date.parse(retrievedSnapshot.createdAt)),
  );
  TestValidator.predicate(
    "updated_at is valid ISO 8601",
    !isNaN(Date.parse(retrievedSnapshot.updatedAt)),
  );
}
