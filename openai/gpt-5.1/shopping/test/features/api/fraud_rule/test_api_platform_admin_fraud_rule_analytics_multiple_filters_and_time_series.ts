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

export async function test_api_platform_admin_fraud_rule_analytics_multiple_filters_and_time_series(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a platform admin
  const adminJoinBody = {
    email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    name: RandomGenerator.name(),
    password: "AdminPass123!",
    ip: "127.0.0.1",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create basic catalog context: category tree and brand
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
    slug: `brand-${RandomGenerator.alphaNumeric(8)}`,
    description: RandomGenerator.paragraph({ sentences: 2 }),
    logo_uri: "https://cdn.example.com/logo.png",
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert(brand);

  // 3. Create two products as platform admin and SKUs under them
  const sellerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const createProduct = async (
    codeSuffix: string,
  ): Promise<{
    product: IShoppingMallProduct;
    sku: IShoppingMallProductSku;
  }> => {
    const productBody = {
      shopping_mall_seller_id: sellerId,
      shopping_mall_brand_id: brand.id,
      code: `prod-${codeSuffix}-${RandomGenerator.alphaNumeric(4)}`,
      name: `Product ${codeSuffix}`,
      short_description: RandomGenerator.paragraph({ sentences: 2 }),
      description: RandomGenerator.content({ paragraphs: 2 }),
      status: "active",
      is_multi_sku: false,
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
      code: `sku-${codeSuffix}-${RandomGenerator.alphaNumeric(4)}`,
      name: `SKU ${codeSuffix}`,
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
          productCode: product.code,
          body: skuBody,
        },
      );
    typia.assert(sku);

    return { product, sku };
  };

  const { product: productA, sku: skuA } = await createProduct("A");
  const { product: productB, sku: skuB } = await createProduct("B");

  // 4. Create a payment method
  const now = new Date();
  const inOneHour = new Date(now.getTime() + 60 * 60 * 1000);

  const paymentMethodBody = {
    code: `pm-${RandomGenerator.alphaNumeric(6)}`,
    display_name: "Test Credit Card",
    description: RandomGenerator.paragraph({ sentences: 2 }),
    provider_key: "test-gateway",
    method_type: "card",
    currency_restriction: "USD",
    min_amount: 1,
    max_amount: 100000,
    priority: 1,
    is_active: true,
    starts_at: now.toISOString(),
    ends_at: inOneHour.toISOString(),
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const paymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.platformAdmin.paymentMethods.create(
      connection,
      { body: paymentMethodBody },
    );
  typia.assert(paymentMethod);

  // 5. Create and authenticate a customer
  const customerJoinBody = {
    email: `customer+${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "CustomerPass123!",
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

  // 6. Create a customer cart and add an item
  const cartBody = {
    currency_code: "USD",
    region_code: "US",
    channel: "web",
    metadata: undefined,
    is_active: true,
    source_guest_token: undefined,
  } satisfies IShoppingMallCustomerCart.ICreate;

  const cart: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.customerCarts.create(
      connection,
      { body: cartBody },
    );
  typia.assert(cart);

  const cartItemBody = {
    skuId: skuA.id,
    quantity: 1,
    note: "Fraud analytics test item",
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

  // 7. Create an order from the cart
  const orderBody = {
    customer_cart_id: cart.id,
    currency_code: cart.currency_code,
    items_subtotal_amount: 80,
    discount_total_amount: 0,
    shipping_total_amount: 0,
    tax_total_amount: 0,
    grand_total_amount: 80,
    shipping_address_id: typia.random<string & tags.Format<"uuid">>(),
    billing_address_id: typia.random<string & tags.Format<"uuid">>(),
    customer_note: "Fraud analytics order",
  } satisfies IShoppingMallOrder.ICreate;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderBody,
    });
  typia.assert(order);

  // 8. Create multiple payment transactions for the order
  const createPaymentTx = async (
    providerName: string,
    status: string,
  ): Promise<IShoppingMallPaymentTransaction> => {
    const txBody = {
      orderId: order.id,
      customerId: customerAuthorized.id,
      paymentMethodId: paymentMethod.id,
      paymentIntentKey: RandomGenerator.alphaNumeric(12),
      providerName,
      providerTransactionId: RandomGenerator.alphaNumeric(16),
      currency: order.currency_code,
      authorizedAmount: 80,
      capturedAmount: status === "payment_captured" ? 80 : 0,
      paymentStatus: status,
      providerStatus: status,
      failureReasonCode: null,
      failureReasonMessage: null,
      requiresManualReview: false,
      metadataJson: null,
    } satisfies IShoppingMallPaymentTransaction.ICreate;

    const tx: IShoppingMallPaymentTransaction =
      await api.functional.shoppingMall.platformAdmin.paymentTransactions.create(
        connection,
        { body: txBody },
      );
    typia.assert(tx);
    return tx;
  };

  await createPaymentTx("test-gateway", "payment_authorized");
  await createPaymentTx("test-gateway", "payment_captured");

  // 9. Create two fraud rule definitions with different scopes and severities
  const ruleACategory = "payment_velocity";
  const ruleBCategory = "account_linkage";

  const ruleABody = {
    ruleCode: `RULE_A_${RandomGenerator.alphaNumeric(6)}`,
    name: "High severity payment velocity rule",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    scope: "payment",
    severity: "high",
    ruleExpression: "amount > 5000 AND velocity > 3",
    isEnabled: true,
  } satisfies IShoppingMallFraudRuleDefinition.ICreate;

  const ruleA: IShoppingMallFraudRuleDefinition =
    await api.functional.shoppingMall.platformAdmin.fraudRuleDefinitions.create(
      connection,
      { body: ruleABody },
    );
  typia.assert(ruleA);

  const ruleBBody = {
    ruleCode: `RULE_B_${RandomGenerator.alphaNumeric(6)}`,
    name: "Low severity account linkage rule",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    scope: "account",
    severity: "low",
    ruleExpression: "multiple_accounts_same_device",
    isEnabled: true,
  } satisfies IShoppingMallFraudRuleDefinition.ICreate;

  const ruleB: IShoppingMallFraudRuleDefinition =
    await api.functional.shoppingMall.platformAdmin.fraudRuleDefinitions.create(
      connection,
      { body: ruleBBody },
    );
  typia.assert(ruleB);

  // 10. Prepare analysis window and filters
  const from = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();
  const to = new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString();

  const broadRequest = {
    from,
    to,
    timeGranularity: "hour" as const,
    ruleIds: [ruleA.id, ruleB.id],
    ruleCategories: [ruleACategory, ruleBCategory],
    severities: [ruleA.severity, ruleB.severity],
    eventTypes: ["payment", "account"],
    includePerRuleBreakdown: true,
    includeTimeSeries: true,
    includeSeverityBreakdown: true,
    includeRuleCategoryBreakdown: true,
  } satisfies IShoppingMallFraudRuleAnalytics.IRequest;

  const broadAnalytics: IShoppingMallFraudRuleAnalytics.IResponse =
    await api.functional.shoppingMall.platformAdmin.analytics.fraudRules.index(
      connection,
      { body: broadRequest },
    );
  typia.assert(broadAnalytics);

  // 11. Structural and internal consistency checks for broad response
  TestValidator.predicate(
    "broad: totalViolations is non-negative",
    broadAnalytics.totalViolations >= 0,
  );
  TestValidator.predicate(
    "broad: uniqueRulesTriggered is non-negative",
    broadAnalytics.uniqueRulesTriggered >= 0,
  );

  if (broadAnalytics.perRuleMetrics !== undefined) {
    const allowedRuleIds = new Set(broadRequest.ruleIds ?? []);
    for (const metric of broadAnalytics.perRuleMetrics) {
      TestValidator.predicate(
        "broad: perRuleMetrics.ruleId is within requested ruleIds",
        allowedRuleIds.has(metric.ruleId),
      );
      TestValidator.predicate(
        "broad: perRuleMetrics.totalViolations is non-negative",
        metric.totalViolations >= 0,
      );
    }
  }

  if (broadAnalytics.timeSeries !== undefined) {
    let prevBucketStart: string | null = null;
    for (const point of broadAnalytics.timeSeries) {
      TestValidator.predicate(
        "broad: timeSeries bucketStart within [from, to]",
        point.bucketStart >= broadAnalytics.from &&
          point.bucketStart <= broadAnalytics.to,
      );
      TestValidator.predicate(
        "broad: timeSeries bucketEnd within [from, to]",
        point.bucketEnd >= broadAnalytics.from &&
          point.bucketEnd <= broadAnalytics.to,
      );
      TestValidator.predicate(
        "broad: timeSeries totalViolations is non-negative",
        point.totalViolations >= 0,
      );
      if (prevBucketStart !== null) {
        TestValidator.predicate(
          "broad: timeSeries bucketStart is sorted",
          point.bucketStart >= prevBucketStart,
        );
      }
      prevBucketStart = point.bucketStart;
    }
  }

  if (broadAnalytics.severityBreakdown !== undefined) {
    const allowedSeverities = new Set(broadRequest.severities ?? []);
    for (const bucket of broadAnalytics.severityBreakdown) {
      TestValidator.predicate(
        "broad: severityBreakdown.totalViolations is non-negative",
        bucket.totalViolations >= 0,
      );
      TestValidator.predicate(
        "broad: severityBreakdown.severity is within requested severities",
        allowedSeverities.has(bucket.severity),
      );
    }
  }

  if (broadAnalytics.ruleCategoryBreakdown !== undefined) {
    const allowedCategories = new Set(broadRequest.ruleCategories ?? []);
    for (const bucket of broadAnalytics.ruleCategoryBreakdown) {
      TestValidator.predicate(
        "broad: ruleCategoryBreakdown.totalViolations is non-negative",
        bucket.totalViolations >= 0,
      );
      TestValidator.predicate(
        "broad: ruleCategoryBreakdown.ruleCategory is within requested categories",
        allowedCategories.has(bucket.ruleCategory),
      );
    }
  }

  // 12. Narrowed filters focusing only on ruleA (high severity payment rule)
  const narrowRequest = {
    from,
    to,
    timeGranularity: "hour" as const,
    ruleIds: [ruleA.id],
    ruleCategories: [ruleACategory],
    severities: [ruleA.severity],
    eventTypes: ["payment"],
    includePerRuleBreakdown: true,
    includeTimeSeries: true,
    includeSeverityBreakdown: true,
    includeRuleCategoryBreakdown: true,
  } satisfies IShoppingMallFraudRuleAnalytics.IRequest;

  const narrowAnalytics: IShoppingMallFraudRuleAnalytics.IResponse =
    await api.functional.shoppingMall.platformAdmin.analytics.fraudRules.index(
      connection,
      { body: narrowRequest },
    );
  typia.assert(narrowAnalytics);

  // 13. Monotonicity checks between broad and narrow analytics
  TestValidator.predicate(
    "narrow: totalViolations should not exceed broad",
    narrowAnalytics.totalViolations <= broadAnalytics.totalViolations,
  );
  TestValidator.predicate(
    "narrow: uniqueRulesTriggered should not exceed broad",
    narrowAnalytics.uniqueRulesTriggered <= broadAnalytics.uniqueRulesTriggered,
  );

  if (
    broadAnalytics.severityBreakdown !== undefined &&
    narrowAnalytics.severityBreakdown !== undefined
  ) {
    const narrowAllowedSeverity = new Set(narrowRequest.severities ?? []);
    for (const bucket of narrowAnalytics.severityBreakdown) {
      TestValidator.predicate(
        "narrow: severityBreakdown.severity matches narrowed severities",
        narrowAllowedSeverity.has(bucket.severity),
      );
    }
  }

  if (
    broadAnalytics.ruleCategoryBreakdown !== undefined &&
    narrowAnalytics.ruleCategoryBreakdown !== undefined
  ) {
    const narrowAllowedCategories = new Set(narrowRequest.ruleCategories ?? []);
    for (const bucket of narrowAnalytics.ruleCategoryBreakdown) {
      TestValidator.predicate(
        "narrow: ruleCategoryBreakdown.ruleCategory matches narrowed categories",
        narrowAllowedCategories.has(bucket.ruleCategory),
      );
    }
  }

  if (
    broadAnalytics.perRuleMetrics !== undefined &&
    narrowAnalytics.perRuleMetrics !== undefined
  ) {
    const broadByRuleId = new Map<
      string,
      IShoppingMallFraudRuleAnalytics.IRuleMetric
    >();
    for (const metric of broadAnalytics.perRuleMetrics) {
      broadByRuleId.set(metric.ruleId, metric);
    }

    for (const metric of narrowAnalytics.perRuleMetrics) {
      TestValidator.predicate(
        "narrow: perRuleMetrics.ruleId must be subset of broad",
        broadByRuleId.has(metric.ruleId),
      );
      const broadMetric = broadByRuleId.get(metric.ruleId);
      if (broadMetric !== undefined) {
        TestValidator.predicate(
          "narrow: perRuleMetrics.totalViolations must not exceed broad",
          metric.totalViolations <= broadMetric.totalViolations,
        );
      }
    }
  }
}
