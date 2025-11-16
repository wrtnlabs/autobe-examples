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
 * Validate filtered, sorted, and paginated search of shipment tracking events.
 *
 * Business workflow:
 *
 * 1. Create platform admin, seller, and customer accounts.
 * 2. As platform admin, set up catalog entities: category tree, brand, product,
 *    and one SKU.
 * 3. As customer, create a cart, add a SKU item, and create an order snapshot.
 * 4. As platform admin, create a fulfillment for the order and then create a
 *    shipment for it.
 * 5. As seller and platform admin, append many tracking events with diverse
 *    statuses and timestamps.
 * 6. Call PATCH /shoppingMall/shipments/{shipmentId}/trackingEvents with filters
 *    (status, time range) and pagination (page, limit).
 * 7. Assert page size, filter correctness, and occurred_at ascending order.
 * 8. Fetch additional pages, ensuring no duplication and full coverage across
 *    pages.
 * 9. Run an additional search using carrierStatusCode filter to validate that
 *    filter path as well.
 */
export async function test_api_shipment_tracking_events_search_with_filters_and_pagination(
  connection: api.IConnection,
) {
  // 1. Create actors: platform admin, seller, customer
  const platformAdminEmail = typia.random<string & tags.Format<"email">>();
  const platformAdminPassword = RandomGenerator.alphaNumeric(12);

  const platformAdminJoinBody = {
    email: platformAdminEmail,
    name: RandomGenerator.name(),
    password: platformAdminPassword,
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdminJoin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminJoin);

  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(12);
  const sellerJoinBody = {
    email: sellerEmail,
    password: sellerPassword,
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;
  const sellerJoin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerJoin);

  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(12);
  const customerJoinBody = {
    email: customerEmail,
    password: customerPassword,
    name: RandomGenerator.name(),
    ip: null,
    href: "https://shop.example.com/join",
    referrer: "https://shop.example.com/",
  } satisfies IShoppingMallCustomerAuth.IJoin;
  const customerJoin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerJoin);

  // 2. Catalog setup as platform admin
  const platformAdminLoginBody = {
    email: platformAdminEmail,
    password: platformAdminPassword,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;
  const platformAdminLogin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLogin);

  const categoryTreeBody = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(2),
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
    name: RandomGenerator.name(1),
    slug: RandomGenerator.alphaNumeric(10),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    logo_uri: "https://cdn.example.com/logo.png" as string & tags.Format<"uri">,
  } satisfies IShoppingMallBrand.ICreate;
  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert(brand);

  const productBody = {
    shopping_mall_seller_id: sellerJoin.seller.id,
    shopping_mall_brand_id: brand.id,
    code: RandomGenerator.alphaNumeric(12) as string & tags.MinLength<1>,
    name: RandomGenerator.name(3) as string & tags.MinLength<1>,
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: true,
    primary_image_uri: "https://cdn.example.com/product.png" as string &
      tags.Format<"uri">,
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      { body: productBody },
    );
  typia.assert(product);

  const skuBody = {
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(2),
    listPrice: 100,
    salePrice: 80,
    currency: "USD",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;
  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.platformAdmin.products.skus.create(
      connection,
      { productCode: product.code, body: skuBody },
    );
  typia.assert(sku);

  // 3. Customer cart and order
  const customerLoginBody = {
    email: customerEmail,
    password: customerPassword,
    ip: null,
    href: "https://shop.example.com/login",
    referrer: "https://shop.example.com/",
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
    metadata: undefined,
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
    note: "test item",
  } satisfies IShoppingMallCustomerCartItem.ICreate;
  const cartItem: IShoppingMallCustomerCartItem =
    await api.functional.shoppingMall.customer.customerCarts.items.create(
      connection,
      { customerCartId: cart.id, body: cartItemBody },
    );
  typia.assert(cartItem);

  const orderSubtotal = cart.subtotal_amount;
  const orderDiscount = cart.discount_amount;
  const orderShipping = cart.shipping_amount;
  const orderTax = cart.tax_amount;
  const orderGrandTotal = cart.total_amount;

  const orderBody = {
    customer_cart_id: cart.id,
    currency_code: cart.currency_code,
    items_subtotal_amount: orderSubtotal,
    discount_total_amount: orderDiscount,
    shipping_total_amount: orderShipping,
    tax_total_amount: orderTax,
    grand_total_amount: orderGrandTotal,
    shipping_address_id: typia.random<string & tags.Format<"uuid">>(),
    billing_address_id: typia.random<string & tags.Format<"uuid">>(),
    customer_note: "tracking test order",
  } satisfies IShoppingMallOrder.ICreate;
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderBody,
    });
  typia.assert(order);

  // 4. Fulfillment and shipment as platform admin
  const platformAdminLogin2Body = {
    email: platformAdminEmail,
    password: platformAdminPassword,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;
  const platformAdminLogin2: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLogin2Body,
    });
  typia.assert(platformAdminLogin2);

  const fulfillmentOrderLine: IShoppingMallFulfillmentOrderLine.ICreate = {
    order_line_id: typia.random<string & tags.Format<"uuid">>(),
    quantity: 1 as number & tags.Type<"int32">,
  };
  const fulfillmentBody = {
    order_line_fulfillments: [fulfillmentOrderLine],
    carrier_code: "TEST_CARRIER",
    requested_ship_date: new Date().toISOString() as string &
      tags.Format<"date-time">,
    warehouse_code: "WH-1",
    notes: "auto fulfillment for tracking test",
  } satisfies IShoppingMallFulfillment.ICreate;
  const fulfillment: IShoppingMallFulfillment =
    await api.functional.shoppingMall.platformAdmin.orders.fulfillments.create(
      connection,
      { orderId: order.id, body: fulfillmentBody },
    );
  typia.assert(fulfillment);

  const sellerSegment: IShoppingMallOrderSellerSegment.ISummary | undefined =
    order.customer ? undefined : undefined;

  const shipmentBody = {
    order_seller_segment_id: typia.random<string & tags.Format<"uuid">>(),
    shipment_status: "pending",
    carrier_name: "TestCarrier",
    carrier_service_level: "standard",
    tracking_number: RandomGenerator.alphaNumeric(12),
    shipped_at: undefined,
  } satisfies IShoppingMallShipment.ICreate;
  const shipment: IShoppingMallShipment =
    await api.functional.shoppingMall.orders.shipments.create(connection, {
      orderId: order.id,
      body: shipmentBody,
    });
  typia.assert(shipment);

  // 5. Append tracking events from seller and platform admin
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/",
  } satisfies IShoppingMallSellerLogin.IRequest;
  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLogin);

  type LocalEvent = {
    id?: string;
    status: string;
    carrier_status_code?: string | null;
    occurred_at: string & tags.Format<"date-time">;
  };
  const localEvents: LocalEvent[] = [];

  const baseDate = new Date();

  const sellerStatuses = [
    "shipped",
    "in_transit",
    "in_transit",
    "out_for_delivery",
    "delivery_failed",
  ] as const;

  for (let i = 0; i < sellerStatuses.length; i++) {
    const occurredDate = new Date(baseDate.getTime() + i * 60 * 60 * 1000);
    const occurred = occurredDate.toISOString() as string &
      tags.Format<"date-time">;
    const createBody = {
      status: sellerStatuses[i],
      carrier_status_code: `SC_${i}`,
      location_description: RandomGenerator.paragraph({ sentences: 2 }),
      carrier_raw_message: RandomGenerator.paragraph({ sentences: 3 }),
      occurred_at: occurred,
    } satisfies IShoppingMallShipmentTrackingEvent.ICreate;
    const createdEvent: IShoppingMallShipmentTrackingEvent =
      await api.functional.shoppingMall.seller.shipments.trackingEvents.create(
        connection,
        { shipmentId: shipment.id, body: createBody },
      );
    typia.assert(createdEvent);
    localEvents.push({
      id: createdEvent.id,
      status: createdEvent.status,
      carrier_status_code: createdEvent.carrier_status_code ?? null,
      occurred_at: createdEvent.occurred_at,
    });
  }

  const platformAdminLogin3Body = {
    email: platformAdminEmail,
    password: platformAdminPassword,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;
  const platformAdminLogin3: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLogin3Body,
    });
  typia.assert(platformAdminLogin3);

  const adminStatuses = [
    "in_transit",
    "in_transit",
    "out_for_delivery",
    "delivered",
    "delivered",
  ] as const;

  for (let i = 0; i < adminStatuses.length; i++) {
    const occurredDate = new Date(
      baseDate.getTime() + (sellerStatuses.length + i) * 60 * 60 * 1000,
    );
    const occurred = occurredDate.toISOString() as string &
      tags.Format<"date-time">;
    const createBody = {
      status: adminStatuses[i],
      carrier_status_code: `AC_${i}`,
      location_description: RandomGenerator.paragraph({ sentences: 2 }),
      carrier_raw_message: RandomGenerator.paragraph({ sentences: 3 }),
      occurred_at: occurred,
    } satisfies IShoppingMallShipmentTrackingEvent.ICreate;
    const createdEvent: IShoppingMallShipmentTrackingEvent =
      await api.functional.shoppingMall.platformAdmin.shipments.trackingEvents.create(
        connection,
        { shipmentId: shipment.id, body: createBody },
      );
    typia.assert(createdEvent);
    localEvents.push({
      id: createdEvent.id,
      status: createdEvent.status,
      carrier_status_code: createdEvent.carrier_status_code ?? null,
      occurred_at: createdEvent.occurred_at,
    });
  }

  // 6. Build filters for PATCH index
  const inTransitEvents = localEvents.filter((e) => e.status === "in_transit");
  const targetEvents =
    inTransitEvents.length > 0 ? inTransitEvents : localEvents;

  targetEvents.sort((a, b) => a.occurred_at.localeCompare(b.occurred_at));

  const fromOccurredAt = targetEvents[0].occurred_at;
  const toOccurredAt = targetEvents[targetEvents.length - 1].occurred_at;
  const filterStatus = "in_transit";

  const requestBodyPage1 = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 5 as number & tags.Type<"int32"> & tags.Minimum<1>,
    fromOccurredAt,
    toOccurredAt,
    status: filterStatus,
    carrierStatusCode: null,
    locationSearch: null,
    messageSearch: null,
    orderBy: "occurred_at",
    orderDirection: "asc",
  } satisfies IShoppingMallShipmentTrackingEvent.IRequest;

  const page1: IPageIShoppingMallShipmentTrackingEvent.ISummary =
    await api.functional.shoppingMall.shipments.trackingEvents.index(
      connection,
      { shipmentId: shipment.id, body: requestBodyPage1 },
    );
  typia.assert(page1);

  // 7. Validate first page
  TestValidator.equals(
    "pagination limit should be 5",
    page1.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "first page size should be <= limit",
    page1.data.length <= 5,
  );

  for (const ev of page1.data) {
    TestValidator.equals(
      "event status equals requested status",
      ev.status,
      filterStatus,
    );
    TestValidator.predicate(
      "event occurred_at within range",
      ev.occurred_at >= fromOccurredAt && ev.occurred_at <= toOccurredAt,
    );
  }

  for (let i = 1; i < page1.data.length; i++) {
    TestValidator.predicate(
      "page1 occurred_at ascending",
      page1.data[i - 1].occurred_at <= page1.data[i].occurred_at,
    );
  }

  // 8. Fetch subsequent pages and validate aggregation
  const totalRecords = page1.pagination.records;
  const limit = page1.pagination.limit;
  const pages = page1.pagination.pages;

  const allEvents: IShoppingMallShipmentTrackingEvent.ISummary[] = [];
  allEvents.push(...page1.data);

  for (let pageIndex = 2; pageIndex <= pages; pageIndex++) {
    const body = {
      ...requestBodyPage1,
      page: pageIndex as number & tags.Type<"int32"> & tags.Minimum<1>,
    } satisfies IShoppingMallShipmentTrackingEvent.IRequest;
    const page: IPageIShoppingMallShipmentTrackingEvent.ISummary =
      await api.functional.shoppingMall.shipments.trackingEvents.index(
        connection,
        { shipmentId: shipment.id, body },
      );
    typia.assert(page);

    TestValidator.predicate("page size <= limit", page.data.length <= limit);

    for (const ev of page.data) {
      TestValidator.equals(
        "event status equals requested status (subsequent)",
        ev.status,
        filterStatus,
      );
      TestValidator.predicate(
        "event occurred_at within range (subsequent)",
        ev.occurred_at >= fromOccurredAt && ev.occurred_at <= toOccurredAt,
      );
    }

    for (let i = 1; i < page.data.length; i++) {
      TestValidator.predicate(
        "page occurred_at ascending",
        page.data[i - 1].occurred_at <= page.data[i].occurred_at,
      );
    }

    allEvents.push(...page.data);
  }

  TestValidator.equals(
    "aggregated filtered events count equals pagination.records",
    allEvents.length,
    totalRecords,
  );

  const idSet = new Set<string>();
  for (const ev of allEvents) {
    TestValidator.predicate(
      "no duplicate event ids across pages",
      idSet.has(ev.id) === false,
    );
    idSet.add(ev.id);
  }

  for (let i = 1; i < allEvents.length; i++) {
    TestValidator.predicate(
      "overall occurred_at non-decreasing",
      allEvents[i - 1].occurred_at <= allEvents[i].occurred_at,
    );
  }

  // 9. Additional filter scenario using carrierStatusCode
  const eventWithCarrierCode = allEvents.find(
    (ev) => ev.carrier_status_code !== undefined,
  );

  if (eventWithCarrierCode !== undefined) {
    const carrierCode = eventWithCarrierCode.carrier_status_code!;
    const carrierFilterBody = {
      page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
      limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
      fromOccurredAt: null,
      toOccurredAt: null,
      status: null,
      carrierStatusCode: carrierCode,
      locationSearch: null,
      messageSearch: null,
      orderBy: "occurred_at",
      orderDirection: "asc",
    } satisfies IShoppingMallShipmentTrackingEvent.IRequest;

    const carrierPage: IPageIShoppingMallShipmentTrackingEvent.ISummary =
      await api.functional.shoppingMall.shipments.trackingEvents.index(
        connection,
        { shipmentId: shipment.id, body: carrierFilterBody },
      );
    typia.assert(carrierPage);

    TestValidator.predicate(
      "carrierStatusCode filtered page has at least one event",
      carrierPage.data.length > 0,
    );

    for (const ev of carrierPage.data) {
      TestValidator.equals(
        "carrierStatusCode filter applied",
        ev.carrier_status_code,
        carrierCode,
      );
    }

    for (let i = 1; i < carrierPage.data.length; i++) {
      TestValidator.predicate(
        "carrier filter occurred_at ascending",
        carrierPage.data[i - 1].occurred_at <= carrierPage.data[i].occurred_at,
      );
    }
  }
}
