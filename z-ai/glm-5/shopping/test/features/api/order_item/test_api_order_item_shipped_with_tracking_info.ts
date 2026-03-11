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
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_seller_products_create";
import { generate_random_shopping_mall_seller_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_seller_shipments_create";
import { generate_random_shopping_mall_seller_variants_inventory_adjust } from "../../../generate/generate_random_shopping_mall_seller_variants_inventory_adjust";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

/**
 * Test that a shipped order item includes shipment tracking information.
 *
 * Validates that when an order item has been shipped:
 * - The status changes to 'shipped'
 * - Shipment tracking details are included
 * - The snapshot preserves purchase-time data
 *
 * Note: This test uses simulation/mock mode and may require additional
 * setup endpoints (address creation, seller approval) in production.
 */
export async function test_api_order_item_shipped_with_tracking_info(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connections (base connection never used directly)
  const sellerConnection: api.IConnection = { host: connection.host };
  const customerConnection: api.IConnection = { host: connection.host };
  // 1. Seller setup - authenticate and create product infrastructure
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      shopName: RandomGenerator.name(1),
    },
  });
  typia.assert(seller);
  // Create product
  const product =
    await generate_random_shopping_mall_seller_seller_products_create(
      sellerConnection,
      {},
    );
  typia.assert(product);
  // Create variant
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  // Add inventory
  const inventory =
    await generate_random_shopping_mall_seller_variants_inventory_adjust(
      sellerConnection,
      {
        params: { variantId: variant.id },
        body: {
          quantity_change: 100,
          reason: "Initial stock for test",
        },
      },
    );
  typia.assert(inventory);
  // 2. Customer setup
  const customer = await authorize_customer_join(customerConnection, {});
  typia.assert(customer);
  // Add to cart
  const cartItem =
    await generate_random_shopping_mall_customer_customers_cart_items_create(
      customerConnection,
      {
        body: {
          variantId: variant.id,
          quantity: 1,
        },
      },
    );
  typia.assert(cartItem);
  // Checkout - note: requires address which may need mock/simulation support
  const order = await generate_random_shopping_mall_customer_checkout_create(
    customerConnection,
    {},
  );
  typia.assert(order);
  // Get order items
  const orderItem = order.orderItems[0];
  typia.assert(orderItem);
  // 3. Seller creates shipment
  const shipment =
    await generate_random_shopping_mall_seller_seller_shipments_create(
      sellerConnection,
      {
        body: {
          carrierName: "FedEx",
          trackingNumber: RandomGenerator.alphaNumeric(12).toUpperCase(),
          orderId: order.id,
          orderItemIds: [orderItem.id],
        },
      },
    );
  typia.assert(shipment);
  // 4. Customer retrieves the shipped order item
  const shippedItem =
    await api.functional.shoppingMall.customer.orders.items.at(
      customerConnection,
      {
        orderId: order.id,
        itemId: orderItem.id,
      },
    );
  typia.assert(shippedItem);
  // 5. Validate order item status
  TestValidator.equals(
    "order item status is shipped",
    shippedItem.status,
    "shipped",
  );
  // 6. Validate shipment tracking information
  TestValidator.predicate(
    "shipment exists on shipped item",
    shippedItem.shipment !== null,
  );
  if (shippedItem.shipment !== null) {
    const itemShipment = shippedItem.shipment;
    TestValidator.predicate(
      "carrier name provided",
      itemShipment.carrierName.length > 0,
    );
    TestValidator.predicate(
      "tracking number provided",
      itemShipment.trackingNumber.length > 0,
    );
    TestValidator.equals(
      "delivery status is pending_delivery before confirmation",
      itemShipment.deliveryStatus,
      "pending_delivery",
    );
    TestValidator.predicate(
      "shipped_at timestamp set",
      itemShipment.shippedAt.length > 0,
    );
    TestValidator.equals(
      "seller reference matches",
      itemShipment.seller.id,
      seller.id,
    );
  }
  // 7. Validate snapshot preserves purchase-time data
  TestValidator.predicate(
    "snapshot exists",
    shippedItem.snapshot !== undefined,
  );
  TestValidator.equals(
    "snapshot preserves product name",
    shippedItem.snapshot.productName,
    product.name,
  );
  TestValidator.equals(
    "snapshot preserves seller shop name",
    shippedItem.snapshot.sellerShopName,
    seller.shop_name,
  );
  TestValidator.predicate(
    "snapshot price matches order item price",
    shippedItem.snapshot.price === shippedItem.price,
  );
}
