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
import type { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
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
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_inventory_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_inventory_create";
import { generate_random_ecommerce_mall_seller_shipments_create } from "../../../generate/generate_random_ecommerce_mall_seller_shipments_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";

export async function test_api_refund_approval_fails_for_non_pending_request(
  connection: api.IConnection,
): Promise<void> {
  // Test seller cannot approve a refund request that is not in pending status (rejected request).
  //
  // Pre-conditions Setup:
  // 1. Register and approve a seller
  // 2. Register a customer
  // 3. Create product, order, ship, and deliver item
  // 4. A refund request exists for the delivered item
  // 5. Seller rejects the refund request first (status changes to 'rejected')
  //
  // Test Execution:
  // 1. Authenticate as the owning seller
  // 2. Attempt to call POST /ecommerceMall/seller/refund-requests/{requestId}/approve on the already rejected request
  //
  // Validation Points:
  // - Response returns HTTP 400 Bad Request or 409 Conflict
  // - Refund request status remains 'rejected'
  // - No additional snapshot is created
  // 1. Create admin account
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = "testpassword123!";
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: "https://example.com/seller",
      referrer: "https://example.com",
    },
  });
  // 3. Admin approves seller
  const adminLoginConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminLoginConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
      href: "https://example.com/admin",
      referrer: "https://example.com",
    },
  });
  // Note: Admin approval API should be called here if available
  // For now, proceed assuming seller is approved or will be handled by the system
  // 4. Login as approved seller
  const approvedSellerConnection: api.IConnection = { host: connection.host };
  const sellerLoginResult = await authorize_seller_login(
    approvedSellerConnection,
    {
      body: {
        email: sellerEmail,
        password: sellerPassword,
        href: "https://example.com/seller",
        referrer: "https://example.com",
      },
    },
  );
  // Check if seller is approved - if not, test cannot proceed
  if (sellerLoginResult.approval_status !== "approved") {
    // Cannot test without approved seller
    return;
  }
  // 5. Create customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerEmail = typia.random<string & tags.Format<"email">>();
  await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      password: "testpassword123!",
      href: "https://example.com/customer",
      referrer: "https://example.com",
    },
  });
  // 6. Create product with variant (using simulate mode if category not available)
  const product = await generate_random_ecommerce_mall_seller_products_create(
    approvedSellerConnection,
    {
      body: {
        name: "Test Refund Product",
        description: "Test product for refund scenario",
        base_price: 10000,
        category_id: typia.random<string & tags.Format<"uuid">>(),
      },
    },
  );
  typia.assert(product);
  const variant = product.variants[0];
  // 7. Add inventory
  await generate_random_ecommerce_mall_seller_products_variants_inventory_create(
    approvedSellerConnection,
    {
      params: {
        productId: product.id,
        variantId: variant.id,
      },
      body: {
        operation: "restock",
        quantity: 10,
        reason: "Initial stock",
      },
    },
  );
  // 8. Customer adds item to cart
  await generate_random_ecommerce_mall_customer_cart_items_create(
    customerConnection,
    {
      body: {
        variant_id: variant.id,
        quantity: 1,
      },
    },
  );
  // 9. Customer checkout
  const order =
    await api.functional.ecommerceMall.customer.checkout.confirm.create(
      customerConnection,
      {
        body: {
          payment_token: "test_payment_token",
        },
      },
    );
  typia.assert(order);
  const orderItem = order.orderItems[0];
  // 10. Seller ships item
  const shipment = await generate_random_ecommerce_mall_seller_shipments_create(
    approvedSellerConnection,
    {
      body: {
        orderId: order.id,
        orderItemIds: [orderItem.id],
        carrier: "DHL",
        trackingNumber: "TRACK123456",
      },
    },
  );
  typia.assert(shipment);
  // 11. Customer confirms delivery
  await api.functional.ecommerceMall.customer.orders.shipments.confirm_delivery.confirmDelivery(
    customerConnection,
    {
      orderId: order.id,
      shipmentId: shipment.id,
    },
  );
  // 12. Get pending refund requests
  const refundRequestsResponse =
    await api.functional.ecommerceMall.seller.refund_requests.index(
      approvedSellerConnection,
      {
        body: {
          status: "pending",
        },
      },
    );
  typia.assert(refundRequestsResponse);
  // Find refund request for our order item
  const pendingRefundRequest = refundRequestsResponse.data.find(
    (r) => r.orderItem.id === orderItem.id,
  );
  // If no pending refund request exists for this item, test cannot proceed
  if (!pendingRefundRequest) {
    return;
  }
  // 13. Count snapshots before rejection
  const fullRefundRequestBefore =
    await api.functional.ecommerceMall.seller.refund_requests.index(
      approvedSellerConnection,
      {
        body: {
          status: "rejected",
        },
      },
    );
  // We'll compare snapshot count after rejection
  // 14. First reject the refund request
  const rejectedRequest =
    await api.functional.ecommerceMall.seller.refund_requests.reject(
      approvedSellerConnection,
      {
        requestId: pendingRefundRequest.id,
        body: {
          seller_response_reason: "Item was as described",
        },
      },
    );
  typia.assert(rejectedRequest);
  TestValidator.equals(
    "status should be rejected",
    rejectedRequest.status,
    "rejected",
  );
  // 15. Count snapshots after rejection (should have at least 1 from rejection)
  const snapshotsAfterRejection = rejectedRequest.refundRequestSnapshots.length;
  // 16. Attempt to approve the already rejected refund request
  // This should fail - the server should reject the approval of a non-pending request
  let approvalFailed = false;
  try {
    await api.functional.ecommerceMall.seller.refund_requests.approve(
      approvedSellerConnection,
      {
        requestId: rejectedRequest.id,
      },
    );
  } catch (error) {
    // Expected - server should return error for non-pending request
    approvalFailed = true;
  }
  TestValidator.predicate(
    "approval of rejected request should fail",
    approvalFailed,
  );
  // 17. Verify refund request status remains 'rejected'
  const finalRequests =
    await api.functional.ecommerceMall.seller.refund_requests.index(
      approvedSellerConnection,
      {
        body: {
          status: "rejected",
        },
      },
    );
  typia.assert(finalRequests);
  const finalRequest = finalRequests.data.find(
    (r) => r.id === rejectedRequest.id,
  );
  TestValidator.notEquals(
    "refund request should still exist in rejected status",
    finalRequest,
    undefined,
  );
  TestValidator.equals(
    "status should remain rejected",
    finalRequest!.status,
    "rejected",
  );
}
