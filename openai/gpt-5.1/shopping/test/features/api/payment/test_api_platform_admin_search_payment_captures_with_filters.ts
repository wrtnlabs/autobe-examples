import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPaymentCapture } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPaymentCapture";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallCategoryTree } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategoryTree";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";
import type { IShoppingMallCustomerCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCart";
import type { IShoppingMallCustomerCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCartItem";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallPaymentAuthorization } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentAuthorization";
import type { IShoppingMallPaymentCapture } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentCapture";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import type { IShoppingMallPaymentTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentTransaction";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate search and filtering of payment captures for a specific payment
 * transaction.
 *
 * Business goal: ensure that the platform admin capture search endpoint (PATCH
 * /shoppingMall/platformAdmin/paymentTransactions/{paymentTransactionId}/captures)
 * correctly applies filter criteria (status, amount range, date range, gateway
 * reference) and scoping to the target payment transaction, with intersection
 * semantics when multiple filters are combined.
 *
 * End-to-end steps:
 *
 * 1. Create and authenticate a platform admin via join (token handled by SDK).
 * 2. As platform admin, create a payment method configuration.
 * 3. As platform admin, create catalog scaffolding: category tree, brand, product,
 *    and SKU. Where DTOs require foreign keys not expressible via available
 *    APIs (e.g., seller ID), use typia.random UUIDs to satisfy structure only;
 *    these relations are not asserted in this test.
 * 4. Create and authenticate a customer. As the customer:
 *
 *    - Create a customer cart.
 *    - Add a cart item referencing the created SKU.
 *    - Create a customer order derived from that cart using
 *         IShoppingMallOrder.ICreate, providing realistic monetary snapshot
 *         values and random UUIDs for shipping_address_id and
 *         billing_address_id.
 * 5. Switch back to the platform admin via login.
 * 6. Create a payment transaction for the order and payment method using
 *    IShoppingMallPaymentTransaction.ICreate.
 * 7. Under that transaction, create three payment capture records via
 *    api.functional.shoppingMall.platformAdmin.paymentTransactions.captures.create
 *    with varied properties:
 *
 *    - CaptureA: status "capture_succeeded", medium amount, specific
 *         provider_capture_id (used later as gatewayReference).
 *    - CaptureB: status "capture_failed", smaller amount, different
 *         provider_capture_id and failure_reason fields.
 *    - CaptureC: status "capture_succeeded" (or another distinct status), larger
 *         amount.
 * 8. Optionally, create another payment transaction and an extra capture under it
 *    to prove that the search endpoint is scoped by paymentTransactionId.
 * 9. Execute search scenarios using
 *    api.functional.shoppingMall.platformAdmin.paymentTransactions.captures.index
 *    and IShoppingMallPaymentCapture.IRequest:
 *
 *    - Baseline: no filters (other than paymentTransactionId); assert all three
 *         captures are returned and pagination metadata is consistent.
 *    - Status filter: status=capture_succeeded; assert only succeeded captures are
 *         returned and failed captureB is excluded.
 *    - Amount range filter: choose [minAmount, maxAmount] that includes only
 *         captureB (e.g., between its amount and just below the others); assert
 *         every returned capture amount is within the inclusive range and that
 *         captureB is present while A/C are absent.
 *    - Date range filter: derive from captureA.created_at; set
 *         fromCapturedAt/toCapturedAt such that captureA is included; assert
 *         all returned created_at values are within range.
 *    - GatewayReference filter: set gatewayReference to captureA's
 *         provider_capture_id; assert all returned captures correspond to that
 *         provider capture reference.
 *    - Combined filter: set status, minAmount/maxAmount, fromCapturedAt,
 *         toCapturedAt, and gatewayReference so that only captureA matches;
 *         assert the data array has exactly one item equal to captureA.id.
 * 10. Throughout, use typia.assert to validate response DTOs, and use
 *     TestValidator.equals/notEquals/predicate with descriptive titles to
 *     assert:
 *
 *     - Scoping by paymentTransactionId (captures from other transactions never
 *           appear).
 *     - Correct application of each individual filter.
 *     - Intersection behavior when combining multiple filters.
 */
export async function test_api_platform_admin_search_payment_captures_with_filters(
  connection: api.IConnection,
) {
  // 1. Platform admin join (and implicit login)
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminJoinBody = {
    email: adminEmail,
    name: RandomGenerator.name(),
    password: "AdminPass123!",
    ip: null,
    href: "https://admin.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/" as string & tags.Format<"uri">,
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create payment method configuration
  const paymentMethodCode = `card_${RandomGenerator.alphaNumeric(8)}`;
  const paymentMethodBody = {
    code: paymentMethodCode,
    display_name: "Test Credit Card",
    description: "E2E test payment method",
    provider_key: "test-gateway-provider",
    method_type: "card",
    currency_restriction: null,
    min_amount: null,
    max_amount: null,
    priority: 1 as number & tags.Type<"int32">,
    is_active: true,
    starts_at: null,
    ends_at: null,
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const paymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.platformAdmin.paymentMethods.create(
      connection,
      { body: paymentMethodBody },
    );
  typia.assert(paymentMethod);

  // Choose a fixed currency code to keep consistency
  const currencyCode = "USD";

  // 3. Catalog scaffolding: category tree, brand, product, SKU
  const categoryTreeBody = {
    code: `tree_${RandomGenerator.alphaNumeric(6)}`,
    name: "Main Catalog Tree",
    description: "E2E test category tree",
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
    description: "E2E test brand",
    logo_uri: "https://cdn.example.com/logo.png" as string & tags.Format<"uri">,
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert(brand);

  // Product requires seller ID; use random UUID just to satisfy type
  const randomSellerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const productCode = `prod_${RandomGenerator.alphaNumeric(8)}`;
  const productBody = {
    shopping_mall_seller_id: randomSellerId,
    shopping_mall_brand_id: brand.id,
    code: productCode as string & tags.MinLength<1>,
    name: "E2E Test Product" as string & tags.MinLength<1>,
    short_description: "Short description for E2E",
    description: "Longer description for E2E product",
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: true,
    primary_image_uri: "https://cdn.example.com/product.png" as
      | (string & tags.Format<"uri">)
      | null,
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      { body: productBody },
    );
  typia.assert(product);

  // SKU under the product
  const skuCode = `sku_${RandomGenerator.alphaNumeric(6)}`;
  const skuBody = {
    code: skuCode,
    name: "Default SKU",
    listPrice: 5000,
    salePrice: 4500,
    currency: currencyCode,
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

  // 4. Customer join and login
  const customerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const customerJoinBody = {
    email: customerEmail,
    password: "CustomerPass123!",
    name: RandomGenerator.name(),
    ip: null,
    href: "https://shop.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://shop.example.com/" as string & tags.Format<"uri">,
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  // As customer, create cart
  const cartBody = {
    currency_code: currencyCode,
    region_code: "TEST-REGION",
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

  // Add an item referencing the SKU
  const cartItemBody = {
    skuId: sku.id,
    quantity: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
    note: "E2E test cart item",
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

  const effectiveUnitPrice =
    cartItem.unitPrice !== null && cartItem.unitPrice !== undefined
      ? cartItem.unitPrice
      : skuBody.salePrice;

  const itemsSubtotal = effectiveUnitPrice * cartItem.quantity;

  // Create order from the cart; snapshot totals are simple multiples
  const orderBody = {
    customer_cart_id: cart.id,
    currency_code: cart.currency_code,
    items_subtotal_amount: itemsSubtotal,
    discount_total_amount: 0,
    shipping_total_amount: 0,
    tax_total_amount: 0,
    grand_total_amount: itemsSubtotal,
    shipping_address_id: typia.random<string & tags.Format<"uuid">>(),
    billing_address_id: typia.random<string & tags.Format<"uuid">>(),
    customer_note: "E2E order note",
  } satisfies IShoppingMallOrder.ICreate;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderBody,
    });
  typia.assert(order);

  // 5. Switch back to platform admin via login (token swap handled by SDK)
  const adminLoginBody = {
    email: adminEmail,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/" as string & tags.Format<"uri">,
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const adminLoginAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginAuthorized);

  // 6. Create payment transaction for the order
  const paymentTransactionBody = {
    orderId: order.id,
    customerId: order.customer_id,
    paymentMethodId: paymentMethod.id,
    paymentIntentKey: `intent_${RandomGenerator.alphaNumeric(10)}`,
    providerName: paymentMethod.provider_key ?? "test-gateway",
    providerTransactionId: `txn_${RandomGenerator.alphaNumeric(10)}`,
    currency: cart.currency_code as string &
      tags.MinLength<3> &
      tags.MaxLength<3>,
    authorizedAmount: order.grand_total_amount,
    capturedAmount: 0,
    paymentStatus: "payment_authorized",
    providerStatus: "authorized",
    failureReasonCode: null,
    failureReasonMessage: null,
    requiresManualReview: false,
    metadataJson: null,
  } satisfies IShoppingMallPaymentTransaction.ICreate;

  const paymentTransaction: IShoppingMallPaymentTransaction =
    await api.functional.shoppingMall.platformAdmin.paymentTransactions.create(
      connection,
      { body: paymentTransactionBody },
    );
  typia.assert(paymentTransaction);

  // 7. Create multiple captures under the payment transaction
  const baseAmount = order.grand_total_amount;

  const captureABody = {
    shopping_mall_payment_authorization_id: null,
    provider_capture_id: `capA_${RandomGenerator.alphaNumeric(6)}`,
    amount: baseAmount * 0.5,
    currency: paymentTransaction.currency,
    capture_status: "capture_succeeded",
    provider_status: "succeeded",
    failure_reason_code: null,
    failure_reason_message: null,
  } satisfies IShoppingMallPaymentCapture.ICreate;

  const captureA: IShoppingMallPaymentCapture =
    await api.functional.shoppingMall.platformAdmin.paymentTransactions.captures.create(
      connection,
      {
        paymentTransactionId: paymentTransaction.id,
        body: captureABody,
      },
    );
  typia.assert(captureA);

  const captureBBody = {
    shopping_mall_payment_authorization_id: null,
    provider_capture_id: `capB_${RandomGenerator.alphaNumeric(6)}`,
    amount: baseAmount * 0.2,
    currency: paymentTransaction.currency,
    capture_status: "capture_failed",
    provider_status: "failed",
    failure_reason_code: "insufficient_funds",
    failure_reason_message: "Card declined for insufficient funds",
  } satisfies IShoppingMallPaymentCapture.ICreate;

  const captureB: IShoppingMallPaymentCapture =
    await api.functional.shoppingMall.platformAdmin.paymentTransactions.captures.create(
      connection,
      {
        paymentTransactionId: paymentTransaction.id,
        body: captureBBody,
      },
    );
  typia.assert(captureB);

  const captureCBody = {
    shopping_mall_payment_authorization_id: null,
    provider_capture_id: `capC_${RandomGenerator.alphaNumeric(6)}`,
    amount: baseAmount * 0.8,
    currency: paymentTransaction.currency,
    capture_status: "capture_succeeded",
    provider_status: "succeeded",
    failure_reason_code: null,
    failure_reason_message: null,
  } satisfies IShoppingMallPaymentCapture.ICreate;

  const captureC: IShoppingMallPaymentCapture =
    await api.functional.shoppingMall.platformAdmin.paymentTransactions.captures.create(
      connection,
      {
        paymentTransactionId: paymentTransaction.id,
        body: captureCBody,
      },
    );
  typia.assert(captureC);

  // Optional: create another transaction and a capture under it to ensure scoping
  const otherPaymentTransactionBody = {
    orderId: order.id,
    customerId: order.customer_id,
    paymentMethodId: paymentMethod.id,
    paymentIntentKey: `intent_${RandomGenerator.alphaNumeric(10)}`,
    providerName: paymentTransactionBody.providerName,
    providerTransactionId: `txn_${RandomGenerator.alphaNumeric(10)}`,
    currency: paymentTransaction.currency,
    authorizedAmount: order.grand_total_amount,
    capturedAmount: 0,
    paymentStatus: "payment_authorized",
    providerStatus: "authorized",
    failureReasonCode: null,
    failureReasonMessage: null,
    requiresManualReview: false,
    metadataJson: null,
  } satisfies IShoppingMallPaymentTransaction.ICreate;

  const otherPaymentTransaction: IShoppingMallPaymentTransaction =
    await api.functional.shoppingMall.platformAdmin.paymentTransactions.create(
      connection,
      { body: otherPaymentTransactionBody },
    );
  typia.assert(otherPaymentTransaction);

  const otherCaptureBody = {
    shopping_mall_payment_authorization_id: null,
    provider_capture_id: `capOther_${RandomGenerator.alphaNumeric(6)}`,
    amount: baseAmount * 0.3,
    currency: paymentTransaction.currency,
    capture_status: "capture_succeeded",
    provider_status: "succeeded",
    failure_reason_code: null,
    failure_reason_message: null,
  } satisfies IShoppingMallPaymentCapture.ICreate;

  const otherCapture: IShoppingMallPaymentCapture =
    await api.functional.shoppingMall.platformAdmin.paymentTransactions.captures.create(
      connection,
      {
        paymentTransactionId: otherPaymentTransaction.id,
        body: otherCaptureBody,
      },
    );
  typia.assert(otherCapture);

  // Helper to extract created_at as Date from summary
  const parseDate = (value: string & tags.Format<"date-time">): Date =>
    new Date(value as string);

  // 9. Baseline search: no filters except transaction ID
  const baselineRequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    pageSize: 20 as number & tags.Type<"int32"> & tags.Minimum<1>,
    sortKey: "created_at",
    sortOrder: "asc" as const,
    status: undefined,
    minAmount: undefined,
    maxAmount: undefined,
    fromCapturedAt: undefined,
    toCapturedAt: undefined,
    gatewayReference: undefined,
  } satisfies IShoppingMallPaymentCapture.IRequest;

  const baselinePage: IPageIShoppingMallPaymentCapture.ISummary =
    await api.functional.shoppingMall.platformAdmin.paymentTransactions.captures.index(
      connection,
      {
        paymentTransactionId: paymentTransaction.id,
        body: baselineRequestBody,
      },
    );
  typia.assert(baselinePage);

  const baselineIds = baselinePage.data.map((c) => c.id);

  TestValidator.predicate(
    "baseline search should contain captureA",
    baselineIds.includes(captureA.id),
  );
  TestValidator.predicate(
    "baseline search should contain captureB",
    baselineIds.includes(captureB.id),
  );
  TestValidator.predicate(
    "baseline search should contain captureC",
    baselineIds.includes(captureC.id),
  );

  TestValidator.predicate(
    "baseline pagination.records should be at least number of created captures",
    baselinePage.pagination.records >= baselinePage.data.length &&
      baselinePage.pagination.records >= 3,
  );

  // Ensure captures from other transaction are not included
  TestValidator.predicate(
    "baseline search should not contain capture from other transaction",
    baselineIds.includes(otherCapture.id) === false,
  );

  // 10. Status filter: only capture_succeeded
  const statusFilterRequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    pageSize: 20 as number & tags.Type<"int32"> & tags.Minimum<1>,
    sortKey: "created_at",
    sortOrder: "asc" as const,
    status: "capture_succeeded",
    minAmount: undefined,
    maxAmount: undefined,
    fromCapturedAt: undefined,
    toCapturedAt: undefined,
    gatewayReference: undefined,
  } satisfies IShoppingMallPaymentCapture.IRequest;

  const statusPage: IPageIShoppingMallPaymentCapture.ISummary =
    await api.functional.shoppingMall.platformAdmin.paymentTransactions.captures.index(
      connection,
      {
        paymentTransactionId: paymentTransaction.id,
        body: statusFilterRequestBody,
      },
    );
  typia.assert(statusPage);

  TestValidator.predicate(
    "all captures in status filter result must have capture_status = capture_succeeded",
    statusPage.data.every((c) => c.capture_status === "capture_succeeded"),
  );

  const statusIds = statusPage.data.map((c) => c.id);

  TestValidator.predicate(
    "status filter should include captureA",
    statusIds.includes(captureA.id),
  );
  TestValidator.predicate(
    "status filter should include captureC",
    statusIds.includes(captureC.id),
  );
  TestValidator.predicate(
    "status filter should NOT include failed captureB",
    statusIds.includes(captureB.id) === false,
  );

  // 11. Amount range filter focused on captureB only
  const minAmount = captureB.amount * 0.9;
  const maxAmount = captureB.amount * 1.1;

  const amountFilterRequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    pageSize: 20 as number & tags.Type<"int32"> & tags.Minimum<1>,
    sortKey: "created_at",
    sortOrder: "asc" as const,
    status: undefined,
    minAmount,
    maxAmount,
    fromCapturedAt: undefined,
    toCapturedAt: undefined,
    gatewayReference: undefined,
  } satisfies IShoppingMallPaymentCapture.IRequest;

  const amountPage: IPageIShoppingMallPaymentCapture.ISummary =
    await api.functional.shoppingMall.platformAdmin.paymentTransactions.captures.index(
      connection,
      {
        paymentTransactionId: paymentTransaction.id,
        body: amountFilterRequestBody,
      },
    );
  typia.assert(amountPage);

  TestValidator.predicate(
    "amount filter results must have amount within [minAmount, maxAmount]",
    amountPage.data.every(
      (c) => c.amount >= minAmount && c.amount <= maxAmount,
    ),
  );

  const amountIds = amountPage.data.map((c) => c.id);

  TestValidator.predicate(
    "amount filter should include captureB",
    amountIds.includes(captureB.id),
  );

  TestValidator.predicate(
    "amount filter should exclude captureA and captureC when ranges are tight",
    amountIds.includes(captureA.id) === false &&
      amountIds.includes(captureC.id) === false,
  );

  // 12. Date range filter: around captureA.created_at as seen from summary
  const baselineSummaryForA = baselinePage.data.find(
    (c) => c.id === captureA.id,
  );
  typia.assertGuard(baselineSummaryForA!);

  const captureACreatedAt = baselineSummaryForA!.created_at;
  const captureADate = parseDate(captureACreatedAt);

  const fromCapturedAt = new Date(
    captureADate.getTime() - 5 * 60 * 1000,
  ).toISOString() as string & tags.Format<"date-time">;
  const toCapturedAt = new Date(
    captureADate.getTime() + 5 * 60 * 1000,
  ).toISOString() as string & tags.Format<"date-time">;

  const dateFilterRequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    pageSize: 20 as number & tags.Type<"int32"> & tags.Minimum<1>,
    sortKey: "created_at",
    sortOrder: "asc" as const,
    status: undefined,
    minAmount: undefined,
    maxAmount: undefined,
    fromCapturedAt,
    toCapturedAt,
    gatewayReference: undefined,
  } satisfies IShoppingMallPaymentCapture.IRequest;

  const datePage: IPageIShoppingMallPaymentCapture.ISummary =
    await api.functional.shoppingMall.platformAdmin.paymentTransactions.captures.index(
      connection,
      {
        paymentTransactionId: paymentTransaction.id,
        body: dateFilterRequestBody,
      },
    );
  typia.assert(datePage);

  TestValidator.predicate(
    "date filter results must have created_at within [fromCapturedAt, toCapturedAt]",
    datePage.data.every((c) => {
      const d = parseDate(c.created_at);
      return d >= new Date(fromCapturedAt) && d <= new Date(toCapturedAt);
    }),
  );

  const dateIds = datePage.data.map((c) => c.id);

  TestValidator.predicate(
    "date filter should include captureA",
    dateIds.includes(captureA.id),
  );

  // 13. gatewayReference filter: provider_capture_id of captureA
  const gatewayReferenceFilterRequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    pageSize: 20 as number & tags.Type<"int32"> & tags.Minimum<1>,
    sortKey: "created_at",
    sortOrder: "asc" as const,
    status: undefined,
    minAmount: undefined,
    maxAmount: undefined,
    fromCapturedAt: undefined,
    toCapturedAt: undefined,
    gatewayReference: captureABody.provider_capture_id,
  } satisfies IShoppingMallPaymentCapture.IRequest;

  const gatewayPage: IPageIShoppingMallPaymentCapture.ISummary =
    await api.functional.shoppingMall.platformAdmin.paymentTransactions.captures.index(
      connection,
      {
        paymentTransactionId: paymentTransaction.id,
        body: gatewayReferenceFilterRequestBody,
      },
    );
  typia.assert(gatewayPage);

  const gatewayIds = gatewayPage.data.map((c) => c.id);

  TestValidator.predicate(
    "gatewayReference filter should return at least one capture",
    gatewayPage.data.length > 0,
  );

  TestValidator.predicate(
    "gatewayReference filter should include captureA",
    gatewayIds.includes(captureA.id),
  );

  // 14. Combined filters: narrow to captureA only
  const combinedMinAmount = captureA.amount * 0.9;
  const combinedMaxAmount = captureA.amount * 1.1;

  const combinedFromCapturedAt = fromCapturedAt;
  const combinedToCapturedAt = toCapturedAt;

  const combinedFilterRequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    pageSize: 20 as number & tags.Type<"int32"> & tags.Minimum<1>,
    sortKey: "created_at",
    sortOrder: "asc" as const,
    status: captureABody.capture_status,
    minAmount: combinedMinAmount,
    maxAmount: combinedMaxAmount,
    fromCapturedAt: combinedFromCapturedAt,
    toCapturedAt: combinedToCapturedAt,
    gatewayReference: captureABody.provider_capture_id,
  } satisfies IShoppingMallPaymentCapture.IRequest;

  const combinedPage: IPageIShoppingMallPaymentCapture.ISummary =
    await api.functional.shoppingMall.platformAdmin.paymentTransactions.captures.index(
      connection,
      {
        paymentTransactionId: paymentTransaction.id,
        body: combinedFilterRequestBody,
      },
    );
  typia.assert(combinedPage);

  const combinedIds = combinedPage.data.map((c) => c.id);

  TestValidator.predicate(
    "combined filters should return exactly one capture",
    combinedPage.data.length === 1,
  );

  TestValidator.predicate(
    "combined filters should return captureA only",
    combinedIds.length === 1 && combinedIds[0] === captureA.id,
  );
}
