import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallCategoryTree } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategoryTree";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";
import type { IShoppingMallCustomerCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCart";
import type { IShoppingMallCustomerCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCartItem";
import type { IShoppingMallFulfillment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallFulfillment";
import type { IShoppingMallFulfillmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallFulfillmentItem";
import type { IShoppingMallFulfillmentOrderLine } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallFulfillmentOrderLine";
import type { IShoppingMallInventoryItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryItem";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderLineThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderLineThumbnail";
import type { IShoppingMallOrderSellerSegment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderSellerSegment";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";
import type { IShoppingMallSellerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerLogin";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShipmentSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentSummary";
import type { IShoppingMallShipmentTrackingEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentTrackingEvent";

/**
 * Validate that a platform administrator can append multiple tracking events to
 * a single shipment and that the API returns correctly typed tracking-event
 * objects tied to the target shipment.
 *
 * Business context:
 *
 * - Platform admins may need to backfill or correct shipment tracking information
 *   by pushing normalized tracking events into the logistics pipeline.
 * - A single shipment should accept multiple tracking events over time without
 *   overwriting earlier ones; each event should be immutable and carry its own
 *   occurred_at timestamp.
 *
 * Due to SDK limitations (no read endpoints for shipments or tracking events),
 * this test focuses on the write path and per-call invariants rather than
 * querying back aggregated history or shipment.latest_tracking_status.
 *
 * End-to-end steps implemented with available APIs:
 *
 * 1. Register and implicitly log in a platform admin using
 *    auth.platformAdmin.join.
 *
 *    - Capture the returned IShoppingMallPlatformAdmin.IAuthorized for type checking
 *         via typia.assert, but rely on the SDK's automatic token injection
 *         into connection.headers for authorization.
 * 2. Register and implicitly log in a seller using auth.seller.join so that we can
 *    create inventory for catalog SKUs.
 * 3. Register and implicitly log in a customer using auth.customer.join to own
 *    carts and orders.
 * 4. Switch to platformAdmin context (auth.platformAdmin.login) and create minimal
 *    catalog configuration:
 *
 *    - A category tree via shoppingMall.platformAdmin.categoryTrees.create; response
 *         is asserted but not otherwise used, as later APIs do not depend
 *         directly on it.
 *    - A brand via shoppingMall.platformAdmin.brands.create.
 *    - A product via shoppingMall.platformAdmin.products.create, assigning it to the
 *         seller by setting shopping_mall_seller_id to the seller id and
 *         shopping_mall_brand_id to the created brand id.
 *    - A SKU for that product via shoppingMall.platformAdmin.products.skus.create,
 *         using a simple pricing configuration and marking it active and
 *         purchasable.
 * 5. Switch to seller context (auth.seller.login) and create an inventory item for
 *    the SKU via shoppingMall.seller.inventoryItems.create so that orders
 *    involving this SKU are valid from an inventory standpoint.
 * 6. Switch to customer context (auth.customer.login) and:
 *
 *    - Create a customer cart via shoppingMall.customer.customerCarts.create.
 *    - Add the SKU to the cart via shoppingMall.customer.customerCarts.items.create
 *         with quantity 1.
 * 7. Still as customer, create an order from the cart via
 *    shoppingMall.customer.orders.create, populating the pricing snapshot
 *    fields with coherent numbers (e.g., subtotal = unit price, discount = 0,
 *    tax and shipping small positive values, grand_total = subtotal - discount
 *
 *    - Tax + shipping) and using random UUIDs for shipping_address_id and
 *         billing_address_id to satisfy type constraints.
 * 8. Switch to seller context and create a fulfillment for the order via
 *    shoppingMall.seller.orders.fulfillments.create. Because order-line IDs are
 *    not exposed by any SDK function in this test, we cannot reference real
 *    order_line_id values; we therefore call the endpoint with typia.random for
 *    IShoppingMallFulfillment.ICreate in simulation mode, focusing the test on
 *    later shipment and tracking-event writes rather than line-level
 *    consistency.
 * 9. Still in seller context, create a shipment for the order via
 *    shoppingMall.orders.shipments.create. For the body we again use a
 *    realistic payload built from fixed values where possible and random UUIDs
 *    where only identity matters (order_seller_segment_id, optional tracking
 *    fields). Capture the returned shipment and assert its type.
 * 10. Switch back to platformAdmin context (auth.platformAdmin.login) to exercise
 *     the trackingEvents endpoint under the correct actor.
 * 11. For the captured shipment.id, build three (or four) tracking-event request
 *     bodies with strictly increasing occurred_at timestamps:
 *
 *     - Event 1: status "shipped" at time T1.
 *     - Event 2: status "in_transit" at time T2 > T1.
 *     - Event 3: status "out_for_delivery" at time T3 > T2.
 *     - Optionally Event 4: status "delivered" at time T4 > T3. Each body is an
 *           IShoppingMallShipmentTrackingEvent.ICreate.
 * 12. Call shoppingMall.platformAdmin.shipments.trackingEvents.create once per
 *     body, always passing the same shipmentId.
 *
 *     - Typia.assert the returned IShoppingMallShipmentTrackingEvent.
 *     - TestValidator.equals("shipment id matches", event.shipment_id, shipment.id).
 *     - TestValidator.equals("status matches request", event.status,
 *           requestedStatus).
 * 13. Using the collected events array, validate business invariants that are
 *     observable from the write API responses alone:
 *
 *     - All event ids are distinct (pairwise inequality) using
 *           TestValidator.notEquals for a few representative comparisons.
 *     - Occurred_at timestamps are strictly increasing when interpreted as Date
 *           objects, via TestValidator.predicate on `t1 < t2 < t3 (< t4)`.
 *
 * This test does NOT:
 *
 * - Read shipments or tracking events back from list/detail endpoints (they are
 *   not present in the provided SDK), so shipment.latest_tracking_status and
 *   latest_tracking_timestamp are not directly asserted.
 * - Validate the internal linkage between fulfillment items and the shipment, as
 *   the necessary order-line and seller-segment querying APIs are outside the
 *   current function set. Instead, it focuses on ensuring the
 *   trackingEvents.create endpoint is callable by a platform admin for an
 *   existing shipment and behaves consistently across multiple calls.
 */
export async function test_api_platform_admin_adds_multiple_tracking_events_in_chronological_order(
  connection: api.IConnection,
) {
  // 1. Register platform admin (implicit login via join)
  const platformAdminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const platformAdminJoinBody = {
    email: platformAdminEmail,
    name: RandomGenerator.name(),
    password: "AdminPass123!",
    ip: null,
    href: "https://admin.test.local/join",
    referrer: "https://admin.test.local/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. Register seller (implicit login)
  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const sellerJoinBody = {
    email: sellerEmail,
    password: "SellerPass123!",
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  // 3. Register customer (implicit login)
  const customerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const customerJoinBody = {
    email: customerEmail,
    password: "CustomerPass123!",
    name: RandomGenerator.name(),
    ip: null,
    href: "https://shop.test.local/join",
    referrer: "https://shop.test.local/home",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  // 4. Switch to platform admin (explicit login to ensure context)
  const platformAdminLoginBody = {
    email: platformAdminEmail,
    password: "AdminPass123!",
    ip: null,
    href: "https://admin.test.local/login",
    referrer: "https://admin.test.local/home",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const platformAdminLogin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLogin);

  // 4-1. Create category tree (not strictly needed for later steps but
  // exercises dependency and ensures catalog baseline exists).
  const categoryTreeBody = {
    code: `tree-${RandomGenerator.alphaNumeric(8)}`,
    name: "Main Catalog Tree",
    description: "Primary category tree for tests",
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;

  const categoryTree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      { body: categoryTreeBody },
    );
  typia.assert(categoryTree);

  // 4-2. Create brand
  const brandBody = {
    name: `Brand ${RandomGenerator.name(1)}`,
    slug: `brand-${RandomGenerator.alphaNumeric(6)}`,
    description: "Test brand for shipment tracking",
    logo_uri: "https://cdn.test.local/brand/logo.png",
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert(brand);

  // 4-3. Create product assigned to seller and brand
  const productCode = `prod-${RandomGenerator.alphaNumeric(8)}`;
  const productBody = {
    shopping_mall_seller_id: sellerAuthorized.id,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: "Tracking Test Product",
    short_description: "Product used for shipment tracking e2e test",
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: "https://cdn.test.local/product/main.png",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      { body: productBody },
    );
  typia.assert(product);

  // 4-4. Create SKU for the product
  const skuCode = `sku-${RandomGenerator.alphaNumeric(8)}`;
  const skuBody = {
    code: skuCode,
    name: "Default Variant",
    listPrice: 100,
    salePrice: 90,
    currency: "USD",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.platformAdmin.products.skus.create(
      connection,
      {
        productCode,
        body: skuBody,
      },
    );
  typia.assert(sku);

  // 5. Switch to seller and create inventory for SKU
  const sellerLoginBody = {
    email: sellerEmail,
    password: "SellerPass123!",
    ip: null,
    href: "https://seller.test.local/login",
    referrer: "https://seller.test.local/home",
  } satisfies IShoppingMallSellerLogin.IRequest;

  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLogin);

  const inventoryBody = {
    product_sku_id: sku.id,
    on_hand_quantity: 100,
    low_stock_threshold: 5,
    backorder_enabled: false,
    preorder_enabled: false,
  } satisfies IShoppingMallInventoryItem.ICreate;

  const inventoryItem: IShoppingMallInventoryItem =
    await api.functional.shoppingMall.seller.inventoryItems.create(connection, {
      body: inventoryBody,
    });
  typia.assert(inventoryItem);

  // 6. Switch to customer context and create cart + add item
  const customerLoginBody = {
    email: customerEmail,
    password: "CustomerPass123!",
    ip: null,
    href: "https://shop.test.local/login",
    referrer: "https://shop.test.local/home",
  } satisfies IShoppingMallCustomerAuth.ILogin;

  const customerLogin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLogin);

  const cartBody = {
    currency_code: "USD",
    region_code: "US",
    channel: "web",
    metadata: {
      scenario: "tracking_e2e",
    },
    is_active: true,
    source_guest_token: undefined,
  } satisfies IShoppingMallCustomerCart.ICreate;

  const cart: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.customerCarts.create(
      connection,
      { body: cartBody },
    );
  typia.assert(cart);

  const cartItemBody = {
    skuId: sku.id,
    quantity: 1,
    note: "Primary test line",
  } satisfies IShoppingMallCustomerCartItem.ICreate;

  const cartItem: IShoppingMallCustomerCartItem =
    await api.functional.shoppingMall.customer.customerCarts.items.create(
      connection,
      {
        customerCartId: cart.id,
        body: cartItemBody,
      },
    );
  typia.assert(cartItem);

  // 7. Create order from cart
  const itemsSubtotal = sku.salePrice;
  const discountAmount = 0;
  const shippingAmount = 10;
  const taxAmount = 5;
  const grandTotal =
    itemsSubtotal - discountAmount + shippingAmount + taxAmount;

  const shippingAddressId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const billingAddressId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const orderCreateBody = {
    customer_cart_id: cart.id,
    currency_code: cart.currency_code,
    items_subtotal_amount: itemsSubtotal,
    discount_total_amount: discountAmount,
    shipping_total_amount: shippingAmount,
    tax_total_amount: taxAmount,
    grand_total_amount: grandTotal,
    shipping_address_id: shippingAddressId,
    billing_address_id: billingAddressId,
    customer_note: "Please deliver quickly",
  } satisfies IShoppingMallOrder.ICreate;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateBody,
    });
  typia.assert(order);

  // 8. Switch to seller and create fulfillment for order
  const sellerLoginAgain: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoginAgain);

  const fulfillmentBody: IShoppingMallFulfillment.ICreate =
    typia.random<IShoppingMallFulfillment.ICreate>();

  const fulfillment: IShoppingMallFulfillment =
    await api.functional.shoppingMall.seller.orders.fulfillments.create(
      connection,
      {
        orderId: order.id,
        body: fulfillmentBody,
      },
    );
  typia.assert(fulfillment);

  // 9. Create shipment for order. We use a mostly-random but type-safe body;
  // seller segment id is not available from the order type, so we rely on
  // random generation for test purposes.
  const shipmentCreateBody: IShoppingMallShipment.ICreate =
    typia.random<IShoppingMallShipment.ICreate>();

  const shipment: IShoppingMallShipment =
    await api.functional.shoppingMall.orders.shipments.create(connection, {
      orderId: order.id,
      body: shipmentCreateBody,
    });
  typia.assert(shipment);

  // 10. Switch back to platform admin context before creating tracking events
  const platformAdminLoginAgain: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoginAgain);

  const baseTime = new Date();
  const t1 = new Date(baseTime.getTime() + 1 * 60 * 1000);
  const t2 = new Date(baseTime.getTime() + 2 * 60 * 1000);
  const t3 = new Date(baseTime.getTime() + 3 * 60 * 1000);
  const t4 = new Date(baseTime.getTime() + 4 * 60 * 1000);

  const eventBodies: IShoppingMallShipmentTrackingEvent.ICreate[] = [
    {
      status: "shipped",
      carrier_status_code: "SHIP",
      location_description: "Seoul DC",
      carrier_raw_message: "Shipment handed to carrier",
      occurred_at: t1.toISOString(),
    },
    {
      status: "in_transit",
      carrier_status_code: "TRANSIT",
      location_description: "Incheon Hub",
      carrier_raw_message: "Departed hub",
      occurred_at: t2.toISOString(),
    },
    {
      status: "out_for_delivery",
      carrier_status_code: "OFD",
      location_description: "Local delivery center",
      carrier_raw_message: "Out for delivery",
      occurred_at: t3.toISOString(),
    },
    {
      status: "delivered",
      carrier_status_code: "DLVD",
      location_description: "Customer address",
      carrier_raw_message: "Delivered",
      occurred_at: t4.toISOString(),
    },
  ];

  const events: IShoppingMallShipmentTrackingEvent[] = [];

  for (const body of eventBodies) {
    const created: IShoppingMallShipmentTrackingEvent =
      await api.functional.shoppingMall.platformAdmin.shipments.trackingEvents.create(
        connection,
        {
          shipmentId: shipment.id,
          body,
        },
      );
    typia.assert(created);

    TestValidator.equals(
      "tracking event shipment id matches shipment.id",
      created.shipment_id,
      shipment.id,
    );
    TestValidator.equals(
      "tracking event status matches request",
      created.status,
      body.status,
    );

    events.push(created);
  }

  // 11. Validate ids are distinct
  TestValidator.notEquals(
    "first and second tracking event ids differ",
    events[0].id,
    events[1].id,
  );
  TestValidator.notEquals(
    "second and third tracking event ids differ",
    events[1].id,
    events[2].id,
  );
  TestValidator.notEquals(
    "third and fourth tracking event ids differ",
    events[2].id,
    events[3].id,
  );

  // 12. Validate occurred_at is strictly increasing
  const d1 = new Date(events[0].occurred_at);
  const d2 = new Date(events[1].occurred_at);
  const d3 = new Date(events[2].occurred_at);
  const d4 = new Date(events[3].occurred_at);

  TestValidator.predicate(
    "tracking event timestamps are strictly increasing (T1 < T2 < T3 < T4)",
    d1.getTime() < d2.getTime() &&
      d2.getTime() < d3.getTime() &&
      d3.getTime() < d4.getTime(),
  );
}
