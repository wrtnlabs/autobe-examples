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
import type { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
import type { IShoppingMallFulfillment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallFulfillment";
import type { IShoppingMallFulfillmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallFulfillmentItem";
import type { IShoppingMallFulfillmentOrderLine } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallFulfillmentOrderLine";
import type { IShoppingMallInventoryItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryItem";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderCancellationRequest";
import type { IShoppingMallOrderLine } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderLine";
import type { IShoppingMallOrderLineThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderLineThumbnail";
import type { IShoppingMallOrderSellerSegment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderSellerSegment";
import type { IShoppingMallOrderTimeline } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderTimeline";
import type { IShoppingMallOrderTimelineEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderTimelineEntry";
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

export async function test_api_customer_order_timeline_event_ordering_and_types(
  connection: api.IConnection,
) {
  // 1. Platform admin joins (for brand/category/product setup if needed in future)
  const platformAdminEmail = typia.random<string & tags.Format<"email">>();
  const platformAdminJoinBody = {
    email: platformAdminEmail,
    name: RandomGenerator.name(2),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.shoppingmall.test/join",
    referrer: "https://admin.shoppingmall.test/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. Create category tree as platform admin (not strictly used downstream but realistic catalog context)
  const categoryTreeBody = {
    code: `ct-${RandomGenerator.alphaNumeric(8)}`,
    name: "Default Category Tree",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;

  const categoryTree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      { body: categoryTreeBody },
    );
  typia.assert(categoryTree);

  // 3. Create brand as platform admin
  const brandBody = {
    name: `Brand ${RandomGenerator.name(1)}`,
    slug: `brand-${RandomGenerator.alphaNumeric(6)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    logo_uri: "https://cdn.shoppingmall.test/logo.png",
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert(brand);

  // 4. Seller joins
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(12);
  const sellerJoinBody = {
    email: sellerEmail,
    password: sellerPassword,
    storeName: `Store ${RandomGenerator.name(1)}`,
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  // 5. Seller creates product
  const productCode = `prd-${RandomGenerator.alphaNumeric(10)}`;
  const productBody = {
    shopping_mall_seller_id: sellerAuthorized.id,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: `Product ${RandomGenerator.name(1)}`,
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: false,
    primary_image_uri: "https://cdn.shoppingmall.test/product.png",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert(product);

  // 6. Seller creates a SKU for the product
  const skuCode = `sku-${RandomGenerator.alphaNumeric(10)}`;
  const listPrice = 100;
  const salePrice = 90;
  const skuBody = {
    code: skuCode,
    name: `SKU ${RandomGenerator.name(1)}`,
    listPrice,
    salePrice,
    currency: "USD",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const productSku: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode: product.code,
      body: skuBody,
    });
  typia.assert(productSku);

  // 7. Seller creates inventory item for the SKU
  const inventoryBody = {
    product_sku_id: productSku.id,
    on_hand_quantity: 10,
    low_stock_threshold: 1,
    backorder_enabled: false,
    preorder_enabled: false,
  } satisfies IShoppingMallInventoryItem.ICreate;

  const inventoryItem: IShoppingMallInventoryItem =
    await api.functional.shoppingMall.seller.inventoryItems.create(connection, {
      body: inventoryBody,
    });
  typia.assert(inventoryItem);

  // 8. Customer joins
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(12);

  const customerJoinBody = {
    email: customerEmail,
    password: customerPassword,
    name: RandomGenerator.name(2),
    ip: null,
    href: "https://shoppingmall.test/join",
    referrer: "https://shoppingmall.test/landing",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  // 9. Customer creates a cart
  const customerCartBody = {
    currency_code: skuBody.currency,
    region_code: "US",
    channel: "web",
    metadata: {
      scenario: "timeline-test",
    },
    is_active: true,
    source_guest_token: undefined,
  } satisfies IShoppingMallCustomerCart.ICreate;

  const customerCart: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.customerCarts.create(
      connection,
      { body: customerCartBody },
    );
  typia.assert(customerCart);

  // 10. Customer adds SKU to cart
  const cartItemBody = {
    skuId: productSku.id,
    quantity: 1,
    note: "timeline scenario item",
  } satisfies IShoppingMallCustomerCartItem.ICreate;

  const cartItem: IShoppingMallCustomerCartItem =
    await api.functional.shoppingMall.customer.customerCarts.items.create(
      connection,
      {
        customerCartId: customerCart.id,
        body: cartItemBody,
      },
    );
  typia.assert(cartItem);

  // 11. Customer creates order from cart
  const itemsSubtotalAmount = skuBody.salePrice * cartItemBody.quantity;
  const discountTotalAmount = 0;
  const shippingTotalAmount = 5;
  const taxTotalAmount = Math.round(
    0.1 * (itemsSubtotalAmount + shippingTotalAmount),
  );
  const grandTotalAmount =
    itemsSubtotalAmount -
    discountTotalAmount +
    shippingTotalAmount +
    taxTotalAmount;

  const shippingAddressId = typia.random<string & tags.Format<"uuid">>();
  const billingAddressId = typia.random<string & tags.Format<"uuid">>();

  const orderCreateBody = {
    customer_cart_id: customerCart.id,
    currency_code: skuBody.currency,
    items_subtotal_amount: itemsSubtotalAmount,
    discount_total_amount: discountTotalAmount,
    shipping_total_amount: shippingTotalAmount,
    tax_total_amount: taxTotalAmount,
    grand_total_amount: grandTotalAmount,
    shipping_address_id: shippingAddressId,
    billing_address_id: billingAddressId,
    customer_note: "timeline test order",
  } satisfies IShoppingMallOrder.ICreate;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateBody,
    });
  typia.assert(order);

  // 12. Seller logs in again to act on the order (fulfillment/shipment)
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: "https://seller.shoppingmall.test/login",
    referrer: "https://seller.shoppingmall.test/dashboard",
  } satisfies IShoppingMallSellerLogin.IRequest;

  const sellerLoginAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoginAuthorized);

  // 13. Seller creates fulfillment for the order
  const fulfillmentOrderLineId = typia.random<string & tags.Format<"uuid">>();
  const fulfillmentBody = {
    order_line_fulfillments: [
      {
        order_line_id: fulfillmentOrderLineId,
        quantity: 1,
      },
    ] satisfies IShoppingMallFulfillmentOrderLine.ICreate[],
    carrier_code: "UPS",
    requested_ship_date: new Date().toISOString(),
    warehouse_code: "W1",
    notes: "Test fulfillment for timeline",
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

  // 14. Create shipment for the order
  const orderSellerSegmentId = typia.random<string & tags.Format<"uuid">>();
  const shipmentTrackingNumber = `TRK-${RandomGenerator.alphaNumeric(12)}`;
  const shipmentBody = {
    order_seller_segment_id: orderSellerSegmentId,
    shipment_status: "shipped",
    carrier_name: "UPS",
    carrier_service_level: "ground",
    tracking_number: shipmentTrackingNumber,
    shipped_at: new Date().toISOString(),
  } satisfies IShoppingMallShipment.ICreate;

  const shipment: IShoppingMallShipment =
    await api.functional.shoppingMall.orders.shipments.create(connection, {
      orderId: order.id,
      body: shipmentBody,
    });
  typia.assert(shipment);

  // 15. Create shipment tracking event
  const trackingEventBody = {
    status: "in_transit",
    carrier_status_code: "IT",
    location_description: "Origin Facility",
    carrier_raw_message: "Package departed origin facility",
    occurred_at: new Date().toISOString(),
  } satisfies IShoppingMallShipmentTrackingEvent.ICreate;

  const trackingEvent: IShoppingMallShipmentTrackingEvent =
    await api.functional.shoppingMall.seller.shipments.trackingEvents.create(
      connection,
      {
        shipmentId: shipment.id,
        body: trackingEventBody,
      },
    );
  typia.assert(trackingEvent);

  // 16. Customer logs back in and creates a cancellation request
  const customerLoginBody = {
    email: customerEmail,
    password: customerPassword,
    ip: null,
    href: "https://shoppingmall.test/login",
    referrer: "https://shoppingmall.test/orders",
    userAgent: "timeline-e2e-test/1.0",
  } satisfies IShoppingMallCustomerAuth.ILogin;

  const customerLoginAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLoginAuthorized);

  const cancellationBody = {
    request_reason_category: "timeline_test",
    request_reason_detail: "Testing order timeline cancellation event",
  } satisfies IShoppingMallOrderCancellationRequest.ICreate;

  const cancellationRequest: IShoppingMallOrderCancellationRequest =
    await api.functional.shoppingMall.customer.orders.cancellationRequests.create(
      connection,
      {
        orderId: order.id,
        body: cancellationBody,
      },
    );
  typia.assert(cancellationRequest);

  // 17. Retrieve order timeline as customer
  const timeline: IShoppingMallOrderTimeline =
    await api.functional.shoppingMall.customer.orders.timeline.at(connection, {
      orderId: order.id,
    });
  typia.assert(timeline);

  // 18. Basic validations on timeline
  TestValidator.equals(
    "timeline.orderId should match created order id",
    timeline.orderId,
    order.id,
  );

  TestValidator.predicate(
    "timeline entries should contain more than one entry",
    timeline.entries.length > 1,
  );

  // 19. Validate chronological ordering by occurredAt ascending
  const sortedByOccurredAt: IShoppingMallOrderTimelineEntry[] = [
    ...timeline.entries,
  ].sort((a, b) =>
    a.occurredAt < b.occurredAt ? -1 : a.occurredAt > b.occurredAt ? 1 : 0,
  );

  TestValidator.equals(
    "timeline entries should be sorted by occurredAt ascending",
    timeline.entries,
    sortedByOccurredAt,
  );

  // 20. Validate diversity of event types
  const typeSet = new Set<string>();
  for (const entry of timeline.entries) typeSet.add(entry.type);

  TestValidator.predicate(
    "timeline should contain at least two distinct event types",
    typeSet.size >= 2,
  );

  // 21. Validate presence of actor roles for some entries
  const entriesWithActorRole = timeline.entries.filter(
    (e) => e.actorRole !== undefined,
  );

  TestValidator.predicate(
    "timeline should have at least one entry with actorRole",
    entriesWithActorRole.length >= 1,
  );

  // 22. Validate that at least one metadata object (if present) has some keys
  const entriesWithMetadata = timeline.entries.filter(
    (e) => e.metadata !== undefined && e.metadata !== null,
  );

  if (entriesWithMetadata.length > 0) {
    const hasNonEmptyMetadata = entriesWithMetadata.some((entry) => {
      const keys = Object.keys(entry.metadata ?? {});
      return keys.length > 0;
    });

    TestValidator.predicate(
      "at least one timeline entry metadata object should have keys when metadata is present",
      hasNonEmptyMetadata,
    );
  }
}
