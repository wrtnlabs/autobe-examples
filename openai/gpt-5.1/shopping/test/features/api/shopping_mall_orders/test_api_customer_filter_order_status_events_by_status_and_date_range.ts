import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderStatusEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderStatusEvent";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallCategoryTree } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategoryTree";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";
import type { IShoppingMallCustomerCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCart";
import type { IShoppingMallCustomerCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCartItem";
import type { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
import type { IShoppingMallFulfillment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallFulfillment";
import type { IShoppingMallFulfillmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallFulfillmentItem";
import type { IShoppingMallFulfillmentOrderLine } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallFulfillmentOrderLine";
import type { IShoppingMallInventoryItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryItem";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderCancellationRequest";
import type { IShoppingMallOrderDispute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderDispute";
import type { IShoppingMallOrderLine } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderLine";
import type { IShoppingMallOrderLineThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderLineThumbnail";
import type { IShoppingMallOrderReturnRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderReturnRequest";
import type { IShoppingMallOrderReturnRequestAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderReturnRequestAttachment";
import type { IShoppingMallOrderReturnRequestItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderReturnRequestItem";
import type { IShoppingMallOrderSellerSegment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderSellerSegment";
import type { IShoppingMallOrderStatusEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderStatusEvent";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductOptionType } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionType";
import type { IShoppingMallProductOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionValue";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";
import type { IShoppingMallSellerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerLogin";
import type { IShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSession";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShipmentSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentSummary";
import type { IShoppingMallShipmentTrackingEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentTrackingEvent";

/**
 * Validate customer-side filtering of order status events by status codes and
 * date range.
 *
 * Business goal
 *
 * - Build a realistic lifecycle for a single order spanning multiple actors
 *   (customer, seller, platform admin), and then verify that the
 *   customer-facing status history endpoint correctly filters by status codes
 *   and time range.
 *
 * High-level steps
 *
 * 1. Prepare actors: platform admin, seller, and customer.
 * 2. As platform admin, create basic catalog scaffolding (category tree, brand).
 * 3. As seller, create a product, option type, option value, SKU, and inventory.
 * 4. As customer, create a cart, add the SKU, and create an order from the cart.
 * 5. Generate a diverse status history via cancellation, return, dispute,
 *    fulfillment, and shipment/ tracking operations from the respective
 *    actors.
 * 6. As the customer, call the statusEvents endpoint once without filters to
 *    discover actual events and their timestamps.
 * 7. Build a filtered request using a subset of observed statuses and a bounded
 *    occurred_at date range, and call the endpoint again.
 * 8. Assert that the filtered results only contain events for the target order,
 *    with statuses and occurred_at timestamps that satisfy the requested
 *    filters, and that pagination metadata is consistent with the filtered
 *    dataset.
 */
export async function test_api_customer_filter_order_status_events_by_status_and_date_range(
  connection: api.IConnection,
) {
  // 1. Prepare reusable helpers for URLs and common constants
  const randomUrl = () => typia.random<string & tags.Format<"uri">>();

  const randomEmail = () => typia.random<string & tags.Format<"email">>();

  const randomUuid = () => typia.random<string & tags.Format<"uuid">>();

  // 2. Register and authenticate actors
  // 2-1. Customer join & login
  const customerEmail = randomEmail();
  const customerPassword = "customer-password";

  const customerJoinBody = {
    email: customerEmail,
    password: customerPassword,
    name: RandomGenerator.name(2),
    ip: null,
    href: randomUrl(),
    referrer: randomUrl(),
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerAuthorized = await api.functional.auth.customer.join(
    connection,
    {
      body: customerJoinBody,
    },
  );
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerAuthorized);

  // Explicit login to exercise login flow and ensure token is fresh
  const customerLoginBody = {
    email: customerEmail,
    password: customerPassword,
    ip: null,
    href: randomUrl(),
    referrer: randomUrl(),
    userAgent: "E2E-Customer-Agent",
  } satisfies IShoppingMallCustomerAuth.ILogin;
  const customerSession = await api.functional.auth.customer.login(connection, {
    body: customerLoginBody,
  });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerSession);

  const customerId = customerSession.id;

  // 2-2. Seller join & login
  const sellerEmail = randomEmail();
  const sellerPassword = "seller-password";

  const sellerJoinBody = {
    email: sellerEmail,
    password: sellerPassword,
    storeName: RandomGenerator.name(1),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorized = await api.functional.auth.seller.join(connection, {
    body: sellerJoinBody,
  });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAuthorized);

  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: randomUrl(),
    referrer: randomUrl(),
  } satisfies IShoppingMallSellerLogin.IRequest;
  const sellerSession = await api.functional.auth.seller.login(connection, {
    body: sellerLoginBody,
  });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerSession);

  const sellerId = sellerSession.id;

  // 2-3. Platform admin join & login
  const adminEmail = randomEmail();
  const adminPassword = "admin-password";

  const platformAdminJoinBody = {
    email: adminEmail,
    name: RandomGenerator.name(2),
    password: adminPassword,
    ip: null,
    href: randomUrl(),
    referrer: randomUrl(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdminAuthorized = await api.functional.auth.platformAdmin.join(
    connection,
    {
      body: platformAdminJoinBody,
    },
  );
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(platformAdminAuthorized);

  const platformAdminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: randomUrl(),
    referrer: randomUrl(),
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const platformAdminSession = await api.functional.auth.platformAdmin.login(
    connection,
    {
      body: platformAdminLoginBody,
    },
  );
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(platformAdminSession);

  // 3. Catalog scaffolding as platform admin
  // At this point, connection is authenticated as platform admin
  const categoryTreeCreateBody = {
    code: `tree-${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;

  const categoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      { body: categoryTreeCreateBody },
    );
  typia.assert<IShoppingMallCategoryTree>(categoryTree);

  const brandCreateBody = {
    name: `Brand ${RandomGenerator.name(1)}`,
    slug: `brand-${RandomGenerator.alphaNumeric(8)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    logo_uri: randomUrl(),
  } satisfies IShoppingMallBrand.ICreate;

  const brand = await api.functional.shoppingMall.platformAdmin.brands.create(
    connection,
    {
      body: brandCreateBody,
    },
  );
  typia.assert<IShoppingMallBrand>(brand);

  // 4. Product and SKU as seller
  // Re-login as seller to ensure connection has seller token
  await api.functional.auth.seller.login(connection, {
    body: sellerLoginBody,
  });

  const productCode = `prod-${RandomGenerator.alphaNumeric(10)}`;

  const productCreateBody = {
    shopping_mall_seller_id: sellerId,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: RandomGenerator.name(3),
    short_description: RandomGenerator.paragraph({ sentences: 4 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: randomUrl(),
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: productCreateBody,
    },
  );
  typia.assert<IShoppingMallProduct>(product);

  const optionTypeCreateBody = {
    name: "Color",
    display_name: "Color",
    display_order: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
  } satisfies IShoppingMallProductOptionType.ICreate;

  const optionType =
    await api.functional.shoppingMall.seller.products.optionTypes.create(
      connection,
      {
        productCode,
        body: optionTypeCreateBody,
      },
    );
  typia.assert<IShoppingMallProductOptionType>(optionType);

  const optionValueCreateBody = {
    value: "red",
    display_name: "Red",
    display_order: 0 as number & tags.Type<"int32">,
    is_active: true,
  } satisfies IShoppingMallProductOptionValue.ICreate;

  const optionValue =
    await api.functional.shoppingMall.seller.products.optionTypes.values.create(
      connection,
      {
        productCode,
        productOptionTypeId: optionType.id,
        body: optionValueCreateBody,
      },
    );
  typia.assert<IShoppingMallProductOptionValue>(optionValue);

  const skuCode = `sku-${RandomGenerator.alphaNumeric(8)}`;

  const skuCreateBody = {
    code: skuCode,
    name: `${product.name} - ${optionValue.display_name ?? optionValue.value}`,
    listPrice: 100,
    salePrice: 90,
    currency: "USD",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const sku = await api.functional.shoppingMall.seller.products.skus.create(
    connection,
    {
      productCode,
      body: skuCreateBody,
    },
  );
  typia.assert<IShoppingMallProductSku>(sku);

  const inventoryCreateBody = {
    product_sku_id: sku.id,
    on_hand_quantity: 100 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 5 as
      | (number & tags.Type<"int32"> & tags.Minimum<0>)
      | undefined,
    backorder_enabled: false,
    preorder_enabled: false,
  } satisfies IShoppingMallInventoryItem.ICreate;

  const inventoryItem =
    await api.functional.shoppingMall.seller.inventoryItems.create(connection, {
      body: inventoryCreateBody,
    });
  typia.assert<IShoppingMallInventoryItem>(inventoryItem);

  // 5. Customer cart and order
  // Re-login as customer
  await api.functional.auth.customer.login(connection, {
    body: customerLoginBody,
  });

  const cartCreateBody = {
    currency_code: "USD",
    region_code: "US",
    channel: "web",
    metadata: {
      source: "e2e-test",
    },
    is_active: true,
    source_guest_token: undefined,
  } satisfies IShoppingMallCustomerCart.ICreate;

  const customerCart =
    await api.functional.shoppingMall.customer.customerCarts.create(
      connection,
      {
        body: cartCreateBody,
      },
    );
  typia.assert<IShoppingMallCustomerCart>(customerCart);

  const cartItemCreateBody = {
    skuId: sku.id,
    quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    note: "E2E test item",
  } satisfies IShoppingMallCustomerCartItem.ICreate;

  const cartItem =
    await api.functional.shoppingMall.customer.customerCarts.items.create(
      connection,
      {
        customerCartId: customerCart.id,
        body: cartItemCreateBody,
      },
    );
  typia.assert<IShoppingMallCustomerCartItem>(cartItem);

  const orderCreateBody = {
    customer_cart_id: customerCart.id,
    currency_code: customerCart.currency_code,
    items_subtotal_amount: customerCart.subtotal_amount,
    discount_total_amount: customerCart.discount_amount,
    shipping_total_amount: customerCart.shipping_amount,
    tax_total_amount: customerCart.tax_amount,
    grand_total_amount: customerCart.total_amount,
    shipping_address_id: randomUuid(),
    billing_address_id: randomUuid(),
    customer_note: "Please handle with care.",
  } satisfies IShoppingMallOrder.ICreate;

  const order = await api.functional.shoppingMall.customer.orders.create(
    connection,
    {
      body: orderCreateBody,
    },
  );
  typia.assert<IShoppingMallOrder>(order);

  const orderId = order.id;

  // 6. Generate status history from multiple actors
  // 6-1. Customer cancellation request
  const cancellationCreateBody = {
    request_reason_category: "changed_mind",
    request_reason_detail: "Just testing cancellation flow.",
  } satisfies IShoppingMallOrderCancellationRequest.ICreate;

  const cancellationRequest =
    await api.functional.shoppingMall.customer.orders.cancellationRequests.create(
      connection,
      {
        orderId,
        body: cancellationCreateBody,
      },
    );
  typia.assert<IShoppingMallOrderCancellationRequest>(cancellationRequest);

  // 6-2. Customer return request (simple case: one line, quantity 1)
  const returnItemCreate: IShoppingMallOrderReturnRequestItem.ICreate = {
    order_line_id: randomUuid(),
    quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
  };

  const returnRequestCreateBody = {
    reason_code: "size_issue",
    reason_text: "Item did not fit.",
    preferred_resolution_type: "refund" as string & tags.MinLength<1>,
    items: [returnItemCreate],
    evidence_attachments: [],
    metadata: {
      channel: "web",
    },
  } satisfies IShoppingMallOrderReturnRequest.ICreate;

  const returnRequest =
    await api.functional.shoppingMall.customer.orders.returnRequests.create(
      connection,
      {
        orderId,
        body: returnRequestCreateBody,
      },
    );
  typia.assert<IShoppingMallOrderReturnRequest>(returnRequest);

  // 6-3. Customer dispute
  const disputeCreateBody = {
    shopping_mall_order_line_id: null,
    issue_category: "non_delivery",
    issue_title: "Order not delivered yet",
    issue_description: "Package has not arrived within expected time.",
  } satisfies IShoppingMallOrderDispute.ICreate;

  const dispute =
    await api.functional.shoppingMall.customer.orders.disputes.create(
      connection,
      {
        orderId,
        body: disputeCreateBody,
      },
    );
  typia.assert<IShoppingMallOrderDispute>(dispute);

  // 6-4. Seller fulfillment for order
  await api.functional.auth.seller.login(connection, {
    body: sellerLoginBody,
  });

  const sellerFulfillmentCreateBody = {
    order_line_fulfillments: [],
    carrier_code: "SELLER-CARRIER",
    requested_ship_date: new Date().toISOString() as string &
      tags.Format<"date-time">,
    warehouse_code: "WH-01",
    notes: "Seller fulfillment created by E2E test.",
  } satisfies IShoppingMallFulfillment.ICreate;

  const sellerFulfillment =
    await api.functional.shoppingMall.seller.orders.fulfillments.create(
      connection,
      {
        orderId,
        body: sellerFulfillmentCreateBody,
      },
    );
  typia.assert<IShoppingMallFulfillment>(sellerFulfillment);

  // 6-5. Platform admin fulfillment
  await api.functional.auth.platformAdmin.login(connection, {
    body: platformAdminLoginBody,
  });

  const adminFulfillmentCreateBody = {
    order_line_fulfillments: [],
    carrier_code: "ADMIN-CARRIER",
    requested_ship_date: new Date().toISOString() as string &
      tags.Format<"date-time">,
    warehouse_code: "WH-02",
    notes: "Platform admin fulfillment created by E2E test.",
  } satisfies IShoppingMallFulfillment.ICreate;

  const adminFulfillment =
    await api.functional.shoppingMall.platformAdmin.orders.fulfillments.create(
      connection,
      {
        orderId,
        body: adminFulfillmentCreateBody,
      },
    );
  typia.assert<IShoppingMallFulfillment>(adminFulfillment);

  // 6-6. Platform admin creates shipment
  const shipmentCreateBody = {
    order_seller_segment_id: randomUuid(),
    shipment_status: "ready_to_ship",
    carrier_name: "E2E Carrier",
    carrier_service_level: "standard",
    tracking_number: RandomGenerator.alphaNumeric(12),
    shipped_at: new Date().toISOString() as string & tags.Format<"date-time">,
  } satisfies IShoppingMallShipment.ICreate;

  const shipment = await api.functional.shoppingMall.orders.shipments.create(
    connection,
    {
      orderId,
      body: shipmentCreateBody,
    },
  );
  typia.assert<IShoppingMallShipment>(shipment);

  const shipmentId = shipment.id;

  // 6-7. Seller tracking event
  await api.functional.auth.seller.login(connection, {
    body: sellerLoginBody,
  });

  const sellerTrackingCreateBody = {
    status: "in_transit",
    carrier_status_code: "IT",
    location_description: "Seller warehouse",
    carrier_raw_message: "Package picked up by carrier.",
    occurred_at: new Date().toISOString() as string & tags.Format<"date-time">,
  } satisfies IShoppingMallShipmentTrackingEvent.ICreate;

  const sellerTrackingEvent =
    await api.functional.shoppingMall.seller.shipments.trackingEvents.create(
      connection,
      {
        shipmentId,
        body: sellerTrackingCreateBody,
      },
    );
  typia.assert<IShoppingMallShipmentTrackingEvent>(sellerTrackingEvent);

  // 6-8. Platform admin tracking event
  await api.functional.auth.platformAdmin.login(connection, {
    body: platformAdminLoginBody,
  });

  const adminTrackingCreateBody = {
    status: "delivered",
    carrier_status_code: "DL",
    location_description: "Customer address",
    carrier_raw_message: "Package delivered.",
    occurred_at: new Date().toISOString() as string & tags.Format<"date-time">,
  } satisfies IShoppingMallShipmentTrackingEvent.ICreate;

  const adminTrackingEvent =
    await api.functional.shoppingMall.platformAdmin.shipments.trackingEvents.create(
      connection,
      {
        shipmentId,
        body: adminTrackingCreateBody,
      },
    );
  typia.assert<IShoppingMallShipmentTrackingEvent>(adminTrackingEvent);

  // 7. Customer calls statusEvents endpoint
  await api.functional.auth.customer.login(connection, {
    body: customerLoginBody,
  });

  // 7-1. Unfiltered call to discover events
  const unfilteredRequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 50 as number & tags.Type<"int32"> & tags.Minimum<1>,
    status_codes: undefined,
    originator_types: undefined,
    from_timestamp: null,
    to_timestamp: null,
    sort_direction: "asc" as "asc" | "desc",
  } satisfies IShoppingMallOrderStatusEvent.IRequest;

  const unfilteredPage =
    await api.functional.shoppingMall.customer.orders.statusEvents.index(
      connection,
      {
        orderId,
        body: unfilteredRequestBody,
      },
    );
  typia.assert<IPageIShoppingMallOrderStatusEvent.ISummary>(unfilteredPage);

  const allEvents = unfilteredPage.data;

  // Basic sanity: all events belong to the same order
  allEvents.forEach((event) => {
    typia.assert<IShoppingMallOrderStatusEvent.ISummary>(event);
    TestValidator.equals(
      "status event order id matches order",
      event.order.id,
      orderId,
    );
  });

  // If there are no events, we can at least validate empty pagination semantics
  if (allEvents.length === 0) {
    TestValidator.equals(
      "no events -> records should be zero",
      unfilteredPage.pagination.records,
      0,
    );
    TestValidator.equals(
      "no events -> pages should be zero",
      unfilteredPage.pagination.pages,
      0,
    );
    TestValidator.equals(
      "no events -> current page index is zero or first page",
      unfilteredPage.pagination.current >= 0,
      true,
    );
    return;
  }

  // 7-2. Derive time window and status subset from unfiltered events
  const occurredTimestamps = allEvents.map((e) => e.occurred_at);

  const sortedByTime = [...occurredTimestamps].sort();
  const minOccurredAt = sortedByTime[0];
  const maxOccurredAt = sortedByTime[sortedByTime.length - 1];

  const windowFrom = minOccurredAt;
  const windowTo = maxOccurredAt;

  const uniqueStatuses: string[] = [];
  allEvents.forEach((e) => {
    if (!uniqueStatuses.includes(e.new_status))
      uniqueStatuses.push(e.new_status);
  });

  let statusFilter: string[] | undefined = undefined;
  if (uniqueStatuses.length > 0) {
    const sampleCount = Math.min(3, uniqueStatuses.length);
    statusFilter =
      sampleCount === uniqueStatuses.length
        ? uniqueStatuses
        : RandomGenerator.sample(uniqueStatuses, sampleCount);
  }

  const filteredLimit = Math.min(10, allEvents.length);

  const filteredRequestBody: IShoppingMallOrderStatusEvent.IRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: filteredLimit as number & tags.Type<"int32"> & tags.Minimum<1>,
    status_codes: statusFilter,
    originator_types: undefined,
    from_timestamp: windowFrom as string & tags.Format<"date-time">,
    to_timestamp: windowTo as string & tags.Format<"date-time">,
    sort_direction: "asc",
  };

  const filteredPage =
    await api.functional.shoppingMall.customer.orders.statusEvents.index(
      connection,
      {
        orderId,
        body: filteredRequestBody,
      },
    );
  typia.assert<IPageIShoppingMallOrderStatusEvent.ISummary>(filteredPage);

  const filteredEvents = filteredPage.data;

  // 8. Assertions on filtered result
  TestValidator.equals(
    "filtered limit matches request",
    filteredPage.pagination.limit,
    filteredLimit,
  );

  // records should be >= returned data length when there is any data
  if (filteredEvents.length > 0) {
    TestValidator.predicate(
      "records should be at least number of returned events",
      filteredPage.pagination.records >= filteredEvents.length,
    );
  }

  filteredEvents.forEach((event, idx) => {
    typia.assert<IShoppingMallOrderStatusEvent.ISummary>(event);

    TestValidator.equals(
      `filtered event ${idx} belongs to the target order`,
      event.order.id,
      orderId,
    );

    if (statusFilter !== undefined && statusFilter.length > 0) {
      TestValidator.predicate(
        `filtered event ${idx} status is one of requested status_codes`,
        statusFilter.includes(event.new_status),
      );
    }

    TestValidator.predicate(
      `filtered event ${idx} occurred_at >= from_timestamp`,
      event.occurred_at >= windowFrom,
    );

    TestValidator.predicate(
      `filtered event ${idx} occurred_at <= to_timestamp`,
      event.occurred_at <= windowTo,
    );
  });
}
