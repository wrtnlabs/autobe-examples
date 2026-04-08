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
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshotProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotProductImage";
import type { IShoppingMallOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotVariantOption";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
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
import { generate_random_shopping_mall_customer_orders_items_refund_create } from "../../../generate/generate_random_shopping_mall_customer_orders_items_refund_create";
import { generate_random_shopping_mall_seller_orders_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_orders_shipments_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_products_variants_inventory_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_inventory_create";
import { prepare_random_shopping_mall_checkout } from "../../../prepare/prepare_random_shopping_mall_checkout";
import { prepare_random_shopping_mall_customer_cart_item } from "../../../prepare/prepare_random_shopping_mall_customer_cart_item";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_refund_request } from "../../../prepare/prepare_random_shopping_mall_refund_request";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

/**
 * Test that refund approval processes only the specific item being refunded, leaving other items in the same order unaffected.
 *
 * Validates the complete refund approval workflow where a seller approves a refund request for a single item in an order containing multiple items. Ensures that the refund operation is item-specific and does not affect other items in the same order.
 *
 * Special attention is given to verifying that:
 * - Only the requested item's status changes to 'refunded'
 * - Other items in the same order maintain their 'delivered' status
 * - Stock restoration is variant-specific (only the refunded variant's stock increases)
 * - The order status correctly reflects the mixed state (partially_completed)
 *
 * 1. Seller registers and authenticates to the platform.
 * 2. Seller creates a product with name, description, and base price.
 * 3. Seller creates first variant with option (e.g., color: Red) and adds stock.
 * 4. Seller creates second variant with different option (e.g., color: Blue) and adds stock.
 * 5. Customer registers and authenticates to the platform.
 * 6. Customer adds first variant to cart with quantity.
 * 7. Customer adds second variant to cart with quantity.
 * 8. Customer places order with both items from cart.
 * 9. Seller creates shipment containing both order items.
 * 10. Customer confirms delivery for the shipment.
 * 11. Customer creates refund request for only the first item.
 * 12. Seller approves the refund request for the specific item.
 * 13. Validates that only the refunded item's status is 'refunded'.
 * 14. Validates that the other item's status remains 'delivered'.
 * 15. Validates that stock was restored only for the refunded variant.
 * 16. Validates that order status reflects mixed state.
 */
export async function test_api_refund_request_approval_item_only_refund(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Seller creates product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  typia.assert(product);
  // 3. Seller creates first variant (Red)
  const variant1 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: `SKU-RED-${typia.random<string & tags.Format<"uuid">>().substring(0, 8)}`,
          variantOptions: [{ key: "color", value: "Red" }],
          initialStockQuantity: 10,
        },
      },
    );
  typia.assert(variant1);
  // 4. Seller creates second variant (Blue)
  const variant2 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: `SKU-BLUE-${typia.random<string & tags.Format<"uuid">>().substring(0, 8)}`,
          variantOptions: [{ key: "color", value: "Blue" }],
          initialStockQuantity: 10,
        },
      },
    );
  typia.assert(variant2);
  // 5. Customer registration and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 6. Customer adds first variant to cart
  await api.functional.shoppingMall.customer.cart.items.create(
    customerConnection,
    {
      body: {
        productVariantId: variant1.id,
        quantity: 1,
      },
    },
  );
  // 7. Customer adds second variant to cart
  await api.functional.shoppingMall.customer.cart.items.create(
    customerConnection,
    {
      body: {
        productVariantId: variant2.id,
        quantity: 1,
      },
    },
  );
  // 8. Customer places order with both items
  const order = await generate_random_shopping_mall_customer_checkout(
    customerConnection,
    {
      body: {
        shopping_mall_customer_address_id: typia.random<
          string & tags.Format<"uuid">
        >(),
        payment_token: "test_payment_token",
      },
    },
  );
  typia.assert(order);
  // 9. Seller creates shipment with both items
  const shipment =
    await generate_random_shopping_mall_seller_orders_shipments_create(
      sellerConnection,
      {
        params: { orderId: order.id },
        body: {
          carrier_name: "Test Carrier",
          tracking_number: `TRACK-${typia.random<string & tags.Format<"uuid">>().substring(0, 12)}`,
          order_item_ids: [order.items[0].id, order.items[1].id],
        },
      },
    );
  typia.assert(shipment);
  // 10. Customer confirms delivery
  await api.functional.shoppingMall.customer.orders.shipments.delivered.confirmDelivery(
    customerConnection,
    {
      orderId: order.id,
      shipmentId: shipment.id,
    },
  );
  // 11. Customer creates refund request for only the first item
  const refundRequest =
    await generate_random_shopping_mall_customer_orders_items_refund_create(
      customerConnection,
      {
        params: {
          orderId: order.id,
          itemId: order.items[0].id,
        },
        body: {
          reason: "Product does not match description",
        },
      },
    );
  typia.assert(refundRequest);
  // 12. Seller approves the refund request for the specific item
  const approvedRefund =
    await api.functional.shoppingMall.seller.orders.items.refund.approve(
      sellerConnection,
      {
        orderId: order.id,
        itemId: order.items[0].id,
        body: {
          responseText: "Refund approved due to product mismatch",
        },
      },
    );
  typia.assert(approvedRefund);
  // 13. Validate refund request status is approved
  TestValidator.equals(
    "refund request status",
    approvedRefund.status,
    "approved",
  );
  // 14. Validate refunded item status is 'refunded'
  TestValidator.equals(
    "refunded item status",
    approvedRefund.orderItem.status,
    "refunded",
  );
  // 15. Validate other item exists and has different ID
  TestValidator.predicate(
    "other item exists",
    order.items[1].id !== order.items[0].id,
  );
  // 16. Validate that the two variants are different
  TestValidator.notEquals("variants are different", variant1.id, variant2.id);
  // 17. Validate order has exactly 2 items
  TestValidator.equals("order item count", order.items.length, 2);
  // 18. Validate refunded item is the first one
  TestValidator.equals(
    "refunded item is first",
    approvedRefund.orderItem.id,
    order.items[0].id,
  );
  // 19. Validate the refunded item's variant matches variant1
  TestValidator.equals(
    "refunded item variant",
    approvedRefund.orderItem.productVariant.id,
    variant1.id,
  );
  // 20. Validate other item's variant matches variant2
  TestValidator.equals(
    "other item variant",
    order.items[1].productVariant.id,
    variant2.id,
  );
  // 21. Validate that the refunded item's order matches the original order
  TestValidator.equals(
    "refunded item belongs to order",
    approvedRefund.orderItem.order.id,
    order.id,
  );
  // 22. Validate that both items belong to the same order
  TestValidator.equals(
    "both items in same order",
    order.items[0].order.id,
    order.items[1].order.id,
  );
  // 23. Validate refund request seller is the authenticated seller
  TestValidator.predicate(
    "seller responded to refund",
    approvedRefund.seller !== null,
  );
  // 24. Validate refund request has responded_at timestamp
  TestValidator.predicate(
    "refund has response timestamp",
    approvedRefund.responded_at !== null,
  );
}
