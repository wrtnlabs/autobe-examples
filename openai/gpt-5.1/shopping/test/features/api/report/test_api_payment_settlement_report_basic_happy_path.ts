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
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import type { IShoppingMallPaymentSettlementReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentSettlementReport";
import type { IShoppingMallPaymentSettlementReportRow } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentSettlementReportRow";
import type { IShoppingMallPaymentTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentTransaction";
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
import type { IShoppingMallSettlementReportSort } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSettlementReportSort";

/**
 * Basic happy-path payment settlement report generation.
 *
 * This E2E test wires together a minimal but realistic payment flow that should
 * produce at least one settlement row for the platform-admin payment settlement
 * report.
 *
 * Steps:
 *
 * 1. Register and authenticate a platformAdmin, seller, and customer.
 * 2. As platformAdmin, create brand, category tree, product, and SKU for the
 *    seller.
 * 3. As seller, create inventory for the SKU so it can be sold.
 * 4. As customer, create a cart, add the SKU as an item, and create an order from
 *    that cart with coherent monetary snapshots.
 * 5. As platformAdmin, create a payment method.
 * 6. As platformAdmin, create a payment transaction with paymentStatus
 *    "payment_captured" and capturedAmount equal to the order
 *    grand_total_amount.
 * 7. As platformAdmin, call the payment settlement report endpoint with a
 *    dateRange and filters that should include the created transaction.
 * 8. Assert that the report pagination metadata is sane and that at least one row
 *    matches the seller and currency, with expected non-zero gross and net
 *    settlement amounts and zero refunds/chargebacks.
 */
export async function test_api_payment_settlement_report_basic_happy_path(
  connection: api.IConnection,
) {
  // 1. Register platform admin and capture its credentials for re-login
  const platformAdminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const platformAdminPassword: string = RandomGenerator.alphaNumeric(12);

  const platformAdminJoinBody = {
    email: platformAdminEmail,
    name: RandomGenerator.name(),
    password: platformAdminPassword,
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. Register seller
  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const sellerPassword: string = RandomGenerator.alphaNumeric(12);

  const sellerJoinBody = {
    email: sellerEmail,
    password: sellerPassword,
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);
  const sellerId = sellerAuthorized.id;

  // 3. Register customer
  const customerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const customerPassword: string = RandomGenerator.alphaNumeric(12);

  const customerJoinBody = {
    email: customerEmail,
    password: customerPassword,
    name: RandomGenerator.name(),
    ip: null,
    href: "https://shop.example.com/join",
    referrer: "https://shop.example.com/landing",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  // Helper to login as platformAdmin when needed
  const loginPlatformAdmin = async () => {
    const loginBody = {
      email: platformAdminEmail,
      password: platformAdminPassword,
      ip: null,
      href: "https://admin.example.com/login",
      referrer: "https://admin.example.com/",
    } satisfies IShoppingMallPlatformAdminLogin.IRequest;

    const authorized: IShoppingMallPlatformAdmin.IAuthorized =
      await api.functional.auth.platformAdmin.login(connection, {
        body: loginBody,
      });
    typia.assert(authorized);
  };

  // Helper to login as seller
  const loginSeller = async () => {
    const loginBody = {
      email: sellerEmail,
      password: sellerPassword,
      ip: null,
      href: "https://seller.example.com/login",
      referrer: "https://seller.example.com/",
    } satisfies IShoppingMallSellerLogin.IRequest;

    const authorized: IShoppingMallSeller.IAuthorized =
      await api.functional.auth.seller.login(connection, {
        body: loginBody,
      });
    typia.assert(authorized);
  };

  // Helper to login as customer
  const loginCustomer = async () => {
    const loginBody = {
      email: customerEmail,
      password: customerPassword,
      ip: null,
      href: "https://shop.example.com/login",
      referrer: "https://shop.example.com/",
      userAgent: "e2e-test-agent",
    } satisfies IShoppingMallCustomerAuth.ILogin;

    const authorized: IShoppingMallCustomer.IAuthorized =
      await api.functional.auth.customer.login(connection, {
        body: loginBody,
      });
    typia.assert(authorized);
  };

  // 4. As platformAdmin, create brand, category tree, product, and SKU
  await loginPlatformAdmin();

  const brandCreateBody = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphaNumeric(12),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    logo_uri: "https://cdn.example.com/logo.png",
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  const categoryTreeCreateBody = {
    code: `tree-${RandomGenerator.alphaNumeric(8)}`,
    name: "Default Tree",
    description: "Default category tree for tests",
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;

  const categoryTree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      {
        body: categoryTreeCreateBody,
      },
    );
  typia.assert(categoryTree);

  const productCode = `prod-${RandomGenerator.alphaNumeric(10)}`;

  const productCreateBody = {
    shopping_mall_seller_id: sellerId,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: "Test Product",
    short_description: "Short description",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    status: "active",
    is_multi_sku: false,
    primary_image_uri: "https://cdn.example.com/product.png",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      {
        body: productCreateBody,
      },
    );
  typia.assert(product);

  const skuCode = `sku-${RandomGenerator.alphaNumeric(10)}`;
  const skuCurrency = "USD";
  const skuPrice = 100;

  const skuCreateBody = {
    code: skuCode,
    name: "Default SKU",
    listPrice: skuPrice,
    salePrice: skuPrice,
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

  // 5. As seller, create inventory item for the SKU
  await loginSeller();

  const inventoryCreateBody = {
    product_sku_id: sku.id,
    on_hand_quantity:
      typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>() + 10,
    low_stock_threshold: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
    backorder_enabled: false,
    preorder_enabled: false,
  } satisfies IShoppingMallInventoryItem.ICreate;

  const inventoryItem: IShoppingMallInventoryItem =
    await api.functional.shoppingMall.seller.inventoryItems.create(connection, {
      body: inventoryCreateBody,
    });
  typia.assert(inventoryItem);

  // 6. As customer, create cart, add item, and create order
  await loginCustomer();

  const cartCreateBody = {
    currency_code: skuCurrency,
    region_code: "US",
    channel: "web",
    metadata: undefined,
    is_active: true,
    source_guest_token: undefined,
  } satisfies IShoppingMallCustomerCart.ICreate;

  const cart: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.customerCarts.create(
      connection,
      {
        body: cartCreateBody,
      },
    );
  typia.assert(cart);

  const cartItemQuantity: number & tags.Type<"int32"> & tags.Minimum<1> =
    1 as number & tags.Type<"int32"> & tags.Minimum<1>;

  const cartItemCreateBody = {
    skuId: sku.id,
    quantity: cartItemQuantity,
    note: "test item",
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

  const itemsSubtotal = skuPrice * cartItem.quantity;
  const discountTotal = 0;
  const shippingTotal = 0;
  const taxTotal = 0;
  const grandTotal = itemsSubtotal - discountTotal + shippingTotal + taxTotal;

  const shippingAddressId = typia.random<string & tags.Format<"uuid">>();
  const billingAddressId = typia.random<string & tags.Format<"uuid">>();

  const orderCreateBody = {
    customer_cart_id: cart.id,
    currency_code: skuCurrency,
    items_subtotal_amount: itemsSubtotal,
    discount_total_amount: discountTotal,
    shipping_total_amount: shippingTotal,
    tax_total_amount: taxTotal,
    grand_total_amount: grandTotal,
    shipping_address_id: shippingAddressId,
    billing_address_id: billingAddressId,
    customer_note: "please ship quickly",
  } satisfies IShoppingMallOrder.ICreate;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateBody,
    });
  typia.assert(order);

  TestValidator.equals(
    "order grand total should match snapshot",
    order.grand_total_amount,
    grandTotal,
  );

  // 7. As platformAdmin, create payment method and payment transaction
  await loginPlatformAdmin();

  const paymentMethodCode = `pay-${RandomGenerator.alphaNumeric(8)}`;

  const nowIso = new Date().toISOString();

  const paymentMethodCreateBody = {
    code: paymentMethodCode,
    display_name: "Test Card",
    description: "Test payment method for settlement report",
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

  const paymentTransactionCreateBody = {
    orderId: order.id,
    customerId: order.customer_id,
    paymentMethodId: paymentMethod.id,
    paymentIntentKey: null,
    providerName: "test-gateway",
    providerTransactionId: `txn-${RandomGenerator.alphaNumeric(12)}`,
    currency: skuCurrency as string & tags.MinLength<3> & tags.MaxLength<3>,
    authorizedAmount: grandTotal,
    capturedAmount: grandTotal,
    paymentStatus: "payment_captured",
    providerStatus: "captured",
    failureReasonCode: null,
    failureReasonMessage: null,
    requiresManualReview: false,
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

  // 8. Call payment settlement report with date range that includes the transaction
  const txCreatedAt = paymentTransaction.createdAt;

  const fromDate = new Date(new Date(txCreatedAt).getTime() - 60 * 60 * 1000);
  const toDate = new Date(new Date(txCreatedAt).getTime() + 60 * 60 * 1000);

  const dateRange: IShoppingMallReportDateRange = {
    from: fromDate.toISOString(),
    to: toDate.toISOString(),
  };

  const sort: IShoppingMallSettlementReportSort = {
    field: "transactionCreatedAt",
    direction: "ascending",
  };

  const reportRequestBody = {
    dateRange,
    timeZone: "UTC",
    paymentMethodCodes: [paymentMethod.code],
    currencies: [skuCurrency],
    sellerIds: [sellerId],
    includePendingRefunds: false,
    includePendingPayouts: false,
    statusFilters: undefined,
    minGrossAmount: undefined,
    maxGrossAmount: undefined,
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 20 as number & tags.Type<"int32"> & tags.Minimum<1>,
    sort,
  } satisfies IShoppingMallPaymentSettlementReport.IRequest;

  const reportPage: IPageIShoppingMallPaymentSettlementReportRow =
    await api.functional.shoppingMall.platformAdmin.reports.payment_settlement.index(
      connection,
      {
        body: reportRequestBody,
      },
    );
  typia.assert(reportPage);

  // 9. Assert pagination metadata and locate matching row
  const pagination = reportPage.pagination;
  TestValidator.predicate(
    "settlement report should have at least one record",
    pagination.records >= 1,
  );

  TestValidator.predicate("limit should be at least 1", pagination.limit >= 1);

  const rows = reportPage.data;
  TestValidator.predicate(
    "settlement report data should not be empty",
    rows.length > 0,
  );

  const matchingRow = rows.find((row) => {
    return row.seller.id === sellerId && row.currency === skuCurrency;
  });

  TestValidator.predicate(
    "should find at least one settlement row for the seller and currency",
    matchingRow !== undefined,
  );

  if (!matchingRow) return;

  const row: IShoppingMallPaymentSettlementReportRow = matchingRow;

  TestValidator.predicate(
    "gross sales amount should be positive",
    row.gross_sales_amount > 0,
  );
  TestValidator.equals(
    "refund amount should be zero in happy path",
    row.refund_amount,
    0,
  );
  TestValidator.equals(
    "chargeback amount should be zero in happy path",
    row.chargeback_amount,
    0,
  );
  TestValidator.predicate(
    "net settlement amount should be positive",
    row.net_settlement_amount > 0,
  );
}
