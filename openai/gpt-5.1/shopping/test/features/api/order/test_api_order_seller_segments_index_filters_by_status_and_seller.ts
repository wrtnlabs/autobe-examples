import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderSellerSegment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderSellerSegment";
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
import type { IShoppingMallProductOptionType } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionType";
import type { IShoppingMallProductOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionValue";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";
import type { IShoppingMallSellerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerLogin";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShipmentSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentSummary";
import type { IShoppingMallShipmentTrackingEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentTrackingEvent";

export async function test_api_order_seller_segments_index_filters_by_status_and_seller(
  connection: api.IConnection,
) {
  // 1. Platform admin join & login (minimal, used only if needed later)
  const platformAdminEmail: string = typia.random<
    string & tags.Format<"email">
  >();
  const platformAdminJoinBody = {
    email: platformAdminEmail,
    name: RandomGenerator.name(2),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;
  const platformAdminAuth: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuth);

  const platformAdminLoginBody = {
    email: platformAdminEmail,
    password: platformAdminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/join",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;
  const platformAdminLogin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLogin);

  // 2. Seller A setup
  const sellerAEmail: string = typia.random<string & tags.Format<"email">>();
  const sellerAJoinBody = {
    email: sellerAEmail,
    password: RandomGenerator.alphaNumeric(12),
    storeName: `SellerA-${RandomGenerator.alphabets(8)}`,
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;
  const sellerAAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerAJoinBody,
    });
  typia.assert(sellerAAuth);

  const sellerALoginBody = {
    email: sellerAEmail,
    password: sellerAJoinBody.password,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/join",
  } satisfies IShoppingMallSellerLogin.IRequest;
  const sellerALogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerALoginBody,
    });
  typia.assert(sellerALogin);

  // Seller A product
  const productACode = `PROD-A-${RandomGenerator.alphaNumeric(8)}`;
  const sellerAProductBody = {
    shopping_mall_seller_id: sellerAAuth.id,
    shopping_mall_brand_id: null,
    code: productACode,
    name: `ProductA-${RandomGenerator.paragraph({ sentences: 1 })}`,
    short_description: null,
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 3,
      sentenceMax: 6,
    }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: null,
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;
  const productA: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: sellerAProductBody,
    });
  typia.assert(productA);

  // Seller A option type
  const optionTypeABody = {
    name: "Color",
    display_name: "Color",
    display_order: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
  } satisfies IShoppingMallProductOptionType.ICreate;
  const optionTypeA: IShoppingMallProductOptionType =
    await api.functional.shoppingMall.seller.products.optionTypes.create(
      connection,
      {
        productCode: productACode,
        body: optionTypeABody,
      },
    );
  typia.assert(optionTypeA);

  // Seller A option value
  const optionValueABody = {
    value: "red",
    display_name: "Red",
    display_order: 0 as number & tags.Type<"int32">,
    is_active: true,
  } satisfies IShoppingMallProductOptionValue.ICreate;
  const optionValueA: IShoppingMallProductOptionValue =
    await api.functional.shoppingMall.seller.products.optionTypes.values.create(
      connection,
      {
        productCode: productACode,
        productOptionTypeId: optionTypeA.id,
        body: optionValueABody,
      },
    );
  typia.assert(optionValueA);

  // Seller A SKU
  const skuACode = `SKU-A-${RandomGenerator.alphaNumeric(6)}`;
  const skuABody = {
    code: skuACode,
    name: `SKU-A-${RandomGenerator.paragraph({ sentences: 1 })}`,
    listPrice: 10000,
    salePrice: 9000,
    currency: "KRW",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;
  const skuA: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode: productACode,
      body: skuABody,
    });
  typia.assert(skuA);

  // Seller A inventory
  const inventoryABody = {
    product_sku_id: skuA.id,
    on_hand_quantity: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 1 as number & tags.Type<"int32"> & tags.Minimum<0>,
    backorder_enabled: false,
    preorder_enabled: false,
  } satisfies IShoppingMallInventoryItem.ICreate;
  const inventoryA: IShoppingMallInventoryItem =
    await api.functional.shoppingMall.seller.inventoryItems.create(connection, {
      body: inventoryABody,
    });
  typia.assert(inventoryA);

  // 3. Seller B setup
  const sellerBEmail: string = typia.random<string & tags.Format<"email">>();
  const sellerBJoinBody = {
    email: sellerBEmail,
    password: RandomGenerator.alphaNumeric(12),
    storeName: `SellerB-${RandomGenerator.alphabets(8)}`,
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;
  const sellerBAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerBJoinBody,
    });
  typia.assert(sellerBAuth);

  const sellerBLoginBody = {
    email: sellerBEmail,
    password: sellerBJoinBody.password,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/join",
  } satisfies IShoppingMallSellerLogin.IRequest;
  const sellerBLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerBLoginBody,
    });
  typia.assert(sellerBLogin);

  // Seller B product
  const productBCode = `PROD-B-${RandomGenerator.alphaNumeric(8)}`;
  const sellerBProductBody = {
    shopping_mall_seller_id: sellerBAuth.id,
    shopping_mall_brand_id: null,
    code: productBCode,
    name: `ProductB-${RandomGenerator.paragraph({ sentences: 1 })}`,
    short_description: null,
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 3,
      sentenceMax: 6,
    }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: null,
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;
  const productB: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: sellerBProductBody,
    });
  typia.assert(productB);

  // Seller B option type
  const optionTypeBBody = {
    name: "Size",
    display_name: "Size",
    display_order: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
  } satisfies IShoppingMallProductOptionType.ICreate;
  const optionTypeB: IShoppingMallProductOptionType =
    await api.functional.shoppingMall.seller.products.optionTypes.create(
      connection,
      {
        productCode: productBCode,
        body: optionTypeBBody,
      },
    );
  typia.assert(optionTypeB);

  // Seller B option value
  const optionValueBBody = {
    value: "large",
    display_name: "Large",
    display_order: 0 as number & tags.Type<"int32">,
    is_active: true,
  } satisfies IShoppingMallProductOptionValue.ICreate;
  const optionValueB: IShoppingMallProductOptionValue =
    await api.functional.shoppingMall.seller.products.optionTypes.values.create(
      connection,
      {
        productCode: productBCode,
        productOptionTypeId: optionTypeB.id,
        body: optionValueBBody,
      },
    );
  typia.assert(optionValueB);

  // Seller B SKU
  const skuBCode = `SKU-B-${RandomGenerator.alphaNumeric(6)}`;
  const skuBBody = {
    code: skuBCode,
    name: `SKU-B-${RandomGenerator.paragraph({ sentences: 1 })}`,
    listPrice: 20000,
    salePrice: 18000,
    currency: "KRW",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;
  const skuB: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode: productBCode,
      body: skuBBody,
    });
  typia.assert(skuB);

  // Seller B inventory
  const inventoryBBody = {
    product_sku_id: skuB.id,
    on_hand_quantity: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 1 as number & tags.Type<"int32"> & tags.Minimum<0>,
    backorder_enabled: false,
    preorder_enabled: false,
  } satisfies IShoppingMallInventoryItem.ICreate;
  const inventoryB: IShoppingMallInventoryItem =
    await api.functional.shoppingMall.seller.inventoryItems.create(connection, {
      body: inventoryBBody,
    });
  typia.assert(inventoryB);

  // 4. Customer setup
  const customerEmail: string = typia.random<string & tags.Format<"email">>();
  const customerJoinBody = {
    email: customerEmail,
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(2),
    ip: null,
    href: "https://shop.example.com/join",
    referrer: "https://shop.example.com/landing",
  } satisfies IShoppingMallCustomerAuth.IJoin;
  const customerAuth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuth);

  const customerLoginBody = {
    email: customerEmail,
    password: customerJoinBody.password,
    ip: null,
    href: "https://shop.example.com/login",
    referrer: "https://shop.example.com/join",
  } satisfies IShoppingMallCustomerAuth.ILogin;
  const customerLogin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLogin);

  // Customer cart
  const cartBody = {
    currency_code: "KRW",
    region_code: "KR-Seoul",
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

  // Cart items for Seller A and Seller B
  const cartItemABody = {
    skuId: skuA.id,
    quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    note: null,
  } satisfies IShoppingMallCustomerCartItem.ICreate;
  const cartItemA: IShoppingMallCustomerCartItem =
    await api.functional.shoppingMall.customer.customerCarts.items.create(
      connection,
      {
        customerCartId: cart.id,
        body: cartItemABody,
      },
    );
  typia.assert(cartItemA);

  const cartItemBBody = {
    skuId: skuB.id,
    quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    note: null,
  } satisfies IShoppingMallCustomerCartItem.ICreate;
  const cartItemB: IShoppingMallCustomerCartItem =
    await api.functional.shoppingMall.customer.customerCarts.items.create(
      connection,
      {
        customerCartId: cart.id,
        body: cartItemBBody,
      },
    );
  typia.assert(cartItemB);

  // 5. Order creation (multi-seller)
  const itemsSubtotal = skuABody.salePrice + skuBBody.salePrice;
  const discountTotal = 0;
  const shippingTotal = 3000;
  const taxTotal = 0;
  const grandTotal = itemsSubtotal - discountTotal + shippingTotal + taxTotal;

  const orderCreateBody = {
    customer_cart_id: cart.id,
    currency_code: "KRW",
    items_subtotal_amount: itemsSubtotal,
    discount_total_amount: discountTotal,
    shipping_total_amount: shippingTotal,
    tax_total_amount: taxTotal,
    grand_total_amount: grandTotal,
    shipping_address_id: typia.random<string & tags.Format<"uuid">>(),
    billing_address_id: typia.random<string & tags.Format<"uuid">>(),
    customer_note: "Test multi-seller order",
  } satisfies IShoppingMallOrder.ICreate;
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateBody,
    });
  typia.assert(order);

  // 6. Initial segment discovery to get seller segments and IDs
  const initialSegmentsPage: IPageIShoppingMallOrderSellerSegment.ISummary =
    await api.functional.shoppingMall.orders.sellerSegments.index(connection, {
      orderId: order.id,
      body: {
        seller_id: undefined,
        segment_statuses: undefined,
        created_at_from: undefined,
        created_at_to: undefined,
        sort_field: undefined,
        sort_direction: undefined,
        page: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
        limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
      } satisfies IShoppingMallOrderSellerSegment.IRequest,
    });
  typia.assert(initialSegmentsPage);

  TestValidator.predicate(
    "initial segments should have at least two entries",
    initialSegmentsPage.data.length >= 2,
  );

  const sellerASegment = initialSegmentsPage.data.find(
    (seg) => seg.seller.id === sellerAAuth.id,
  );
  const sellerBSegment = initialSegmentsPage.data.find(
    (seg) => seg.seller.id === sellerBAuth.id,
  );

  TestValidator.predicate(
    "seller A segment should exist in initial segments",
    sellerASegment !== undefined,
  );
  TestValidator.predicate(
    "seller B segment should exist in initial segments",
    sellerBSegment !== undefined,
  );

  // 7. Drive Seller A segment forward: fulfillment + shipment + tracking
  await api.functional.auth.seller.login(connection, {
    body: sellerALoginBody,
  });

  const fulfillmentBody = {
    order_line_fulfillments: [],
    carrier_code: undefined,
    requested_ship_date: undefined,
    warehouse_code: undefined,
    notes: undefined,
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

  const refreshedSegmentsPage: IPageIShoppingMallOrderSellerSegment.ISummary =
    await api.functional.shoppingMall.orders.sellerSegments.index(connection, {
      orderId: order.id,
      body: {
        seller_id: undefined,
        segment_statuses: undefined,
        created_at_from: undefined,
        created_at_to: undefined,
        sort_field: undefined,
        sort_direction: undefined,
        page: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
        limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
      } satisfies IShoppingMallOrderSellerSegment.IRequest,
    });
  typia.assert(refreshedSegmentsPage);

  const refreshedSellerASegment = refreshedSegmentsPage.data.find(
    (seg) => seg.seller.id === sellerAAuth.id,
  );
  const refreshedSellerBSegment = refreshedSegmentsPage.data.find(
    (seg) => seg.seller.id === sellerBAuth.id,
  );

  TestValidator.predicate(
    "refreshed seller A segment exists",
    refreshedSellerASegment !== undefined,
  );
  TestValidator.predicate(
    "refreshed seller B segment exists",
    refreshedSellerBSegment !== undefined,
  );

  if (
    refreshedSellerASegment === undefined ||
    refreshedSellerBSegment === undefined
  ) {
    throw new Error("Segments for both sellers must exist after refresh");
  }

  const sellerASegmentStatusAfterFulfillment =
    refreshedSellerASegment.segment_status;
  const sellerBSegmentStatusBaseline = refreshedSellerBSegment.segment_status;

  // 8. Create a shipment for Seller A using its seller segment ID
  const shipmentBody = {
    order_seller_segment_id: refreshedSellerASegment.id,
    shipment_status: "shipped",
    carrier_name: "TestCarrier",
    carrier_service_level: "standard",
    tracking_number: RandomGenerator.alphaNumeric(12),
    shipped_at: new Date().toISOString(),
  } satisfies IShoppingMallShipment.ICreate;
  const shipment: IShoppingMallShipment =
    await api.functional.shoppingMall.orders.shipments.create(connection, {
      orderId: order.id,
      body: shipmentBody,
    });
  typia.assert(shipment);

  // 9. Add tracking event for the shipment
  const trackingEventBody = {
    status: "in_transit",
    carrier_status_code: null,
    location_description: "Center Warehouse",
    carrier_raw_message: "Package departed facility",
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

  // 10. Reload segments after shipment & tracking
  const afterShipmentSegmentsPage: IPageIShoppingMallOrderSellerSegment.ISummary =
    await api.functional.shoppingMall.orders.sellerSegments.index(connection, {
      orderId: order.id,
      body: {
        seller_id: undefined,
        segment_statuses: undefined,
        created_at_from: undefined,
        created_at_to: undefined,
        sort_field: undefined,
        sort_direction: undefined,
        page: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
        limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
      } satisfies IShoppingMallOrderSellerSegment.IRequest,
    });
  typia.assert(afterShipmentSegmentsPage);

  const afterShipmentSellerASegment = afterShipmentSegmentsPage.data.find(
    (seg) => seg.seller.id === sellerAAuth.id,
  );
  const afterShipmentSellerBSegment = afterShipmentSegmentsPage.data.find(
    (seg) => seg.seller.id === sellerBAuth.id,
  );

  TestValidator.predicate(
    "after-shipment seller A segment exists",
    afterShipmentSellerASegment !== undefined,
  );
  TestValidator.predicate(
    "after-shipment seller B segment exists",
    afterShipmentSellerBSegment !== undefined,
  );

  if (
    afterShipmentSellerASegment === undefined ||
    afterShipmentSellerBSegment === undefined
  ) {
    throw new Error("Segments for both sellers must exist after shipment");
  }

  const sellerASegmentStatusFinal = afterShipmentSellerASegment.segment_status;
  const sellerBSegmentStatusFinal = afterShipmentSellerBSegment.segment_status;

  TestValidator.predicate(
    "seller A and seller B segment_status should differ",
    sellerASegmentStatusFinal !== sellerBSegmentStatusFinal,
  );

  // 11. Filter by seller_id only (Seller A)
  const filterSellerAPage: IPageIShoppingMallOrderSellerSegment.ISummary =
    await api.functional.shoppingMall.orders.sellerSegments.index(connection, {
      orderId: order.id,
      body: {
        seller_id: sellerAAuth.id,
        segment_statuses: undefined,
        created_at_from: undefined,
        created_at_to: undefined,
        sort_field: undefined,
        sort_direction: undefined,
        page: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
        limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
      } satisfies IShoppingMallOrderSellerSegment.IRequest,
    });
  typia.assert(filterSellerAPage);

  for (const seg of filterSellerAPage.data) {
    TestValidator.equals(
      "seller_id filter: all segments should belong to seller A",
      seg.seller.id,
      sellerAAuth.id,
    );
  }

  TestValidator.equals(
    "seller_id-only filter: records equals data length",
    filterSellerAPage.pagination.records,
    filterSellerAPage.data.length,
  );

  // 12. Filter by segment_status only (use Seller A final status)
  const filterStatusPage: IPageIShoppingMallOrderSellerSegment.ISummary =
    await api.functional.shoppingMall.orders.sellerSegments.index(connection, {
      orderId: order.id,
      body: {
        seller_id: undefined,
        segment_statuses: [sellerASegmentStatusFinal],
        created_at_from: undefined,
        created_at_to: undefined,
        sort_field: undefined,
        sort_direction: undefined,
        page: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
        limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
      } satisfies IShoppingMallOrderSellerSegment.IRequest,
    });
  typia.assert(filterStatusPage);

  for (const seg of filterStatusPage.data) {
    TestValidator.equals(
      "segment_status-only filter: segment_status must match",
      seg.segment_status,
      sellerASegmentStatusFinal,
    );
    TestValidator.equals(
      "segment_status-only filter: order must match",
      seg.order.id,
      order.id,
    );
  }

  // 13. Filter by both seller_id and segment_status (Seller A + its status)
  const filterBothPage: IPageIShoppingMallOrderSellerSegment.ISummary =
    await api.functional.shoppingMall.orders.sellerSegments.index(connection, {
      orderId: order.id,
      body: {
        seller_id: sellerAAuth.id,
        segment_statuses: [sellerASegmentStatusFinal],
        created_at_from: undefined,
        created_at_to: undefined,
        sort_field: undefined,
        sort_direction: undefined,
        page: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
        limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
      } satisfies IShoppingMallOrderSellerSegment.IRequest,
    });
  typia.assert(filterBothPage);

  for (const seg of filterBothPage.data) {
    TestValidator.equals(
      "combined filter: seller must be A",
      seg.seller.id,
      sellerAAuth.id,
    );
    TestValidator.equals(
      "combined filter: status must match seller A status",
      seg.segment_status,
      sellerASegmentStatusFinal,
    );
  }

  const expectedPages = filterBothPage.pagination.records > 0 ? 1 : 0;
  TestValidator.equals(
    "combined filter: records equals data length",
    filterBothPage.pagination.records,
    filterBothPage.data.length,
  );
  TestValidator.equals(
    "combined filter: pages should be 1 when records > 0 else 0",
    filterBothPage.pagination.pages,
    expectedPages,
  );

  // 14. Negative combination: Seller A with Seller B's status (expect empty)
  const negativeFilterPage: IPageIShoppingMallOrderSellerSegment.ISummary =
    await api.functional.shoppingMall.orders.sellerSegments.index(connection, {
      orderId: order.id,
      body: {
        seller_id: sellerAAuth.id,
        segment_statuses: [sellerBSegmentStatusFinal],
        created_at_from: undefined,
        created_at_to: undefined,
        sort_field: undefined,
        sort_direction: undefined,
        page: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
        limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
      } satisfies IShoppingMallOrderSellerSegment.IRequest,
    });
  typia.assert(negativeFilterPage);

  TestValidator.equals(
    "negative combination: no segments returned",
    negativeFilterPage.data.length,
    0,
  );
  TestValidator.equals(
    "negative combination: records must be 0",
    negativeFilterPage.pagination.records,
    0,
  );
  TestValidator.equals(
    "negative combination: pages must be 0",
    negativeFilterPage.pagination.pages,
    0,
  );
}
