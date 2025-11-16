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

export async function test_api_order_status_breakdown_basic_distribution(
  connection: api.IConnection,
) {
  // 1. Register and authenticate platform admin (join)
  const platformAdminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: "127.0.0.1",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  // SDK already set Authorization header for platformAdmin

  // 2. Register customer (join) and keep their email/password for later login
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(12);

  const customerJoinBody = {
    email: customerEmail,
    password: customerPassword,
    name: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://shop.example.com/join",
    referrer: "https://shop.example.com/",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  // 3. Register seller and then login as seller when needed
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(12);

  const sellerJoinBody = {
    email: sellerEmail,
    password: sellerPassword,
    storeName: RandomGenerator.name(1),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  // 4. As platform admin, create category tree and brand and product & SKU
  // (platform admin is currently authenticated from step 1)

  const categoryTreeBody = {
    code: `tree-${RandomGenerator.alphaNumeric(8)}`,
    name: "Main Catalog",
    description: RandomGenerator.paragraph({ sentences: 3 }),
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
    slug: `brand-${RandomGenerator.alphaNumeric(6)}`,
    description: RandomGenerator.paragraph({ sentences: 2 }),
    logo_uri: "https://cdn.example.com/logo.png" as string & tags.Format<"uri">,
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert(brand);

  const productCode = `prod-${RandomGenerator.alphaNumeric(8)}`;

  const productBody = {
    shopping_mall_seller_id: sellerAuthorized.id,
    shopping_mall_brand_id: brand.id,
    code: productCode as string & tags.MinLength<1>,
    name: "Test Product" as string & tags.MinLength<1>,
    short_description: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: true,
    primary_image_uri: "https://cdn.example.com/product-primary.png" as string &
      tags.Format<"uri">,
    additional_data: undefined,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      {
        body: productBody,
      },
    );
  typia.assert(product);

  const skuCode = `sku-${RandomGenerator.alphaNumeric(8)}`;

  const skuBody = {
    code: skuCode,
    name: "Default Variant",
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
        body: skuBody,
      },
    );
  typia.assert(sku);

  // 5. Login as customer (to ensure customer token is active)
  const customerLoginBody = {
    email: customerEmail,
    password: customerPassword,
    ip: "127.0.0.1",
    href: "https://shop.example.com/login",
    referrer: "https://shop.example.com/",
    userAgent: "E2E-Test-Agent",
  } satisfies IShoppingMallCustomerAuth.ILogin;

  const customerLogin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLogin);

  // 6. Create a customer cart and add an item with the SKU
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
      {
        body: cartBody,
      },
    );
  typia.assert(cart);

  const cartItemBody = {
    skuId: sku.id,
    quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    note: "test line",
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

  // 7. Create multiple orders from the same cart snapshot
  const orders: IShoppingMallOrder[] = [];
  const orderCount = 3;

  for (let i = 0; i < orderCount; i += 1) {
    const baseAmount = 80;
    const shippingAmount = 10;
    const taxAmount = 8;

    const orderCreateBody = {
      customer_cart_id: cart.id,
      currency_code: cart.currency_code,
      items_subtotal_amount: baseAmount,
      discount_total_amount: 0,
      shipping_total_amount: shippingAmount,
      tax_total_amount: taxAmount,
      grand_total_amount: baseAmount + shippingAmount + taxAmount,
      shipping_address_id: typia.random<string & tags.Format<"uuid">>(),
      billing_address_id: typia.random<string & tags.Format<"uuid">>(),
      customer_note: i === 0 ? "basic order" : undefined,
    } satisfies IShoppingMallOrder.ICreate;

    const createdOrder: IShoppingMallOrder =
      await api.functional.shoppingMall.customer.orders.create(connection, {
        body: orderCreateBody,
      });
    typia.assert(createdOrder);
    orders.push(createdOrder);
  }

  // 8. For one order, create a cancellation request; for another, create a return request
  const [orderForCancel, orderForReturn, orderForShip] = orders;

  const cancellationBody = {
    request_reason_category: "customer_changed_mind",
    request_reason_detail: "E2E test cancellation",
  } satisfies IShoppingMallOrderCancellationRequest.ICreate;

  const cancellationRequest: IShoppingMallOrderCancellationRequest =
    await api.functional.shoppingMall.customer.orders.cancellationRequests.create(
      connection,
      {
        orderId: orderForCancel.id,
        body: cancellationBody,
      },
    );
  typia.assert(cancellationRequest);

  const returnRequestBody = {
    reason_code: "test_reason",
    reason_text: "E2E test return",
    preferred_resolution_type: "refund" as string & tags.MinLength<1>,
    items: [
      {
        order_line_id: typia.random<string & tags.Format<"uuid">>(),
        quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
      },
    ],
    evidence_attachments: [
      {
        name: "photo" as string & tags.MinLength<1>,
        extension: "png" as string & tags.MinLength<1>,
        url: "https://cdn.example.com/evidence.png" as string &
          tags.Format<"uri">,
        type: "product_photo",
      },
    ],
    metadata: {
      purpose: "e2e",
    },
  } satisfies IShoppingMallOrderReturnRequest.ICreate;

  const returnRequest: IShoppingMallOrderReturnRequest =
    await api.functional.shoppingMall.customer.orders.returnRequests.create(
      connection,
      {
        orderId: orderForReturn.id,
        body: returnRequestBody,
      },
    );
  typia.assert(returnRequest);

  // 9. As seller, create a fulfillment and shipment for the third order
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: "127.0.0.1",
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/",
  } satisfies IShoppingMallSellerLogin.IRequest;

  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLogin);

  const fulfillmentBody = {
    order_line_fulfillments: [
      {
        order_line_id: typia.random<string & tags.Format<"uuid">>(),
        quantity: 1 as number & tags.Type<"int32">,
      },
    ],
    carrier_code: "UPS",
    requested_ship_date: new Date().toISOString(),
    warehouse_code: "WH-1",
    notes: "E2E fulfillment",
  } satisfies IShoppingMallFulfillment.ICreate;

  const fulfillment: IShoppingMallFulfillment =
    await api.functional.shoppingMall.seller.orders.fulfillments.create(
      connection,
      {
        orderId: orderForShip.id,
        body: fulfillmentBody,
      },
    );
  typia.assert(fulfillment);

  const shipmentBody = {
    order_seller_segment_id: typia.random<string & tags.Format<"uuid">>(),
    shipment_status: "shipped",
    carrier_name: "UPS",
    carrier_service_level: "ground",
    tracking_number: RandomGenerator.alphaNumeric(12),
    shipped_at: new Date().toISOString(),
  } satisfies IShoppingMallShipment.ICreate;

  const shipment: IShoppingMallShipment =
    await api.functional.shoppingMall.orders.shipments.create(connection, {
      orderId: orderForShip.id,
      body: shipmentBody,
    });
  typia.assert(shipment);

  // 10. Switch back to platform admin to query statistics
  const platformAdminLoginBody = {
    email: platformAdmin.email,
    password: platformAdminJoinBody.password,
    ip: "127.0.0.1",
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const platformAdminLogin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLogin);

  // 11. Call statistics endpoint and validate breakdown
  const stats: IShoppingMallOrderStatusBreakdownStatistics =
    await api.functional.shoppingMall.platformAdmin.statistics.orderStatusBreakdown.index(
      connection,
    );
  typia.assert(stats);

  const createdOrdersCount = orders.length;

  TestValidator.predicate(
    "totalOrders is non-negative",
    stats.totalOrders >= 0,
  );

  TestValidator.predicate(
    "totalOrders is at least number of created orders (monotonic)",
    stats.totalOrders >= createdOrdersCount,
  );

  const counts = [
    stats.pendingCount,
    stats.confirmedCount,
    stats.paidCount,
    stats.shippedCount,
    stats.deliveredCount,
    stats.cancelledCount,
    stats.refundedCount,
  ];

  TestValidator.predicate(
    "all status counts are non-negative",
    counts.every((c) => c >= 0),
  );

  const sumCounts = counts.reduce((a, b) => a + b, 0);

  TestValidator.predicate(
    "sum of status counts is at least totalOrders (coarse sanity)",
    stats.totalOrders === 0 ? sumCounts >= 0 : sumCounts >= stats.totalOrders,
  );

  // Validate ratio fields are between 0 and 1 when defined
  const ratios: Array<number | undefined> = [
    stats.pendingRatio,
    stats.confirmedRatio,
    stats.paidRatio,
    stats.shippedRatio,
    stats.deliveredRatio,
    stats.cancelledRatio,
    stats.refundedRatio,
  ];

  ratios.forEach((r, index) => {
    if (r !== undefined) {
      TestValidator.predicate(
        `ratio[${index}] is between 0 and 1`,
        r >= 0 && r <= 1,
      );
    }
  });
}
