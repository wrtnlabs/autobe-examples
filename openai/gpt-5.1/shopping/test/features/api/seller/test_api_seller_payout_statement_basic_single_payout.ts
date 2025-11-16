import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEShoppingMallSellerPayoutStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IEShoppingMallSellerPayoutStatus";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerPayoutStatementRow } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerPayoutStatementRow";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallCategoryTree } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategoryTree";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";
import type { IShoppingMallCustomerCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCart";
import type { IShoppingMallCustomerCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCartItem";
import type { IShoppingMallInventoryItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryItem";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderLine } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderLine";
import type { IShoppingMallOrderLineThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderLineThumbnail";
import type { IShoppingMallOrderSellerSegment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderSellerSegment";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import type { IShoppingMallPaymentTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentTransaction";
import type { IShoppingMallPayoutStatementSort } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayoutStatementSort";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallReportDateRange } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReportDateRange";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";
import type { IShoppingMallSellerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerLogin";
import type { IShoppingMallSellerPayout } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPayout";
import type { IShoppingMallSellerPayoutItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPayoutItem";
import type { IShoppingMallSellerPayoutStatementReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPayoutStatementReport";
import type { IShoppingMallSellerPayoutStatementRow } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPayoutStatementRow";

export async function test_api_seller_payout_statement_basic_single_payout(
  connection: api.IConnection,
) {
  // 1. Platform admin join and auth context
  const platformAdminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.shoppingmall.example.com/join",
    referrer: "https://shoppingmall.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  // 2. Seller join (target of payout)
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuth);

  const seller = sellerAuth.seller;

  // 3. Customer join
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    ip: null,
    href: "https://shoppingmall.example.com/signup",
    referrer: "https://shoppingmall.example.com/landing",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  const customer = customerAuthorized.customer;

  // 4. As platformAdmin, create category tree, brand, product, and SKU
  const categoryTreeBody = {
    code: `tree-${RandomGenerator.alphaNumeric(8)}`,
    name: "Default Category Tree",
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
    logo_uri: "https://cdn.shoppingmall.example.com/logo.png",
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert(brand);

  const productCode = `PROD-${RandomGenerator.alphaNumeric(10)}`;
  const productBody = {
    shopping_mall_seller_id: seller.id,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: `Product ${RandomGenerator.name(1)}`,
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri:
      "https://cdn.shoppingmall.example.com/product-primary.png",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      { body: productBody },
    );
  typia.assert(product);

  const salePrice = 10_000;
  const listPrice = 12_000;
  const currencyCode = "KRW";

  const skuBody = {
    code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
    name: `SKU ${RandomGenerator.name(1)}`,
    listPrice,
    salePrice,
    currency: currencyCode,
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

  // 5. As seller, login and create inventory for the SKU
  const sellerLoginBody = {
    email: sellerJoinBody.email,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.shoppingmall.example.com/login",
    referrer: "https://seller.shoppingmall.example.com/",
  } satisfies IShoppingMallSellerLogin.IRequest;

  const sellerLoginAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoginAuth);

  // Create inventory item with enough stock
  const inventoryBody = {
    product_sku_id: sku.id,
    on_hand_quantity: 10,
    low_stock_threshold: 1,
    backorder_enabled: false,
    preorder_enabled: false,
  } satisfies IShoppingMallInventoryItem.ICreate;

  const inventoryItem: IShoppingMallInventoryItem =
    await api.functional.shoppingMall.seller.inventoryItems.create(connection, {
      body: inventoryBody,
    });
  typia.assert(inventoryItem);

  // 6. As customer, login, create cart, add item, and create order
  const customerLoginBody = {
    email: customerJoinBody.email,
    password: customerJoinBody.password,
    ip: null,
    href: "https://shoppingmall.example.com/login",
    referrer: "https://shoppingmall.example.com/landing",
    userAgent: "E2E-Test-Agent/1.0",
  } satisfies IShoppingMallCustomerAuth.ILogin;

  const customerLoginAuth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLoginAuth);

  const cartBody = {
    currency_code: currencyCode,
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
    quantity: 1,
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

  const itemsSubtotal = salePrice * cartItem.quantity;
  const discountTotal = 0;
  const shippingTotal = 0;
  const taxTotal = 0;
  const grandTotal = itemsSubtotal - discountTotal + shippingTotal + taxTotal;

  // Use random UUIDs for address IDs (no address creation API provided)
  const shippingAddressId = typia.random<string & tags.Format<"uuid">>();
  const billingAddressId = typia.random<string & tags.Format<"uuid">>();

  const orderCreateBody = {
    customer_cart_id: cart.id,
    currency_code: currencyCode,
    items_subtotal_amount: itemsSubtotal,
    discount_total_amount: discountTotal,
    shipping_total_amount: shippingTotal,
    tax_total_amount: taxTotal,
    grand_total_amount: grandTotal,
    shipping_address_id: shippingAddressId,
    billing_address_id: billingAddressId,
    customer_note: "Please handle with care.",
  } satisfies IShoppingMallOrder.ICreate;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateBody,
    });
  typia.assert(order);

  // 7. As platformAdmin, login and create payment transaction
  const platformAdminLoginBody = {
    email: platformAdminJoinBody.email,
    password: platformAdminJoinBody.password,
    ip: null,
    href: "https://admin.shoppingmall.example.com/login",
    referrer: "https://shoppingmall.example.com/",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const platformAdminLoginAuth: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoginAuth);

  const paymentMethodId = typia.random<string & tags.Format<"uuid">>();

  const paymentCreateBody = {
    orderId: order.id,
    customerId: customer.id,
    paymentMethodId,
    paymentIntentKey: null,
    providerName: "test-gateway",
    providerTransactionId: RandomGenerator.alphaNumeric(16),
    currency: currencyCode as string & tags.MinLength<3> & tags.MaxLength<3>,
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
      { body: paymentCreateBody },
    );
  typia.assert(paymentTx);

  // 8. Create seller payout batch and payout item
  const feeAmount = 1000;
  const adjustmentAmount = 0;
  const grossAmount = grandTotal;
  const netAmount = grossAmount - feeAmount + adjustmentAmount;

  const periodStart = new Date();
  const periodEnd = new Date(periodStart.getTime() + 60 * 60 * 1000);

  const payoutCreateBody = {
    seller_id: seller.id,
    currency_code: currencyCode,
    gross_amount: grossAmount,
    fee_amount: feeAmount,
    adjustment_amount: adjustmentAmount,
    net_amount: netAmount,
    period_start: periodStart.toISOString(),
    period_end: periodEnd.toISOString(),
    payout_status: "completed",
    scheduled_payout_at: new Date(
      periodEnd.getTime() + 60 * 60 * 1000,
    ).toISOString(),
    memo: "Single-payout test batch",
  } satisfies IShoppingMallSellerPayout.ICreate;

  const sellerPayout: IShoppingMallSellerPayout =
    await api.functional.shoppingMall.platformAdmin.sellerPayouts.create(
      connection,
      { body: payoutCreateBody },
    );
  typia.assert(sellerPayout);

  const payoutItemCreateBody = {
    shopping_mall_order_id: order.id,
    shopping_mall_order_seller_segment_id: null,
    shopping_mall_order_line_id: null,
    componentType: "item_revenue",
    description: "Revenue for order line(s) in single payout batch",
    currency: currencyCode,
    grossAmount: grossAmount,
    feeAmount: feeAmount,
    taxAmount: 0,
    netAmount: netAmount,
  } satisfies IShoppingMallSellerPayoutItem.ICreate;

  const payoutItem: IShoppingMallSellerPayoutItem =
    await api.functional.shoppingMall.platformAdmin.sellerPayouts.items.create(
      connection,
      {
        sellerPayoutId: sellerPayout.id as string & tags.Format<"uuid">,
        body: payoutItemCreateBody,
      },
    );
  typia.assert(payoutItem);

  // 9. Call seller payout statement report as platformAdmin
  const fromDate = new Date(periodStart.getTime() - 60 * 60 * 1000);
  const toDate = new Date(periodEnd.getTime() + 60 * 60 * 1000);

  const dateRange: IShoppingMallReportDateRange = {
    from: fromDate.toISOString(),
    to: toDate.toISOString(),
  };

  const statusFilter: IEShoppingMallSellerPayoutStatus = "completed";

  const sortConfig: IShoppingMallPayoutStatementSort = {
    field: "payoutCreatedAt",
    direction: "desc",
  };

  const reportRequestBody = {
    dateRange,
    timeZone: "Asia/Seoul",
    sellerIds: [seller.id],
    payoutStatusFilters: [statusFilter],
    currencies: [currencyCode],
    includeOrderBreakdown: false,
    includeRefundAndChargebackImpact: false,
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    sort: sortConfig,
  } satisfies IShoppingMallSellerPayoutStatementReport.IRequest;

  const reportPage: IPageIShoppingMallSellerPayoutStatementRow =
    await api.functional.shoppingMall.platformAdmin.reports.seller_payout_statement.index(
      connection,
      { body: reportRequestBody },
    );
  typia.assert(reportPage);

  const pagination = reportPage.pagination;
  typia.assert<IPage.IPagination>(pagination);

  TestValidator.predicate(
    "report should contain at least one payout statement row",
    reportPage.data.length > 0,
  );

  const matchingRow: IShoppingMallSellerPayoutStatementRow | undefined =
    reportPage.data.find((row) => row.seller.id === seller.id);

  TestValidator.predicate(
    "there should be a statement row for the created seller",
    matchingRow !== undefined,
  );

  if (!matchingRow) return;

  const row = matchingRow;

  TestValidator.equals(
    "row seller id should match seller id",
    row.seller.id,
    seller.id,
  );

  TestValidator.equals(
    "row currency should match payout currency",
    row.currency,
    currencyCode,
  );

  TestValidator.equals(
    "gross payable amount should match payout gross amount",
    row.gross_payable_amount,
    grossAmount,
  );

  TestValidator.equals(
    "platform fee amount should match payout fee amount",
    row.platform_fee_amount,
    feeAmount,
  );

  TestValidator.equals(
    "net payout amount should match payout net amount",
    row.net_payout_amount,
    netAmount,
  );

  TestValidator.equals(
    "payout status should be completed",
    row.payout_status,
    payoutCreateBody.payout_status ?? "completed",
  );

  TestValidator.predicate(
    "settlement period start should be on or after payout period start",
    new Date(row.settlement_period_start).getTime() >=
      periodStart.getTime() - 5 * 60 * 1000,
  );

  TestValidator.predicate(
    "settlement period end should be on or before payout period end",
    new Date(row.settlement_period_end).getTime() <=
      periodEnd.getTime() + 5 * 60 * 1000,
  );

  TestValidator.predicate(
    "related settlement report ids should be an array (length can be >= 0)",
    Array.isArray(row.related_settlement_report_row_ids),
  );
}
