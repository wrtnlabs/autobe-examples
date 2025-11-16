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
import type { IShoppingMallPaymentAuthorization } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentAuthorization";
import type { IShoppingMallPaymentCapture } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentCapture";
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
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Ensure that the payment funnel analytics honors order-level filters and only
 * counts high-value orders.
 *
 * Business flow:
 *
 * 1. Platform admin joins (auth) and is auto-authenticated.
 * 2. Platform admin creates minimal catalog configuration: category tree, brand,
 *    product, and single SKU with known price.
 * 3. Customer joins and is auto-authenticated.
 * 4. Customer creates two carts and corresponding orders using different
 *    quantities of the same SKU to get low and high grand totals.
 * 5. Platform admin creates one payment method and, for each order, a payment
 *    transaction, authorization, and capture.
 * 6. Platform admin calls analytics.payment_funnel.index with
 *    orderFilters.minOrderTotal set between the low and high order totals.
 * 7. Validate that analytics overall metrics include only the high-value order and
 *    all funnel conversion rates are 1.0, with zero refunds and chargebacks.
 */
export async function test_api_payment_funnel_filtered_by_high_value_orders(
  connection: api.IConnection,
) {
  // 1. Platform admin join (creates and authenticates admin)
  const platformAdminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const platformAdminJoinRequest = {
    email: platformAdminEmail,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/login",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinRequest,
    });
  typia.assert(platformAdminAuthorized);

  // 2. Platform admin creates category tree
  const categoryTreeCreate = {
    code: `cat-${RandomGenerator.alphaNumeric(8)}`,
    name: "Default Category Tree",
    description: "Test category tree for payment funnel analytics",
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;

  const categoryTree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      {
        body: categoryTreeCreate,
      },
    );
  typia.assert(categoryTree);

  // 3. Platform admin creates brand
  const brandCreate = {
    name: `Brand ${RandomGenerator.name(1)}`,
    slug: `brand-${RandomGenerator.alphaNumeric(6)}`,
    description: "Test brand for payment funnel analytics",
    logo_uri: undefined,
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreate,
    });
  typia.assert(brand);

  // 4. Platform admin creates product with synthetic seller id (no seller API available)
  const sellerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const productCode = `prod-${RandomGenerator.alphaNumeric(8)}`;
  const productCreate = {
    shopping_mall_seller_id: sellerId,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: "High/Low value test product",
    short_description: "Product for creating different order totals",
    description: "Product used in payment funnel analytics e2e test",
    status: "active",
    is_multi_sku: true,
    primary_image_uri: null,
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      {
        body: productCreate,
      },
    );
  typia.assert(product);
  void product;

  // 5. Platform admin creates a single SKU with known price
  const unitPrice = 1000;
  const skuCode = `sku-${RandomGenerator.alphaNumeric(6)}`;
  const skuCreate = {
    code: skuCode,
    name: "Standard SKU",
    listPrice: unitPrice,
    salePrice: unitPrice,
    currency: "KRW",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.platformAdmin.products.skus.create(
      connection,
      {
        productCode,
        body: skuCreate,
      },
    );
  typia.assert(sku);

  // 6. Customer join (authenticate as customer)
  const customerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const customerJoinRequest = {
    email: customerEmail,
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    ip: null,
    href: "https://shop.example.com/register",
    referrer: "https://shop.example.com/landing",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinRequest,
    });
  typia.assert(customerAuthorized);

  // Synthetic address IDs for order creation (no address API available)
  const shippingAddressId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const billingAddressId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 7. Create low-value cart and order
  const lowCartCreate = {
    currency_code: sku.currency,
    region_code: "KR-Seoul",
    channel: "web",
    metadata: undefined,
    is_active: true,
    source_guest_token: undefined,
  } satisfies IShoppingMallCustomerCart.ICreate;

  const lowCart: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.customerCarts.create(
      connection,
      {
        body: lowCartCreate,
      },
    );
  typia.assert(lowCart);

  const lowQuantity = 1 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const lowCartItemCreate = {
    skuId: sku.id,
    quantity: lowQuantity,
    note: "Low-value order item",
  } satisfies IShoppingMallCustomerCartItem.ICreate;

  const lowCartItem: IShoppingMallCustomerCartItem =
    await api.functional.shoppingMall.customer.customerCarts.items.create(
      connection,
      {
        customerCartId: lowCart.id,
        body: lowCartItemCreate,
      },
    );
  typia.assert(lowCartItem);

  const lowOrderSubtotal = unitPrice * lowQuantity;
  const lowOrderDiscount = 0;
  const lowOrderShipping = 0;
  const lowOrderTax = 0;
  const lowOrderGrandTotal =
    lowOrderSubtotal - lowOrderDiscount + lowOrderShipping + lowOrderTax;

  const lowOrderCreate = {
    customer_cart_id: lowCart.id,
    currency_code: sku.currency,
    items_subtotal_amount: lowOrderSubtotal,
    discount_total_amount: lowOrderDiscount,
    shipping_total_amount: lowOrderShipping,
    tax_total_amount: lowOrderTax,
    grand_total_amount: lowOrderGrandTotal,
    shipping_address_id: shippingAddressId,
    billing_address_id: billingAddressId,
    customer_note: "Low-value order",
  } satisfies IShoppingMallOrder.ICreate;

  const lowOrder: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: lowOrderCreate,
    });
  typia.assert(lowOrder);

  // 8. Create high-value cart and order
  const highCartCreate = {
    currency_code: sku.currency,
    region_code: "KR-Seoul",
    channel: "web",
    metadata: undefined,
    is_active: true,
    source_guest_token: undefined,
  } satisfies IShoppingMallCustomerCart.ICreate;

  const highCart: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.customerCarts.create(
      connection,
      {
        body: highCartCreate,
      },
    );
  typia.assert(highCart);

  const highQuantity = 10 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const highCartItemCreate = {
    skuId: sku.id,
    quantity: highQuantity,
    note: "High-value order item",
  } satisfies IShoppingMallCustomerCartItem.ICreate;

  const highCartItem: IShoppingMallCustomerCartItem =
    await api.functional.shoppingMall.customer.customerCarts.items.create(
      connection,
      {
        customerCartId: highCart.id,
        body: highCartItemCreate,
      },
    );
  typia.assert(highCartItem);

  const highOrderSubtotal = unitPrice * highQuantity;
  const highOrderDiscount = 0;
  const highOrderShipping = 0;
  const highOrderTax = 0;
  const highOrderGrandTotal =
    highOrderSubtotal - highOrderDiscount + highOrderShipping + highOrderTax;

  const highOrderCreate = {
    customer_cart_id: highCart.id,
    currency_code: sku.currency,
    items_subtotal_amount: highOrderSubtotal,
    discount_total_amount: highOrderDiscount,
    shipping_total_amount: highOrderShipping,
    tax_total_amount: highOrderTax,
    grand_total_amount: highOrderGrandTotal,
    shipping_address_id: shippingAddressId,
    billing_address_id: billingAddressId,
    customer_note: "High-value order",
  } satisfies IShoppingMallOrder.ICreate;

  const highOrder: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: highOrderCreate,
    });
  typia.assert(highOrder);

  // 9. Switch back to platform admin (login)
  const platformAdminLoginRequest = {
    email: platformAdminEmail,
    password: platformAdminJoinRequest.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const platformAdminLogin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginRequest,
    });
  typia.assert(platformAdminLogin);

  // 10. Create payment method
  const now = new Date();
  const startsAt = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
  const endsAt = new Date(now.getTime() + 60 * 60 * 1000).toISOString();

  const paymentMethodCreate = {
    code: `pm-${RandomGenerator.alphaNumeric(6)}`,
    display_name: "Test Payment Method",
    description: "Payment method for payment funnel E2E test",
    provider_key: "test-gateway",
    method_type: "card",
    currency_restriction: null,
    min_amount: null,
    max_amount: null,
    priority: 1 as number & tags.Type<"int32">,
    is_active: true,
    starts_at: startsAt,
    ends_at: endsAt,
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const paymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.platformAdmin.paymentMethods.create(
      connection,
      {
        body: paymentMethodCreate,
      },
    );
  typia.assert(paymentMethod);

  // Helper to create payment transaction, authorization, and capture for an order
  const createPaidTransactionForOrder = async (
    order: IShoppingMallOrder,
  ): Promise<{
    transaction: IShoppingMallPaymentTransaction;
    authorization: IShoppingMallPaymentAuthorization;
    capture: IShoppingMallPaymentCapture;
  }> => {
    const currencyCode = typia.assert<
      string & tags.MinLength<3> & tags.MaxLength<3>
    >(order.currency_code);

    const transactionCreate = {
      orderId: order.id,
      customerId: order.customer_id,
      paymentMethodId: paymentMethod.id,
      paymentIntentKey: null,
      providerName: paymentMethodCreate.provider_key,
      providerTransactionId: null,
      currency: currencyCode,
      authorizedAmount: order.grand_total_amount,
      capturedAmount: null,
      paymentStatus: "payment_authorized",
      providerStatus: null,
      failureReasonCode: null,
      failureReasonMessage: null,
      requiresManualReview: false,
      metadataJson: null,
    } satisfies IShoppingMallPaymentTransaction.ICreate;

    const transaction: IShoppingMallPaymentTransaction =
      await api.functional.shoppingMall.platformAdmin.paymentTransactions.create(
        connection,
        {
          body: transactionCreate,
        },
      );
    typia.assert(transaction);

    const paymentTransactionId = typia.assert<string & tags.Format<"uuid">>(
      transaction.id,
    );

    const authorizationCreate = {
      amount: order.grand_total_amount,
      currency: currencyCode,
      gateway_code: paymentMethodCreate.provider_key,
      gateway_authorization_id: `auth-${RandomGenerator.alphaNumeric(8)}`,
      channel: "web",
      risk_metadata: undefined,
    } satisfies IShoppingMallPaymentAuthorization.ICreate;

    const authorization: IShoppingMallPaymentAuthorization =
      await api.functional.shoppingMall.platformAdmin.paymentTransactions.authorizations.create(
        connection,
        {
          paymentTransactionId,
          body: authorizationCreate,
        },
      );
    typia.assert(authorization);

    const captureCreate = {
      shopping_mall_payment_authorization_id: authorization.id,
      provider_capture_id: `cap-${RandomGenerator.alphaNumeric(8)}`,
      amount: order.grand_total_amount,
      currency: currencyCode,
      capture_status: "capture_succeeded",
      provider_status: null,
      failure_reason_code: null,
      failure_reason_message: null,
    } satisfies IShoppingMallPaymentCapture.ICreate;

    const capture: IShoppingMallPaymentCapture =
      await api.functional.shoppingMall.platformAdmin.paymentTransactions.captures.create(
        connection,
        {
          paymentTransactionId,
          body: captureCreate,
        },
      );
    typia.assert(capture);

    return {
      transaction,
      authorization,
      capture,
    };
  };

  const lowPayment = await createPaidTransactionForOrder(lowOrder);
  const highPayment = await createPaidTransactionForOrder(highOrder);
  void lowPayment;
  void highPayment;

  // 11. Build time range that covers now (orders/payment just created)
  const nowDate = new Date();
  const timeRange: IShoppingMallAnalyticsTimeRange = {
    start: new Date(nowDate.getTime() - 2 * 60 * 60 * 1000).toISOString(),
    end: new Date(nowDate.getTime() + 2 * 60 * 60 * 1000).toISOString(),
  } satisfies IShoppingMallAnalyticsTimeRange;
  typia.assert<IShoppingMallAnalyticsTimeRange>(timeRange);

  // minOrderTotal strictly between low and high grand totals
  const minOrderTotalFilter = (lowOrderGrandTotal + highOrderGrandTotal) / 2;

  const orderFilters: IShoppingMallPaymentFunnelOrderFilter = {
    orderStatusIn: undefined,
    minOrderTotal: minOrderTotalFilter,
    maxOrderTotal: undefined,
    regionCodes: undefined,
    sellerIds: undefined,
  } satisfies IShoppingMallPaymentFunnelOrderFilter;

  const analyticsRequest = {
    timeRange,
    segmentations: undefined,
    orderFilters,
    paymentFilters: undefined,
    maxSegmentCount: undefined,
  } satisfies IShoppingMallPaymentFunnelAnalytics.IRequest;

  const analytics: IShoppingMallPaymentFunnelAnalytics =
    await api.functional.shoppingMall.platformAdmin.analytics.payment_funnel.index(
      connection,
      {
        body: analyticsRequest,
      },
    );
  typia.assert(analytics);

  const overall: IShoppingMallPaymentFunnelAnalyticsItem = analytics.overall;
  typia.assert<IShoppingMallPaymentFunnelAnalyticsItem>(overall);

  // 12. Validate that only the high-value order is counted
  TestValidator.equals(
    "ordersCreatedCount should be 1 (only high-value order included)",
    overall.ordersCreatedCount,
    1,
  );
  TestValidator.equals(
    "paymentsInitiatedCount should be 1",
    overall.paymentsInitiatedCount,
    1,
  );
  TestValidator.equals(
    "authorizationsApprovedCount should be 1",
    overall.authorizationsApprovedCount,
    1,
  );
  TestValidator.equals(
    "capturesCompletedCount should be 1",
    overall.capturesCompletedCount,
    1,
  );

  TestValidator.equals(
    "ordersTotalAmount should equal highOrder grand total",
    overall.ordersTotalAmount,
    highOrderGrandTotal,
  );

  TestValidator.equals(
    "capturedTotalAmount should equal highOrder grand total",
    overall.capturedTotalAmount,
    highOrderGrandTotal,
  );

  TestValidator.equals(
    "refundedTotalAmount should be 0",
    overall.refundedTotalAmount,
    0,
  );

  TestValidator.equals(
    "chargebackTotalAmount should be 0",
    overall.chargebackTotalAmount,
    0,
  );

  TestValidator.equals(
    "orderToPaymentConversionRate should be 1",
    overall.orderToPaymentConversionRate,
    1,
  );

  TestValidator.equals(
    "paymentToAuthorizationConversionRate should be 1",
    overall.paymentToAuthorizationConversionRate,
    1,
  );

  TestValidator.equals(
    "authorizationToCaptureConversionRate should be 1",
    overall.authorizationToCaptureConversionRate,
    1,
  );

  // If segments are present, ensure they are consistent with overall counts
  if (analytics.segments !== undefined) {
    const segments: IShoppingMallPaymentFunnelSegmentAnalytics[] =
      analytics.segments;
    typia.assert<IShoppingMallPaymentFunnelSegmentAnalytics[]>(segments);

    if (segments.length > 0) {
      const aggregated =
        segments.reduce<IShoppingMallPaymentFunnelAnalyticsItem>(
          (acc, seg) => {
            const metrics = seg.metrics;
            return {
              ordersCreatedCount:
                acc.ordersCreatedCount + metrics.ordersCreatedCount,
              paymentsInitiatedCount:
                acc.paymentsInitiatedCount + metrics.paymentsInitiatedCount,
              authorizationsApprovedCount:
                acc.authorizationsApprovedCount +
                metrics.authorizationsApprovedCount,
              capturesCompletedCount:
                acc.capturesCompletedCount + metrics.capturesCompletedCount,
              refundsProcessedCount:
                acc.refundsProcessedCount + metrics.refundsProcessedCount,
              chargebacksRecordedCount:
                acc.chargebacksRecordedCount + metrics.chargebacksRecordedCount,
              ordersTotalAmount:
                acc.ordersTotalAmount + metrics.ordersTotalAmount,
              authorizedTotalAmount:
                acc.authorizedTotalAmount + metrics.authorizedTotalAmount,
              capturedTotalAmount:
                acc.capturedTotalAmount + metrics.capturedTotalAmount,
              refundedTotalAmount:
                acc.refundedTotalAmount + metrics.refundedTotalAmount,
              chargebackTotalAmount:
                acc.chargebackTotalAmount + metrics.chargebackTotalAmount,
              orderToPaymentConversionRate: acc.orderToPaymentConversionRate,
              paymentToAuthorizationConversionRate:
                acc.paymentToAuthorizationConversionRate,
              authorizationToCaptureConversionRate:
                acc.authorizationToCaptureConversionRate,
              netCapturedAmount:
                acc.netCapturedAmount + metrics.netCapturedAmount,
            };
          },
          {
            ordersCreatedCount: 0,
            paymentsInitiatedCount: 0,
            authorizationsApprovedCount: 0,
            capturesCompletedCount: 0,
            refundsProcessedCount: 0,
            chargebacksRecordedCount: 0,
            ordersTotalAmount: 0,
            authorizedTotalAmount: 0,
            capturedTotalAmount: 0,
            refundedTotalAmount: 0,
            chargebackTotalAmount: 0,
            orderToPaymentConversionRate: 0,
            paymentToAuthorizationConversionRate: 0,
            authorizationToCaptureConversionRate: 0,
            netCapturedAmount: 0,
          } satisfies IShoppingMallPaymentFunnelAnalyticsItem,
        );

      TestValidator.equals(
        "aggregated segment ordersCreatedCount should equal overall",
        aggregated.ordersCreatedCount,
        overall.ordersCreatedCount,
      );

      TestValidator.equals(
        "aggregated segment capturedTotalAmount should equal overall",
        aggregated.capturedTotalAmount,
        overall.capturedTotalAmount,
      );
    }
  }
}
