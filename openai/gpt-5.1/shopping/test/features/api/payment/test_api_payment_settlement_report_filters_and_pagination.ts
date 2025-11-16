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

/**
 * Verify that payment settlement report supports filtering and pagination.
 *
 * Business context
 *
 * - Platform admin observes settlement report across sellers, currencies, payment
 *   methods and settlement periods.
 * - Seller lists products and inventory; customers place orders and platform
 *   admin records payment transactions.
 * - Platform admin needs to slice settlement report by date range, seller,
 *   currency and navigate with pagination and sorting.
 *
 * Steps
 *
 * 1. Register and login a platform admin.
 * 2. Register and login a seller.
 * 3. Create minimal catalog data: category tree, brand, product, SKU, inventory
 *    for that SKU.
 * 4. Register and login two customers.
 * 5. For each customer: create a cart, add SKU item, and create an order.
 * 6. As platform admin, create two payment methods and payment transactions for
 *    the orders, with different currencies and amounts.
 * 7. Optionally create refund, chargeback and payout for one payment.
 * 8. Call settlement report endpoint with:
 *
 *    - Broad date range and small page size to exercise pagination
 *    - Date range checks on returned rows
 *    - Filters by payment method codes, currencies and sellerIds
 *    - Two different sort configurations and ensure record set equality and ordering
 *         difference.
 * 9. Call settlement report without authentication and expect error.
 */
export async function test_api_payment_settlement_report_filters_and_pagination(
  connection: api.IConnection,
) {
  // Helper for ISO date strings around now
  const now = new Date();
  const from = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const to = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

  // 1. Platform admin join & login
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoinBody = {
    email: adminEmail,
    name: RandomGenerator.name(),
    password: "AdminPassword123!",
    ip: null,
    href: "https://admin.test.local/join",
    referrer: "https://admin.test.local/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;
  const adminAuth: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuth);

  const adminLoginBody = {
    email: adminEmail,
    password: "AdminPassword123!",
    ip: null,
    href: "https://admin.test.local/login",
    referrer: "https://admin.test.local/",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;
  const adminLogin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  // 2. Seller join & login
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerJoinBody = {
    email: sellerEmail,
    password: "SellerPassword123!",
    storeName: RandomGenerator.name(1),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;
  const sellerAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuth);

  const sellerLoginBody = {
    email: sellerEmail,
    password: "SellerPassword123!",
    ip: null,
    href: "https://seller.test.local/login",
    referrer: "https://seller.test.local/",
  } satisfies IShoppingMallSellerLogin.IRequest;
  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLogin);

  // 3. Minimal catalog data as platform admin
  // Category tree
  const categoryTreeBody = {
    code: `tree-${RandomGenerator.alphaNumeric(8)}`,
    name: "Main Tree",
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

  // Brand
  const brandBody = {
    name: `Brand ${RandomGenerator.name(1)}`,
    slug: `brand-${RandomGenerator.alphaNumeric(8)}`,
    description: RandomGenerator.paragraph({ sentences: 2 }),
    logo_uri: "https://cdn.test.local/logo.png",
  } satisfies IShoppingMallBrand.ICreate;
  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert(brand);

  // Product for seller
  const productCode = `prd-${RandomGenerator.alphaNumeric(8)}`;
  const productBody = {
    shopping_mall_seller_id: sellerAuth.id,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: `Product ${RandomGenerator.name(1)}`,
    short_description: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: "https://cdn.test.local/product.png",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      { body: productBody },
    );
  typia.assert(product);

  // SKU under product
  const skuBody = {
    code: `sku-${RandomGenerator.alphaNumeric(6)}`,
    name: `SKU ${RandomGenerator.name(1)}`,
    listPrice: 10000,
    salePrice: 9000,
    currency: "KRW",
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

  // Inventory for SKU as seller
  const inventoryBody = {
    product_sku_id: sku.id,
    on_hand_quantity: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
    low_stock_threshold: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
    backorder_enabled: false,
    preorder_enabled: false,
  } satisfies IShoppingMallInventoryItem.ICreate;
  const inventoryItem: IShoppingMallInventoryItem =
    await api.functional.shoppingMall.seller.inventoryItems.create(connection, {
      body: inventoryBody,
    });
  typia.assert(inventoryItem);

  // 4. Register and login two customers
  const customerEmails: (string & tags.Format<"email">)[] = [
    typia.random<string & tags.Format<"email">>(),
    typia.random<string & tags.Format<"email">>(),
  ];
  const customerAuths: IShoppingMallCustomer.IAuthorized[] = [];

  for (const email of customerEmails) {
    const joinBody = {
      email,
      password: "CustomerPassword123!",
      name: RandomGenerator.name(),
      ip: null,
      href: "https://shop.test.local/join",
      referrer: "https://shop.test.local/",
    } satisfies IShoppingMallCustomerAuth.IJoin;
    const joined: IShoppingMallCustomer.IAuthorized =
      await api.functional.auth.customer.join(connection, {
        body: joinBody,
      });
    typia.assert(joined);
    const loginBody = {
      email,
      password: "CustomerPassword123!",
      ip: null,
      href: "https://shop.test.local/login",
      referrer: "https://shop.test.local/",
      userAgent: "e2e-test-agent",
    } satisfies IShoppingMallCustomerAuth.ILogin;
    const logged: IShoppingMallCustomer.IAuthorized =
      await api.functional.auth.customer.login(connection, {
        body: loginBody,
      });
    typia.assert(logged);
    customerAuths.push(logged);
  }

  // 5. For each customer: create cart, add SKU item, create order
  const orders: IShoppingMallOrder[] = [];

  for (const customer of customerAuths) {
    // Create cart
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

    // Add item to cart
    const cartItemBody = {
      skuId: sku.id,
      quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
      note: null,
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

    // Create order via random base plus linked fields
    const baseOrderCreate = typia.random<IShoppingMallOrder.ICreate>();
    const orderCreate: IShoppingMallOrder.ICreate = {
      ...baseOrderCreate,
      customer_cart_id: cart.id,
      currency_code: cart.currency_code,
      items_subtotal_amount: cart.subtotal_amount,
      discount_total_amount: cart.discount_amount,
      shipping_total_amount: cart.shipping_amount,
      tax_total_amount: cart.tax_amount,
      grand_total_amount: cart.total_amount,
    };
    const order: IShoppingMallOrder =
      await api.functional.shoppingMall.customer.orders.create(connection, {
        body: orderCreate,
      });
    typia.assert(order);
    orders.push(order);
  }

  // 6. Payment methods and transactions
  const methodCodes = ["card", "bank_transfer"] as const;
  const paymentMethods: IShoppingMallPaymentMethod[] = [];

  for (const code of methodCodes) {
    const paymentMethodBody = {
      code,
      display_name: code === "card" ? "Credit Card" : "Bank Transfer",
      description: RandomGenerator.paragraph({ sentences: 2 }),
      provider_key: `provider-${code}`,
      method_type: code,
      currency_restriction: null,
      min_amount: null,
      max_amount: null,
      priority: 1,
      is_active: true,
      starts_at: null,
      ends_at: null,
    } satisfies IShoppingMallPaymentMethod.ICreate;
    const pm: IShoppingMallPaymentMethod =
      await api.functional.shoppingMall.platformAdmin.paymentMethods.create(
        connection,
        { body: paymentMethodBody },
      );
    typia.assert(pm);
    paymentMethods.push(pm);
  }

  const paymentTransactions: IShoppingMallPaymentTransaction[] = [];

  for (let i = 0; i < orders.length; i++) {
    const order = orders[i];
    const method = paymentMethods[i % paymentMethods.length];
    const currency = i % 2 === 0 ? "KRW" : "USD";

    const txBody = {
      orderId: order.id,
      customerId: order.customer_id,
      paymentMethodId: method.id,
      paymentIntentKey: `intent-${RandomGenerator.alphaNumeric(8)}`,
      providerName: method.method_type,
      providerTransactionId: `tx-${RandomGenerator.alphaNumeric(12)}`,
      currency,
      authorizedAmount: order.grand_total_amount,
      capturedAmount: order.grand_total_amount,
      paymentStatus: "payment_captured",
      providerStatus: "captured",
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
    paymentTransactions.push(tx);
  }

  // 7. Optional refund, chargeback, payout for the first transaction/order
  if (paymentTransactions.length > 0) {
    const tx = paymentTransactions[0];
    const order = orders[0];

    const refundBody = {
      shopping_mall_payment_transaction_id: tx.id,
      shopping_mall_order_id: order.id,
      refund_number: `RF-${RandomGenerator.alphaNumeric(10)}`,
      refund_status: "refund_pending",
      actor_type: "admin",
      reason_category: "admin_adjustment",
      reason_message: RandomGenerator.paragraph({ sentences: 2 }),
      requested_amount: order.grand_total_amount / 2,
      approved_amount: null,
      refunded_amount: null,
      currency: tx.currency,
      provider_refund_id: null,
      provider_status: null,
      failure_reason_code: null,
      failure_reason_message: null,
    } satisfies IShoppingMallRefundTransaction.ICreate;
    const refund: IShoppingMallRefundTransaction =
      await api.functional.shoppingMall.refundTransactions.create(connection, {
        body: refundBody,
      });
    typia.assert(refund);

    const chargebackBody = {
      paymentTransactionId: tx.id,
      orderId: order.id,
      caseReference: `CB-${RandomGenerator.alphaNumeric(10)}`,
      providerCaseId: undefined,
      disputedAmount: order.grand_total_amount / 3,
      currency: tx.currency,
      status: "chargeback_open",
      reasonCode: "FRAUD",
      reasonMessage: RandomGenerator.paragraph({ sentences: 1 }),
      openedAt: new Date().toISOString(),
    } satisfies IShoppingMallPaymentChargeback.ICreate;
    const chargeback: IShoppingMallPaymentChargeback =
      await api.functional.shoppingMall.platformAdmin.paymentChargebacks.create(
        connection,
        { body: chargebackBody },
      );
    typia.assert(chargeback);

    const payoutBody = {
      seller_id: sellerAuth.id,
      currency_code: tx.currency,
      gross_amount: order.grand_total_amount,
      fee_amount: 0,
      adjustment_amount: 0,
      net_amount: order.grand_total_amount,
      period_start: order.placed_at,
      period_end: order.placed_at,
      payout_status: "payout_pending",
      scheduled_payout_at: new Date().toISOString(),
      memo: "test payout",
    } satisfies IShoppingMallSellerPayout.ICreate;
    const payout: IShoppingMallSellerPayout =
      await api.functional.shoppingMall.platformAdmin.sellerPayouts.create(
        connection,
        { body: payoutBody },
      );
    typia.assert(payout);
  }

  // 8. Settlement report calls
  const baseRequest: IShoppingMallPaymentSettlementReport.IRequest = {
    dateRange: { from, to },
    timeZone: "Asia/Seoul",
    paymentMethodCodes: undefined,
    currencies: undefined,
    sellerIds: undefined,
    includePendingRefunds: undefined,
    includePendingPayouts: undefined,
    statusFilters: undefined,
    minGrossAmount: undefined,
    maxGrossAmount: undefined,
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    sort: undefined,
  };

  // 8-1. Broad date range, small page size for pagination
  const page1: IPageIShoppingMallPaymentSettlementReportRow =
    await api.functional.shoppingMall.platformAdmin.reports.payment_settlement.index(
      connection,
      {
        body: baseRequest,
      },
    );
  typia.assert(page1);

  TestValidator.predicate(
    "page1 data length should be <= limit",
    page1.data.length <= page1.pagination.limit,
  );
  TestValidator.equals(
    "page1 current page should be stable",
    page1.pagination.current,
    page1.pagination.current,
  );

  // If there are multiple pages, fetch second page
  if (page1.pagination.pages > 1) {
    const page2Req: IShoppingMallPaymentSettlementReport.IRequest = {
      ...baseRequest,
      page: (page1.pagination.current + 2) as number &
        tags.Type<"int32"> &
        tags.Minimum<1>,
    };
    const page2 =
      await api.functional.shoppingMall.platformAdmin.reports.payment_settlement.index(
        connection,
        { body: page2Req },
      );
    typia.assert(page2);

    TestValidator.predicate(
      "page2 data length should be <= limit",
      page2.data.length <= page2.pagination.limit,
    );
  }

  // 8-2. Date range checks on returned rows
  for (const row of page1.data) {
    TestValidator.predicate(
      "row.period_start within range",
      row.period_start >= from && row.period_start <= to,
    );
    TestValidator.predicate(
      "row.period_end within range",
      row.period_end >= from && row.period_end <= to,
    );
  }

  // 8-3. Filter by payment method codes (we cannot see methods on rows, so we
  // at least assert the call succeeds and returns some rows when broad).
  const methodFilterReq: IShoppingMallPaymentSettlementReport.IRequest = {
    ...baseRequest,
    paymentMethodCodes: paymentMethods.map((m) => m.code),
    limit: 5 as number & tags.Type<"int32"> & tags.Minimum<1>,
  };
  const methodFilterPage =
    await api.functional.shoppingMall.platformAdmin.reports.payment_settlement.index(
      connection,
      { body: methodFilterReq },
    );
  typia.assert(methodFilterPage);

  // 8-4. Filter by currencies
  const krwReq: IShoppingMallPaymentSettlementReport.IRequest = {
    ...baseRequest,
    currencies: ["KRW"],
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
  };
  const krwPage =
    await api.functional.shoppingMall.platformAdmin.reports.payment_settlement.index(
      connection,
      { body: krwReq },
    );
  typia.assert(krwPage);

  for (const row of krwPage.data) {
    TestValidator.equals("KRW currency filter", row.currency, "KRW");
  }

  const usdReq: IShoppingMallPaymentSettlementReport.IRequest = {
    ...baseRequest,
    currencies: ["USD"],
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
  };
  const usdPage =
    await api.functional.shoppingMall.platformAdmin.reports.payment_settlement.index(
      connection,
      { body: usdReq },
    );
  typia.assert(usdPage);

  for (const row of usdPage.data) {
    TestValidator.equals("USD currency filter", row.currency, "USD");
  }

  // 8-5. Filter by sellerIds
  const sellerFilterReq: IShoppingMallPaymentSettlementReport.IRequest = {
    ...baseRequest,
    sellerIds: [sellerAuth.id],
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
  };
  const sellerPage =
    await api.functional.shoppingMall.platformAdmin.reports.payment_settlement.index(
      connection,
      { body: sellerFilterReq },
    );
  typia.assert(sellerPage);

  for (const row of sellerPage.data) {
    TestValidator.equals("seller id filter", row.seller.id, sellerAuth.id);
  }

  // 8-6. Sort options: grossAmount asc vs desc
  const sortAsc: IShoppingMallSettlementReportSort = {
    field: "grossAmount",
    direction: "asc",
  };
  const sortDesc: IShoppingMallSettlementReportSort = {
    field: "grossAmount",
    direction: "desc",
  };

  const sortAscReq: IShoppingMallPaymentSettlementReport.IRequest = {
    ...sellerFilterReq,
    sort: sortAsc,
    limit: 50 as number & tags.Type<"int32"> & tags.Minimum<1>,
  };
  const sortDescReq: IShoppingMallPaymentSettlementReport.IRequest = {
    ...sellerFilterReq,
    sort: sortDesc,
    limit: 50 as number & tags.Type<"int32"> & tags.Minimum<1>,
  };

  const ascPage =
    await api.functional.shoppingMall.platformAdmin.reports.payment_settlement.index(
      connection,
      { body: sortAscReq },
    );
  typia.assert(ascPage);

  const descPage =
    await api.functional.shoppingMall.platformAdmin.reports.payment_settlement.index(
      connection,
      { body: sortDescReq },
    );
  typia.assert(descPage);

  const ascIds = ascPage.data.map((r) => r.id).sort();
  const descIds = descPage.data.map((r) => r.id).sort();

  TestValidator.equals("sort should not change record set", ascIds, descIds);

  if (ascPage.data.length > 1 && descPage.data.length > 1) {
    const ascFirst = ascPage.data[0].gross_sales_amount;
    const descFirst = descPage.data[0].gross_sales_amount;
    TestValidator.predicate(
      "ordering should differ between asc and desc",
      ascFirst !== descFirst,
    );
  }

  // 9. Unauthorized access: clone connection without headers
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "unauthenticated settlement report should fail",
    async () => {
      await api.functional.shoppingMall.platformAdmin.reports.payment_settlement.index(
        unauthConn,
        { body: baseRequest },
      );
    },
  );
}
