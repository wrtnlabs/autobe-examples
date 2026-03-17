import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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
import { generate_random_shopping_mall_customer_checkout_create } from "../../../generate/generate_random_shopping_mall_customer_checkout_create";
import { generate_random_shopping_mall_customer_customers_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_customers_cart_items_create";
import { generate_random_shopping_mall_customer_refund_requests_create } from "../../../generate/generate_random_shopping_mall_customer_refund_requests_create";
import { generate_random_shopping_mall_seller_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_seller_products_create";
import { generate_random_shopping_mall_seller_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_seller_shipments_create";
import { generate_random_shopping_mall_seller_variants_inventory_adjust } from "../../../generate/generate_random_shopping_mall_seller_variants_inventory_adjust";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_refund_request } from "../../../prepare/prepare_random_shopping_mall_refund_request";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

/**
 * Test that a suspended seller can still approve refund requests for their products.
 *
 * This validates the business rule that suspended sellers retain refund
 * processing capabilities to fulfill existing obligations, unlike banned
 * sellers who cannot access the platform.
 *
 * Test Flow:
 * 1. Create seller and customer accounts
 * 2. Create product with variants and inventory
 * 3. Customer places order through cart checkout
 * 4. Seller creates shipment and customer confirms delivery
 * 5. Customer creates refund request for delivered item
 * 6. Seller approves refund request
 * 7. Validate all outcomes
 */
export async function test_api_refund_request_approval_suspended_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // 2. Create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  typia.assert(customer);
  // 3. Create product with inventory
  const product =
    await generate_random_shopping_mall_seller_seller_products_create(
      sellerConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          basePrice: typia.random<
            number & tags.Minimum<1> & tags.Maximum<10000>
          >(),
        },
      },
    );
  typia.assert(product);
  // Get the variant from product
  const variant = product.variants[0];
  if (!variant) {
    throw new Error("Product has no variants - cannot proceed with order");
  }
  // 4. Add inventory for the variant
  const inventoryQuantity = 100;
  await generate_random_shopping_mall_seller_variants_inventory_adjust(
    sellerConnection,
    {
      params: { variantId: variant.id },
      body: {
        quantity_change: inventoryQuantity,
        reason: "Initial stock for refund approval test",
      },
    },
  );
  // 5. Customer adds item to cart
  const cartItem =
    await generate_random_shopping_mall_customer_customers_cart_items_create(
      customerConnection,
      {
        body: {
          variantId: variant.id,
          quantity: 2,
        },
      },
    );
  typia.assert(cartItem);
  // 6. Customer completes checkout
  const order = await generate_random_shopping_mall_customer_checkout_create(
    customerConnection,
    {},
  );
  typia.assert(order);
  // Get the order item from the order
  const orderItem = order.orderItems[0];
  if (!orderItem) {
    throw new Error("Order has no items");
  }
  // 7. Seller creates shipment for the order item
  const shipment =
    await generate_random_shopping_mall_seller_seller_shipments_create(
      sellerConnection,
      {
        body: {
          orderId: order.id,
          orderItemIds: [orderItem.id],
          carrierName: "TestCarrier",
          trackingNumber: RandomGenerator.alphaNumeric(12),
        },
      },
    );
  typia.assert(shipment);
  // 8. Customer confirms delivery
  const confirmedShipment =
    await api.functional.shoppingMall.customer.shipments.confirm_delivery.confirmDelivery(
      customerConnection,
      {
        shipmentId: shipment.id,
      },
    );
  typia.assert(confirmedShipment);
  // Get the delivered order item
  const deliveredOrderItem = confirmedShipment.orderItems[0];
  if (!deliveredOrderItem) {
    throw new Error("Shipment has no order items");
  }
  // 9. Customer creates refund request
  const refundRequest =
    await generate_random_shopping_mall_customer_refund_requests_create(
      customerConnection,
      {
        body: {
          orderItemId: deliveredOrderItem.id,
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(refundRequest);
  // Verify initial status is pending
  TestValidator.equals(
    "initial refund status",
    refundRequest.status,
    "pending",
  );
  // 10. Seller approves the refund request
  // Note: The API spec explicitly allows suspended sellers to approve refunds
  // A banned seller would receive 403 Forbidden
  const approvedRefund =
    await api.functional.shoppingMall.seller.refund_requests.approve(
      sellerConnection,
      {
        refundRequestId: refundRequest.id,
      },
    );
  typia.assert(approvedRefund);
  // 11. Validate outcomes
  TestValidator.equals(
    "refund status is approved",
    approvedRefund.status,
    "approved",
  );
  TestValidator.predicate(
    "responded_at timestamp is set",
    approvedRefund.responded_at !== null,
  );
  // 12. Verify order item reference is correct
  TestValidator.equals(
    "order item reference matches",
    approvedRefund.orderItem.id,
    deliveredOrderItem.id,
  );
}
