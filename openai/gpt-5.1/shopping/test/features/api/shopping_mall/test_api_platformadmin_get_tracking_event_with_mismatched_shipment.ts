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
import type { IShoppingMallShipmentTrackingEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentTrackingEvent";

/**
 * Validate that a tracking event can only be fetched through its owning
 * shipment.
 *
 * Business goal:
 *
 * - Ensure GET
 *   /shoppingMall/platformAdmin/shipments/{shipmentId}/trackingEvents/{trackingEventId}
 *   returns an error when the trackingEventId does not belong to the given
 *   shipmentId, while the correct shipmentId/trackingEventId pair succeeds.
 *
 * Scenario steps:
 *
 * 1. Platform admin joins and authenticates, establishing an admin session.
 * 2. Platform admin creates minimal catalog configuration:
 *
 *    - Category tree
 *    - Brand
 *    - Product
 *    - SKU for the product
 * 3. Customer joins and authenticates, establishing a customer session.
 * 4. Customer creates a cart and adds one line item for the created SKU.
 * 5. Customer creates an order from the cart using snapshot monetary values.
 * 6. Using the same connection, two shipments are created for the order (shipmentA
 *    and shipmentB).
 * 7. Platform admin creates a tracking event for each shipment:
 *
 *    - EventA for shipmentA
 *    - EventB for shipmentB
 * 8. Mismatch validation: admin calls GET trackingEvents.at using (shipmentA.id,
 *    eventB.id). This must throw an error, as eventB belongs to shipmentB, not
 *    shipmentA.
 * 9. Control validation: admin calls GET trackingEvents.at using (shipmentB.id,
 *    eventB.id). This must succeed, and the returned event must have id ===
 *    eventB.id and shipment_id === shipmentB.id.
 */
export async function test_api_platformadmin_get_tracking_event_with_mismatched_shipment(
  connection: api.IConnection,
) {
  // 1. Platform admin joins (registration + implicit login via SDK)
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const adminJoinBody = {
    email: adminEmail,
    name: RandomGenerator.name(2),
    password: "AdminPassword!234",
    ip: null,
    href: "https://admin.shopping-mall.test/auth/join",
    referrer: "https://admin.shopping-mall.test/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Catalog setup as platform admin
  const categoryTreeBody = {
    code: `tree-${RandomGenerator.alphaNumeric(8)}`,
    name: "Main Catalog Tree",
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

  const brandBody = {
    name: `Brand ${RandomGenerator.name(1)}`,
    slug: `brand-${RandomGenerator.alphaNumeric(8)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    logo_uri: "https://cdn.shopping-mall.test/logo.png",
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert(brand);

  const fakeSellerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const productBody = {
    shopping_mall_seller_id: fakeSellerId,
    shopping_mall_brand_id: brand.id,
    code: `prd-${RandomGenerator.alphaNumeric(10)}` as string &
      tags.MinLength<1>,
    name: "Test Product",
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: true,
    primary_image_uri: "https://cdn.shopping-mall.test/product.png",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      { body: productBody },
    );
  typia.assert(product);

  const skuBody = {
    code: `sku-${RandomGenerator.alphaNumeric(10)}`,
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
        productCode: product.code,
        body: skuBody,
      },
    );
  typia.assert(sku);

  // 3. Customer joins and authenticates
  const customerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const customerJoinBody = {
    email: customerEmail,
    password: "CustomerPassword!234",
    name: RandomGenerator.name(2),
    ip: null,
    href: "https://shopping-mall.test/auth/join",
    referrer: "https://shopping-mall.test/landing",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  // 4. Customer creates a cart and adds one item
  const cartBody = {
    currency_code: "USD",
    region_code: "US",
    channel: "web",
    metadata: {
      source: "e2e-test",
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
    quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    note: "E2E test item",
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

  // 5. Customer creates an order from the cart
  const itemsSubtotal = 90;
  const discountTotal = 0;
  const shippingTotal = 10;
  const taxTotal = 0;
  const grandTotal = itemsSubtotal - discountTotal + shippingTotal + taxTotal;

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
    discount_total_amount: discountTotal,
    shipping_total_amount: shippingTotal,
    tax_total_amount: taxTotal,
    grand_total_amount: grandTotal,
    shipping_address_id: shippingAddressId,
    billing_address_id: billingAddressId,
    customer_note: "E2E order from tracking event mismatch test",
  } satisfies IShoppingMallOrder.ICreate;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateBody,
    });
  typia.assert(order);

  // 6. Create two shipments for the order
  const sellerSegmentIdA: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const sellerSegmentIdB: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const shipmentABody = {
    order_seller_segment_id: sellerSegmentIdA,
    shipment_status: "ready_to_ship",
    carrier_name: "E2ECarrier",
    carrier_service_level: "standard",
    tracking_number: `TRK-A-${RandomGenerator.alphaNumeric(8)}`,
    shipped_at: undefined,
  } satisfies IShoppingMallShipment.ICreate;

  const shipmentA: IShoppingMallShipment =
    await api.functional.shoppingMall.orders.shipments.create(connection, {
      orderId: order.id,
      body: shipmentABody,
    });
  typia.assert(shipmentA);

  const shipmentBBody = {
    order_seller_segment_id: sellerSegmentIdB,
    shipment_status: "ready_to_ship",
    carrier_name: "E2ECarrier",
    carrier_service_level: "express",
    tracking_number: `TRK-B-${RandomGenerator.alphaNumeric(8)}`,
    shipped_at: undefined,
  } satisfies IShoppingMallShipment.ICreate;

  const shipmentB: IShoppingMallShipment =
    await api.functional.shoppingMall.orders.shipments.create(connection, {
      orderId: order.id,
      body: shipmentBBody,
    });
  typia.assert(shipmentB);

  // 7. Platform admin creates tracking events for each shipment
  const occurredAtA: string & tags.Format<"date-time"> =
    new Date().toISOString() as string & tags.Format<"date-time">;
  const occurredAtB: string & tags.Format<"date-time"> = new Date(
    Date.now() + 60 * 60 * 1000,
  ).toISOString() as string & tags.Format<"date-time">;

  const trackingEventABody = {
    status: "shipped",
    carrier_status_code: "SHIPPED",
    location_description: "Fulfillment Center A",
    carrier_raw_message: "Package has left the facility",
    occurred_at: occurredAtA,
  } satisfies IShoppingMallShipmentTrackingEvent.ICreate;

  const eventA: IShoppingMallShipmentTrackingEvent =
    await api.functional.shoppingMall.platformAdmin.shipments.trackingEvents.create(
      connection,
      {
        shipmentId: shipmentA.id,
        body: trackingEventABody,
      },
    );
  typia.assert(eventA);

  const trackingEventBBody = {
    status: "in_transit",
    carrier_status_code: "IN_TRANSIT",
    location_description: "Hub B",
    carrier_raw_message: "Package in transit to destination",
    occurred_at: occurredAtB,
  } satisfies IShoppingMallShipmentTrackingEvent.ICreate;

  const eventB: IShoppingMallShipmentTrackingEvent =
    await api.functional.shoppingMall.platformAdmin.shipments.trackingEvents.create(
      connection,
      {
        shipmentId: shipmentB.id,
        body: trackingEventBBody,
      },
    );
  typia.assert(eventB);

  // 8. Mismatch validation: (shipmentA.id, eventB.id) should throw
  await TestValidator.error(
    "mismatched shipment and trackingEventId should cause error",
    async () => {
      await api.functional.shoppingMall.platformAdmin.shipments.trackingEvents.at(
        connection,
        {
          shipmentId: shipmentA.id,
          trackingEventId: eventB.id,
        },
      );
    },
  );

  // 9. Control validation: (shipmentB.id, eventB.id) should succeed
  const reloadedEventB: IShoppingMallShipmentTrackingEvent =
    await api.functional.shoppingMall.platformAdmin.shipments.trackingEvents.at(
      connection,
      {
        shipmentId: shipmentB.id,
        trackingEventId: eventB.id,
      },
    );
  typia.assert(reloadedEventB);

  TestValidator.equals(
    "tracking event id should match eventB.id",
    reloadedEventB.id,
    eventB.id,
  );

  TestValidator.equals(
    "tracking event should belong to shipmentB",
    reloadedEventB.shipment_id,
    shipmentB.id,
  );
}
