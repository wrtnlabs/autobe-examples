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

/**
 * Validate payment funnel analytics for a single complete payment lifecycle.
 *
 * Business flow:
 *
 * 1. Platform admin joins and becomes authenticated.
 * 2. Admin creates category tree, brand, product, and SKU to have a sellable item.
 * 3. Customer joins and logs in, then creates a cart.
 * 4. Customer adds the SKU as a single cart item and creates an order from that
 *    cart with consistent monetary snapshots.
 * 5. Admin creates a payment method and a payment transaction for that order.
 * 6. Admin records one authorization and one capture for the full order amount.
 * 7. Admin records one refund and one chargeback with partial amounts.
 * 8. Admin invokes payment funnel analytics over a time range covering the whole
 *    flow.
 * 9. The test asserts that overall analytics counts and monetary totals reflect
 *    exactly this one flow and that conversion rates are all 1.0.
 */
export async function test_api_payment_funnel_overall_performance_for_single_payment_flow(
  connection: api.IConnection,
) {
  // 1. Platform admin join (auto-login through SDK behavior)
  const platformAdminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(2),
    password: RandomGenerator.alphabets(12),
    ip: "127.0.0.1",
    href: "https://admin.shopping-mall.test/join",
    referrer: "https://admin.shopping-mall.test/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  const analyticsStartTime: string & tags.Format<"date-time"> =
    platformAdminAuthorized.createdAt;

  // 2. Admin creates category tree
  const categoryTreeCreateBody = {
    code: `tree-${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;

  const categoryTree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      { body: categoryTreeCreateBody },
    );
  typia.assert(categoryTree);

  // 2-2. Admin creates brand
  const brandCreateBody = {
    name: RandomGenerator.name(1),
    slug: RandomGenerator.alphaNumeric(10),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    logo_uri: "https://cdn.shopping-mall.test/logo.png",
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  // 2-3. Admin creates product. Seller id is generated to satisfy type.
  const productSellerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const productCode = `prd-${RandomGenerator.alphaNumeric(8)}`;
  const productCreateBody = {
    shopping_mall_seller_id: productSellerId,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: RandomGenerator.name(3),
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: "https://cdn.shopping-mall.test/product.png",
    additional_data: undefined,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      { body: productCreateBody },
    );
  typia.assert(product);

  // 2-4. Admin creates SKU under this product
  const skuCurrency = "USD";
  const skuListPrice = 100;
  const skuSalePrice = 80;

  const skuCreateBody = {
    code: `sku-${RandomGenerator.alphaNumeric(6)}`,
    name: RandomGenerator.name(2),
    listPrice: skuListPrice,
    salePrice: skuSalePrice,
    currency: skuCurrency,
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

  // 3. Customer join and login
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12),
    name: RandomGenerator.name(2),
    ip: "127.0.0.1",
    href: "https://shopping-mall.test/join",
    referrer: "https://shopping-mall.test/landing",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  const customerLoginBody = {
    email: customerJoinBody.email,
    password: customerJoinBody.password,
    ip: "127.0.0.1",
    href: "https://shopping-mall.test/login",
    referrer: "https://shopping-mall.test/landing",
    userAgent: "E2E Test Agent",
  } satisfies IShoppingMallCustomerAuth.ILogin;

  const customerLoggedIn: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLoggedIn);

  // 4. Customer creates cart
  const cartCreateBody = {
    currency_code: skuCurrency,
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
      { body: cartCreateBody },
    );
  typia.assert(cart);

  // 4-2. Customer adds SKU as cart item
  const quantity: number & tags.Type<"int32"> & tags.Minimum<1> = 1 as number &
    tags.Type<"int32"> &
    tags.Minimum<1>;

  const cartItemCreateBody = {
    skuId: sku.id,
    quantity,
    note: "single-flow-item",
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

  // 4-3. Customer creates order from this cart
  const grandTotal = skuSalePrice * (quantity as number);
  const orderCreateBody = {
    customer_cart_id: cart.id,
    currency_code: skuCurrency,
    items_subtotal_amount: grandTotal,
    discount_total_amount: 0,
    shipping_total_amount: 0,
    tax_total_amount: 0,
    grand_total_amount: grandTotal,
    shipping_address_id: typia.random<string & tags.Format<"uuid">>(),
    billing_address_id: typia.random<string & tags.Format<"uuid">>(),
    customer_note: "single payment funnel order",
  } satisfies IShoppingMallOrder.ICreate;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateBody,
    });
  typia.assert(order);

  // 5. Switch back to platform admin: login with same admin credentials
  const platformAdminLoginBody = {
    email: platformAdminJoinBody.email,
    password: platformAdminJoinBody.password,
    ip: "127.0.0.1",
    href: "https://admin.shopping-mall.test/login",
    referrer: "https://admin.shopping-mall.test/landing",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const platformAdminLoggedIn: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoggedIn);

  // 5-1. Admin creates payment method
  const paymentMethodCode = `pm-${RandomGenerator.alphaNumeric(6)}`;
  const nowIso = new Date().toISOString() as string & tags.Format<"date-time">;

  const paymentMethodCreateBody = {
    code: paymentMethodCode,
    display_name: "Test Card",
    description: "E2E test payment method",
    provider_key: "test-gateway",
    method_type: "card",
    currency_restriction: null,
    min_amount: null,
    max_amount: null,
    priority: 1,
    is_active: true,
    starts_at: nowIso,
    ends_at: null,
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const paymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.platformAdmin.paymentMethods.create(
      connection,
      {
        body: paymentMethodCreateBody,
      },
    );
  typia.assert(paymentMethod);

  // 5-2. Admin creates payment transaction bound to the order
  const paymentTransactionCreateBody = {
    orderId: order.id,
    customerId: order.customer_id,
    paymentMethodId: paymentMethod.id,
    paymentIntentKey: undefined,
    providerName: "test-gateway",
    providerTransactionId: undefined,
    currency: skuCurrency as string & tags.MinLength<3> & tags.MaxLength<3>,
    authorizedAmount: null,
    capturedAmount: null,
    paymentStatus: "payment_pending",
    providerStatus: null,
    failureReasonCode: null,
    failureReasonMessage: null,
    requiresManualReview: null,
    metadataJson: null,
  } satisfies IShoppingMallPaymentTransaction.ICreate;

  const paymentTransaction: IShoppingMallPaymentTransaction =
    await api.functional.shoppingMall.platformAdmin.paymentTransactions.create(
      connection,
      {
        body: paymentTransactionCreateBody,
      },
    );
  typia.assert(paymentTransaction);

  // 6. Admin records one authorization for full amount
  const authorizationCreateBody = {
    amount: grandTotal,
    currency: skuCurrency,
    gateway_code: "test-gateway",
    gateway_authorization_id: `auth-${RandomGenerator.alphaNumeric(10)}`,
    channel: "web",
    risk_metadata: {},
  } satisfies IShoppingMallPaymentAuthorization.ICreate;

  const authorization: IShoppingMallPaymentAuthorization =
    await api.functional.shoppingMall.platformAdmin.paymentTransactions.authorizations.create(
      connection,
      {
        paymentTransactionId: paymentTransaction.id,
        body: authorizationCreateBody,
      },
    );
  typia.assert(authorization);

  // 7. Admin records one capture for same full amount
  const captureCreateBody = {
    shopping_mall_payment_authorization_id: authorization.id,
    provider_capture_id: `cap-${RandomGenerator.alphaNumeric(10)}`,
    amount: grandTotal,
    currency: skuCurrency,
    capture_status: "capture_succeeded",
    provider_status: null,
    failure_reason_code: null,
    failure_reason_message: null,
  } satisfies IShoppingMallPaymentCapture.ICreate;

  const capture: IShoppingMallPaymentCapture =
    await api.functional.shoppingMall.platformAdmin.paymentTransactions.captures.create(
      connection,
      {
        paymentTransactionId: paymentTransaction.id,
        body: captureCreateBody,
      },
    );
  typia.assert(capture);

  // 8. Admin records one refund transaction (partial: half)
  const refundAmount = grandTotal / 2;
  const refundCreateBody = {
    shopping_mall_payment_transaction_id: paymentTransaction.id,
    shopping_mall_order_id: order.id,
    refund_number: `rf-${RandomGenerator.alphaNumeric(8)}`,
    refund_status: "refund_pending",
    actor_type: "admin",
    reason_category: "e2e_test_refund",
    reason_message: "partial refund for e2e test",
    requested_amount: refundAmount,
    approved_amount: refundAmount,
    refunded_amount: 0,
    currency: skuCurrency,
    provider_refund_id: null,
    provider_status: null,
    failure_reason_code: null,
    failure_reason_message: null,
  } satisfies IShoppingMallRefundTransaction.ICreate;

  const refundTransaction: IShoppingMallRefundTransaction =
    await api.functional.shoppingMall.refundTransactions.create(connection, {
      body: refundCreateBody,
    });
  typia.assert(refundTransaction);

  // 9. Admin records one payment chargeback (partial: quarter)
  const chargebackAmount = grandTotal / 4;
  const chargebackOpenedAt: string & tags.Format<"date-time"> =
    new Date().toISOString() as string & tags.Format<"date-time">;

  const chargebackCreateBody = {
    paymentTransactionId: paymentTransaction.id,
    orderId: order.id,
    caseReference: `cb-${RandomGenerator.alphaNumeric(8)}`,
    providerCaseId: `provider-case-${RandomGenerator.alphaNumeric(6)}`,
    disputedAmount: chargebackAmount as number & tags.Minimum<0>,
    currency: skuCurrency,
    status: "chargeback_open",
    reasonCode: "e2e_test_chargeback",
    reasonMessage: "e2e test chargeback",
    openedAt: chargebackOpenedAt,
  } satisfies IShoppingMallPaymentChargeback.ICreate;

  const chargeback: IShoppingMallPaymentChargeback =
    await api.functional.shoppingMall.platformAdmin.paymentChargebacks.create(
      connection,
      {
        body: chargebackCreateBody,
      },
    );
  typia.assert(chargeback);

  const analyticsEndTimeRaw: string & tags.Format<"date-time"> =
    chargeback.createdAt;

  // Ensure end is strictly later than start by adding a small offset
  const startDate = new Date(analyticsStartTime);
  const endDate = new Date(analyticsEndTimeRaw);
  const safeEnd =
    endDate.getTime() <= startDate.getTime()
      ? new Date(startDate.getTime() + 1000)
      : endDate;

  const analyticsEndTime = safeEnd.toISOString() as string &
    tags.Format<"date-time">;

  // 10. Admin calls payment funnel analytics over a covering time range
  const timeRange: IShoppingMallAnalyticsTimeRange = {
    start: analyticsStartTime,
    end: analyticsEndTime,
  };

  const analyticsRequestBody = {
    timeRange,
    segmentations: undefined,
    orderFilters: undefined,
    paymentFilters: undefined,
    maxSegmentCount: undefined,
  } satisfies IShoppingMallPaymentFunnelAnalytics.IRequest;

  const analytics: IShoppingMallPaymentFunnelAnalytics =
    await api.functional.shoppingMall.platformAdmin.analytics.payment_funnel.index(
      connection,
      {
        body: analyticsRequestBody,
      },
    );
  typia.assert(analytics);

  const overall: IShoppingMallPaymentFunnelAnalyticsItem = analytics.overall;
  typia.assert(overall);

  // Extract plain numbers to avoid tag-related generic issues in TestValidator.equals
  const ordersCreatedCount = overall.ordersCreatedCount as number;
  const paymentsInitiatedCount = overall.paymentsInitiatedCount as number;
  const authorizationsApprovedCount =
    overall.authorizationsApprovedCount as number;
  const capturesCompletedCount = overall.capturesCompletedCount as number;
  const refundsProcessedCount = overall.refundsProcessedCount as number;
  const chargebacksRecordedCount = overall.chargebacksRecordedCount as number;

  const ordersTotalAmount = overall.ordersTotalAmount as number;
  const authorizedTotalAmount = overall.authorizedTotalAmount as number;
  const capturedTotalAmount = overall.capturedTotalAmount as number;
  const refundedTotalAmount = overall.refundedTotalAmount as number;
  const chargebackTotalAmount = overall.chargebackTotalAmount as number;
  const netCapturedAmount = overall.netCapturedAmount as number;

  const orderToPaymentConversionRate =
    overall.orderToPaymentConversionRate as number;
  const paymentToAuthorizationConversionRate =
    overall.paymentToAuthorizationConversionRate as number;
  const authorizationToCaptureConversionRate =
    overall.authorizationToCaptureConversionRate as number;

  // 11. Validate counts
  TestValidator.equals("ordersCreatedCount should be 1", ordersCreatedCount, 1);
  TestValidator.equals(
    "paymentsInitiatedCount should be 1",
    paymentsInitiatedCount,
    1,
  );
  TestValidator.equals(
    "authorizationsApprovedCount should be 1",
    authorizationsApprovedCount,
    1,
  );
  TestValidator.equals(
    "capturesCompletedCount should be 1",
    capturesCompletedCount,
    1,
  );
  TestValidator.equals(
    "refundsProcessedCount should be 1",
    refundsProcessedCount,
    1,
  );
  TestValidator.equals(
    "chargebacksRecordedCount should be 1",
    chargebacksRecordedCount,
    1,
  );

  // 11-2. Validate monetary totals
  TestValidator.equals(
    "ordersTotalAmount should equal grandTotal",
    ordersTotalAmount,
    grandTotal,
  );
  TestValidator.equals(
    "authorizedTotalAmount should equal grandTotal",
    authorizedTotalAmount,
    grandTotal,
  );
  TestValidator.equals(
    "capturedTotalAmount should equal grandTotal",
    capturedTotalAmount,
    grandTotal,
  );
  TestValidator.equals(
    "refundedTotalAmount should equal refundAmount",
    refundedTotalAmount,
    refundAmount,
  );
  TestValidator.equals(
    "chargebackTotalAmount should equal chargebackAmount",
    chargebackTotalAmount,
    chargebackAmount,
  );

  const expectedNetCaptured = grandTotal - refundAmount - chargebackAmount;
  TestValidator.equals(
    "netCapturedAmount should equal captured - refund - chargeback",
    netCapturedAmount,
    expectedNetCaptured,
  );

  // 11-3. Validate conversion rates
  TestValidator.equals(
    "orderToPaymentConversionRate should be 1.0",
    orderToPaymentConversionRate,
    1.0,
  );
  TestValidator.equals(
    "paymentToAuthorizationConversionRate should be 1.0",
    paymentToAuthorizationConversionRate,
    1.0,
  );
  TestValidator.equals(
    "authorizationToCaptureConversionRate should be 1.0",
    authorizationToCaptureConversionRate,
    1.0,
  );
}
