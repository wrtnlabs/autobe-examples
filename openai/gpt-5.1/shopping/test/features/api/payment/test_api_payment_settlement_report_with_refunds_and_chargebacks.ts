import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEShoppingMallPaymentSettlementStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IEShoppingMallPaymentSettlementStatus";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPaymentSettlementReportRow } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPaymentSettlementReportRow";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallCategoryTree } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategoryTree";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";
import type { IShoppingMallCustomerCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCart";
import type { IShoppingMallCustomerCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCartItem";
import type { IShoppingMallInventoryItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryItem";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderLineThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderLineThumbnail";
import type { IShoppingMallPaymentChargeback } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentChargeback";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import type { IShoppingMallPaymentSettlementReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentSettlementReport";
import type { IShoppingMallPaymentSettlementReportRow } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentSettlementReportRow";
import type { IShoppingMallPaymentTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentTransaction";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallRefundTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundTransaction";
import type { IShoppingMallReportDateRange } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReportDateRange";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";
import type { IShoppingMallSellerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerLogin";
import type { IShoppingMallSellerPayout } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPayout";
import type { IShoppingMallSettlementReportSort } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSettlementReportSort";

export async function test_api_payment_settlement_report_with_refunds_and_chargebacks(
  connection: api.IConnection,
) {
  // 1. Create core actors: platform admin, seller, customer
  const platformAdminJoinBody = {
    email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
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

  // Keep platform admin email/password for later login if needed
  const platformAdminEmail = platformAdminJoinBody.email;
  const platformAdminPassword = platformAdminJoinBody.password;

  const sellerJoinBody = {
    email: `seller+${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    storeName: `Store ${RandomGenerator.name(1)}`,
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuth);
  const seller = sellerAuth.seller;

  const customerJoinBody = {
    email: `customer+${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    ip: null,
    href: "https://shop.example.com/join",
    referrer: "https://shop.example.com/",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerAuth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuth);
  const customer = customerAuth.customer;

  // 2. Switch to platformAdmin context explicitly via login to ensure header state
  await api.functional.auth.platformAdmin.login(connection, {
    body: {
      email: platformAdminEmail,
      password: platformAdminPassword,
      ip: null,
      href: "https://admin.example.com/login",
      referrer: "https://admin.example.com/",
    } satisfies IShoppingMallPlatformAdminLogin.IRequest,
  });

  // 3. Catalog setup as platformAdmin: category tree, brand, product, SKU
  const categoryTreeBody = {
    code: `cat-${RandomGenerator.alphaNumeric(6)}`,
    name: "Main Catalog",
    description: "Main category tree for tests",
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
    description: "Test brand",
    logo_uri: "https://cdn.example.com/logo.png",
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert(brand);

  const productBody = {
    shopping_mall_seller_id: seller.id,
    shopping_mall_brand_id: brand.id,
    code: `prod-${RandomGenerator.alphaNumeric(6)}` as string &
      tags.MinLength<1>,
    name: "Test Product" as string & tags.MinLength<1>,
    short_description: "Short desc",
    description: "Long description for settlement tests",
    status: "active" as string & tags.MinLength<1>,
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
    listPrice: 10000,
    salePrice: 10000,
    currency: "KRW",
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

  // 4. Inventory setup as seller
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerJoinBody.email,
      password: sellerJoinBody.password,
      ip: null,
      href: "https://seller.example.com/login",
      referrer: "https://seller.example.com/",
    } satisfies IShoppingMallSellerLogin.IRequest,
  });

  const inventoryBody = {
    product_sku_id: sku.id,
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

  // 5. Customer cart and order for first (partially refunded) payment
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerJoinBody.email,
      password: customerJoinBody.password,
      ip: null,
      href: "https://shop.example.com/login",
      referrer: "https://shop.example.com/",
    } satisfies IShoppingMallCustomerAuth.ILogin,
  });

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
      { body: cartBody },
    );
  typia.assert(cart);

  const cartItemBody = {
    skuId: sku.id,
    quantity: 2,
    note: "Settlement test item",
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

  const itemsSubtotal = sku.salePrice * cartItem.quantity;
  const discountTotal = 0;
  const shippingTotal = 0;
  const taxTotal = 0;
  const grandTotal = itemsSubtotal - discountTotal + shippingTotal + taxTotal;

  const orderBody: IShoppingMallOrder.ICreate = {
    customer_cart_id: cart.id,
    currency_code: cart.currency_code,
    items_subtotal_amount: itemsSubtotal,
    discount_total_amount: discountTotal,
    shipping_total_amount: shippingTotal,
    tax_total_amount: taxTotal,
    grand_total_amount: grandTotal,
    shipping_address_id: typia.random<string & tags.Format<"uuid">>(),
    billing_address_id: typia.random<string & tags.Format<"uuid">>(),
    customer_note: "Settlement test order",
  };

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderBody,
    });
  typia.assert(order);

  // 6. Platform admin: payment method and transactions
  await api.functional.auth.platformAdmin.login(connection, {
    body: {
      email: platformAdminEmail,
      password: platformAdminPassword,
      ip: null,
      href: "https://admin.example.com/login",
      referrer: "https://admin.example.com/",
    } satisfies IShoppingMallPlatformAdminLogin.IRequest,
  });

  const paymentMethodBody = {
    code: `pm-${RandomGenerator.alphaNumeric(6)}`,
    display_name: "Test Card",
    description: "Test payment method",
    provider_key: "test-gateway",
    method_type: "card",
    currency_restriction: null,
    min_amount: null,
    max_amount: null,
    priority: 1,
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

  const paymentTxBody = {
    orderId: order.id,
    customerId: customer.id,
    paymentMethodId: paymentMethod.id,
    paymentIntentKey: null,
    providerName: "test-gateway",
    providerTransactionId: RandomGenerator.alphaNumeric(12),
    currency: paymentMethodBody.currency_restriction ?? cart.currency_code,
    authorizedAmount: grandTotal,
    capturedAmount: grandTotal,
    paymentStatus: "payment_captured",
    providerStatus: "captured",
    failureReasonCode: null,
    failureReasonMessage: null,
    requiresManualReview: false,
    metadataJson: null,
  } satisfies IShoppingMallPaymentTransaction.ICreate;

  const paymentTx: IShoppingMallPaymentTransaction =
    await api.functional.shoppingMall.platformAdmin.paymentTransactions.create(
      connection,
      { body: paymentTxBody },
    );
  typia.assert(paymentTx);

  // Create a partial refund against this payment
  const partialRefundAmount = grandTotal / 2;

  const refundBody = {
    shopping_mall_payment_transaction_id: paymentTx.id,
    shopping_mall_order_id: order.id,
    refund_number: `rf-${RandomGenerator.alphaNumeric(8)}`,
    refund_status: "refund_pending",
    actor_type: "platformAdmin",
    reason_category: "admin_adjustment",
    reason_message: "Partial refund for settlement test",
    requested_amount: partialRefundAmount,
    approved_amount: partialRefundAmount,
    refunded_amount: null,
    currency: cart.currency_code,
    provider_refund_id: null,
    provider_status: null,
    failure_reason_code: null,
    failure_reason_message: null,
  } satisfies IShoppingMallRefundTransaction.ICreate;

  const refundTx: IShoppingMallRefundTransaction =
    await api.functional.shoppingMall.refundTransactions.create(connection, {
      body: refundBody,
    });
  typia.assert(refundTx);

  // Optional: second order with chargeback
  // Create a simple second order and payment, then attach chargeback
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerJoinBody.email,
      password: customerJoinBody.password,
      ip: null,
      href: "https://shop.example.com/login",
      referrer: "https://shop.example.com/",
    } satisfies IShoppingMallCustomerAuth.ILogin,
  });

  const cart2Body = {
    currency_code: "KRW",
    region_code: "KR-Seoul",
    channel: "web",
    metadata: undefined,
    is_active: true,
    source_guest_token: undefined,
  } satisfies IShoppingMallCustomerCart.ICreate;

  const cart2: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.customerCarts.create(
      connection,
      { body: cart2Body },
    );
  typia.assert(cart2);

  const cart2ItemBody = {
    skuId: sku.id,
    quantity: 1,
    note: "Chargeback test item",
  } satisfies IShoppingMallCustomerCartItem.ICreate;

  const cart2Item: IShoppingMallCustomerCartItem =
    await api.functional.shoppingMall.customer.customerCarts.items.create(
      connection,
      {
        customerCartId: cart2.id,
        body: cart2ItemBody,
      },
    );
  typia.assert(cart2Item);

  const items2Subtotal = sku.salePrice * cart2Item.quantity;
  const order2Body: IShoppingMallOrder.ICreate = {
    customer_cart_id: cart2.id,
    currency_code: cart2.currency_code,
    items_subtotal_amount: items2Subtotal,
    discount_total_amount: 0,
    shipping_total_amount: 0,
    tax_total_amount: 0,
    grand_total_amount: items2Subtotal,
    shipping_address_id: typia.random<string & tags.Format<"uuid">>(),
    billing_address_id: typia.random<string & tags.Format<"uuid">>(),
    customer_note: "Chargeback test order",
  };

  const order2: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: order2Body,
    });
  typia.assert(order2);

  await api.functional.auth.platformAdmin.login(connection, {
    body: {
      email: platformAdminEmail,
      password: platformAdminPassword,
      ip: null,
      href: "https://admin.example.com/login",
      referrer: "https://admin.example.com/",
    } satisfies IShoppingMallPlatformAdminLogin.IRequest,
  });

  const paymentTx2Body = {
    orderId: order2.id,
    customerId: customer.id,
    paymentMethodId: paymentMethod.id,
    paymentIntentKey: null,
    providerName: "test-gateway",
    providerTransactionId: RandomGenerator.alphaNumeric(12),
    currency: cart2.currency_code,
    authorizedAmount: order2Body.grand_total_amount,
    capturedAmount: order2Body.grand_total_amount,
    paymentStatus: "payment_captured",
    providerStatus: "captured",
    failureReasonCode: null,
    failureReasonMessage: null,
    requiresManualReview: false,
    metadataJson: null,
  } satisfies IShoppingMallPaymentTransaction.ICreate;

  const paymentTx2: IShoppingMallPaymentTransaction =
    await api.functional.shoppingMall.platformAdmin.paymentTransactions.create(
      connection,
      { body: paymentTx2Body },
    );
  typia.assert(paymentTx2);

  const chargebackBody = {
    paymentTransactionId: paymentTx2.id,
    orderId: order2.id,
    caseReference: `cb-${RandomGenerator.alphaNumeric(8)}`,
    providerCaseId: `provider-${RandomGenerator.alphaNumeric(8)}`,
    disputedAmount: order2Body.grand_total_amount / 2,
    currency: cart2.currency_code,
    status: "chargeback_open",
    reasonCode: "test_reason",
    reasonMessage: "Chargeback for test",
    openedAt: new Date().toISOString(),
  } satisfies IShoppingMallPaymentChargeback.ICreate;

  const chargeback: IShoppingMallPaymentChargeback =
    await api.functional.shoppingMall.platformAdmin.paymentChargebacks.create(
      connection,
      { body: chargebackBody },
    );
  typia.assert(chargeback);

  // Optional seller payout for completeness
  const payoutBody = {
    seller_id: seller.id,
    currency_code: cart.currency_code,
    gross_amount: grandTotal,
    fee_amount: 0,
    adjustment_amount: 0,
    net_amount: grandTotal,
    period_start: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    period_end: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
    payout_status: "payout_pending",
    scheduled_payout_at: new Date(
      Date.now() + 1000 * 60 * 60 * 24,
    ).toISOString(),
    memo: "Settlement test payout",
  } satisfies IShoppingMallSellerPayout.ICreate;

  const payout: IShoppingMallSellerPayout =
    await api.functional.shoppingMall.platformAdmin.sellerPayouts.create(
      connection,
      { body: payoutBody },
    );
  typia.assert(payout);

  // 7. Call settlement report
  const now = new Date();
  const from = new Date(now.getTime() - 1000 * 60 * 60 * 24).toISOString();
  const to = new Date(now.getTime() + 1000 * 60 * 60 * 24).toISOString();

  const dateRange: IShoppingMallReportDateRange = {
    from,
    to,
  };

  const sort: IShoppingMallSettlementReportSort = {
    field: "transactionCreatedAt",
    direction: "desc",
  };

  const requestBody: IShoppingMallPaymentSettlementReport.IRequest = {
    dateRange,
    timeZone: "Asia/Seoul",
    paymentMethodCodes: [paymentMethod.code],
    currencies: [cart.currency_code],
    sellerIds: [seller.id],
    includePendingRefunds: true,
    includePendingPayouts: true,
    statusFilters: undefined,
    minGrossAmount: undefined,
    maxGrossAmount: undefined,
    page: 1,
    limit: 50,
    sort,
  };

  const reportPage: IPageIShoppingMallPaymentSettlementReportRow =
    await api.functional.shoppingMall.platformAdmin.reports.payment_settlement.index(
      connection,
      { body: requestBody },
    );
  typia.assert(reportPage);

  const pagination: IPage.IPagination = reportPage.pagination;
  typia.assert(pagination);

  TestValidator.predicate(
    "report should have at least one settlement row",
    reportPage.data.length > 0,
  );

  // Find rows for our seller and currency
  const relevantRows: IShoppingMallPaymentSettlementReportRow[] =
    reportPage.data.filter(
      (row) =>
        row.seller.id === seller.id && row.currency === cart.currency_code,
    );

  TestValidator.predicate(
    "should have at least one relevant settlement row",
    relevantRows.length > 0,
  );

  // Check partial refund characteristics
  const anyPartialRefundRow = relevantRows.find(
    (row) => row.refund_amount > 0 && row.chargeback_amount === 0,
  );

  if (anyPartialRefundRow) {
    const row = anyPartialRefundRow;
    TestValidator.predicate(
      "gross sales greater than refund amount for partial refund row",
      row.gross_sales_amount > row.refund_amount,
    );

    TestValidator.predicate(
      "net settlement less than gross for partial refund row",
      row.net_settlement_amount < row.gross_sales_amount,
    );

    TestValidator.predicate(
      "net settlement positive for partial refund row",
      row.net_settlement_amount > 0,
    );
  }

  // Check chargeback characteristics
  const anyChargebackRow = relevantRows.find(
    (row) => row.chargeback_amount > 0,
  );

  if (anyChargebackRow) {
    const row = anyChargebackRow;
    TestValidator.predicate(
      "net settlement less than gross for chargeback row",
      row.net_settlement_amount < row.gross_sales_amount,
    );
  }
}
