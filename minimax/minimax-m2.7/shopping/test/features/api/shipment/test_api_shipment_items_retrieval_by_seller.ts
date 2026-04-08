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
import type { IEcommerceMallProductSnapshotVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariantOptionValue";
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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
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
import { generate_random_ecommerce_mall_seller_variants_inventory_create } from "../../../generate/generate_random_ecommerce_mall_seller_variants_inventory_create";
import { prepare_random_ecommerce_mall_cart } from "../../../prepare/prepare_random_ecommerce_mall_cart";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";

/**
 * Test that an approved seller can successfully retrieve all order items included in their shipment.
 *
 * Validates the complete fulfillment workflow including:
 * 1. Administrator registers to approve seller
 * 2. Seller registers and creates product with variants
 * 3. Customer registers, adds to cart, and places order
 * 4. Seller creates shipment for paid order items
 * 5. Seller retrieves shipment items and validates response structure
 *
 * Validates that the response returns:
 * - Shipment item ID and creation timestamp
 * - Complete order item details (product name, quantity, unit price, status as 'shipped')
 * - Product snapshot information frozen at purchase time
 * - Product variant details with SKU and option key-value pairs
 * - Parent shipment context with carrier and tracking number
 */
export async function test_api_shipment_items_retrieval_by_seller(
  connection: api.IConnection,
): Promise<void> {
  // ============================================================
  // 1. Setup: Register admin
  // ============================================================
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {});
  typia.assert(adminAuth);
  // ============================================================
  // 2. Setup: Register and login as seller
  // ============================================================
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = "TestPass123!";
  await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    },
  });
  // Login as seller
  const approvedSellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_login(approvedSellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAuth);
  // ============================================================
  // 3. Setup: Register and login as customer
  // ============================================================
  const customerConnection: api.IConnection = { host: connection.host };
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = "TestPass123!";
  await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
    },
  });
  // Login as customer
  const loggedInCustomerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_login(
    loggedInCustomerConnection,
    {
      body: {
        email: customerEmail,
        password: customerPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(customerAuth);
  // ============================================================
  // 4. Seller creates product with variants
  // ============================================================
  const product =
    await generate_random_ecommerce_mall_seller_sellers_me_products_create(
      approvedSellerConnection,
      {},
    );
  typia.assert(product);
  const variant = product.variants[0];
  TestValidator.equals("variant exists", !!variant, true);
  // ============================================================
  // 5. Seller adds inventory to variant
  // ============================================================
  const inventoryRecord =
    await generate_random_ecommerce_mall_seller_variants_inventory_create(
      approvedSellerConnection,
      {
        params: {
          variantId: variant.id,
        },
      },
    );
  typia.assert(inventoryRecord);
  // ============================================================
  // 6. Customer adds item to cart
  // ============================================================
  const cartItem =
    await generate_random_ecommerce_mall_customer_customers_me_cart_create(
      loggedInCustomerConnection,
      {
        body: {
          variantId: variant.id,
          quantity: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
        },
      },
    );
  typia.assert(cartItem);
  // ============================================================
  // 7. Customer places order (order creation handles shipping address)
  // ============================================================
  const order =
    await generate_random_ecommerce_mall_customer_customers_me_orders_create(
      loggedInCustomerConnection,
      {},
    );
  typia.assert(order);
  TestValidator.equals("order status is paid", order.status, "paid");
  // Get the order item for this seller
  const orderItem = order.orderItems[0];
  TestValidator.equals("order item exists", !!orderItem, true);
  TestValidator.equals("order item status is paid", orderItem.status, "paid");
  // ============================================================
  // 8. Seller creates shipment
  // ============================================================
  const shipment =
    await generate_random_ecommerce_mall_seller_sellers_me_orders_items_ship_create(
      approvedSellerConnection,
      {
        params: {
          itemId: orderItem.id,
        },
        body: {
          itemIds: [orderItem.id],
          carrier: "DHL Express",
          trackingNumber: "DHL123456789",
        },
      },
    );
  typia.assert(shipment);
  TestValidator.equals("shipment carrier", shipment.carrier, "DHL Express");
  TestValidator.equals(
    "shipment tracking number",
    shipment.trackingNumber,
    "DHL123456789",
  );
  // ============================================================
  // 9. Seller retrieves shipment items
  // ============================================================
  const shipmentItems =
    await api.functional.ecommerceMall.seller.shipments.items.getByShipmentid(
      approvedSellerConnection,
      {
        shipmentId: shipment.id,
      },
    );
  typia.assert(shipmentItems);
  // ============================================================
  // 10. Validate response structure
  // ============================================================
  // Validate shipment item ID
  TestValidator.equals("shipment item id exists", !!shipmentItems.id, true);
  // Validate creation timestamp
  TestValidator.equals(
    "shipment item created_at exists",
    !!shipmentItems.createdAt,
    true,
  );
  // Validate order item details
  TestValidator.equals(
    "order item id matches",
    shipmentItems.orderItem.id,
    orderItem.id,
  );
  TestValidator.equals(
    "quantity matches",
    shipmentItems.orderItem.quantity,
    orderItem.quantity,
  );
  TestValidator.equals(
    "unit price matches",
    shipmentItems.orderItem.unit_price,
    orderItem.unit_price,
  );
  TestValidator.equals(
    "status is shipped",
    shipmentItems.orderItem.status,
    "shipped",
  );
  // Validate product snapshot (frozen at purchase time)
  TestValidator.equals(
    "product snapshot exists",
    !!shipmentItems.productSnapshot,
    true,
  );
  TestValidator.equals(
    "product name preserved",
    shipmentItems.productSnapshot.name,
    product.name,
  );
  // Validate product variant details with SKU and options
  // The property is productSnapshotVariant, not variantOptions
  TestValidator.equals(
    "product snapshot variant exists",
    !!shipmentItems.productSnapshotVariant,
    true,
  );
  TestValidator.equals(
    "variant sku exists",
    !!shipmentItems.productSnapshotVariant.sku,
    true,
  );
  TestValidator.equals(
    "variant option values exist",
    !!shipmentItems.productSnapshotVariant.optionValues,
    true,
  );
  // Validate parent shipment context
  TestValidator.equals(
    "parent shipment carrier",
    shipmentItems.shipment.carrier,
    "DHL Express",
  );
  TestValidator.equals(
    "parent shipment tracking number",
    shipmentItems.shipment.tracking_number,
    "DHL123456789",
  );
}
