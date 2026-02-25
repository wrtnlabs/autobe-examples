import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderAddress";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemVariantOption";
import type { IShoppingMallOrderShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderShipment";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { generate_random_shopping_mall_customer_orders_items_refund_create } from "../../../generate/generate_random_shopping_mall_customer_orders_items_refund_create";
import { generate_random_shopping_mall_seller_sellers_me_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_sellers_me_shipments_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_order_shipment } from "../../../prepare/prepare_random_shopping_mall_order_shipment";
import { prepare_random_shopping_mall_refund_request } from "../../../prepare/prepare_random_shopping_mall_refund_request";

/**
 * Test the successful retrieval of a pending refund request by the customer who created it.
 *
 * This test validates:
 * 1. Customer can retrieve their own pending refund request
 * 2. All required fields are correctly populated for pending status
 * 3. Complete order item snapshot data is preserved
 * 4. Response matches the expected IShoppingMallRefundRequest structure
 */
export async function test_api_refund_request_pending_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // ========================================
  // Setup: Create Admin, Seller, and Customer
  // ========================================
  // 1. Create admin for seller approval
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {});
  typia.assert(adminAuth);
  // 2. Create seller (will have 'pending' approval status)
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // 3. Admin approves the seller
  const approvedSeller =
    await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
      sellerId: sellerAuth.id,
    });
  typia.assert(approvedSeller);
  TestValidator.equals(
    "seller approval status",
    approvedSeller.approvalStatus,
    "approved",
  );
  // 4. Create customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  typia.assert(customerAuth);
  // ========================================
  // Setup: Create Order with Delivered Item
  // ========================================
  // 5. Customer places order (generation function handles product, variant, inventory, cart setup)
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {},
  );
  typia.assert(order);
  TestValidator.equals("order has items", order.orderItems.length > 0, true);
  TestValidator.equals("order item status", order.orderItems[0].status, "paid");
  const orderItem = order.orderItems[0];
  // 6. Seller ships the order items
  const shipment =
    await generate_random_shopping_mall_seller_sellers_me_shipments_create(
      sellerConnection,
      {
        body: {
          orderItemIds: [orderItem.id],
          carrierName: "FedEx",
          trackingNumber: "FX123456789",
        },
      },
    );
  typia.assert(shipment);
  // 7. Customer confirms delivery
  const confirmedShipment =
    await api.functional.shoppingMall.customer.shipments.confirm_delivery.confirmDelivery(
      customerConnection,
      { shipmentId: shipment.id },
    );
  typia.assert(confirmedShipment);
  TestValidator.predicate(
    "shipment delivered",
    confirmedShipment.delivered_at !== null,
  );
  // ========================================
  // Setup: Create Refund Request
  // ========================================
  // 8. Customer submits refund request
  const refundReason =
    "Product does not match description - color is different from photos";
  const refundRequest =
    await generate_random_shopping_mall_customer_orders_items_refund_create(
      customerConnection,
      {
        params: {
          orderId: order.id,
          orderItemId: orderItem.id,
        },
        body: {
          reason: refundReason,
        },
      },
    );
  typia.assert(refundRequest);
  // ========================================
  // Test: Retrieve Pending Refund Request
  // ========================================
  // 9. Customer retrieves the refund request
  const retrievedRefund =
    await api.functional.shoppingMall.customer.refund_requests.at(
      customerConnection,
      { refundRequestId: refundRequest.id },
    );
  typia.assert(retrievedRefund);
  // ========================================
  // Validation: Verify Pending Refund Request Fields
  // ========================================
  // 1. Verify refund request ID matches
  TestValidator.equals(
    "refund request id matches",
    retrievedRefund.id,
    refundRequest.id,
  );
  // 2. Verify status is 'pending'
  TestValidator.equals("status is pending", retrievedRefund.status, "pending");
  // 3. Verify reason matches the submitted reason
  TestValidator.equals("reason matches", retrievedRefund.reason, refundReason);
  // 4. Verify sellerResponse is null (seller has not responded yet)
  TestValidator.equals(
    "seller response is null",
    retrievedRefund.sellerResponse,
    null,
  );
  // 5. Verify rejectionReason is null (not rejected)
  TestValidator.equals(
    "rejection reason is null",
    retrievedRefund.rejectionReason,
    null,
  );
  // 6. Verify timestamps are populated
  TestValidator.predicate(
    "createdAt is populated",
    retrievedRefund.createdAt.length > 0,
  );
  TestValidator.predicate(
    "updatedAt is populated",
    retrievedRefund.updatedAt.length > 0,
  );
  // ========================================
  // Validation: Verify Order Item Snapshot Data
  // ========================================
  // 7. Verify order item is included with complete data
  TestValidator.predicate(
    "order item exists",
    retrievedRefund.orderItem !== null,
  );
  TestValidator.equals(
    "order item id matches",
    retrievedRefund.orderItem.id,
    orderItem.id,
  );
  // 8. Verify order item status is 'delivered' (changed after delivery confirmation)
  TestValidator.equals(
    "order item status is delivered",
    retrievedRefund.orderItem.status,
    "delivered",
  );
  // 9. Verify order item has product name
  TestValidator.predicate(
    "product name is populated",
    retrievedRefund.orderItem.product_name.length > 0,
  );
  // 10. Verify order item has variant SKU code
  TestValidator.predicate(
    "variant sku code is populated",
    retrievedRefund.orderItem.variant_sku_code.length > 0,
  );
  // 11. Verify order item has seller shop name
  TestValidator.predicate(
    "seller shop name is populated",
    retrievedRefund.orderItem.seller_shop_name.length > 0,
  );
  // 12. Verify order item has quantity and unit price
  TestValidator.predicate(
    "quantity is positive",
    retrievedRefund.orderItem.quantity > 0,
  );
  TestValidator.predicate(
    "unit price is non-negative",
    retrievedRefund.orderItem.unit_price >= 0,
  );
  // 13. Verify order item has subtotal calculated
  TestValidator.predicate(
    "subtotal exists",
    typeof retrievedRefund.orderItem.subtotal === "number",
  );
  // 14. Verify variant options exist
  TestValidator.predicate(
    "variant options array exists",
    Array.isArray(retrievedRefund.orderItem.variant_options),
  );
  // 15. Verify order reference exists
  TestValidator.predicate(
    "order reference exists",
    retrievedRefund.orderItem.order !== null,
  );
  TestValidator.equals(
    "order id matches",
    retrievedRefund.orderItem.order.id,
    order.id,
  );
}
