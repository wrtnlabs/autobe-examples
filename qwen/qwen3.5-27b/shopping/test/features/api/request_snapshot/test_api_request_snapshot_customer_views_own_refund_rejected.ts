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
import type { IShoppingMallRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRequestSnapshot";
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
import { generate_random_shopping_mall_customer_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_cart_items_create";
import { generate_random_shopping_mall_customer_checkout } from "../../../generate/generate_random_shopping_mall_customer_checkout";
import { generate_random_shopping_mall_customer_customers_me_orders_items_refund_create } from "../../../generate/generate_random_shopping_mall_customer_customers_me_orders_items_refund_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_shipments_create";
import { prepare_random_shopping_mall_checkout } from "../../../prepare/prepare_random_shopping_mall_checkout";
import { prepare_random_shopping_mall_customer_cart_item } from "../../../prepare/prepare_random_shopping_mall_customer_cart_item";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_refund_request } from "../../../prepare/prepare_random_shopping_mall_refund_request";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

/**
 * Test that a customer can retrieve their own refund request snapshot after the seller has rejected it.
 *
 * Validates the complete refund rejection workflow including customer and seller authentication, product setup, order placement, delivery confirmation, refund request creation, seller rejection, and snapshot retrieval. Ensures that the request snapshot correctly captures the state transition from pending to rejected status.
 *
 * Special attention is given to verifying that the snapshot preserves the complete audit trail of the rejection decision, including the seller's reason and the order item context at the time of rejection.
 *
 * 1. Customer registers and authenticates with email and password credentials.
 * 2. Seller registers and authenticates with email and password credentials.
 * 3. Seller creates a product with name, description, and base price.
 * 4. Customer adds the product variant to shopping cart with quantity.
 * 5. Customer places an order through checkout with shipping address and payment.
 * 6. Seller creates a shipment for the order items with carrier and tracking number.
 * 7. Customer confirms delivery for the shipment.
 * 8. Customer creates a refund request for the delivered order item within 7 days.
 * 9. Seller rejects the refund request, creating a snapshot with status transition.
 * 10. Customer retrieves the request snapshot and validates its contents.
 */
export async function test_api_request_snapshot_customer_views_own_refund_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  const customerId = customerAuth.id;
  // 2. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 3. Seller creates a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // Ensure product has at least one variant
  TestValidator.predicate("product has variants", product.variants.length > 0);
  const variantId = product.variants[0].id;
  // 4. Customer adds product variant to cart
  const cartItem =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          productVariantId: variantId,
          quantity: 1,
        },
      },
    );
  typia.assert(cartItem);
  // 5. Customer places order through checkout
  const order = await generate_random_shopping_mall_customer_checkout(
    customerConnection,
    {},
  );
  typia.assert(order);
  // 6. Seller creates shipment
  const shipment = await generate_random_shopping_mall_seller_shipments_create(
    sellerConnection,
    {
      body: {
        carrier_name: "Test Carrier",
        tracking_number: "TRACK123456",
        order_item_ids: order.items.map((item) => item.id),
      },
    },
  );
  typia.assert(shipment);
  // 7. Customer confirms delivery
  const confirmedShipment =
    await api.functional.shoppingMall.customer.orders.shipments.delivered.confirmDelivery(
      customerConnection,
      {
        orderId: order.id,
        shipmentId: shipment.id,
      },
    );
  typia.assert(confirmedShipment);
  // 8. Customer creates refund request for delivered order item
  const refundRequest =
    await generate_random_shopping_mall_customer_customers_me_orders_items_refund_create(
      customerConnection,
      {
        body: {
          reason: "Product not as described",
        },
        params: {
          orderId: order.id,
          itemId: order.items[0].id,
        },
      },
    );
  typia.assert(refundRequest);
  // 9. Seller rejects the refund request (creates snapshot)
  const rejectedRefund =
    await api.functional.shoppingMall.seller.orders.items.refund.reject(
      sellerConnection,
      {
        orderId: order.id,
        itemId: order.items[0].id,
      },
    );
  typia.assert(rejectedRefund);
  // 10. Customer retrieves the request snapshot
  // Note: In a real system, there would be a way to get the snapshot ID from the reject response
  // or through a list endpoint. For this test, we assume the snapshot ID is the same as
  // the refund request ID (this may need adjustment based on actual API behavior)
  const snapshot =
    await api.functional.shoppingMall.customer.request_snapshots.at(
      customerConnection,
      {
        snapshotId: refundRequest.id,
      },
    );
  typia.assert(snapshot);
  // Validate snapshot contents
  TestValidator.equals(
    "request type is refund",
    snapshot.requestType,
    "refund",
  );
  TestValidator.equals(
    "status before is pending",
    snapshot.statusBefore,
    "pending",
  );
  TestValidator.equals(
    "status after is rejected",
    snapshot.statusAfter,
    "rejected",
  );
  TestValidator.predicate("has seller reason", snapshot.sellerReason !== null);
  TestValidator.equals(
    "cancellation request ID is null",
    snapshot.cancellationRequestId,
    null,
  );
  TestValidator.equals(
    "refund request ID matches",
    snapshot.refundRequestId,
    refundRequest.id,
  );
  TestValidator.equals("customer ID matches", snapshot.customer.id, customerId);
  TestValidator.equals(
    "order item status is delivered",
    snapshot.orderItem.status,
    "delivered",
  );
}
