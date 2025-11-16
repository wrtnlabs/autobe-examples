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
import type { IShoppingMallFraudRuleAnalytics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallFraudRuleAnalytics";
import type { IShoppingMallFraudRuleDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallFraudRuleDefinition";
import type { IShoppingMallInventoryItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryItem";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import type { IShoppingMallPaymentTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentTransaction";
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
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";
import type { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";

/**
 * Validate that a platform administrator can retrieve basic fraud rule
 * analytics for a single active fraud rule over a recent time window.
 *
 * Business flow (adapted to available APIs):
 *
 * 1. Register a platform admin and obtain an authorized session.
 * 2. As platformAdmin, create basic catalog and configuration context:
 *
 *    - Category tree
 *    - Brand
 *    - Platform-admin product and SKU
 * 3. Register a seller and create an inventory item for a seller SKU to keep the
 *    environment realistic (though not strictly required by analytics).
 * 4. Register a customer, create a cart, add a cart item using the platform-admin
 *    product SKU, and create an order.
 * 5. As platformAdmin, create a payment method, then a payment transaction that
 *    references the order and payment method.
 * 6. As platformAdmin, create an active fraud rule definition (scope "payment",
 *    severity "medium", isEnabled=true).
 * 7. Call the fraud rule analytics endpoint over a small [from, to) window around
 *    "now", filtered by the created ruleId, with timeGranularity="day" and
 *    includePerRuleBreakdown/includeTimeSeries/include*Breakdown flags set.
 * 8. Assert that the analytics response is structurally valid and logically
 *    consistent: non-negative counts, presence of the created rule in
 *    perRuleMetrics when present, and consistency between uniqueRulesTriggered
 *    and the perRuleMetrics length.
 */
export async function test_api_platform_admin_fraud_rule_analytics_basic_rule_performance(
  connection: api.IConnection,
) {
  // 1. Register platform admin (join also authenticates and sets Authorization header)
  const platformAdminEmail: string = typia.random<
    string & tags.Format<"email">
  >();
  const platformAdminJoinBody = {
    email: platformAdminEmail,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.shoppingmall.local/join",
    referrer: "https://admin.shoppingmall.local/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  // 2. Create category tree
  const categoryTreeBody = {
    code: `main-${RandomGenerator.alphaNumeric(8)}`,
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

  // 3. Create brand
  const brandBody = {
    name: `Brand-${RandomGenerator.alphabets(6)}`,
    slug: `brand-${RandomGenerator.alphaNumeric(8)}`,
    description: RandomGenerator.paragraph({ sentences: 2 }),
    logo_uri: "https://cdn.shoppingmall.local/logo.png",
  } satisfies IShoppingMallBrand.ICreate;
  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert(brand);

  // 4. Create platform-admin product
  const productCode: string = `PROD-${RandomGenerator.alphaNumeric(8)}`;
  const platformProductBody = {
    shopping_mall_seller_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: "Fraud Analytics Test Product",
    short_description: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: "https://cdn.shoppingmall.local/products/test.png",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;
  const platformProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      { body: platformProductBody },
    );
  typia.assert(platformProduct);

  // 5. Create platform-admin SKU
  const skuCode: string = `SKU-${RandomGenerator.alphaNumeric(8)}`;
  const platformSkuBody = {
    code: skuCode,
    name: "Fraud Analytics Test SKU",
    listPrice: 100,
    salePrice: 90,
    currency: "USD",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;
  const platformSku: IShoppingMallProductSku =
    await api.functional.shoppingMall.platformAdmin.products.skus.create(
      connection,
      {
        productCode,
        body: platformSkuBody,
      },
    );
  typia.assert(platformSku);

  // 6. Create seller user and login
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const sellerJoinBody = {
    email: sellerEmail,
    password: RandomGenerator.alphaNumeric(12),
    storeName: `Store-${RandomGenerator.alphabets(6)}`,
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;
  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.shoppingmall.local/login",
    referrer: "https://seller.shoppingmall.local/landing",
  } satisfies IShoppingMallSellerLogin.IRequest;
  const sellerLoggedIn: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoggedIn);

  // 7. Create seller product and SKU and inventory item (realistic environment)
  const sellerProductCode: string = `SEL-${RandomGenerator.alphaNumeric(8)}`;
  const sellerProductBody = {
    shopping_mall_seller_id: sellerLoggedIn.id,
    shopping_mall_brand_id: null,
    code: sellerProductCode,
    name: "Seller Test Product",
    short_description: RandomGenerator.paragraph({ sentences: 1 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri:
      "https://cdn.shoppingmall.local/products/seller-test.png",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;
  const sellerProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: sellerProductBody,
    });
  typia.assert(sellerProduct);

  const sellerSkuBody = {
    code: `SSKU-${RandomGenerator.alphaNumeric(8)}`,
    name: "Seller Test SKU",
    listPrice: 50,
    salePrice: 45,
    currency: "USD",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;
  const sellerSku: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode: sellerProduct.code,
      body: sellerSkuBody,
    });
  typia.assert(sellerSku);

  const inventoryBody = {
    product_sku_id: sellerSku.id,
    on_hand_quantity: 100,
    low_stock_threshold: 10,
    backorder_enabled: false,
    preorder_enabled: false,
  } satisfies IShoppingMallInventoryItem.ICreate;
  const inventoryItem: IShoppingMallInventoryItem =
    await api.functional.shoppingMall.seller.inventoryItems.create(connection, {
      body: inventoryBody,
    });
  typia.assert(inventoryItem);

  // 8. Create customer (join also authenticates and sets Authorization)
  const customerEmail: string = typia.random<string & tags.Format<"email">>();
  const customerJoinBody = {
    email: customerEmail,
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    ip: null,
    href: "https://shop.shoppingmall.local/join",
    referrer: "https://shop.shoppingmall.local/home",
  } satisfies IShoppingMallCustomerAuth.IJoin;
  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  // 9. Create customer cart
  const cartBody = {
    currency_code: "USD",
    region_code: "US",
    channel: "web",
    metadata: {
      test: "fraud-analytics",
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

  // 10. Add cart item using the platform-admin SKU
  const cartItemBody = {
    skuId: platformSku.id,
    quantity: 1,
    note: "fraud analytics test item",
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

  // 11. Create order from the cart
  const orderCurrency = cart.currency_code;
  const itemsSubtotal = 90; // one unit of platform SKU salePrice
  const discountTotal = 0;
  const shippingTotal = 10;
  const taxTotal = 9;
  const grandTotal = itemsSubtotal - discountTotal + shippingTotal + taxTotal;

  const shippingAddressId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const billingAddressId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const orderCreateBody = {
    customer_cart_id: cart.id,
    currency_code: orderCurrency,
    items_subtotal_amount: itemsSubtotal,
    discount_total_amount: discountTotal,
    shipping_total_amount: shippingTotal,
    tax_total_amount: taxTotal,
    grand_total_amount: grandTotal,
    shipping_address_id: shippingAddressId,
    billing_address_id: billingAddressId,
    customer_note: "fraud rule analytics test order",
  } satisfies IShoppingMallOrder.ICreate;
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateBody,
    });
  typia.assert(order);

  // 12. Switch back to platformAdmin via login (to be explicit)
  const platformAdminLoginBody = {
    email: platformAdminEmail,
    password: platformAdminJoinBody.password,
    ip: null,
    href: "https://admin.shoppingmall.local/login",
    referrer: "https://admin.shoppingmall.local/landing",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;
  const platformAdminLoggedIn: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoggedIn);

  // 13. Create payment method
  const paymentMethodCode = `pm-${RandomGenerator.alphaNumeric(6)}`;
  const now = new Date();
  const startsAt = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
  const endsAt = new Date(now.getTime() + 60 * 60 * 1000).toISOString();

  const paymentMethodBody = {
    code: paymentMethodCode,
    display_name: "Test Card",
    description: "Fraud analytics test payment method",
    provider_key: "test-gateway",
    method_type: "card",
    currency_restriction: null,
    min_amount: null,
    max_amount: null,
    priority: 1,
    is_active: true,
    starts_at: startsAt,
    ends_at: endsAt,
  } satisfies IShoppingMallPaymentMethod.ICreate;
  const paymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.platformAdmin.paymentMethods.create(
      connection,
      {
        body: paymentMethodBody,
      },
    );
  typia.assert(paymentMethod);

  // 14. Create payment transaction for the order
  const paymentTransactionBody = {
    orderId: order.id,
    customerId: order.customer_id,
    paymentMethodId: paymentMethod.id,
    paymentIntentKey: null,
    providerName: "test-gateway",
    providerTransactionId: null,
    currency: order.currency_code,
    authorizedAmount: grandTotal,
    capturedAmount: grandTotal,
    paymentStatus: "payment_captured",
    providerStatus: null,
    failureReasonCode: null,
    failureReasonMessage: null,
    requiresManualReview: false,
    metadataJson: null,
  } satisfies IShoppingMallPaymentTransaction.ICreate;
  const paymentTransaction: IShoppingMallPaymentTransaction =
    await api.functional.shoppingMall.platformAdmin.paymentTransactions.create(
      connection,
      {
        body: paymentTransactionBody,
      },
    );
  typia.assert(paymentTransaction);

  // 15. Create fraud rule definition (scope payment, severity medium, enabled)
  const ruleCode = `RULE-${RandomGenerator.alphaNumeric(8)}`;
  const fraudRuleBody = {
    ruleCode,
    name: "Test Payment Fraud Rule",
    description: "Medium severity payment rule for analytics testing",
    scope: "payment",
    severity: "medium",
    ruleExpression: '{ "type": "threshold", "field": "amount", "gte": 0 }',
    isEnabled: true,
  } satisfies IShoppingMallFraudRuleDefinition.ICreate;
  const fraudRule: IShoppingMallFraudRuleDefinition =
    await api.functional.shoppingMall.platformAdmin.fraudRuleDefinitions.create(
      connection,
      {
        body: fraudRuleBody,
      },
    );
  typia.assert(fraudRule);

  // 16. Query fraud rule analytics for recent window including now, filtered to this rule
  const fromTime = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
  const toTime = new Date(now.getTime() + 60 * 60 * 1000).toISOString();

  const analyticsRequest = {
    from: fromTime,
    to: toTime,
    timeGranularity: "day",
    ruleIds: [fraudRule.id],
    ruleCategories: undefined,
    severities: [fraudRule.severity],
    eventTypes: undefined,
    includePerRuleBreakdown: true,
    includeTimeSeries: true,
    includeSeverityBreakdown: true,
    includeRuleCategoryBreakdown: true,
  } satisfies IShoppingMallFraudRuleAnalytics.IRequest;

  const analytics: IShoppingMallFraudRuleAnalytics.IResponse =
    await api.functional.shoppingMall.platformAdmin.analytics.fraudRules.index(
      connection,
      {
        body: analyticsRequest,
      },
    );
  typia.assert(analytics);

  // 17. Business and logical assertions on analytics response
  TestValidator.equals(
    "analytics from echoes request from",
    analytics.from,
    analyticsRequest.from,
  );
  TestValidator.equals(
    "analytics to echoes request to",
    analytics.to,
    analyticsRequest.to,
  );
  TestValidator.equals(
    "analytics timeGranularity echoes request",
    analytics.timeGranularity,
    analyticsRequest.timeGranularity,
  );

  TestValidator.predicate(
    "totalViolations is non-negative",
    analytics.totalViolations >= 0,
  );
  TestValidator.predicate(
    "uniqueRulesTriggered is non-negative",
    analytics.uniqueRulesTriggered >= 0,
  );

  if (analytics.perRuleMetrics !== undefined) {
    TestValidator.predicate(
      "perRuleMetrics length is non-negative",
      analytics.perRuleMetrics.length >= 0,
    );

    const matchingRuleMetric = analytics.perRuleMetrics.find(
      (metric) => metric.ruleId === fraudRule.id,
    );

    if (matchingRuleMetric !== undefined) {
      TestValidator.equals(
        "matching rule metric has correct ruleId",
        matchingRuleMetric.ruleId,
        fraudRule.id,
      );
      TestValidator.predicate(
        "matching rule metric totalViolations is non-negative",
        matchingRuleMetric.totalViolations >= 0,
      );
      if (matchingRuleMetric.hitRatePerThousand !== undefined) {
        TestValidator.predicate(
          "hitRatePerThousand is non-negative when present",
          matchingRuleMetric.hitRatePerThousand >= 0,
        );
      }
      if (matchingRuleMetric.falsePositiveRate !== undefined) {
        TestValidator.predicate(
          "falsePositiveRate is between 0 and 1 when present",
          matchingRuleMetric.falsePositiveRate >= 0 &&
            matchingRuleMetric.falsePositiveRate <= 1,
        );
      }
    }

    TestValidator.predicate(
      "uniqueRulesTriggered is at least the count of metrics with >0 violations",
      analytics.uniqueRulesTriggered >=
        analytics.perRuleMetrics.filter((metric) => metric.totalViolations > 0)
          .length,
    );
  }

  if (analytics.timeSeries !== undefined) {
    for (const point of analytics.timeSeries) {
      TestValidator.predicate(
        "timeSeries point totalViolations non-negative",
        point.totalViolations >= 0,
      );
      TestValidator.predicate(
        "bucketStart <= bucketEnd",
        point.bucketStart <= point.bucketEnd,
      );
      if (point.uniqueRulesTriggered !== undefined) {
        TestValidator.predicate(
          "timeSeries uniqueRulesTriggered non-negative when present",
          point.uniqueRulesTriggered >= 0,
        );
      }
    }
  }

  if (analytics.severityBreakdown !== undefined) {
    for (const bucket of analytics.severityBreakdown) {
      TestValidator.predicate(
        "severity bucket totalViolations non-negative",
        bucket.totalViolations >= 0,
      );
    }
  }

  if (analytics.ruleCategoryBreakdown !== undefined) {
    for (const bucket of analytics.ruleCategoryBreakdown) {
      TestValidator.predicate(
        "rule category bucket totalViolations non-negative",
        bucket.totalViolations >= 0,
      );
    }
  }
}
