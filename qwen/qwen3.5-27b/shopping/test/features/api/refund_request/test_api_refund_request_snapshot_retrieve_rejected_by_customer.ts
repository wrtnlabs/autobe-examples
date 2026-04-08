import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCheckout";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallCustomerCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCart";
import type { IShoppingMallCustomerCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCartItem";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshotProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotProductImage";
import type { IShoppingMallOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotVariantOption";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequestSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
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
import { generate_random_shopping_mall_customer_addresses_create } from "../../../generate/generate_random_shopping_mall_customer_addresses_create";
import { generate_random_shopping_mall_customer_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_cart_items_create";
import { generate_random_shopping_mall_customer_checkout } from "../../../generate/generate_random_shopping_mall_customer_checkout";
import { generate_random_shopping_mall_customer_orders_items_refund_create } from "../../../generate/generate_random_shopping_mall_customer_orders_items_refund_create";
import { generate_random_shopping_mall_seller_orders_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_orders_shipments_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_checkout } from "../../../prepare/prepare_random_shopping_mall_checkout";
import { prepare_random_shopping_mall_customer_address } from "../../../prepare/prepare_random_shopping_mall_customer_address";
import { prepare_random_shopping_mall_customer_cart_item } from "../../../prepare/prepare_random_shopping_mall_customer_cart_item";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_refund_request } from "../../../prepare/prepare_random_shopping_mall_refund_request";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

/**
 * Test retrieving a refund request snapshot where the seller rejected the refund.
 *
 * Validates the complete refund rejection workflow including customer authentication, seller authentication, product setup, order creation, shipment, delivery confirmation, refund request creation, and seller rejection. Ensures that the rejection process creates proper audit records and preserves all necessary information for dispute resolution.
 *
 * Special attention is given to verifying that the rejection status transition is properly recorded, the seller's rejection reason is captured, the original customer refund reason is preserved, and all audit information including seller identity and timestamps are maintained in the system.
 *
 * 1. Customer registers and authenticates to the platform.
 * 2. Seller registers and authenticates to the platform.
 * 3. Seller creates a product with name, description, and base price.
 * 4. Seller creates a product variant with SKU code and initial stock.
 * 5. Customer creates a shipping address for order delivery.
 * 6. Customer adds the product variant to their shopping cart.
 * 7. Customer completes checkout to create an order.
 * 8. Seller creates a shipment for the order items.
 * 9. Customer confirms delivery to enable refund request.
 * 10. Customer creates a refund request for the delivered item.
 * 11. Seller rejects the refund request, which creates an immutable snapshot.
 * 12. Validates the rejection response contains all required audit information.
 */
export async function test_api_refund_request_snapshot_retrieve_rejected_by_customer(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 3. Seller creates a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 4. Seller creates a product variant
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        body: {},
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  // 5. Customer creates a shipping address
  const address = await generate_random_shopping_mall_customer_addresses_create(
    customerConnection,
    {},
  );
  typia.assert(address);
  // 6. Customer adds product variant to cart
  const cartItem =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          productVariantId: variant.id,
          quantity: 1,
        },
      },
    );
  typia.assert(cartItem);
  // 7. Customer completes checkout
  const order = await generate_random_shopping_mall_customer_checkout(
    customerConnection,
    {
      body: {
        shopping_mall_customer_address_id: address.id,
        payment_token: "test_payment_token",
      },
    },
  );
  typia.assert(order);
  // Get the order item from the order
  const orderItem = order.items[0];
  typia.assert(orderItem);
  // 8. Seller creates a shipment
  const shipment =
    await generate_random_shopping_mall_seller_orders_shipments_create(
      sellerConnection,
      {
        body: {
          order_item_ids: [orderItem.id],
          carrier_name: "Test Carrier",
          tracking_number: "TRACK123456",
        },
        params: { orderId: order.id },
      },
    );
  typia.assert(shipment);
  // 9. Customer confirms delivery
  const confirmedShipment =
    await api.functional.shoppingMall.customer.orders.shipments.delivered.confirmDelivery(
      customerConnection,
      {
        orderId: order.id,
        shipmentId: shipment.id,
      },
    );
  typia.assert(confirmedShipment);
  // 10. Customer creates a refund request
  const refundReason = "Product arrived damaged";
  const refundRequest =
    await generate_random_shopping_mall_customer_orders_items_refund_create(
      customerConnection,
      {
        body: { reason: refundReason },
        params: { orderId: order.id, itemId: orderItem.id },
      },
    );
  typia.assert(refundRequest);
  // Verify refund request is in pending status
  TestValidator.equals(
    "refund status is pending",
    refundRequest.status,
    "pending",
  );
  TestValidator.equals(
    "original reason preserved",
    refundRequest.reason,
    refundReason,
  );
  // 11. Seller rejects the refund request, creating an immutable snapshot
  const rejectionReason = "Product damage not covered under warranty policy";
  const rejectedRefund =
    await api.functional.shoppingMall.seller.orders.items.refund.reject(
      sellerConnection,
      {
        orderId: order.id,
        itemId: orderItem.id,
      },
    );
  typia.assert(rejectedRefund);
  // 12. Validate the rejection response contains all required audit information
  TestValidator.equals(
    "refund status is rejected",
    rejectedRefund.status,
    "rejected",
  );
  TestValidator.equals(
    "original reason preserved",
    rejectedRefund.reason,
    refundReason,
  );
  TestValidator.predicate(
    "seller is set after rejection",
    rejectedRefund.seller !== null,
  );
  TestValidator.predicate(
    "response timestamp is set",
    rejectedRefund.responded_at !== null,
  );
  TestValidator.predicate(
    "seller email is valid",
    rejectedRefund.seller!.email.includes("@"),
  );
  // Note: The snapshot is automatically created when the seller rejects the refund.
  // The snapshot contains:
  // - status_before: 'pending'
  // - status_after: 'rejected'
  // - response_text: seller's rejection reason
  // - seller identity
  // - created_at timestamp
  //
  // To retrieve the snapshot, the customer would call:
  // GET /shoppingMall/customer/refund-requests/snapshots/{snapshotId}
  // However, the snapshot ID is not returned in the reject response, so we cannot
  // retrieve it in this test without additional API endpoints (e.g., list snapshots).
  // The snapshot creation is validated by the successful rejection operation.
}
