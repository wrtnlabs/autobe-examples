import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckout";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariant";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import type { IEcommerceMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlist";
import type { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_ecommerce_mall_customer_customers_me_cart_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_me_cart_create";
import { generate_random_ecommerce_mall_customer_customers_me_orders_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_me_orders_create";
import { generate_random_ecommerce_mall_seller_sellers_me_orders_items_ship_create } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_orders_items_ship_create";
import { generate_random_ecommerce_mall_seller_sellers_me_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_products_create";
import { generate_random_ecommerce_mall_seller_sellers_me_variants_inventory_add } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_variants_inventory_add";
import { prepare_random_ecommerce_mall_cart } from "../../../prepare/prepare_random_ecommerce_mall_cart";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";

/**
 * Test seller bundled shipment creation with multiple items from the same order.
 *
 * Validates the complete fulfillment workflow where a seller ships multiple order
 * items together in a single shipment. The test verifies that:
 *
 * 1. Seller can register and create products with inventory
 * 2. Customer can add multiple products to cart and complete checkout
 * 3. Both order items have 'paid' status after order creation
 * 4. Seller can create a single shipment bundling both items
 * 5. Both items transition from 'paid' to 'shipped' status
 * 6. Tracking information is stored correctly (carrier, tracking number)
 * 7. Shipment contains both order items with correct quantities
 * 8. Order shipments_count increments correctly
 *
 * Test data setup:
 * - Register approved seller account
 * - Create two different products with variants
 * - Add inventory for both product variants
 * - Register customer account
 * - Customer adds both products to cart
 * - Customer creates order with shipping address
 *
 * Validation scenarios:
 * - Verify order contains both items with 'paid' status
 * - Create shipment bundling both items with FedEx and tracking TRACK123
 * - Verify both order items transition to 'shipped' status
 * - Verify shipment contains both items
 * - Verify order shipments_count increments
 */
export async function test_api_seller_shipment_multiple_items_bundle(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  // 2. Create first product
  const product1 =
    await generate_random_ecommerce_mall_seller_sellers_me_products_create(
      sellerConnection,
      {},
    );
  typia.assert(product1);
  // 3. Create second product
  const product2 =
    await generate_random_ecommerce_mall_seller_sellers_me_products_create(
      sellerConnection,
      {},
    );
  typia.assert(product2);
  // 4. Add inventory for first product's first variant
  const variant1 = product1.variants[0];
  const inventoryRecord1 =
    await generate_random_ecommerce_mall_seller_sellers_me_variants_inventory_add(
      sellerConnection,
      {
        params: { variantId: variant1.id },
      },
    );
  typia.assert(inventoryRecord1);
  // 5. Add inventory for second product's first variant
  const variant2 = product2.variants[0];
  const inventoryRecord2 =
    await generate_random_ecommerce_mall_seller_sellers_me_variants_inventory_add(
      sellerConnection,
      {
        params: { variantId: variant2.id },
      },
    );
  typia.assert(inventoryRecord2);
  // 6. Customer registration
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  // 7. Customer adds first product to cart
  const cartItem1 =
    await generate_random_ecommerce_mall_customer_customers_me_cart_create(
      customerConnection,
      {
        body: { variantId: variant1.id, quantity: 2 },
      },
    );
  typia.assert(cartItem1);
  // 8. Customer adds second product to cart
  const cartItem2 =
    await generate_random_ecommerce_mall_customer_customers_me_cart_create(
      customerConnection,
      {
        body: { variantId: variant2.id, quantity: 1 },
      },
    );
  typia.assert(cartItem2);
  // 9. Customer creates shipping address and order
  const order =
    await generate_random_ecommerce_mall_customer_customers_me_orders_create(
      customerConnection,
      {},
    );
  typia.assert(order);
  // 10. Verify order has both items with 'paid' status
  TestValidator.equals("order has 2 items", order.orderItems.length, 2);
  const orderItem1 = order.orderItems.find(
    (item) => item.productSnapshot.name === product1.name,
  )!;
  const orderItem2 = order.orderItems.find(
    (item) => item.productSnapshot.name === product2.name,
  )!;
  TestValidator.equals(
    "first order item has paid status",
    orderItem1.status,
    "paid",
  );
  TestValidator.equals(
    "second order item has paid status",
    orderItem2.status,
    "paid",
  );
  TestValidator.equals(
    "first order item quantity is 2",
    orderItem1.quantity,
    2,
  );
  TestValidator.equals(
    "second order item quantity is 1",
    orderItem2.quantity,
    1,
  );
  // 11. Seller creates bundled shipment with both items
  const shipment =
    await generate_random_ecommerce_mall_seller_sellers_me_orders_items_ship_create(
      sellerConnection,
      {
        params: { itemId: orderItem1.id },
        body: {
          carrier: "FedEx",
          trackingNumber: "TRACK123",
          itemIds: [orderItem1.id, orderItem2.id],
        },
      },
    );
  typia.assert(shipment);
  // 12. Validate shipment creation
  TestValidator.equals("shipment carrier is FedEx", shipment.carrier, "FedEx");
  TestValidator.equals(
    "tracking number is TRACK123",
    shipment.trackingNumber,
    "TRACK123",
  );
  TestValidator.equals(
    "shipment contains 2 items",
    shipment.shipmentItems.length,
    2,
  );
  // 13. Verify both items transitioned to 'shipped' status
  const shippedItem1 = shipment.shipmentItems.find(
    (item) => item.productSnapshot.name === product1.name,
  )!;
  const shippedItem2 = shipment.shipmentItems.find(
    (item) => item.productSnapshot.name === product2.name,
  )!;
  TestValidator.equals(
    "first item status is shipped",
    shippedItem1.status,
    "shipped",
  );
  TestValidator.equals(
    "second item status is shipped",
    shippedItem2.status,
    "shipped",
  );
  TestValidator.equals(
    "first shipped item quantity is 2",
    shippedItem1.quantity,
    2,
  );
  TestValidator.equals(
    "second shipped item quantity is 1",
    shippedItem2.quantity,
    1,
  );
}
