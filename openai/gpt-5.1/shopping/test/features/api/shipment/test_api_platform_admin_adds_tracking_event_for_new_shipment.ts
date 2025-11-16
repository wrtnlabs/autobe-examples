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

export async function test_api_platform_admin_adds_tracking_event_for_new_shipment(
  connection: api.IConnection,
) {
  /**
   * Scenario:
   *
   * 1. Register a platform admin and obtain an authorized session.
   * 2. As platform admin, create a category tree and a brand.
   * 3. As platform admin, create a product for a seller and one SKU variant.
   * 4. Register a seller and a customer (so that order flows are realistic).
   * 5. As seller, create an inventory item for the SKU with sufficient on-hand
   *    quantity.
   * 6. As customer, create a cart and add the SKU as a cart item.
   * 7. As customer, create an order from the cart.
   * 8. As seller, create a fulfillment for at least one order line.
   * 9. Create a shipment for the order (seller segment) using the
   *    orders.shipments.create API.
   * 10. As platform admin, append the first tracking event to this shipment.
   * 11. Validate that the returned tracking event links to the shipment and echoes
   *     the input fields.
   *
   * Notes:
   *
   * - We do not test negative cases (invalid tokens, non-existent shipment) in
   *   this scenario.
   * - We rely on typia.assert() for full structural validation and TestValidator
   *   for business assertions.
   */

  // Helper: quickly generate a simple URL for href/referrer
  const url = "https://shoppingmall.example.com/";

  // 1. Register a platform admin (join) and obtain tokens
  const platformAdminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: "admin-password-1234",
    ip: null,
    href: url,
    referrer: url,
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  const platformAdminEmail = platformAdmin.email;
  const platformAdminPassword = platformAdminJoinBody.password;

  // 2. As platform admin, create a category tree
  const categoryTreeBody = {
    code: `tree-${RandomGenerator.alphaNumeric(8)}`,
    name: "Main Catalog",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;

  const categoryTree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      { body: categoryTreeBody },
    );
  typia.assert(categoryTree);

  // 3. As platform admin, create a brand
  const brandBody = {
    name: `Brand ${RandomGenerator.name(1)}`,
    slug: `brand-${RandomGenerator.alphaNumeric(8)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    logo_uri: "https://cdn.example.com/logo.png",
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert(brand);

  // 4. Register a seller and a customer

  // 4-1. Seller join
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "seller-password-1234",
    storeName: `Store ${RandomGenerator.name(1)}`,
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  const sellerId = sellerAuthorized.id;
  const sellerEmail = sellerAuthorized.email;
  const sellerPassword = sellerJoinBody.password;

  // 4-2. Customer join
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "customer-password-1234",
    name: RandomGenerator.name(),
    ip: null,
    href: url,
    referrer: url,
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  const customerEmail = customerAuthorized.email;
  const customerPassword = customerJoinBody.password;

  // 5. As platform admin, create a product that belongs to the seller and references the brand
  // Ensure we're acting as platform admin (login again to be explicit)
  const platformAdminLoginBody = {
    email: platformAdminEmail,
    password: platformAdminPassword,
    ip: null,
    href: url,
    referrer: url,
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const platformAdminLoggedIn: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoggedIn);

  const productCode = `prd-${RandomGenerator.alphaNumeric(8)}`;

  const productBody = {
    shopping_mall_seller_id: sellerId,
    shopping_mall_brand_id: brand.id,
    code: productCode as string & tags.MinLength<1>,
    name: "Test Shipment Product" as string & tags.MinLength<1>,
    short_description: RandomGenerator.paragraph({ sentences: 4 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: true,
    primary_image_uri: "https://cdn.example.com/product.png",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      {
        body: productBody,
      },
    );
  typia.assert(product);
  const productCodePersisted = product.code;

  // 6. As platform admin, create a SKU under this product
  const skuBody = {
    code: `sku-${RandomGenerator.alphaNumeric(6)}`,
    name: "Standard Variant",
    listPrice: 10000,
    salePrice: 9000,
    currency: "KRW",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.platformAdmin.products.skus.create(
      connection,
      {
        productCode: productCodePersisted,
        body: skuBody,
      },
    );
  typia.assert(sku);

  const skuSummaryId = sku.id;

  // 7. As seller, create an inventory item for the SKU
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: url,
    referrer: url,
  } satisfies IShoppingMallSellerLogin.IRequest;

  const sellerLoggedIn: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoggedIn);

  const inventoryBody = {
    product_sku_id: skuSummaryId,
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

  // 8. As customer, create a persistent cart
  const customerLoginBody = {
    email: customerEmail,
    password: customerPassword,
    ip: null,
    href: url,
    referrer: url,
    userAgent: undefined,
  } satisfies IShoppingMallCustomerAuth.ILogin;

  const customerLoggedIn: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLoggedIn);

  const cartBody = {
    currency_code: "KRW",
    region_code: "KR-Seoul",
    channel: "web",
    metadata: {
      campaign: "shipment-tracking-e2e",
    },
    is_active: true,
    source_guest_token: undefined,
  } satisfies IShoppingMallCustomerCart.ICreate;

  const cart: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.customerCarts.create(
      connection,
      {
        body: cartBody,
      },
    );
  typia.assert(cart);

  // 9. Add the SKU to the cart as a cart item
  const cartItemBody = {
    skuId: skuSummaryId,
    quantity: 1,
    note: "First shipment item",
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

  // 10. Create an order from the cart
  const itemsSubtotal = 9000;
  const discountTotal = 0;
  const shippingTotal = 0;
  const taxTotal = 0;
  const grandTotal = itemsSubtotal - discountTotal + shippingTotal + taxTotal;

  const shippingAddressId = typia.random<string & tags.Format<"uuid">>();
  const billingAddressId = typia.random<string & tags.Format<"uuid">>();

  const orderBody = {
    customer_cart_id: cart.id,
    currency_code: cart.currency_code,
    items_subtotal_amount: itemsSubtotal,
    discount_total_amount: discountTotal,
    shipping_total_amount: shippingTotal,
    tax_total_amount: taxTotal,
    grand_total_amount: grandTotal,
    shipping_address_id: shippingAddressId,
    billing_address_id: billingAddressId,
    customer_note: "Please ship quickly.",
  } satisfies IShoppingMallOrder.ICreate;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderBody,
    });
  typia.assert(order);

  // 11. As seller, create a fulfillment for one order line.
  // We do not have direct access to order lines in this test context, so we
  // instead create a fulfillment with a random order_line_id purely to drive
  // the shipment creation flow logically. The backend may simulate this when
  // connection.simulate is enabled.

  const fulfillmentOrderLine: IShoppingMallFulfillmentOrderLine.ICreate = {
    order_line_id: typia.random<string & tags.Format<"uuid">>(),
    quantity: 1,
  };

  const fulfillmentBody = {
    order_line_fulfillments: [fulfillmentOrderLine],
    carrier_code: "CARRIER-CODE",
    requested_ship_date: new Date().toISOString(),
    warehouse_code: "WH-001",
    notes: "Prepare for first shipment.",
  } satisfies IShoppingMallFulfillment.ICreate;

  const fulfillment: IShoppingMallFulfillment =
    await api.functional.shoppingMall.seller.orders.fulfillments.create(
      connection,
      {
        orderId: order.id,
        body: fulfillmentBody,
      },
    );
  typia.assert(fulfillment);

  // 12. Create a shipment for the order using orders.shipments.create

  // We need a seller segment id; derive it from one of the fulfillment.shipments
  // summaries if available; otherwise, simulate with a random UUID suitable
  // for IShoppingMallShipment.ICreate.order_seller_segment_id.

  let orderSellerSegmentId: string & tags.Format<"uuid">;
  if (fulfillment.shipments !== undefined && fulfillment.shipments.length > 0) {
    // Use the first shipment summary's id as the segment anchor if present.
    // Even though the type is IShoppingMallShipmentSummary (with an id for shipment),
    // this is only to get a UUID-shaped value for the order_seller_segment_id field
    // in simulation mode.
    const firstShipment: IShoppingMallShipmentSummary =
      fulfillment.shipments[0];
    typia.assert(firstShipment);
    orderSellerSegmentId = firstShipment.id as string & tags.Format<"uuid">;
  } else {
    orderSellerSegmentId = typia.random<string & tags.Format<"uuid">>();
  }

  const shipmentBody = {
    order_seller_segment_id: orderSellerSegmentId,
    shipment_status: "ready_to_ship",
    carrier_name: "Nestia Logistics",
    carrier_service_level: "express",
    tracking_number: RandomGenerator.alphaNumeric(12),
    shipped_at: new Date().toISOString(),
  } satisfies IShoppingMallShipment.ICreate;

  const shipment: IShoppingMallShipment =
    await api.functional.shoppingMall.orders.shipments.create(connection, {
      orderId: order.id,
      body: shipmentBody,
    });
  typia.assert(shipment);

  // 13. As platform admin, append a tracking event to the shipment
  const platformAdminLoginAgainBody = {
    email: platformAdminEmail,
    password: platformAdminPassword,
    ip: null,
    href: url,
    referrer: url,
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const platformAdminLoggedInAgain: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginAgainBody,
    });
  typia.assert(platformAdminLoggedInAgain);

  const occurredAt = new Date().toISOString() as string &
    tags.Format<"date-time">;

  const trackingEventBody = {
    status: "shipped",
    carrier_status_code: "SHIPPED",
    location_description: "Seoul Distribution Center",
    carrier_raw_message: "Parcel has left the facility.",
    occurred_at: occurredAt,
  } satisfies IShoppingMallShipmentTrackingEvent.ICreate;

  const trackingEvent: IShoppingMallShipmentTrackingEvent =
    await api.functional.shoppingMall.platformAdmin.shipments.trackingEvents.create(
      connection,
      {
        shipmentId: shipment.id,
        body: trackingEventBody,
      },
    );
  typia.assert(trackingEvent);

  // 14. Business assertions
  TestValidator.equals(
    "tracking event shipment_id should match shipment.id",
    trackingEvent.shipment_id,
    shipment.id,
  );

  TestValidator.equals(
    "tracking event status should match input",
    trackingEvent.status,
    trackingEventBody.status,
  );

  TestValidator.equals(
    "tracking event occurred_at should match input",
    trackingEvent.occurred_at,
    trackingEventBody.occurred_at,
  );

  TestValidator.equals(
    "tracking event carrier_status_code should match input",
    trackingEvent.carrier_status_code,
    trackingEventBody.carrier_status_code,
  );

  TestValidator.equals(
    "tracking event location_description should match input",
    trackingEvent.location_description,
    trackingEventBody.location_description,
  );

  TestValidator.equals(
    "tracking event carrier_raw_message should match input",
    trackingEvent.carrier_raw_message,
    trackingEventBody.carrier_raw_message,
  );
}
