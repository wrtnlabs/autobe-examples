import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAnalyticsTimeRange } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAnalyticsTimeRange";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallCategoryTree } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategoryTree";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";
import type { IShoppingMallCustomerCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCart";
import type { IShoppingMallCustomerCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCartItem";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderLineThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderLineThumbnail";
import type { IShoppingMallPaymentAuthorization } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentAuthorization";
import type { IShoppingMallPaymentCapture } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentCapture";
import type { IShoppingMallPaymentChargeback } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentChargeback";
import type { IShoppingMallPaymentFunnelAnalytics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentFunnelAnalytics";
import type { IShoppingMallPaymentFunnelAnalyticsItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentFunnelAnalyticsItem";
import type { IShoppingMallPaymentFunnelOrderFilter } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentFunnelOrderFilter";
import type { IShoppingMallPaymentFunnelPaymentFilter } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentFunnelPaymentFilter";
import type { IShoppingMallPaymentFunnelSegmentAnalytics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentFunnelSegmentAnalytics";
import type { IShoppingMallPaymentFunnelSegmentKey } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentFunnelSegmentKey";
import type { IShoppingMallPaymentFunnelSegmentationDimension } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentFunnelSegmentationDimension";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import type { IShoppingMallPaymentTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentTransaction";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallRefundTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundTransaction";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

export async function test_api_payment_funnel_segmented_by_payment_method(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a platform admin (join handles token header)
  const platformAdminJoinBody = {
    email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  const platformAdminEmail = platformAdminAuthorized.email;
  const platformAdminPassword = platformAdminJoinBody.password;

  // 2. As platformAdmin, create catalog basics: categoryTree, brand, product, sku
  const categoryTreeBody = {
    code: `tree-${RandomGenerator.alphaNumeric(6)}`,
    name: "Main Catalog Tree",
    description: RandomGenerator.paragraph({ sentences: 3 }),
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
    slug: `brand-${RandomGenerator.alphaNumeric(6)}`,
    description: RandomGenerator.paragraph({ sentences: 2 }),
    logo_uri: "https://cdn.example.com/logo.png",
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert(brand);

  // Product must belong to some seller; for this test we assume there is a
  // bootstrap seller id available from configuration or fixtures.
  // To keep the test compilable, we use a random UUID as seller id and rely on
  // simulation/seed data in the environment to provide a matching seller.
  const sellerIdForProduct: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const productCode = `prod-${RandomGenerator.alphaNumeric(6)}`;

  const productBody = {
    shopping_mall_seller_id: sellerIdForProduct,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: "Test Product",
    short_description: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: "https://cdn.example.com/product.png",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      { body: productBody },
    );
  typia.assert(product);

  const skuBody = {
    code: `sku-${RandomGenerator.alphaNumeric(6)}`,
    name: "Default SKU",
    listPrice: 100,
    salePrice: 100,
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

  // 3. Create a customer and authenticate
  const customerJoinBody = {
    email: `customer+${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    ip: null,
    href: "https://shop.example.com/signup",
    referrer: "https://shop.example.com/landing",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  // 4. As that customer, create two carts
  const cartBodyBase = {
    currency_code: "USD",
    region_code: "US",
    channel: "web",
    metadata: {
      source: "test-e2e",
    },
    is_active: true,
    source_guest_token: undefined,
  } satisfies IShoppingMallCustomerCart.ICreate;

  const cartA: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.customerCarts.create(
      connection,
      { body: cartBodyBase },
    );
  typia.assert(cartA);

  const cartB: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.customerCarts.create(
      connection,
      { body: cartBodyBase },
    );
  typia.assert(cartB);

  // Add same SKU to each cart
  const cartItemBodyA = {
    skuId: sku.id,
    quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    note: "Order A item",
  } satisfies IShoppingMallCustomerCartItem.ICreate;

  const itemA: IShoppingMallCustomerCartItem =
    await api.functional.shoppingMall.customer.customerCarts.items.create(
      connection,
      {
        customerCartId: cartA.id,
        body: cartItemBodyA,
      },
    );
  typia.assert(itemA);

  const cartItemBodyB = {
    skuId: sku.id,
    quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    note: "Order B item",
  } satisfies IShoppingMallCustomerCartItem.ICreate;

  const itemB: IShoppingMallCustomerCartItem =
    await api.functional.shoppingMall.customer.customerCarts.items.create(
      connection,
      {
        customerCartId: cartB.id,
        body: cartItemBodyB,
      },
    );
  typia.assert(itemB);

  // For simplicity, derive order monetary snapshots from a fixed price
  const unitPrice = 100;
  const itemsSubtotal = unitPrice;
  const discountTotal = 0;
  const shippingTotal = 0;
  const taxTotal = 0;
  const grandTotal = itemsSubtotal - discountTotal + shippingTotal + taxTotal;

  const shippingAddressId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const billingAddressId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const orderABody = {
    customer_cart_id: cartA.id,
    currency_code: "USD",
    items_subtotal_amount: itemsSubtotal,
    discount_total_amount: discountTotal,
    shipping_total_amount: shippingTotal,
    tax_total_amount: taxTotal,
    grand_total_amount: grandTotal,
    shipping_address_id: shippingAddressId,
    billing_address_id: billingAddressId,
    customer_note: "Order A",
  } satisfies IShoppingMallOrder.ICreate;

  const orderA: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderABody,
    });
  typia.assert(orderA);

  const orderBBody = {
    customer_cart_id: cartB.id,
    currency_code: "USD",
    items_subtotal_amount: itemsSubtotal,
    discount_total_amount: discountTotal,
    shipping_total_amount: shippingTotal,
    tax_total_amount: taxTotal,
    grand_total_amount: grandTotal,
    shipping_address_id: shippingAddressId,
    billing_address_id: billingAddressId,
    customer_note: "Order B",
  } satisfies IShoppingMallOrder.ICreate;

  const orderB: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderBBody,
    });
  typia.assert(orderB);

  // 5. Switch back to platformAdmin (login) to perform payment operations
  const platformAdminLoginBody = {
    email: platformAdminEmail,
    password: platformAdminPassword,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const platformAdminAuthorizedLoggedIn: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminAuthorizedLoggedIn);

  // 6. Create two distinct payment methods
  const method1Code = `card-${RandomGenerator.alphaNumeric(4)}`;
  const method2Code = `bank-${RandomGenerator.alphaNumeric(4)}`;

  const paymentMethodBody1 = {
    code: method1Code,
    display_name: "Credit Card",
    description: "Test Card Method",
    provider_key: "test-gateway-card",
    method_type: "card",
    currency_restriction: null,
    min_amount: null,
    max_amount: null,
    priority: 1 as number & tags.Type<"int32">,
    is_active: true,
    starts_at: null,
    ends_at: null,
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const paymentMethod1: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.platformAdmin.paymentMethods.create(
      connection,
      { body: paymentMethodBody1 },
    );
  typia.assert(paymentMethod1);

  const paymentMethodBody2 = {
    code: method2Code,
    display_name: "Bank Transfer",
    description: "Test Bank Transfer Method",
    provider_key: "test-gateway-bank",
    method_type: "bank",
    currency_restriction: null,
    min_amount: null,
    max_amount: null,
    priority: 2 as number & tags.Type<"int32">,
    is_active: true,
    starts_at: null,
    ends_at: null,
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const paymentMethod2: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.platformAdmin.paymentMethods.create(
      connection,
      { body: paymentMethodBody2 },
    );
  typia.assert(paymentMethod2);

  // 7. Create one payment transaction per order, each tied to different method
  const paymentTransactionBodyA = {
    orderId: orderA.id,
    customerId: orderA.customer_id,
    paymentMethodId: paymentMethod1.id,
    paymentIntentKey: null,
    providerName: "test-gateway-card",
    providerTransactionId: null,
    currency: orderA.currency_code as string &
      tags.MinLength<3> &
      tags.MaxLength<3>,
    authorizedAmount: grandTotal,
    capturedAmount: null,
    paymentStatus: "payment_authorized",
    providerStatus: null,
    failureReasonCode: null,
    failureReasonMessage: null,
    requiresManualReview: false,
    metadataJson: null,
  } satisfies IShoppingMallPaymentTransaction.ICreate;

  const paymentTransactionA: IShoppingMallPaymentTransaction =
    await api.functional.shoppingMall.platformAdmin.paymentTransactions.create(
      connection,
      { body: paymentTransactionBodyA },
    );
  typia.assert(paymentTransactionA);

  const paymentTransactionBodyB = {
    orderId: orderB.id,
    customerId: orderB.customer_id,
    paymentMethodId: paymentMethod2.id,
    paymentIntentKey: null,
    providerName: "test-gateway-bank",
    providerTransactionId: null,
    currency: orderB.currency_code as string &
      tags.MinLength<3> &
      tags.MaxLength<3>,
    authorizedAmount: grandTotal,
    capturedAmount: null,
    paymentStatus: "payment_authorized",
    providerStatus: null,
    failureReasonCode: null,
    failureReasonMessage: null,
    requiresManualReview: false,
    metadataJson: null,
  } satisfies IShoppingMallPaymentTransaction.ICreate;

  const paymentTransactionB: IShoppingMallPaymentTransaction =
    await api.functional.shoppingMall.platformAdmin.paymentTransactions.create(
      connection,
      { body: paymentTransactionBodyB },
    );
  typia.assert(paymentTransactionB);

  // 8. For each payment transaction, create authorization and capture
  const authorizationBodyA = {
    amount: grandTotal,
    currency: paymentTransactionA.currency,
    gateway_code: "test-gateway-card",
    gateway_authorization_id: `auth-${RandomGenerator.alphaNumeric(8)}`,
    channel: "web",
    risk_metadata: {},
  } satisfies IShoppingMallPaymentAuthorization.ICreate;

  const authorizationA: IShoppingMallPaymentAuthorization =
    await api.functional.shoppingMall.platformAdmin.paymentTransactions.authorizations.create(
      connection,
      {
        paymentTransactionId: paymentTransactionA.id,
        body: authorizationBodyA,
      },
    );
  typia.assert(authorizationA);

  const captureBodyA = {
    shopping_mall_payment_authorization_id: authorizationA.id,
    provider_capture_id: `cap-${RandomGenerator.alphaNumeric(8)}`,
    amount: grandTotal,
    currency: paymentTransactionA.currency,
    capture_status: "capture_succeeded",
    provider_status: "succeeded",
    failure_reason_code: null,
    failure_reason_message: null,
  } satisfies IShoppingMallPaymentCapture.ICreate;

  const captureA: IShoppingMallPaymentCapture =
    await api.functional.shoppingMall.platformAdmin.paymentTransactions.captures.create(
      connection,
      {
        paymentTransactionId: paymentTransactionA.id,
        body: captureBodyA,
      },
    );
  typia.assert(captureA);

  const authorizationBodyB = {
    amount: grandTotal,
    currency: paymentTransactionB.currency,
    gateway_code: "test-gateway-bank",
    gateway_authorization_id: `auth-${RandomGenerator.alphaNumeric(8)}`,
    channel: "web",
    risk_metadata: {},
  } satisfies IShoppingMallPaymentAuthorization.ICreate;

  const authorizationB: IShoppingMallPaymentAuthorization =
    await api.functional.shoppingMall.platformAdmin.paymentTransactions.authorizations.create(
      connection,
      {
        paymentTransactionId: paymentTransactionB.id,
        body: authorizationBodyB,
      },
    );
  typia.assert(authorizationB);

  const captureBodyB = {
    shopping_mall_payment_authorization_id: authorizationB.id,
    provider_capture_id: `cap-${RandomGenerator.alphaNumeric(8)}`,
    amount: grandTotal,
    currency: paymentTransactionB.currency,
    capture_status: "capture_succeeded",
    provider_status: "succeeded",
    failure_reason_code: null,
    failure_reason_message: null,
  } satisfies IShoppingMallPaymentCapture.ICreate;

  const captureB: IShoppingMallPaymentCapture =
    await api.functional.shoppingMall.platformAdmin.paymentTransactions.captures.create(
      connection,
      {
        paymentTransactionId: paymentTransactionB.id,
        body: captureBodyB,
      },
    );
  typia.assert(captureB);

  // 9. Create refund and chargeback only for method 1 (transaction A)
  const refundAmount = grandTotal / 2;

  const refundBody = {
    shopping_mall_payment_transaction_id: paymentTransactionA.id,
    shopping_mall_order_id: orderA.id,
    refund_number: `RF-${RandomGenerator.alphaNumeric(6)}`,
    refund_status: "refund_completed",
    actor_type: "admin",
    reason_category: "test_refund",
    reason_message: "Test refund for analytics",
    requested_amount: refundAmount,
    approved_amount: refundAmount,
    refunded_amount: refundAmount,
    currency: paymentTransactionA.currency,
    provider_refund_id: `pr-${RandomGenerator.alphaNumeric(6)}`,
    provider_status: "succeeded",
    failure_reason_code: null,
    failure_reason_message: null,
  } satisfies IShoppingMallRefundTransaction.ICreate;

  const refundTx: IShoppingMallRefundTransaction =
    await api.functional.shoppingMall.refundTransactions.create(connection, {
      body: refundBody,
    });
  typia.assert(refundTx);

  const chargebackAmount = grandTotal / 4;

  const chargebackBody = {
    paymentTransactionId: paymentTransactionA.id,
    orderId: orderA.id,
    caseReference: `CB-${RandomGenerator.alphaNumeric(6)}`,
    providerCaseId: `cb-${RandomGenerator.alphaNumeric(6)}`,
    disputedAmount: chargebackAmount as number & tags.Minimum<0>,
    currency: paymentTransactionA.currency,
    status: "chargeback_open",
    reasonCode: "test_chargeback",
    reasonMessage: "Test chargeback for analytics",
    openedAt: new Date().toISOString(),
  } satisfies IShoppingMallPaymentChargeback.ICreate;

  const chargeback: IShoppingMallPaymentChargeback =
    await api.functional.shoppingMall.platformAdmin.paymentChargebacks.create(
      connection,
      { body: chargebackBody },
    );
  typia.assert(chargeback);

  // 10. Call analytics endpoint with segmentation by paymentMethod
  const now = new Date();
  const start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const end = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const timeRange: IShoppingMallAnalyticsTimeRange = {
    start: start.toISOString() as string & tags.Format<"date-time">,
    end: end.toISOString() as string & tags.Format<"date-time">,
  };

  const analyticsRequestBody = {
    timeRange,
    segmentations: [
      "paymentMethod" as IShoppingMallPaymentFunnelSegmentationDimension,
    ],
    orderFilters: undefined,
    paymentFilters: undefined,
    maxSegmentCount: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IShoppingMallPaymentFunnelAnalytics.IRequest;

  const analytics: IShoppingMallPaymentFunnelAnalytics =
    await api.functional.shoppingMall.platformAdmin.analytics.payment_funnel.index(
      connection,
      { body: analyticsRequestBody },
    );
  typia.assert(analytics);

  // 11. Validate overall metrics and segments
  const overall: IShoppingMallPaymentFunnelAnalyticsItem = analytics.overall;

  TestValidator.predicate(
    "overall ordersCreatedCount should be at least 2",
    overall.ordersCreatedCount >= 2,
  );

  TestValidator.predicate(
    "overall paymentsInitiatedCount should be at least 2",
    overall.paymentsInitiatedCount >= 2,
  );

  TestValidator.predicate(
    "overall capturesCompletedCount should be at least 2",
    overall.capturesCompletedCount >= 2,
  );

  TestValidator.predicate(
    "overall capturedTotalAmount should be at least sum of grand totals",
    overall.capturedTotalAmount >= grandTotal * 2,
  );

  const segments: IShoppingMallPaymentFunnelSegmentAnalytics[] =
    analytics.segments ?? [];

  TestValidator.predicate(
    "segments should contain at least two entries",
    segments.length >= 2,
  );

  const segmentByCode: Record<
    string,
    IShoppingMallPaymentFunnelSegmentAnalytics
  > = {};
  for (const seg of segments) {
    const key: IShoppingMallPaymentFunnelSegmentKey = seg.segment;
    if (key.paymentMethodCode !== undefined) {
      segmentByCode[key.paymentMethodCode] = seg;
    }
  }

  const method1Segment = segmentByCode[method1Code];
  const method2Segment = segmentByCode[method2Code];

  TestValidator.predicate("segment for method1 should exist", !!method1Segment);
  TestValidator.predicate("segment for method2 should exist", !!method2Segment);

  if (method1Segment && method2Segment) {
    const m1 = method1Segment.metrics;
    const m2 = method2Segment.metrics;

    // Method1 metrics should reflect refund and chargeback
    TestValidator.predicate(
      "method1 capturedTotalAmount should be >= grandTotal",
      m1.capturedTotalAmount >= grandTotal,
    );
    TestValidator.predicate(
      "method1 refundedTotalAmount should be >= refundAmount",
      m1.refundedTotalAmount >= refundAmount,
    );
    TestValidator.predicate(
      "method1 chargebackTotalAmount should be >= chargebackAmount",
      m1.chargebackTotalAmount >= chargebackAmount,
    );

    // Method2 should have captures but no refunds/chargebacks
    TestValidator.predicate(
      "method2 capturedTotalAmount should be >= grandTotal",
      m2.capturedTotalAmount >= grandTotal,
    );
    TestValidator.predicate(
      "method2 refundedTotalAmount should be 0",
      m2.refundedTotalAmount === 0,
    );
    TestValidator.predicate(
      "method2 chargebackTotalAmount should be 0",
      m2.chargebackTotalAmount === 0,
    );

    // Conversion rates are in [0,1]
    const rates: number[] = [
      m1.orderToPaymentConversionRate,
      m1.paymentToAuthorizationConversionRate,
      m1.authorizationToCaptureConversionRate,
      m2.orderToPaymentConversionRate,
      m2.paymentToAuthorizationConversionRate,
      m2.authorizationToCaptureConversionRate,
    ];

    for (const rate of rates) {
      TestValidator.predicate(
        "conversion rates must be within [0,1]",
        rate >= 0 && rate <= 1,
      );
    }
  }
}
