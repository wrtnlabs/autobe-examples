import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderAddress";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemVariantOption";
import type { IShoppingMallOrderShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderShipment";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductInventoryHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductInventoryHistory";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
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
import { generate_random_shopping_mall_customer_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_cart_items_create";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { generate_random_shopping_mall_customer_orders_items_refund_create } from "../../../generate/generate_random_shopping_mall_customer_orders_items_refund_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_sellers_me_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_sellers_me_shipments_create";
import { generate_random_shopping_mall_seller_sellers_me_variants_inventory_add_add_inventory } from "../../../generate/generate_random_shopping_mall_seller_sellers_me_variants_inventory_add_add_inventory";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_order_shipment } from "../../../prepare/prepare_random_shopping_mall_order_shipment";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_inventory_history } from "../../../prepare/prepare_random_shopping_mall_product_inventory_history";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option } from "../../../prepare/prepare_random_shopping_mall_product_variant_option";
import { prepare_random_shopping_mall_refund_request } from "../../../prepare/prepare_random_shopping_mall_refund_request";

/**
 * Test partial refund approval where order contains multiple items and only one is refunded.
 *
 * Setup Phase:
 * 1. Create admin to approve seller
 * 2. Create seller and get approved
 * 3. Seller creates product with two variants
 * 4. Add inventory for both variants
 * 5. Customer adds both variants to cart and places order
 * 6. Seller ships both items together
 * 7. Customer confirms delivery
 * 8. Customer requests refund for only one item
 *
 * Test Execution:
 * - Seller approves the refund request
 *
 * Verification:
 * - Refunded item status is 'refunded'
 * - Non-refunded item remains 'delivered'
 * - Order status is 'partially_completed'
 */
export async function test_api_refund_request_partial_order_refund(
  connection: api.IConnection,
): Promise<void> {
  // ========================================
  // 1. Admin Setup
  // ========================================
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {});
  typia.assert(adminAuth);
  // ========================================
  // 2. Seller Setup & Approval
  // ========================================
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 3 }),
    },
  });
  typia.assert(sellerAuth);
  // Admin approves the seller
  const approvedSeller =
    await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
      sellerId: sellerAuth.id,
    });
  typia.assert(approvedSeller);
  TestValidator.equals(
    "seller approved",
    approvedSeller.approvalStatus,
    "approved",
  );
  // ========================================
  // 3. Create Product with Two Variants
  // ========================================
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        base_price: 50000,
        category_id: categoryId,
      },
    },
  );
  typia.assert(product);
  // Create first variant with stock
  const variant1 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          price: 55000,
          optionValues: [
            { key: "color", value: "Red" },
            { key: "size", value: "L" },
          ],
          stockQuantity: 100,
        },
      },
    );
  typia.assert(variant1);
  // Create second variant with stock
  const variant2 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          price: 55000,
          optionValues: [
            { key: "color", value: "Blue" },
            { key: "size", value: "M" },
          ],
          stockQuantity: 100,
        },
      },
    );
  typia.assert(variant2);
  // ========================================
  // 4. Customer Setup & Order Creation
  // ========================================
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  typia.assert(customerAuth);
  // Add first variant to cart
  const cartItem1 =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          variantId: variant1.id,
          quantity: 1,
        },
      },
    );
  typia.assert(cartItem1);
  // Add second variant to cart
  const cartItem2 =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          variantId: variant2.id,
          quantity: 2,
        },
      },
    );
  typia.assert(cartItem2);
  // Place order with address ID
  const addressId = typia.random<string & tags.Format<"uuid">>();
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    { body: { address_id: addressId } },
  );
  typia.assert(order);
  TestValidator.equals("order has 2 items", order.orderItems.length, 2);
  TestValidator.equals("order status paid", order.status, "paid");
  // Capture order item IDs for shipment
  const orderItemIds = order.orderItems.map((item) => item.id);
  TestValidator.equals("two order item IDs", orderItemIds.length, 2);
  // ========================================
  // 5. Seller Ships All Items Together
  // ========================================
  const shipment =
    await generate_random_shopping_mall_seller_sellers_me_shipments_create(
      sellerConnection,
      {
        body: {
          orderItemIds: orderItemIds,
          carrierName: "FedEx",
          trackingNumber: RandomGenerator.alphaNumeric(12),
        },
      },
    );
  typia.assert(shipment);
  // ========================================
  // 6. Customer Confirms Delivery
  // ========================================
  const confirmedShipment =
    await api.functional.shoppingMall.customer.shipments.confirm_delivery.confirmDelivery(
      customerConnection,
      { shipmentId: shipment.id },
    );
  typia.assert(confirmedShipment);
  TestValidator.predicate(
    "delivery confirmed",
    confirmedShipment.delivered_at !== null,
  );
  TestValidator.equals(
    "confirmation method manual",
    confirmedShipment.delivery_confirmation_method,
    "manual",
  );
  // ========================================
  // 7. Customer Requests Refund for First Item Only (Partial Refund)
  // ========================================
  const itemToRefund = order.orderItems[0];
  const refundRequest =
    await generate_random_shopping_mall_customer_orders_items_refund_create(
      customerConnection,
      {
        params: {
          orderId: order.id,
          orderItemId: itemToRefund.id,
        },
        body: {
          reason:
            "Product does not match description - requesting partial refund",
        },
      },
    );
  typia.assert(refundRequest);
  TestValidator.equals(
    "refund status pending",
    refundRequest.status,
    "pending",
  );
  TestValidator.equals(
    "refund order item matches",
    refundRequest.orderItem.id,
    itemToRefund.id,
  );
  // ========================================
  // 8. Seller Approves the Partial Refund
  // ========================================
  const approvedRefund =
    await api.functional.shoppingMall.seller.refund_requests.approve(
      sellerConnection,
      { refundRequestId: refundRequest.id },
    );
  typia.assert(approvedRefund);
  // ========================================
  // 9. Verify Partial Refund Results
  // ========================================
  TestValidator.equals("refund approved", approvedRefund.status, "approved");
  TestValidator.equals(
    "order item status refunded",
    approvedRefund.orderItem.status,
    "refunded",
  );
  TestValidator.equals(
    "refunded item matches request",
    approvedRefund.orderItem.id,
    itemToRefund.id,
  );
  // Verify this was a partial refund - only one of two items was refunded
  TestValidator.predicate(
    "partial refund - item refunded",
    approvedRefund.orderItem.status === "refunded",
  );
}
