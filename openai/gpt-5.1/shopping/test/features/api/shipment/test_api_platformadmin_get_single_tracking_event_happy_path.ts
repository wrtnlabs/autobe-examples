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
 * Happy-path: platform admin retrieves a single shipment tracking event
 * belonging to a shipment created from a real customer order.
 *
 * Business flow:
 *
 * 1. Register a new platform admin and obtain tokens (join behaves as login).
 * 2. Register a seller that will own catalog products.
 * 3. As platform admin, create a category tree and a brand.
 * 4. As platform admin, create a product for the seller and a SKU under that
 *    product.
 * 5. Register and log in a customer.
 * 6. As customer, create a persistent cart and add a cart item referencing the
 *    created SKU.
 * 7. As customer, create an order from that cart with realistic monetary snapshot
 *    fields and address ids.
 * 8. As seller (or any actor permitted for shipments.create), create a shipment
 *    for that order and capture shipmentId.
 * 9. Switch back to platform admin, create a tracking event for that shipment and
 *    capture its id.
 * 10. Call the GET trackingEvents.at endpoint with shipmentId and trackingEventId.
 * 11. Validate response typing and key field consistency.
 */
export async function test_api_platformadmin_get_single_tracking_event_happy_path(
  connection: api.IConnection,
) {
  // 1. Register platform admin (also authenticates and sets Authorization header)
  const platformAdminEmail: string = typia.random<
    string & tags.Format<"email">
  >();
  const platformAdminJoinBody = {
    email: platformAdminEmail,
    name: RandomGenerator.name(),
    password: "AdminPassword!234",
    ip: null,
    href: "https://admin.shoppingmall.local/join",
    referrer: "https://admin.shoppingmall.local/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. Register a seller account (behaves as seller auth join)
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const sellerJoinBody = {
    email: sellerEmail,
    password: "SellerPassword!234",
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  // Ensure platform admin is authenticated again (in case seller.join touched headers in future changes)
  const platformAdminLoginBody = {
    email: platformAdminEmail,
    password: "AdminPassword!234",
    ip: null,
    href: "https://admin.shoppingmall.local/login",
    referrer: "https://admin.shoppingmall.local/",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const platformAdminLogin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLogin);

  // 3. Create category tree as platform admin
  const categoryTreeCode = `cat-tree-${RandomGenerator.alphaNumeric(8)}`;
  const categoryTreeCreateBody = {
    code: categoryTreeCode,
    name: "Default Category Tree",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;

  const categoryTree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      {
        body: categoryTreeCreateBody,
      },
    );
  typia.assert(categoryTree);

  // 4. Create brand as platform admin
  const brandSlug = `brand-${RandomGenerator.alphaNumeric(8)}`;
  const brandCreateBody = {
    name: "Acme Logistics",
    slug: brandSlug,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    logo_uri: "https://cdn.shoppingmall.local/brand/acme.png",
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  // 5. Create product owned by seller
  const productCode = `prod-${RandomGenerator.alphaNumeric(10)}`;
  const productCreateBody = {
    shopping_mall_seller_id: sellerAuthorized.id,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: "Express Shipping Box",
    short_description: "Durable shipping box for express deliveries",
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri:
      "https://cdn.shoppingmall.local/products/express-box/primary.jpg",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      {
        body: productCreateBody,
      },
    );
  typia.assert(product);

  // 6. Create a SKU under the product
  const skuCode = `sku-${RandomGenerator.alphaNumeric(8)}`;
  const skuCreateBody = {
    code: skuCode,
    name: "Express Shipping Box - Medium",
    listPrice: 2000,
    salePrice: 1800,
    currency: "KRW",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.platformAdmin.products.skus.create(
      connection,
      {
        productCode,
        body: skuCreateBody,
      },
    );
  typia.assert(sku);

  // 7. Register & login customer
  const customerEmail: string = typia.random<string & tags.Format<"email">>();
  const customerJoinBody = {
    email: customerEmail,
    password: "CustomerPassword!234",
    name: RandomGenerator.name(),
    ip: null,
    href: "https://shoppingmall.local/join",
    referrer: "https://shoppingmall.local/landing",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  // (Optional but explicit) Login as customer again to ensure context
  const customerLoginBody = {
    email: customerEmail,
    password: "CustomerPassword!234",
    ip: null,
    href: "https://shoppingmall.local/login",
    referrer: "https://shoppingmall.local/landing",
    userAgent: "E2E-Test-Agent/1.0",
  } satisfies IShoppingMallCustomerAuth.ILogin;

  const customerLogin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLogin);

  // 8. Create customer cart
  const customerCartCreateBody = {
    currency_code: "KRW",
    region_code: "KR-Seoul",
    channel: "web",
    metadata: {
      source: "e2e-test",
    },
    is_active: true,
    source_guest_token: undefined,
  } satisfies IShoppingMallCustomerCart.ICreate;

  const customerCart: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.customerCarts.create(
      connection,
      {
        body: customerCartCreateBody,
      },
    );
  typia.assert(customerCart);

  // 9. Add cart item for created SKU
  const cartItemCreateBody = {
    skuId: sku.id,
    quantity: 1,
    note: "E2E tracking event test item",
  } satisfies IShoppingMallCustomerCartItem.ICreate;

  const cartItem: IShoppingMallCustomerCartItem =
    await api.functional.shoppingMall.customer.customerCarts.items.create(
      connection,
      {
        customerCartId: customerCart.id,
        body: cartItemCreateBody,
      },
    );
  typia.assert(cartItem);

  // 10. Create order from cart with snapshot fields
  // For address ids, generate UUIDs as placeholders; service is expected to
  // either accept them as snapshots or adjust in implementation.
  const shippingAddressId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const billingAddressId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const itemsSubtotal = sku.salePrice * cartItem.quantity;
  const discountTotal = 0;
  const shippingTotal = 3000;
  const taxTotal = 0;
  const grandTotal = itemsSubtotal + shippingTotal + taxTotal - discountTotal;

  const orderCreateBody = {
    customer_cart_id: customerCart.id,
    currency_code: customerCart.currency_code,
    items_subtotal_amount: itemsSubtotal,
    discount_total_amount: discountTotal,
    shipping_total_amount: shippingTotal,
    tax_total_amount: taxTotal,
    grand_total_amount: grandTotal,
    shipping_address_id: shippingAddressId,
    billing_address_id: billingAddressId,
    customer_note: "Please deliver quickly.",
  } satisfies IShoppingMallOrder.ICreate;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateBody,
    });
  typia.assert(order);

  TestValidator.predicate(
    "order belongs to customer",
    order.customer_id === customerAuthorized.id,
  );

  // 11. Create shipment for the order (must be called in a context that is
  // allowed to manage shipments; we keep current customer token and rely on
  // SDK/back-end auth configuration for this test scenario).
  const shipmentCreateBody = {
    order_seller_segment_id: typia.random<string & tags.Format<"uuid">>(),
    shipment_status: "ready_to_ship",
    carrier_name: "E2E Logistics",
    carrier_service_level: "express",
    tracking_number: RandomGenerator.alphaNumeric(12),
    shipped_at: new Date().toISOString(),
  } satisfies IShoppingMallShipment.ICreate;

  const shipment: IShoppingMallShipment =
    await api.functional.shoppingMall.orders.shipments.create(connection, {
      orderId: order.id,
      body: shipmentCreateBody,
    });
  typia.assert(shipment);

  // 12. Ensure platform admin context is active again for tracking event APIs
  const platformAdminRelogin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminRelogin);

  // 13. Create tracking event for the shipment as platform admin
  const occurredAt = new Date().toISOString();
  const trackingCreateBody = {
    status: "in_transit",
    carrier_status_code: "IT-001",
    location_description: "Seoul Logistics Hub",
    carrier_raw_message: "Parcel departed from hub.",
    occurred_at: occurredAt,
  } satisfies IShoppingMallShipmentTrackingEvent.ICreate;

  const createdTrackingEvent: IShoppingMallShipmentTrackingEvent =
    await api.functional.shoppingMall.platformAdmin.shipments.trackingEvents.create(
      connection,
      {
        shipmentId: shipment.id,
        body: trackingCreateBody,
      },
    );
  typia.assert(createdTrackingEvent);

  TestValidator.equals(
    "created tracking event belongs to shipment",
    createdTrackingEvent.shipment_id,
    shipment.id,
  );

  // 14. Retrieve the same tracking event via GET
  const fetchedTrackingEvent: IShoppingMallShipmentTrackingEvent =
    await api.functional.shoppingMall.platformAdmin.shipments.trackingEvents.at(
      connection,
      {
        shipmentId: shipment.id,
        trackingEventId: createdTrackingEvent.id,
      },
    );
  typia.assert(fetchedTrackingEvent);

  // 15. Validate key fields for consistency
  TestValidator.equals(
    "tracking event id should match path id",
    fetchedTrackingEvent.id,
    createdTrackingEvent.id,
  );

  TestValidator.equals(
    "tracking event shipment_id should match shipment",
    fetchedTrackingEvent.shipment_id,
    shipment.id,
  );

  TestValidator.equals(
    "tracking status should be preserved",
    fetchedTrackingEvent.status,
    trackingCreateBody.status,
  );

  TestValidator.equals(
    "occurred_at should be preserved",
    fetchedTrackingEvent.occurred_at,
    trackingCreateBody.occurred_at,
  );

  TestValidator.predicate(
    "created_at of tracking event should be a valid ISO datetime string",
    typeof fetchedTrackingEvent.created_at === "string" &&
      fetchedTrackingEvent.created_at.length > 0,
  );
}
