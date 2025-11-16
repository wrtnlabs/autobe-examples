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
import type { IShoppingMallOrderTrendStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderTrendStatistics";
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

export async function test_api_order_trend_statistics_time_bucketing_and_status_distribution(
  connection: api.IConnection,
) {
  // 1. Platform admin joins (to ensure admin actor exists, even if not strictly needed for the core flow)
  const platformAdminJoinBody = {
    email: `${RandomGenerator.alphaNumeric(8)}@admin.test.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.test.com/join",
    referrer: "https://admin.test.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;
  const platformAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  // 2. Seller joins and authenticates
  const sellerEmail: string & tags.Format<"email"> =
    `${RandomGenerator.alphaNumeric(8)}@seller.test.com` as string &
      tags.Format<"email">;
  const sellerJoinBody = {
    email: sellerEmail,
    password: RandomGenerator.alphaNumeric(12),
    storeName: `Store-${RandomGenerator.name(1)}`,
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;
  const sellerAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuth);

  // 3. Customer joins and authenticates
  const customerEmail: string & tags.Format<"email"> =
    `${RandomGenerator.alphaNumeric(8)}@customer.test.com` as string &
      tags.Format<"email">;
  const customerJoinBody = {
    email: customerEmail,
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    ip: null,
    href: "https://shop.test.com/join",
    referrer: "https://shop.test.com/",
  } satisfies IShoppingMallCustomerAuth.IJoin;
  const customerAuth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuth);

  // 4. As platform admin, create a brand
  const brandCreateBody = {
    name: `Brand-${RandomGenerator.name(1)}`,
    slug: `brand-${RandomGenerator.alphaNumeric(8)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    logo_uri: "https://cdn.test.com/logo.png",
  } satisfies IShoppingMallBrand.ICreate;
  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  // 5. As seller, create a product
  const productCode = `TRND-${RandomGenerator.alphaNumeric(8)}`;
  const productCreateBody = {
    shopping_mall_seller_id: sellerAuth.id,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: `Product-${RandomGenerator.name(1)}`,
    short_description: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: "https://cdn.test.com/product.png",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  // 6. As seller, create an option type for the product
  const optionTypeCreateBody = {
    name: "Color",
    display_name: "Color",
    display_order: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
  } satisfies IShoppingMallProductOptionType.ICreate;
  const optionType: IShoppingMallProductOptionType =
    await api.functional.shoppingMall.seller.products.optionTypes.create(
      connection,
      {
        productCode,
        body: optionTypeCreateBody,
      },
    );
  typia.assert(optionType);

  // 7. As seller, create an option value
  const optionValueCreateBody = {
    value: "RED",
    display_name: "Red",
    display_order: 0 as number & tags.Type<"int32">,
    is_active: true,
  } satisfies IShoppingMallProductOptionValue.ICreate;
  const optionValue: IShoppingMallProductOptionValue =
    await api.functional.shoppingMall.seller.products.optionTypes.values.create(
      connection,
      {
        productCode,
        productOptionTypeId: optionType.id,
        body: optionValueCreateBody,
      },
    );
  typia.assert(optionValue);

  // 8. As seller, create a SKU for the product
  const skuCode = `TRND-SKU-${RandomGenerator.alphaNumeric(6)}`;
  const skuCreateBody = {
    code: skuCode,
    name: `SKU-${RandomGenerator.name(1)}`,
    listPrice: 10000,
    salePrice: 9000,
    currency: "KRW",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;
  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode,
      body: skuCreateBody,
    });
  typia.assert(sku);

  // 9. As seller, create inventory item for the SKU
  const inventoryCreateBody = {
    product_sku_id: sku.id,
    on_hand_quantity: 50 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 5 as number & tags.Type<"int32"> & tags.Minimum<0>,
    backorder_enabled: false,
    preorder_enabled: false,
  } satisfies IShoppingMallInventoryItem.ICreate;
  const inventory: IShoppingMallInventoryItem =
    await api.functional.shoppingMall.seller.inventoryItems.create(connection, {
      body: inventoryCreateBody,
    });
  typia.assert(inventory);

  // 10. As customer, create a persistent cart
  const cartCreateBody = {
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
        body: cartCreateBody,
      },
    );
  typia.assert(cart);

  // 11. As customer, add three items to the cart referencing the SKU
  const cartItemBodies: IShoppingMallCustomerCartItem.ICreate[] = [
    {
      skuId: sku.id,
      quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
      note: "Order A item",
    },
    {
      skuId: sku.id,
      quantity: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
      note: "Order B item",
    },
    {
      skuId: sku.id,
      quantity: 3 as number & tags.Type<"int32"> & tags.Minimum<1>,
      note: "Order C item",
    },
  ];

  const cartItems: IShoppingMallCustomerCartItem[] = [];
  for (const body of cartItemBodies) {
    const item: IShoppingMallCustomerCartItem =
      await api.functional.shoppingMall.customer.customerCarts.items.create(
        connection,
        {
          customerCartId: cart.id,
          body,
        },
      );
    typia.assert(item);
    cartItems.push(item);
  }

  // Helper to build an order create body with consistent amounts
  const buildOrderCreateBody = (
    customerCartId: string & tags.Format<"uuid">,
  ): IShoppingMallOrder.ICreate => {
    const itemsSubtotal = 10000 * 6; // based on quantities 1+2+3 at price 10000
    const discountTotal = 1000; // arbitrary, for realism
    const shippingTotal = 2500;
    const taxTotal = 0;
    const grandTotal = itemsSubtotal - discountTotal + shippingTotal + taxTotal;

    // We don't have explicit address snapshot IDs; use random UUIDs
    const shippingAddressId = typia.random<string & tags.Format<"uuid">>();
    const billingAddressId = typia.random<string & tags.Format<"uuid">>();

    return {
      customer_cart_id: customerCartId,
      currency_code: "KRW",
      items_subtotal_amount: itemsSubtotal,
      discount_total_amount: discountTotal,
      shipping_total_amount: shippingTotal,
      tax_total_amount: taxTotal,
      grand_total_amount: grandTotal,
      shipping_address_id: shippingAddressId,
      billing_address_id: billingAddressId,
      customer_note: "Trend stats test order",
    } satisfies IShoppingMallOrder.ICreate;
  };

  // 12. Create three orders at controlled times
  const orderABody = buildOrderCreateBody(cart.id);
  const orderA: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderABody,
    });
  typia.assert(orderA);

  // Small delay between orders to help bucketization in real backends
  await new Promise((resolve) => setTimeout(resolve, 50));

  const orderBBody = buildOrderCreateBody(cart.id);
  const orderB: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderBBody,
    });
  typia.assert(orderB);

  await new Promise((resolve) => setTimeout(resolve, 50));

  const orderCBody = buildOrderCreateBody(cart.id);
  const orderC: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCBody,
    });
  typia.assert(orderC);

  // 13. For Order B, create fulfillment, shipment, and tracking event to move it along lifecycle
  const fulfillmentCreateBody: IShoppingMallFulfillment.ICreate =
    typia.random<IShoppingMallFulfillment.ICreate>();
  const fulfillment: IShoppingMallFulfillment =
    await api.functional.shoppingMall.seller.orders.fulfillments.create(
      connection,
      {
        orderId: orderB.id,
        body: fulfillmentCreateBody,
      },
    );
  typia.assert(fulfillment);

  const shipmentCreateBody: IShoppingMallShipment.ICreate =
    typia.random<IShoppingMallShipment.ICreate>();
  const shipment: IShoppingMallShipment =
    await api.functional.shoppingMall.orders.shipments.create(connection, {
      orderId: orderB.id,
      body: shipmentCreateBody,
    });
  typia.assert(shipment);

  const trackingEventCreateBody: IShoppingMallShipmentTrackingEvent.ICreate = {
    status: "delivered",
    carrier_status_code: "DELIVERED",
    location_description: "Seoul",
    carrier_raw_message: "Delivered successfully",
    occurred_at: new Date().toISOString() as string & tags.Format<"date-time">,
  } satisfies IShoppingMallShipmentTrackingEvent.ICreate;
  const trackingEvent: IShoppingMallShipmentTrackingEvent =
    await api.functional.shoppingMall.seller.shipments.trackingEvents.create(
      connection,
      {
        shipmentId: shipment.id,
        body: trackingEventCreateBody,
      },
    );
  typia.assert(trackingEvent);

  // 14. For Order C, create a cancellation request to push it into cancelled-like state
  const cancellationCreateBody = {
    request_reason_category: "customer_changed_mind",
    request_reason_detail: "Test cancellation for trend statistics",
  } satisfies IShoppingMallOrderCancellationRequest.ICreate;
  const cancellation: IShoppingMallOrderCancellationRequest =
    await api.functional.shoppingMall.customer.orders.cancellationRequests.create(
      connection,
      {
        orderId: orderC.id,
        body: cancellationCreateBody,
      },
    );
  typia.assert(cancellation);

  // 15. Fetch order trend statistics
  const stats: IShoppingMallOrderTrendStatistics =
    await api.functional.shoppingMall.statistics.orderTrends.index(connection);
  typia.assert(stats);

  // 16. Basic structural validations
  TestValidator.predicate(
    "overall total_order_count should be >= number of created orders",
    stats.overall.total_order_count >= 3,
  );
  TestValidator.predicate(
    "buckets array should not be empty",
    stats.buckets.length > 0,
  );

  // Sum bucket.order_count and compare with overall.total_order_count
  const totalFromBuckets = stats.buckets.reduce(
    (acc, bucket) => acc + bucket.order_count,
    0 as number & tags.Type<"int32">,
  );
  TestValidator.equals(
    "sum of bucket.order_count matches overall.total_order_count",
    totalFromBuckets,
    stats.overall.total_order_count,
  );

  // Sum status_counts at overall level
  const totalFromOverallStatus = stats.overall.status_counts.reduce(
    (acc, sc) => acc + sc.order_count,
    0 as number & tags.Type<"int32">,
  );
  TestValidator.equals(
    "sum of overall.status_counts.order_count matches overall.total_order_count",
    totalFromOverallStatus,
    stats.overall.total_order_count,
  );

  // 17. Verify that each created order's status appears in overall.status_counts
  const createdOrders: IShoppingMallOrder[] = [orderA, orderB, orderC];
  const statusToCount = new Map<string, number>();
  for (const order of createdOrders) {
    const prev = statusToCount.get(order.order_status) ?? 0;
    statusToCount.set(order.order_status, prev + 1);
  }

  for (const [status, count] of statusToCount.entries()) {
    const overallStatus = stats.overall.status_counts.find(
      (sc) => sc.order_status === status,
    );
    TestValidator.predicate(
      `overall.status_counts should contain entry for created order status '${status}'`,
      overallStatus !== undefined,
    );

    if (overallStatus !== undefined) {
      TestValidator.predicate(
        `overall.status_counts count for status '${status}' should be >= number of created orders with that status`,
        overallStatus.order_count >= count,
      );
    }
  }

  // 18. Validate consistency between bucket-level status_counts and overall.status_counts
  const bucketStatusAggregates = new Map<string, number>();
  for (const bucket of stats.buckets) {
    for (const sc of bucket.status_counts) {
      const prev = bucketStatusAggregates.get(sc.order_status) ?? 0;
      bucketStatusAggregates.set(sc.order_status, prev + sc.order_count);
    }
  }

  // Sum of all bucket.status_counts.order_count must equal overall.total_order_count
  const totalFromBucketStatuses = Array.from(
    bucketStatusAggregates.values(),
  ).reduce((acc, c) => acc + c, 0 as number & tags.Type<"int32">);
  TestValidator.equals(
    "sum of all bucket.status_counts.order_count matches overall.total_order_count",
    totalFromBucketStatuses,
    stats.overall.total_order_count,
  );

  // For each status in overall.status_counts, bucket aggregate count should match
  for (const overallStatus of stats.overall.status_counts) {
    const bucketTotal =
      bucketStatusAggregates.get(overallStatus.order_status) ?? 0;
    TestValidator.equals(
      `bucket-level aggregate count for status '${overallStatus.order_status}' matches overall.status_counts`,
      bucketTotal,
      overallStatus.order_count,
    );
  }
}
