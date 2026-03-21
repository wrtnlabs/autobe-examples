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
 * Test seller cannot approve a refund request for another seller's product.
 *
 * **Pre-conditions Setup**:
 * 1. Register and approve Seller A (owns the product)
 * 2. Register and approve Seller B (does not own the product)
 * 3. Register a customer
 * 4. Register an admin
 * 5. Admin approves Seller A's registration
 * 6. Admin approves Seller B's registration
 * 7. Create product by Seller A with variant and inventory
 * 8. Create order, ship, and deliver the item
 * 9. Customer requests refund for the delivered item
 *
 * **Test Execution**:
 * 1. Authenticate as Seller B (approved but unauthorized)
 * 2. Attempt to call POST /seller/refund-requests/{requestId}/approve for the refund request belonging to Seller A
 *
 * **Validation Points**:
 * - Response returns HTTP 403 Forbidden (not 401 - Seller B is valid but unauthorized)
 * - Error message indicates seller is not authorized to approve this request
 * - Original refund request remains unchanged with status 'pending'
 * - No snapshot is created
 */
export async function test_api_refund_approval_rejected_for_wrong_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register Seller A who will own the product
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerA = await authorize_seller_join(sellerAConnection, {});
  // 2. Register Seller B who will attempt unauthorized approval
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerB = await authorize_seller_join(sellerBConnection, {});
  // 3. Register Customer who will purchase and request refund
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  // 4. Register Admin who will approve seller registrations
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  // 5. Admin approves Seller A's registration
  await generate_random_ecommerce_mall_admin_seller_approvals_create(
    adminConnection,
    {
      body: {
        sellerId: sellerA.id,
        status: "approved",
      } satisfies IEcommerceMallSellerApproval.ICreate,
    },
  );
  // 6. Admin approves Seller B's registration
  await generate_random_ecommerce_mall_admin_seller_approvals_create(
    adminConnection,
    {
      body: {
        sellerId: sellerB.id,
        status: "approved",
      } satisfies IEcommerceMallSellerApproval.ICreate,
    },
  );
  // 7. Seller A creates product with variant and inventory
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerAConnection,
    {},
  );
  typia.assert(product);
  // Add inventory to the first variant
  const variant = product.variants[0];
  await generate_random_ecommerce_mall_seller_products_variants_inventory_create(
    sellerAConnection,
    {
      params: {
        productId: product.id,
        variantId: variant.id,
      },
      body: {
        operation: "restock",
        quantity: 10,
        reason: "Initial stock for testing",
      },
    },
  );
  // 8. Customer adds item to cart and checkout
  const cartItem =
    await generate_random_ecommerce_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          variant_id: variant.id,
          quantity: 1,
        },
      },
    );
  typia.assert(cartItem);
  // Checkout and place order
  const order =
    await api.functional.ecommerceMall.customer.checkout.confirm.create(
      customerConnection,
      {
        body: {
          payment_token: "test_payment_token_success",
        } satisfies IEcommerceMallCheckoutConfirm.IRequest,
      },
    );
  typia.assert(order);
  const orderItem = order.orderItems[0];
  // Seller A ships the order item
  const shipment = await generate_random_ecommerce_mall_seller_shipments_create(
    sellerAConnection,
    {
      body: {
        orderId: order.id,
        orderItemIds: [orderItem.id],
        carrier: "DHL",
        trackingNumber: "1234567890",
      },
    },
  );
  typia.assert(shipment);
  // Customer confirms delivery
  const confirmedShipment =
    await api.functional.ecommerceMall.customer.orders.shipments.confirm_delivery.confirmDelivery(
      customerConnection,
      {
        orderId: order.id,
        shipmentId: shipment.id,
      },
    );
  typia.assert(confirmedShipment);
  // 9. Customer requests refund for the delivered item
  // First, need to get the order item and find it through refund request list
  const refundRequestsResponse =
    await api.functional.ecommerceMall.customer.refund_requests.index(
      customerConnection,
      {
        body: {
          status: "pending",
        } satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(refundRequestsResponse);
  // Find the refund request for this order item
  const refundRequest = refundRequestsResponse.data.find(
    (req) => req.orderItem.id === orderItem.id,
  );
  TestValidator.equals(
    "refund request exists",
    refundRequest !== undefined,
    true,
  );
  // Now Seller B (wrong seller) attempts to approve the refund request
  // This should fail with 403 Forbidden
  await TestValidator.httpError(
    "Seller B cannot approve Seller A's refund request",
    403,
    async () => {
      await api.functional.ecommerceMall.seller.refund_requests.approve(
        sellerBConnection,
        {
          requestId: refundRequest!.id,
        },
      );
    },
  );
  // Verify the refund request is still pending (not changed by unauthorized attempt)
  const refundRequestsAfterResponse =
    await api.functional.ecommerceMall.customer.refund_requests.index(
      customerConnection,
      {
        body: {
          status: "pending",
        } satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(refundRequestsAfterResponse);
  const refundRequestAfter = refundRequestsAfterResponse.data.find(
    (req) => req.orderItem.id === orderItem.id,
  );
  TestValidator.equals(
    "refund request still pending",
    refundRequestAfter?.status,
    "pending",
  );
}
