import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCheckoutConfirm } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckoutConfirm";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
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
import type { IPageIEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallRefundRequest";
import type { IPageIEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallRefundRequestSnapshot";
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
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_customer_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_cart_items_create";
import { generate_random_ecommerce_mall_customer_customers_addresses_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_addresses_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_shipments_create } from "../../../generate/generate_random_ecommerce_mall_seller_shipments_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";
import { prepare_random_ecommerce_mall_shipping_address } from "../../../prepare/prepare_random_ecommerce_mall_shipping_address";

export async function test_api_refund_snapshot_admin_filter_by_seller_response(
  connection: api.IConnection,
): Promise<void> {
  // ============================================================
  // STEP 1: Admin Setup - Authenticate as admin
  // ============================================================
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_login(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
      href: "http://localhost:3000/admin",
      referrer: "http://localhost:3000/",
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  typia.assert(admin);
  // ============================================================
  // STEP 2: Create Seller - Register and login seller for products
  // ============================================================
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: seller.email,
      password: typia.random<string & tags.Format<"password">>(),
      href: "http://localhost:3000/seller",
      referrer: "http://localhost:3000/",
    } satisfies IEcommerceMallSeller.ILogin,
  });
  // Create product for refund scenario
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerLoginConnection,
    {},
  );
  typia.assert(product);
  // ============================================================
  // STEP 3: Create Customer - Register, login, add address, checkout
  // ============================================================
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  typia.assert(customer);
  // Create shipping address
  const address =
    await generate_random_ecommerce_mall_customer_customers_addresses_create(
      customerConnection,
      {},
    );
  typia.assert(address);
  // Add product to cart
  const cartItem =
    await generate_random_ecommerce_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          quantity: 1,
          variant_id: product.variants[0].id,
        },
      },
    );
  typia.assert(cartItem);
  // Checkout - place order
  const order =
    await api.functional.ecommerceMall.customer.checkout.confirm.create(
      customerConnection,
      {
        body: {
          payment_token: "test_payment_token_12345",
          address_id: address.id,
        } satisfies IEcommerceMallCheckoutConfirm.IRequest,
      },
    );
  typia.assert(order);
  // ============================================================
  // STEP 4: Create Shipment and Confirm Delivery
  // ============================================================
  const orderItemId = order.orderItems[0].id;
  const shipment = await generate_random_ecommerce_mall_seller_shipments_create(
    sellerLoginConnection,
    {
      body: {
        orderId: order.id,
        orderItemIds: [orderItemId],
        carrier: "DHL",
        trackingNumber: "DHL123456789",
      },
    },
  );
  typia.assert(shipment);
  // Confirm delivery
  const deliveredShipment =
    await api.functional.ecommerceMall.customer.orders.shipments.confirm_delivery.confirmDelivery(
      customerConnection,
      {
        orderId: order.id,
        shipmentId: shipment.id,
      },
    );
  typia.assert(deliveredShipment);
  // ============================================================
  // STEP 5: Submit Refund Request and Seller Reject with Reason
  // ============================================================
  // Submit refund request
  const refundRequests =
    await api.functional.ecommerceMall.customer.refund_requests.index(
      customerConnection,
      {
        body: {} satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(refundRequests);
  // Find the pending refund request
  const pendingRequest = refundRequests.data.find(
    (r) => r.status === "pending",
  );
  if (!pendingRequest) {
    throw new Error("No pending refund request found");
  }
  // Seller rejects the refund request with reason
  const rejectionReason = "Item was used and damaged by customer";
  const rejectedRefund =
    await api.functional.ecommerceMall.seller.refund_requests.reject(
      sellerLoginConnection,
      {
        requestId: pendingRequest.id,
        body: {
          seller_response_reason: rejectionReason,
        } satisfies IEcommerceMallRefundRequest.IReject,
      },
    );
  typia.assert(rejectedRefund);
  // ============================================================
  // STEP 6: Test Filtering by seller_response = "approved"
  // ============================================================
  const approvedSnapshots =
    await api.functional.ecommerceMall.admin.refund_request_snapshots.index(
      adminConnection,
      {
        body: {
          seller_response: "approved",
        } satisfies IEcommerceMallRefundRequestSnapshot.IRequest,
      },
    );
  typia.assert(approvedSnapshots);
  // Verify approved snapshots have seller_response = "approved"
  for (const snapshot of approvedSnapshots.data) {
    TestValidator.equals(
      "seller_response should be approved",
      snapshot.seller_response,
      "approved",
    );
  }
  // ============================================================
  // STEP 7: Test Filtering by seller_response = "rejected"
  // ============================================================
  const rejectedSnapshots =
    await api.functional.ecommerceMall.admin.refund_request_snapshots.index(
      adminConnection,
      {
        body: {
          seller_response: "rejected",
        } satisfies IEcommerceMallRefundRequestSnapshot.IRequest,
      },
    );
  typia.assert(rejectedSnapshots);
  // Verify rejected snapshots have seller_response = "rejected"
  let foundRejectedSnapshot = false;
  for (const snapshot of rejectedSnapshots.data) {
    TestValidator.equals(
      "seller_response should be rejected",
      snapshot.seller_response,
      "rejected",
    );
    // Check that the rejected snapshot from our test includes the rejection reason
    if (snapshot.refundRequest.id === rejectedRefund.id) {
      foundRejectedSnapshot = true;
      TestValidator.equals(
        "seller_response_reason should match",
        snapshot.seller_response_reason,
        rejectionReason,
      );
    }
  }
  // Verify we found our rejected snapshot with the reason
  TestValidator.predicate(
    "Found rejected snapshot with reason",
    foundRejectedSnapshot,
  );
}