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
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
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
import { generate_random_ecommerce_mall_admin_seller_approvals_create } from "../../../generate/generate_random_ecommerce_mall_admin_seller_approvals_create";
import { generate_random_ecommerce_mall_customer_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_cart_items_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_inventory_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_inventory_create";
import { generate_random_ecommerce_mall_seller_shipments_create } from "../../../generate/generate_random_ecommerce_mall_seller_shipments_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_seller_approval } from "../../../prepare/prepare_random_ecommerce_mall_seller_approval";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";

/**
 * Test seller successfully approves a pending refund request for a delivered order item.
 *
 * Pre-conditions Setup:
 * 1. Admin registers and seller registers
 * 2. Admin approves seller registration
 * 3. Seller creates product with variant and adds inventory
 * 4. Customer registers, adds product to cart, and checks out
 * 5. Seller ships order items
 * 6. Customer confirms delivery
 * 7. System creates a pending refund request for the delivered item
 *
 * Test Execution:
 * 1. Seller queries for pending refund requests
 * 2. Seller approves the pending refund request
 *
 * Validation Points:
 * - Refund request status changes from 'pending' to 'approved'
 * - seller_response_at timestamp is recorded
 * - refundRequestSnapshots array contains newly created snapshot
 * - Snapshot has snapshot_status: 'approved' and seller_response: 'approved'
 * - Response includes complete refund request with order item details
 */
export async function test_api_refund_approval_by_owning_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Register and approve seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  await generate_random_ecommerce_mall_admin_seller_approvals_create(
    adminConnection,
    {
      body: {
        sellerId: sellerAuth.id,
        status: "approved",
      },
    },
  );
  // 3. Seller creates product
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  // Get the first variant from the product
  const variant = product.variants[0];
  const variantId = variant.id;
  const productId = product.id;
  // 4. Seller adds inventory to variant
  const inventoryRecord =
    await generate_random_ecommerce_mall_seller_products_variants_inventory_create(
      sellerConnection,
      {
        params: {
          productId: productId,
          variantId: variantId,
        },
        body: {
          operation: "restock",
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          reason: "Initial stock for testing",
        },
      },
    );
  typia.assert(inventoryRecord);
  // 5. Customer registers
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 6. Customer adds item to cart
  const cartItem =
    await generate_random_ecommerce_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          variant_id: variantId,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<3>
          >(),
        },
      },
    );
  typia.assert(cartItem);
  // 7. Customer checks out (creates order)
  const order =
    await api.functional.ecommerceMall.customer.checkout.confirm.create(
      customerConnection,
      {
        body: {
          payment_token: `payment_token_${RandomGenerator.alphaNumeric(16)}`,
        },
      },
    );
  typia.assert(order);
  // Get the order item ID from the order
  const orderItem = order.orderItems[0];
  const orderId = order.id;
  // 8. Seller ships the order item
  const shipment = await generate_random_ecommerce_mall_seller_shipments_create(
    sellerConnection,
    {
      body: {
        orderId: orderId,
        orderItemIds: [orderItem.id],
        carrier: "DHL",
        trackingNumber: `TRACK${RandomGenerator.alphaNumeric(8)}`,
      },
    },
  );
  typia.assert(shipment);
  // 9. Customer confirms delivery
  const confirmedShipment =
    await api.functional.ecommerceMall.customer.orders.shipments.confirm_delivery.confirmDelivery(
      customerConnection,
      {
        orderId: orderId,
        shipmentId: shipment.id,
      },
    );
  typia.assert(confirmedShipment);
  // 10. Retrieve pending refund request (system/admin creates it or it's pre-existing)
  const refundRequestsPage =
    await api.functional.ecommerceMall.seller.refund_requests.index(
      sellerConnection,
      {
        body: {
          status: "pending",
        },
      },
    );
  typia.assert(refundRequestsPage);
  // Find the refund request for the delivered order item
  const refundRequestSummary = refundRequestsPage.data.find(
    (r) => r.orderItem.id === orderItem.id,
  );
  TestValidator.equals(
    "refund request should exist for delivered order item",
    refundRequestSummary !== undefined,
    true,
  );
  const refundRequestId = refundRequestSummary!.id;
  // 11. Seller approves the refund request
  const approvedRefundRequest =
    await api.functional.ecommerceMall.seller.refund_requests.approve(
      sellerConnection,
      {
        requestId: refundRequestId,
      },
    );
  typia.assert(approvedRefundRequest);
  // 12. Validate the approval response
  TestValidator.equals(
    "refund request status should be approved",
    approvedRefundRequest.status,
    "approved",
  );
  TestValidator.equals(
    "seller_response_at should be recorded",
    approvedRefundRequest.seller_response_at !== null &&
      approvedRefundRequest.seller_response_at !== undefined,
    true,
  );
  TestValidator.equals(
    "refund request snapshots should exist",
    approvedRefundRequest.refundRequestSnapshots.length > 0,
    true,
  );
  // Verify the snapshot details
  const latestSnapshot =
    approvedRefundRequest.refundRequestSnapshots[
      approvedRefundRequest.refundRequestSnapshots.length - 1
    ];
  TestValidator.equals(
    "snapshot status should be approved",
    latestSnapshot.snapshot_status,
    "approved",
  );
  TestValidator.equals(
    "seller response should be approved",
    latestSnapshot.seller_response,
    "approved",
  );
  // Validate order item details are included
  TestValidator.equals(
    "order item should be included",
    approvedRefundRequest.orderItem !== undefined,
    true,
  );
  TestValidator.equals(
    "seller should be the owning seller",
    approvedRefundRequest.seller.id,
    sellerAuth.id,
  );
}
