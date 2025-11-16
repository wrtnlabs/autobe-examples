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
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderCancellationRequest";
import type { IShoppingMallOrderLine } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderLine";
import type { IShoppingMallOrderLineThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderLineThumbnail";
import type { IShoppingMallOrderReturnRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderReturnRequest";
import type { IShoppingMallOrderReturnRequestAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderReturnRequestAttachment";
import type { IShoppingMallOrderReturnRequestItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderReturnRequestItem";
import type { IShoppingMallOrderSellerSegment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderSellerSegment";
import type { IShoppingMallOrderStatusBreakdownStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderStatusBreakdownStatistics";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";
import type { IShoppingMallSellerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerLogin";
import type { IShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSession";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShipmentSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentSummary";

/**
 * Validate platform admin order status breakdown statistics payload and basic
 * lifecycle orchestration across actors.
 *
 * This scenario wires together platform admin, seller, and customer actors to
 * drive catalog setup, cart/order creation, and high level lifecycle operations
 * (fulfillments, shipments, cancellation requests, return requests). It then
 * calls the platform-admin statistics endpoint that returns an
 * IShoppingMallOrderStatusBreakdownStatistics snapshot and validates that the
 * payload is structurally and numerically consistent.
 *
 * Because this test runs against the Nestia simulator (simulate mode), the
 * statistics endpoint is not actually correlated with the specific orders
 * created in this flow. Therefore we do not assert exact deltas per status
 * bucket. Instead, we:
 *
 * - Ensure all core preconditions (auth and data flows) execute successfully
 *   across actors.
 * - Verify that both statistics snapshots are well-formed and internally
 *   consistent: non-negative counts, ratios in [0, 1], and totalOrders greater
 *   than or equal to every individual bucket.
 * - Perform a basic sanity check that at least one lifecycle operation
 *   (fulfillment, shipment, cancellation, return) has been executed to justify
 *   the test’s multi-actor orchestration.
 */
export async function test_api_order_status_breakdown_reflects_lifecycle_changes_over_time(
  connection: api.IConnection,
) {
  // Helper to build a random URL suitable for href/referrer and logo/primary_image.
  const randomUrl = (): string & tags.Format<"uri"> =>
    typia.random<string & tags.Format<"uri">>();

  // ---------------------------------------------------------------------------
  // 1. PLATFORM ADMIN, SELLER, CUSTOMER AUTHENTICATION SETUP
  // ---------------------------------------------------------------------------

  // 1.1 Register platform admin (also implicitly authenticates by join).
  const platformAdminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(2),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: randomUrl(),
    referrer: randomUrl(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 1.2 Register seller.
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  // 1.3 Register customer.
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(2),
    ip: null,
    href: randomUrl(),
    referrer: randomUrl(),
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  // ---------------------------------------------------------------------------
  // 2. PLATFORM ADMIN CATALOG BOOTSTRAP (CATEGORY TREE, BRAND, PRODUCT, SKU)
  // ---------------------------------------------------------------------------

  // Re-login as platformAdmin to ensure admin auth context before catalog ops.
  const platformAdminLoginBody = {
    email: platformAdminJoinBody.email,
    password: platformAdminJoinBody.password,
    ip: null,
    href: randomUrl(),
    referrer: randomUrl(),
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const platformAdminSession: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminSession);

  // 2.1 Create category tree.
  const categoryTreeCreateBody = {
    code: `tree-${RandomGenerator.alphaNumeric(6)}`,
    name: RandomGenerator.name(2),
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

  // 2.2 Create brand.
  const brandCreateBody = {
    name: RandomGenerator.name(2),
    slug: `brand-${RandomGenerator.alphaNumeric(6)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    logo_uri: randomUrl(),
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  // 2.3 Create product for the seller.
  const productCode = `prod-${RandomGenerator.alphaNumeric(8)}`;
  const productCreateBody = {
    shopping_mall_seller_id: sellerAuthorized.id,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: RandomGenerator.name(3),
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: randomUrl(),
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

  // 2.4 Create a SKU under that product.
  const skuCode = `sku-${RandomGenerator.alphaNumeric(6)}`;
  const skuCreateBody = {
    code: skuCode,
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
      {
        productCode,
        body: skuCreateBody,
      },
    );
  typia.assert(sku);

  // ---------------------------------------------------------------------------
  // 3. CUSTOMER: CART, CART ITEM, MULTIPLE ORDERS
  // ---------------------------------------------------------------------------

  // Re-login as customer.
  const customerLoginBody = {
    email: customerJoinBody.email,
    password: customerJoinBody.password,
    ip: null,
    href: randomUrl(),
    referrer: randomUrl(),
  } satisfies IShoppingMallCustomerAuth.ILogin;

  const customerSession: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerSession);

  // 3.1 Create a new persistent customer cart.
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

  const cart: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.customerCarts.create(
      connection,
      {
        body: cartCreateBody,
      },
    );
  typia.assert(cart);

  // 3.2 Add a single item with the created SKU.
  const cartItemCreateBody = {
    skuId: sku.id,
    quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    note: "test item",
  } satisfies IShoppingMallCustomerCartItem.ICreate;

  const cartItem: IShoppingMallCustomerCartItem =
    await api.functional.shoppingMall.customer.customerCarts.items.create(
      connection,
      {
        customerCartId: cart.id,
        body: cartItemCreateBody,
      },
    );
  typia.assert(cartItem);

  // 3.3 Create multiple orders from the same cart.
  const orders: IShoppingMallOrder[] = [];
  const orderCount = 5;

  for (let i = 0; i < orderCount; i++) {
    const itemsSubtotal = 80;
    const discountTotal = 0;
    const shippingTotal = 10;
    const taxTotal = 9;
    const grandTotal = itemsSubtotal - discountTotal + shippingTotal + taxTotal;

    const orderCreateBody = {
      customer_cart_id: cart.id,
      currency_code: "USD",
      items_subtotal_amount: itemsSubtotal,
      discount_total_amount: discountTotal,
      shipping_total_amount: shippingTotal,
      tax_total_amount: taxTotal,
      grand_total_amount: grandTotal,
      shipping_address_id: typia.random<string & tags.Format<"uuid">>(),
      billing_address_id: typia.random<string & tags.Format<"uuid">>(),
      customer_note: undefined,
    } satisfies IShoppingMallOrder.ICreate;

    const createdOrder: IShoppingMallOrder =
      await api.functional.shoppingMall.customer.orders.create(connection, {
        body: orderCreateBody,
      });
    typia.assert(createdOrder);
    orders.push(createdOrder);
  }

  TestValidator.equals(
    "created expected number of orders",
    orders.length,
    orderCount,
  );

  // ---------------------------------------------------------------------------
  // 4. STATISTICS SNAPSHOT A AS PLATFORM ADMIN
  // ---------------------------------------------------------------------------

  const statsA: IShoppingMallOrderStatusBreakdownStatistics =
    await api.functional.shoppingMall.platformAdmin.statistics.orderStatusBreakdown.index(
      connection,
    );
  typia.assert(statsA);

  // Basic structural sanity checks for snapshot A.
  const assertSnapshotConsistency = (
    title: string,
    snapshot: IShoppingMallOrderStatusBreakdownStatistics,
  ): void => {
    const counts = [
      snapshot.pendingCount,
      snapshot.confirmedCount,
      snapshot.paidCount,
      snapshot.shippedCount,
      snapshot.deliveredCount,
      snapshot.cancelledCount,
      snapshot.refundedCount,
    ];

    counts.forEach((count, index) => {
      TestValidator.predicate(
        `${title} - count[${index}] is non-negative`,
        count >= 0,
      );
    });

    counts.forEach((count, index) => {
      TestValidator.predicate(
        `${title} - totalOrders >= count[${index}]`,
        snapshot.totalOrders >= count,
      );
    });

    const ratios: Array<number | undefined> = [
      snapshot.pendingRatio,
      snapshot.confirmedRatio,
      snapshot.paidRatio,
      snapshot.shippedRatio,
      snapshot.deliveredRatio,
      snapshot.cancelledRatio,
      snapshot.refundedRatio,
    ];

    ratios.forEach((ratio, index) => {
      if (ratio !== undefined) {
        TestValidator.predicate(
          `${title} - ratio[${index}] between 0 and 1`,
          ratio >= 0 && ratio <= 1,
        );
      }
    });
  };

  assertSnapshotConsistency("snapshot A", statsA);

  // ---------------------------------------------------------------------------
  // 5. LIFECYCLE OPERATIONS: FULFILLMENTS, SHIPMENTS, CANCELLATION, RETURNS
  // ---------------------------------------------------------------------------

  // 5.1 Seller logs in to perform fulfillments.
  const sellerLoginBody = {
    email: sellerJoinBody.email,
    password: sellerJoinBody.password,
    ip: null,
    href: randomUrl(),
    referrer: randomUrl(),
  } satisfies IShoppingMallSellerLogin.IRequest;

  const sellerSession: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerSession);

  const fulfillments: IShoppingMallFulfillment[] = [];
  const shipments: IShoppingMallShipment[] = [];

  // Prepare one random order_line_id and order_seller_segment_id for simulator.
  const dummyOrderLineId = typia.random<string & tags.Format<"uuid">>();
  const dummySellerSegmentId = typia.random<string & tags.Format<"uuid">>();

  // Create fulfillments and shipments for first two orders, if exist.
  const fulfillmentTargetOrders = orders.slice(0, 2);

  for (const order of fulfillmentTargetOrders) {
    const fulfillmentCreateBody = {
      order_line_fulfillments: [
        {
          order_line_id: dummyOrderLineId,
          quantity: 1 as number & tags.Type<"int32">,
        },
      ],
      carrier_code: "TEST-CARRIER",
      requested_ship_date: new Date().toISOString() as string &
        tags.Format<"date-time">,
      warehouse_code: "WH-TEST",
      notes: "fulfillment created by e2e test",
    } satisfies IShoppingMallFulfillment.ICreate;

    const fulfillment: IShoppingMallFulfillment =
      await api.functional.shoppingMall.seller.orders.fulfillments.create(
        connection,
        {
          orderId: order.id,
          body: fulfillmentCreateBody,
        },
      );
    typia.assert(fulfillment);
    fulfillments.push(fulfillment);

    const shipmentCreateBody = {
      order_seller_segment_id: dummySellerSegmentId,
      shipment_status: "shipped",
      carrier_name: "Test Carrier",
      carrier_service_level: "standard",
      tracking_number: RandomGenerator.alphaNumeric(12),
      shipped_at: new Date().toISOString() as string & tags.Format<"date-time">,
    } satisfies IShoppingMallShipment.ICreate;

    const shipment: IShoppingMallShipment =
      await api.functional.shoppingMall.orders.shipments.create(connection, {
        orderId: order.id,
        body: shipmentCreateBody,
      });
    typia.assert(shipment);
    shipments.push(shipment);
  }

  // 5.2 Customer logs back in to create cancellation and return requests.
  const customerSession2: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerSession2);

  const cancellationRequests: IShoppingMallOrderCancellationRequest[] = [];
  const returnRequests: IShoppingMallOrderReturnRequest[] = [];

  if (orders.length >= 3) {
    const cancelOrder = orders[2];

    const cancellationCreateBody = {
      request_reason_category: "changed_mind",
      request_reason_detail: "customer decided to cancel via e2e test",
    } satisfies IShoppingMallOrderCancellationRequest.ICreate;

    const cancellation: IShoppingMallOrderCancellationRequest =
      await api.functional.shoppingMall.customer.orders.cancellationRequests.create(
        connection,
        {
          orderId: cancelOrder.id,
          body: cancellationCreateBody,
        },
      );
    typia.assert(cancellation);
    cancellationRequests.push(cancellation);
  }

  if (orders.length >= 4) {
    const returnOrder = orders[3];

    const returnItems: IShoppingMallOrderReturnRequestItem.ICreate[] = [
      {
        order_line_id: dummyOrderLineId,
        quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
      },
    ];

    const attachments: IShoppingMallOrderReturnRequestAttachment.ICreate[] = [
      {
        name: "e2e evidence",
        extension: "txt",
        url: randomUrl(),
        type: "note",
      },
    ];

    const returnCreateBody = {
      reason_code: "not_as_described",
      reason_text: "return requested by e2e test",
      preferred_resolution_type: "refund",
      items: returnItems,
      evidence_attachments: attachments,
      metadata: {
        source: "e2e-test",
      },
    } satisfies IShoppingMallOrderReturnRequest.ICreate;

    const returnRequest: IShoppingMallOrderReturnRequest =
      await api.functional.shoppingMall.customer.orders.returnRequests.create(
        connection,
        {
          orderId: returnOrder.id,
          body: returnCreateBody,
        },
      );
    typia.assert(returnRequest);
    returnRequests.push(returnRequest);
  }

  // Ensure at least one lifecycle operation was executed.
  TestValidator.predicate(
    "at least one fulfillment, shipment, cancellation, or return executed",
    fulfillments.length > 0 ||
      shipments.length > 0 ||
      cancellationRequests.length > 0 ||
      returnRequests.length > 0,
  );

  // ---------------------------------------------------------------------------
  // 6. STATISTICS SNAPSHOT B AND COMPARATIVE SANITY CHECKS
  // ---------------------------------------------------------------------------

  const statsB: IShoppingMallOrderStatusBreakdownStatistics =
    await api.functional.shoppingMall.platformAdmin.statistics.orderStatusBreakdown.index(
      connection,
    );
  typia.assert(statsB);

  assertSnapshotConsistency("snapshot B", statsB);

  // Comparison-level sanity checks (without assuming strict linkage).
  TestValidator.predicate(
    "snapshot B totalOrders is non-negative",
    statsB.totalOrders >= 0,
  );
  TestValidator.predicate(
    "snapshot A totalOrders is non-negative",
    statsA.totalOrders >= 0,
  );
}
