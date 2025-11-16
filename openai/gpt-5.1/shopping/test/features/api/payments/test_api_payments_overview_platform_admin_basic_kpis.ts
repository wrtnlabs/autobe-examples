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
import type { IShoppingMallInventoryItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryItem";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderLineThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderLineThumbnail";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import type { IShoppingMallPaymentTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentTransaction";
import type { IShoppingMallPaymentsOverview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentsOverview";
import type { IShoppingMallPaymentsOverviewByDay } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentsOverviewByDay";
import type { IShoppingMallPaymentsOverviewByMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentsOverviewByMethod";
import type { IShoppingMallPaymentsOverviewByStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentsOverviewByStatus";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductOptionType } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionType";
import type { IShoppingMallProductOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionValue";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallRefundTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundTransaction";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";
import type { IShoppingMallSellerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerLogin";

export async function test_api_payments_overview_platform_admin_basic_kpis(
  connection: api.IConnection,
) {
  // 1. Register and authenticate platform admin (actor for dashboard + admin APIs)
  const platformAdminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  // After join(), SDK has set Authorization header for platformAdmin.

  // 2. Register seller and customer actors
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    storeName: RandomGenerator.name(1),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
    ip: null,
    href: "https://shop.example.com/join",
    referrer: "https://shop.example.com/",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  // 3. Ensure we are authenticated back as platformAdmin for admin operations
  const platformAdminLoginBody = {
    email: platformAdmin.email,
    password: platformAdminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const platformAdminLoggedIn: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoggedIn);

  // 4. Create brand and category tree as admin (catalog context)
  const brandBody = {
    name: RandomGenerator.name(1),
    slug: RandomGenerator.alphaNumeric(8),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    logo_uri: "https://cdn.example.com/logo.png" as string & tags.Format<"uri">,
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert(brand);

  const categoryTreeBody = {
    code: `main-${RandomGenerator.alphaNumeric(6)}`,
    name: "Main Catalog",
    description: "Main product category tree for KPI test",
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;

  const categoryTree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      { body: categoryTreeBody },
    );
  typia.assert(categoryTree);

  // 5. Login as seller to create catalog product, option type, value, SKU, inventory
  const sellerLoginBody = {
    email: sellerJoinBody.email,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/",
  } satisfies IShoppingMallSellerLogin.IRequest;

  const sellerLoggedIn: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoggedIn);

  const sellerProductCode = `SELL-${RandomGenerator.alphaNumeric(6)}`;
  const sellerProductBody = {
    shopping_mall_seller_id: sellerLoggedIn.id,
    shopping_mall_brand_id: brand.id,
    code: sellerProductCode as string & tags.MinLength<1>,
    name: "KPI Test Seller Product" as string & tags.MinLength<1>,
    short_description: "Seller product for payments overview KPI test",
    description: RandomGenerator.paragraph({ sentences: 10 }),
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: true,
    primary_image_uri: "https://cdn.example.com/product.png" as string &
      tags.Format<"uri">,
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const sellerProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: sellerProductBody,
    });
  typia.assert(sellerProduct);

  const optionTypeBody = {
    name: "Size",
    display_name: "Size",
    display_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
  } satisfies IShoppingMallProductOptionType.ICreate;

  const optionType: IShoppingMallProductOptionType =
    await api.functional.shoppingMall.seller.products.optionTypes.create(
      connection,
      {
        productCode: sellerProduct.code,
        body: optionTypeBody,
      },
    );
  typia.assert(optionType);

  const optionValueBody = {
    value: "M",
    display_name: "Medium",
    display_order: typia.random<number & tags.Type<"int32">>(),
    is_active: true,
  } satisfies IShoppingMallProductOptionValue.ICreate;

  const optionValue: IShoppingMallProductOptionValue =
    await api.functional.shoppingMall.seller.products.optionTypes.values.create(
      connection,
      {
        productCode: sellerProduct.code,
        productOptionTypeId: optionType.id,
        body: optionValueBody,
      },
    );
  typia.assert(optionValue);

  const sellerSkuPrice = 10000;
  const sellerSkuBody = {
    code: `SELL-SKU-${RandomGenerator.alphaNumeric(4)}`,
    name: "Seller SKU M",
    listPrice: sellerSkuPrice,
    salePrice: sellerSkuPrice,
    currency: "KRW",
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
    on_hand_quantity: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
    low_stock_threshold: undefined,
    backorder_enabled: false,
    preorder_enabled: false,
  } satisfies IShoppingMallInventoryItem.ICreate;

  const inventoryItem: IShoppingMallInventoryItem =
    await api.functional.shoppingMall.seller.inventoryItems.create(connection, {
      body: inventoryBody,
    });
  typia.assert(inventoryItem);

  // 6. As platformAdmin, optionally create a second product + SKU (not strictly needed for KPIs)
  const platformAdminProductCode = `ADMIN-${RandomGenerator.alphaNumeric(6)}`;
  const platformAdminProductBody = {
    shopping_mall_seller_id: sellerLoggedIn.id,
    shopping_mall_brand_id: brand.id,
    code: platformAdminProductCode as string & tags.MinLength<1>,
    name: "KPI Test Admin Product" as string & tags.MinLength<1>,
    short_description: "Admin product for payments overview KPI test",
    description: RandomGenerator.paragraph({ sentences: 6 }),
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: false,
    primary_image_uri: null,
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const platformAdminProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      {
        body: platformAdminProductBody,
      },
    );
  typia.assert(platformAdminProduct);

  const platformAdminSkuBody = {
    code: `ADMIN-SKU-${RandomGenerator.alphaNumeric(4)}`,
    name: "Admin SKU",
    listPrice: 20000,
    salePrice: 20000,
    currency: "KRW",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const platformAdminSku: IShoppingMallProductSku =
    await api.functional.shoppingMall.platformAdmin.products.skus.create(
      connection,
      {
        productCode: platformAdminProduct.code,
        body: platformAdminSkuBody,
      },
    );
  typia.assert(platformAdminSku);

  // 7. Login as customer and create cart + cart item + order
  const customerLoginBody = {
    email: customerJoinBody.email,
    password: customerJoinBody.password,
    ip: null,
    href: "https://shop.example.com/login",
    referrer: "https://shop.example.com/",
  } satisfies IShoppingMallCustomerAuth.ILogin;

  const customerLoggedIn: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLoggedIn);

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

  const cartItemQuantity: number & tags.Type<"int32"> & tags.Minimum<1> =
    1 as number & tags.Type<"int32"> & tags.Minimum<1>;

  const cartItemBody = {
    skuId: sellerSku.id,
    quantity: cartItemQuantity,
    note: "KPI test cart item",
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

  const orderBody = {
    customer_cart_id: cart.id,
    currency_code: cart.currency_code,
    items_subtotal_amount: cart.subtotal_amount,
    discount_total_amount: cart.discount_amount,
    shipping_total_amount: cart.shipping_amount,
    tax_total_amount: cart.tax_amount,
    grand_total_amount: cart.total_amount,
    shipping_address_id: typia.random<string & tags.Format<"uuid">>(),
    billing_address_id: typia.random<string & tags.Format<"uuid">>(),
    customer_note: "KPI test order",
  } satisfies IShoppingMallOrder.ICreate;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderBody,
    });
  typia.assert(order);

  // Extract an order summary-like view for thumbnail typings (we only care about totals here)
  const orderTotalAmount = order.grand_total_amount;

  // 8. Switch back to platformAdmin to create payment methods and transactions
  const reloginAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(reloginAdmin);

  const cardMethodCode = `CARD-${RandomGenerator.alphaNumeric(4)}`;
  const bankMethodCode = `BANK-${RandomGenerator.alphaNumeric(4)}`;

  const cardPaymentMethodBody = {
    code: cardMethodCode,
    display_name: "Test Credit Card",
    description: "Card method for KPI test",
    provider_key: "card-gateway",
    method_type: "card",
    currency_restriction: null,
    min_amount: null,
    max_amount: null,
    priority: 1 as number & tags.Type<"int32">,
    is_active: true,
    starts_at: null,
    ends_at: null,
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const cardMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.platformAdmin.paymentMethods.create(
      connection,
      {
        body: cardPaymentMethodBody,
      },
    );
  typia.assert(cardMethod);

  const bankPaymentMethodBody = {
    code: bankMethodCode,
    display_name: "Test Bank Transfer",
    description: "Bank transfer method for KPI test",
    provider_key: "bank-gateway",
    method_type: "bank",
    currency_restriction: null,
    min_amount: null,
    max_amount: null,
    priority: 2 as number & tags.Type<"int32">,
    is_active: true,
    starts_at: null,
    ends_at: null,
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const bankMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.platformAdmin.paymentMethods.create(
      connection,
      {
        body: bankPaymentMethodBody,
      },
    );
  typia.assert(bankMethod);

  // Create three payment transactions: one successful capture, one failed, one pending
  const successPaymentStatus = "payment_captured";
  const failedPaymentStatus = "payment_failed";
  const pendingPaymentStatus = "payment_pending";

  const successfulPaymentBody = {
    orderId: order.id,
    customerId: customerLoggedIn.id,
    paymentMethodId: cardMethod.id,
    paymentIntentKey: `intent-${RandomGenerator.alphaNumeric(8)}`,
    providerName: "card-gateway",
    providerTransactionId: RandomGenerator.alphaNumeric(12),
    currency: order.currency_code as string &
      tags.MinLength<3> &
      tags.MaxLength<3>,
    authorizedAmount: orderTotalAmount,
    capturedAmount: orderTotalAmount,
    paymentStatus: successPaymentStatus,
    providerStatus: "captured",
    failureReasonCode: null,
    failureReasonMessage: null,
    requiresManualReview: false,
    metadataJson: null,
  } satisfies IShoppingMallPaymentTransaction.ICreate;

  const successfulPayment: IShoppingMallPaymentTransaction =
    await api.functional.shoppingMall.platformAdmin.paymentTransactions.create(
      connection,
      {
        body: successfulPaymentBody,
      },
    );
  typia.assert(successfulPayment);

  const failedPaymentBody = {
    orderId: order.id,
    customerId: customerLoggedIn.id,
    paymentMethodId: cardMethod.id,
    paymentIntentKey: `intent-${RandomGenerator.alphaNumeric(8)}`,
    providerName: "card-gateway",
    providerTransactionId: RandomGenerator.alphaNumeric(12),
    currency: order.currency_code as string &
      tags.MinLength<3> &
      tags.MaxLength<3>,
    authorizedAmount: orderTotalAmount,
    capturedAmount: null,
    paymentStatus: failedPaymentStatus,
    providerStatus: "failed",
    failureReasonCode: "DECLINED",
    failureReasonMessage: "Card declined",
    requiresManualReview: false,
    metadataJson: null,
  } satisfies IShoppingMallPaymentTransaction.ICreate;

  const failedPayment: IShoppingMallPaymentTransaction =
    await api.functional.shoppingMall.platformAdmin.paymentTransactions.create(
      connection,
      {
        body: failedPaymentBody,
      },
    );
  typia.assert(failedPayment);

  const pendingPaymentBody = {
    orderId: order.id,
    customerId: customerLoggedIn.id,
    paymentMethodId: bankMethod.id,
    paymentIntentKey: `intent-${RandomGenerator.alphaNumeric(8)}`,
    providerName: "bank-gateway",
    providerTransactionId: null,
    currency: order.currency_code as string &
      tags.MinLength<3> &
      tags.MaxLength<3>,
    authorizedAmount: null,
    capturedAmount: null,
    paymentStatus: pendingPaymentStatus,
    providerStatus: "pending",
    failureReasonCode: null,
    failureReasonMessage: null,
    requiresManualReview: false,
    metadataJson: null,
  } satisfies IShoppingMallPaymentTransaction.ICreate;

  const pendingPayment: IShoppingMallPaymentTransaction =
    await api.functional.shoppingMall.platformAdmin.paymentTransactions.create(
      connection,
      {
        body: pendingPaymentBody,
      },
    );
  typia.assert(pendingPayment);

  // 9. Create a refund transaction for the successful payment
  const refundAmount = orderTotalAmount / 2;

  const refundBody = {
    shopping_mall_payment_transaction_id: successfulPayment.id,
    shopping_mall_order_id: order.id,
    refund_number: `RF-${RandomGenerator.alphaNumeric(6)}`,
    refund_status: "refund_completed",
    actor_type: "admin",
    reason_category: "admin_adjustment",
    reason_message: "Partial refund for KPI test",
    requested_amount: refundAmount,
    approved_amount: refundAmount,
    refunded_amount: refundAmount,
    currency: order.currency_code,
    provider_refund_id: RandomGenerator.alphaNumeric(10),
    provider_status: "completed",
    failure_reason_code: null,
    failure_reason_message: null,
  } satisfies IShoppingMallRefundTransaction.ICreate;

  const refund: IShoppingMallRefundTransaction =
    await api.functional.shoppingMall.refundTransactions.create(connection, {
      body: refundBody,
    });
  typia.assert(refund);

  // 10. Call payments overview dashboard as admin
  const paymentsOverview: IShoppingMallPaymentsOverview =
    await api.functional.shoppingMall.platformAdmin.dashboard.payments_overview.at(
      connection,
    );
  typia.assert(paymentsOverview);

  // Basic sanity checks on totals
  TestValidator.predicate(
    "totalProcessedAmount should be non-negative",
    paymentsOverview.totalProcessedAmount >= 0,
  );
  TestValidator.predicate(
    "totalRefundAmount should be non-negative",
    paymentsOverview.totalRefundAmount >= 0,
  );
  TestValidator.predicate(
    "successfulTransactionCount should be non-negative",
    paymentsOverview.successfulTransactionCount >= 0,
  );
  TestValidator.predicate(
    "failedTransactionCount should be non-negative",
    paymentsOverview.failedTransactionCount >= 0,
  );
  TestValidator.predicate(
    "pendingTransactionCount should be non-negative",
    paymentsOverview.pendingTransactionCount >= 0,
  );
  TestValidator.predicate(
    "refundCount should be non-negative",
    paymentsOverview.refundCount >= 0,
  );

  if (paymentsOverview.totalProcessedAmount > 0) {
    TestValidator.predicate(
      "refundRate should be between 0 and 1 when totalProcessedAmount > 0",
      paymentsOverview.refundRate >= 0 && paymentsOverview.refundRate <= 1,
    );
  }

  // Ensure our refund contributed at least once
  TestValidator.predicate(
    "refundCount should be at least 1 after creating a refund",
    paymentsOverview.refundCount >= 1,
  );
  TestValidator.predicate(
    "totalRefundAmount should be at least our refund",
    paymentsOverview.totalRefundAmount >= refundAmount,
  );

  // Validate byMethod breakdown includes our card and bank methods with reasonable counts
  const byMethod = paymentsOverview.byMethod;

  const cardMethodEntry: IShoppingMallPaymentsOverviewByMethod | undefined =
    byMethod.find((m) => m.methodCode === cardMethod.code);
  const bankMethodEntry: IShoppingMallPaymentsOverviewByMethod | undefined =
    byMethod.find((m) => m.methodCode === bankMethod.code);

  TestValidator.predicate(
    "byMethod should contain a card method entry for our created method",
    !!cardMethodEntry,
  );
  TestValidator.predicate(
    "byMethod should contain a bank method entry for our created method",
    !!bankMethodEntry,
  );

  if (cardMethodEntry) {
    TestValidator.predicate(
      "card method transactionCount should be at least 2 (success + failed)",
      cardMethodEntry.transactionCount >= 2,
    );
    TestValidator.predicate(
      "card method totalAmount should be at least captured amount of our successful payment",
      cardMethodEntry.totalAmount >= (successfulPayment.capturedAmount ?? 0),
    );
  }

  if (bankMethodEntry) {
    TestValidator.predicate(
      "bank method transactionCount should be at least 1 (pending)",
      bankMethodEntry.transactionCount >= 1,
    );
  }

  // Validate byStatus breakdown contains entries for our statuses
  const byStatus = paymentsOverview.byStatus;

  const successStatusEntry: IShoppingMallPaymentsOverviewByStatus | undefined =
    byStatus.find((s) => s.status === successPaymentStatus);
  const failedStatusEntry: IShoppingMallPaymentsOverviewByStatus | undefined =
    byStatus.find((s) => s.status === failedPaymentStatus);
  const pendingStatusEntry: IShoppingMallPaymentsOverviewByStatus | undefined =
    byStatus.find((s) => s.status === pendingPaymentStatus);

  TestValidator.predicate(
    "byStatus should contain our success payment status bucket",
    !!successStatusEntry,
  );
  TestValidator.predicate(
    "byStatus should contain our failed payment status bucket",
    !!failedStatusEntry,
  );
  TestValidator.predicate(
    "byStatus should contain our pending payment status bucket",
    !!pendingStatusEntry,
  );

  if (successStatusEntry) {
    TestValidator.predicate(
      "success status transactionCount should be at least 1",
      successStatusEntry.transactionCount >= 1,
    );
    TestValidator.predicate(
      "success status totalAmount should be at least our captured amount",
      successStatusEntry.totalAmount >= (successfulPayment.capturedAmount ?? 0),
    );
  }

  if (failedStatusEntry) {
    TestValidator.predicate(
      "failed status transactionCount should be at least 1",
      failedStatusEntry.transactionCount >= 1,
    );
  }

  if (pendingStatusEntry) {
    TestValidator.predicate(
      "pending status transactionCount should be at least 1",
      pendingStatusEntry.transactionCount >= 1,
    );
  }

  // Validate byDay has at least one entry and that totals are consistent lower bounds
  const byDay = paymentsOverview.byDay;

  TestValidator.predicate(
    "byDay should have at least one entry",
    byDay.length >= 1,
  );

  const today = new Date();
  const todayDateString = today.toISOString().slice(0, 10) as string &
    tags.Format<"date">;

  const todayEntry: IShoppingMallPaymentsOverviewByDay | undefined = byDay.find(
    (d) => d.date === todayDateString,
  );

  if (todayEntry) {
    TestValidator.predicate(
      "today's successfulTransactionCount should be at least 1",
      todayEntry.successfulTransactionCount >= 1,
    );
    TestValidator.predicate(
      "today's totalProcessedAmount should be at least our captured amount",
      todayEntry.totalProcessedAmount >=
        (successfulPayment.capturedAmount ?? 0),
    );
    if (todayEntry.refundAmount !== undefined) {
      TestValidator.predicate(
        "today's refundAmount should be at least our refund",
        todayEntry.refundAmount >= refundAmount,
      );
    }
  }
}
