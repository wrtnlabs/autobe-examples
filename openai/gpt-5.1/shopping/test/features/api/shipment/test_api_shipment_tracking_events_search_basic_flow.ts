import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallShipmentTrackingEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShipmentTrackingEvent";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallCategoryTree } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategoryTree";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";
import type { IShoppingMallCustomerCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCart";
import type { IShoppingMallCustomerCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCartItem";
import type { IShoppingMallFulfillment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallFulfillment";
import type { IShoppingMallFulfillmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallFulfillmentItem";
import type { IShoppingMallFulfillmentOrderLine } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallFulfillmentOrderLine";
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
 * Validate basic search behavior for shipment tracking events.
 *
 * Business goal: ensure that when multiple tracking events are recorded for a
 * single shipment by different actors (seller and platformAdmin), the
 * shipment-level search endpoint can retrieve them with simple pagination and
 * sorting by occurred_at in descending order.
 *
 * High-level workflow:
 *
 * 1. As platformAdmin, join and create minimal catalog entities: category tree,
 *    brand, product, and SKU.
 * 2. As customer, join, create a customer cart, and add the SKU as a cart item.
 * 3. As the same customer, create an order referencing the cart with consistent
 *    monetary snapshot fields and synthetic address ids.
 * 4. As platformAdmin, create a fulfillment for the order and then create a
 *    shipment for that order, capturing the shipment id.
 * 5. As seller and platformAdmin actors, append three tracking events to this
 *    shipment with increasing occurred_at timestamps and distinct statuses.
 * 6. Call PATCH /shoppingMall/shipments/{shipmentId}/trackingEvents with
 *    IShoppingMallShipmentTrackingEvent.IRequest requesting page 1, a
 *    sufficiently large limit, and ordering by occurred_at desc.
 * 7. Validate that all created events are present in the response, belong to the
 *    correct shipment, and are ordered correctly, and that pagination metadata
 *    (records, current, limit) is consistent with expectations.
 */
export async function test_api_shipment_tracking_events_search_basic_flow(
  connection: api.IConnection,
) {
  // 1. Platform admin joins (becomes authenticated platformAdmin actor)
  const platformAdminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphabets(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  // 2. Create minimal catalog: category tree and brand
  const categoryTreeBody = {
    code: `tree-${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;

  const categoryTree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      {
        body: categoryTreeBody,
      },
    );
  typia.assert(categoryTree);

  const brandBody = {
    name: `Brand ${RandomGenerator.name(1)}`,
    slug: `brand-${RandomGenerator.alphaNumeric(8)}`,
    description: RandomGenerator.paragraph({ sentences: 4 }),
    logo_uri: "https://static.example.com/logo.png",
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert(brand);

  // 3. Create a product under some seller id (using platform admin id as a
  // stand-in seller id just to satisfy UUID constraints; business linkage is
  // outside the scope of this test)
  const productBody = {
    shopping_mall_seller_id: platformAdmin.id as string & tags.Format<"uuid">,
    shopping_mall_brand_id: brand.id,
    code: `prd-${RandomGenerator.alphaNumeric(8)}` as string &
      tags.MinLength<1>,
    name: `Product ${RandomGenerator.name(2)}` as string & tags.MinLength<1>,
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: true,
    primary_image_uri: "https://static.example.com/product.png",
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

  // Create a SKU for that product
  const skuBody = {
    code: `sku-${RandomGenerator.alphaNumeric(8)}`,
    name: `SKU ${RandomGenerator.name(1)}`,
    listPrice: 100,
    salePrice: 80,
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

  // 4. Customer joins and becomes authenticated customer actor
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12),
    name: RandomGenerator.name(),
    ip: null,
    href: "https://shop.example.com/join",
    referrer: "https://shop.example.com/",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customer);

  // 5. Create a customer cart
  const cartBody = {
    currency_code: "USD",
    region_code: "US",
    channel: "web",
    metadata: undefined,
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

  // 6. Add SKU to cart
  const cartItemBody = {
    skuId: sku.id,
    quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    note: "Test item",
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
  const shippingAddressId = typia.random<string & tags.Format<"uuid">>();
  const billingAddressId = typia.random<string & tags.Format<"uuid">>();

  const orderCreateBody = {
    customer_cart_id: cart.id,
    currency_code: cart.currency_code,
    items_subtotal_amount: cart.subtotal_amount,
    discount_total_amount: cart.discount_amount,
    shipping_total_amount: cart.shipping_amount,
    tax_total_amount: cart.tax_amount,
    grand_total_amount: cart.total_amount,
    shipping_address_id: shippingAddressId,
    billing_address_id: billingAddressId,
    customer_note: "Please deliver quickly",
  } satisfies IShoppingMallOrder.ICreate;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateBody,
    });
  typia.assert(order);

  // 8. As platformAdmin, create a fulfillment for the order
  const fulfillmentCreateBodyRandom =
    typia.random<IShoppingMallFulfillment.ICreate>();

  const fulfillmentCreateBody: IShoppingMallFulfillment.ICreate = {
    ...fulfillmentCreateBodyRandom,
    order_line_fulfillments: [
      {
        order_line_id: typia.random<string & tags.Format<"uuid">>(),
        quantity: 1 as number & tags.Type<"int32">,
      },
    ],
  } satisfies IShoppingMallFulfillment.ICreate;

  const fulfillment: IShoppingMallFulfillment =
    await api.functional.shoppingMall.platformAdmin.orders.fulfillments.create(
      connection,
      {
        orderId: order.id,
        body: fulfillmentCreateBody,
      },
    );
  typia.assert(fulfillment);

  // 9. Create a shipment for the order
  const shipmentCreateBodyRandom =
    typia.random<IShoppingMallShipment.ICreate>();

  const shipmentCreateBody: IShoppingMallShipment.ICreate = {
    ...shipmentCreateBodyRandom,
    order_seller_segment_id: shipmentCreateBodyRandom.order_seller_segment_id,
    shipment_status: shipmentCreateBodyRandom.shipment_status ?? "pending",
    carrier_name: shipmentCreateBodyRandom.carrier_name ?? "DHL",
    carrier_service_level:
      shipmentCreateBodyRandom.carrier_service_level ?? "standard",
    tracking_number:
      shipmentCreateBodyRandom.tracking_number ??
      `TRK-${RandomGenerator.alphaNumeric(10)}`,
    shipped_at: shipmentCreateBodyRandom.shipped_at,
  } satisfies IShoppingMallShipment.ICreate;

  const shipment: IShoppingMallShipment =
    await api.functional.shoppingMall.orders.shipments.create(connection, {
      orderId: order.id,
      body: shipmentCreateBody,
    });
  typia.assert(shipment);

  const shipmentId = shipment.id;

  // 10. Seller joins (multi-actor scenario) and create one tracking event as
  // seller
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12),
    storeName: `Store ${RandomGenerator.name(1)}`,
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(seller);

  // Earlier occurred_at for seller event
  const baseOccurredAt = new Date();
  const sellerOccurredAt = new Date(baseOccurredAt.getTime() - 1000 * 60 * 10);

  const sellerTrackingBody = {
    status: "shipped",
    carrier_status_code: "SHP",
    location_description: "Origin Warehouse",
    carrier_raw_message: "Package shipped from origin",
    occurred_at: sellerOccurredAt.toISOString(),
  } satisfies IShoppingMallShipmentTrackingEvent.ICreate;

  const sellerTracking: IShoppingMallShipmentTrackingEvent =
    await api.functional.shoppingMall.seller.shipments.trackingEvents.create(
      connection,
      {
        shipmentId,
        body: sellerTrackingBody,
      },
    );
  typia.assert(sellerTracking);

  // 11. Platform admin logs in again (to ensure correct actor context) and
  // creates two more tracking events
  const platformAdminLoginBody = {
    email: platformAdminJoinBody.email,
    password: platformAdminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const platformAdminLoggedIn: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoggedIn);

  const inTransitOccurredAt = new Date(
    baseOccurredAt.getTime() - 1000 * 60 * 5,
  );
  const deliveredOccurredAt = new Date(
    baseOccurredAt.getTime() - 1000 * 60 * 1,
  );

  const inTransitTrackingBody = {
    status: "in_transit",
    carrier_status_code: "ITR",
    location_description: "Transit Hub",
    carrier_raw_message: "Arrived at transit hub",
    occurred_at: inTransitOccurredAt.toISOString(),
  } satisfies IShoppingMallShipmentTrackingEvent.ICreate;

  const inTransitTracking: IShoppingMallShipmentTrackingEvent =
    await api.functional.shoppingMall.platformAdmin.shipments.trackingEvents.create(
      connection,
      {
        shipmentId,
        body: inTransitTrackingBody,
      },
    );
  typia.assert(inTransitTracking);

  const deliveredTrackingBody = {
    status: "delivered",
    carrier_status_code: "DLV",
    location_description: "Customer Address",
    carrier_raw_message: "Delivered to customer",
    occurred_at: deliveredOccurredAt.toISOString(),
  } satisfies IShoppingMallShipmentTrackingEvent.ICreate;

  const deliveredTracking: IShoppingMallShipmentTrackingEvent =
    await api.functional.shoppingMall.platformAdmin.shipments.trackingEvents.create(
      connection,
      {
        shipmentId,
        body: deliveredTrackingBody,
      },
    );
  typia.assert(deliveredTracking);

  const createdEvents: IShoppingMallShipmentTrackingEvent[] = [
    sellerTracking,
    inTransitTracking,
    deliveredTracking,
  ];

  // 12. Search tracking events via PATCH /shoppingMall/shipments/{shipmentId}/trackingEvents
  const requestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    fromOccurredAt: null,
    toOccurredAt: null,
    status: null,
    carrierStatusCode: null,
    locationSearch: null,
    messageSearch: null,
    orderBy: "occurred_at",
    orderDirection: "desc",
  } satisfies IShoppingMallShipmentTrackingEvent.IRequest;

  const pageResult: IPageIShoppingMallShipmentTrackingEvent.ISummary =
    await api.functional.shoppingMall.shipments.trackingEvents.index(
      connection,
      {
        shipmentId,
        body: requestBody,
      },
    );
  typia.assert(pageResult);

  const { pagination, data } = pageResult;

  // Validate pagination metadata
  TestValidator.predicate(
    "pagination.records equals number of created events or more",
    pagination.records >= createdEvents.length,
  );

  TestValidator.predicate(
    "pagination.limit is >= number of created events",
    pagination.limit >= createdEvents.length,
  );

  TestValidator.equals(
    "pagination.current is zero-based first page",
    pagination.current,
    0,
  );

  TestValidator.predicate(
    "data length contains at least all created events",
    data.length >= createdEvents.length,
  );

  // Filter data to the three known events for strict ordering and identity
  const filtered = data.filter((event) => event.shipment_id === shipmentId);

  TestValidator.equals(
    "filtered events count matches created events count",
    filtered.length,
    createdEvents.length,
  );

  // Events should be ordered by occurred_at descending
  const occurredOrdered = [...filtered].sort((a, b) =>
    a.occurred_at < b.occurred_at ? 1 : a.occurred_at > b.occurred_at ? -1 : 0,
  );

  TestValidator.equals(
    "events are ordered by occurred_at desc",
    filtered,
    occurredOrdered,
  );

  // Validate that latest occurred_at corresponds to delivered, then in_transit, then shipped
  const statuses = filtered.map((e) => e.status);

  TestValidator.predicate(
    "statuses include shipped",
    statuses.includes("shipped"),
  );
  TestValidator.predicate(
    "statuses include in_transit",
    statuses.includes("in_transit"),
  );
  TestValidator.predicate(
    "statuses include delivered",
    statuses.includes("delivered"),
  );
}
