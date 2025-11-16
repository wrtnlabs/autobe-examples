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

export async function test_api_seller_payout_statement_multiple_payouts_and_filters(
  connection: api.IConnection,
) {
  // 1. Join as platform admin
  const platformAdminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: "Admin!234",
    ip: null,
    href: "https://admin.mall.local/join",
    referrer: "https://admin.mall.local/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;
  const platformAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  // The SDK has already set Authorization header on connection for platformAdmin.

  // 2. Join two sellers
  const seller1JoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Seller!234",
    storeName: RandomGenerator.name(1),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;
  const seller1Auth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: seller1JoinBody,
    });
  typia.assert(seller1Auth);

  const seller2JoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Seller!234",
    storeName: RandomGenerator.name(1),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;
  const seller2Auth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: seller2JoinBody,
    });
  typia.assert(seller2Auth);

  const seller1Id = seller1Auth.id;
  const seller2Id = seller2Auth.id;

  // Switch back to platformAdmin (login) to be explicit
  const platformAdminLoginBody = {
    email: platformAdminJoinBody.email,
    password: platformAdminJoinBody.password,
    ip: null,
    href: "https://admin.mall.local/login",
    referrer: "https://admin.mall.local/landing",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;
  const platformAdminLogin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLogin);

  // 3. Create category tree
  const categoryTreeBody = {
    code: "default-tree-" + RandomGenerator.alphaNumeric(8),
    name: "Default Category Tree",
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

  // 4. Create a brand
  const brandBody = {
    name: "E2E Brand " + RandomGenerator.alphabets(5),
    slug: "e2e-brand-" + RandomGenerator.alphaNumeric(6),
    description: "Brand for payout tests",
    logo_uri: "https://cdn.mall.local/logo.png",
  } satisfies IShoppingMallBrand.ICreate;
  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert(brand);

  // Helper to create one product + sku for a seller
  const createProductWithSku = async (
    sellerId: string & tags.Format<"uuid">,
  ): Promise<{
    product: IShoppingMallProduct;
    sku: IShoppingMallProductSku;
  }> => {
    const productCode = "E2E-PROD-" + RandomGenerator.alphaNumeric(8);
    const productBody = {
      shopping_mall_seller_id: sellerId,
      shopping_mall_brand_id: brand.id,
      code: productCode as string & tags.MinLength<1>,
      name: "Test Product " + RandomGenerator.alphabets(6),
      short_description: "Short description",
      description: "Full description for payout tests",
      status: "active" as string & tags.MinLength<1>,
      is_multi_sku: false,
      primary_image_uri: "https://cdn.mall.local/product.png",
      additional_data: null,
    } satisfies IShoppingMallProduct.ICreate;
    const product: IShoppingMallProduct =
      await api.functional.shoppingMall.platformAdmin.products.create(
        connection,
        { body: productBody },
      );
    typia.assert(product);

    const skuBody = {
      code: "SKU-" + RandomGenerator.alphaNumeric(6),
      name: "Default SKU",
      listPrice: 20000,
      salePrice: 15000,
      currency: "KRW",
      isActive: true,
      isPurchasable: true,
    } satisfies IShoppingMallProductSku.ICreate;
    const sku: IShoppingMallProductSku =
      await api.functional.shoppingMall.platformAdmin.products.skus.create(
        connection,
        { productCode: productCode, body: skuBody },
      );
    typia.assert(sku);

    return { product, sku };
  };

  const { product: product1, sku: sku1 } = await createProductWithSku(
    seller1Id as string & tags.Format<"uuid">,
  );
  const { product: product2, sku: sku2 } = await createProductWithSku(
    seller2Id as string & tags.Format<"uuid">,
  );

  // Helper: create a customer, cart, cart item, and order for a given SKU
  const createOrderForSku = async (
    sku: IShoppingMallProductSku,
  ): Promise<IShoppingMallOrder> => {
    // Join customer
    const customerJoinBody = {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Customer!234",
      name: RandomGenerator.name(),
      ip: null,
      href: "https://mall.local/join",
      referrer: "https://mall.local/landing",
    } satisfies IShoppingMallCustomerAuth.IJoin;
    const customerAuth: IShoppingMallCustomer.IAuthorized =
      await api.functional.auth.customer.join(connection, {
        body: customerJoinBody,
      });
    typia.assert(customerAuth);

    // Login as customer to ensure proper context
    const customerLoginBody = {
      email: customerJoinBody.email,
      password: customerJoinBody.password,
      ip: null,
      href: "https://mall.local/login",
      referrer: "https://mall.local/landing",
      userAgent: "E2E-Test-Agent",
    } satisfies IShoppingMallCustomerAuth.ILogin;
    const customerLogin: IShoppingMallCustomer.IAuthorized =
      await api.functional.auth.customer.login(connection, {
        body: customerLoginBody,
      });
    typia.assert(customerLogin);

    // Create cart
    const cartBody = {
      currency_code: sku.currency,
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
      note: "Payout test item",
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

    // Create order from cart. Use synthetic but consistent pricing numbers.
    const itemsSubtotal = 15000;
    const discountTotal = 1000;
    const shippingTotal = 2000;
    const taxTotal = 1400;
    const grandTotal = itemsSubtotal - discountTotal + shippingTotal + taxTotal;

    const orderBody = {
      customer_cart_id: cart.id,
      currency_code: cart.currency_code,
      items_subtotal_amount: itemsSubtotal,
      discount_total_amount: discountTotal,
      shipping_total_amount: shippingTotal,
      tax_total_amount: taxTotal,
      grand_total_amount: grandTotal,
      shipping_address_id: typia.random<string & tags.Format<"uuid">>(),
      billing_address_id: typia.random<string & tags.Format<"uuid">>(),
      customer_note: "Please deliver quickly",
    } satisfies IShoppingMallOrder.ICreate;

    const order: IShoppingMallOrder =
      await api.functional.shoppingMall.customer.orders.create(connection, {
        body: orderBody,
      });
    typia.assert(order);

    return order;
  };

  const order1: IShoppingMallOrder = await createOrderForSku(sku1);
  const order2: IShoppingMallOrder = await createOrderForSku(sku2);

  // 7. Create payment transactions to simulate paid orders.
  const fakePaymentMethodId1 = typia.random<string & tags.Format<"uuid">>();
  const fakePaymentMethodId2 = typia.random<string & tags.Format<"uuid">>();

  const createPaymentForOrder = async (
    order: IShoppingMallOrder,
    paymentMethodId: string & tags.Format<"uuid">,
  ): Promise<IShoppingMallPaymentTransaction> => {
    const paymentBody = {
      orderId: order.id,
      customerId: order.customer_id,
      paymentMethodId,
      paymentIntentKey: null,
      providerName: "test-gateway",
      providerTransactionId: "TX-" + RandomGenerator.alphaNumeric(10),
      currency: order.currency_code as string &
        tags.MinLength<3> &
        tags.MaxLength<3>,
      authorizedAmount: order.grand_total_amount,
      capturedAmount: order.grand_total_amount,
      paymentStatus: "payment_captured",
      providerStatus: "captured",
      failureReasonCode: null,
      failureReasonMessage: null,
      requiresManualReview: false,
      metadataJson: null,
    } satisfies IShoppingMallPaymentTransaction.ICreate;

    const payment: IShoppingMallPaymentTransaction =
      await api.functional.shoppingMall.platformAdmin.paymentTransactions.create(
        connection,
        { body: paymentBody },
      );
    typia.assert(payment);
    return payment;
  };

  const payment1 = await createPaymentForOrder(
    order1,
    fakePaymentMethodId1 as string & tags.Format<"uuid">,
  );
  const payment2 = await createPaymentForOrder(
    order2,
    fakePaymentMethodId2 as string & tags.Format<"uuid">,
  );

  typia.assert(payment1);
  typia.assert(payment2);

  // 8. Create two seller payout batches with distinct periods and statuses.
  const now = new Date();
  const period1Start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const period1End = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
  const period2Start = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  const period2End = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

  const payout1Gross = order1.grand_total_amount;
  const payout1Fee = 1000;
  const payout1Adjustment = 0;
  const payout1Net = payout1Gross - payout1Fee + payout1Adjustment;

  const payout1Body = {
    seller_id: seller1Id as string & tags.Format<"uuid">,
    currency_code: order1.currency_code,
    gross_amount: payout1Gross,
    fee_amount: payout1Fee,
    adjustment_amount: payout1Adjustment,
    net_amount: payout1Net,
    period_start: period1Start.toISOString(),
    period_end: period1End.toISOString(),
    payout_status: "completed",
    scheduled_payout_at: new Date(
      now.getTime() - 5 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    memo: "Batch A - completed",
  } satisfies IShoppingMallSellerPayout.ICreate;
  const payout1: IShoppingMallSellerPayout =
    await api.functional.shoppingMall.platformAdmin.sellerPayouts.create(
      connection,
      { body: payout1Body },
    );
  typia.assert(payout1);

  const payout2Gross = order2.grand_total_amount;
  const payout2Fee = 2000;
  const payout2Adjustment = -500;
  const payout2Net = payout2Gross - payout2Fee + payout2Adjustment;

  const payout2Body = {
    seller_id: seller2Id as string & tags.Format<"uuid">,
    currency_code: order2.currency_code,
    gross_amount: payout2Gross,
    fee_amount: payout2Fee,
    adjustment_amount: payout2Adjustment,
    net_amount: payout2Net,
    period_start: period2Start.toISOString(),
    period_end: period2End.toISOString(),
    payout_status: "scheduled",
    scheduled_payout_at: new Date(
      now.getTime() - 1 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    memo: "Batch B - scheduled",
  } satisfies IShoppingMallSellerPayout.ICreate;
  const payout2: IShoppingMallSellerPayout =
    await api.functional.shoppingMall.platformAdmin.sellerPayouts.create(
      connection,
      { body: payout2Body },
    );
  typia.assert(payout2);

  // 9. Create payout items for each batch.
  const createPayoutItems = async (
    payout: IShoppingMallSellerPayout,
    order: IShoppingMallOrder,
  ): Promise<IShoppingMallSellerPayoutItem[]> => {
    const baseGross = order.grand_total_amount;

    const item1Body = {
      shopping_mall_order_id: order.id,
      shopping_mall_order_seller_segment_id: null,
      shopping_mall_order_line_id: null,
      componentType: "item_revenue",
      description: "Order revenue",
      currency: payout.currency,
      grossAmount: baseGross,
      feeAmount: 0,
      taxAmount: 0,
      netAmount: baseGross,
    } satisfies IShoppingMallSellerPayoutItem.ICreate;

    const item2Body = {
      shopping_mall_order_id: order.id,
      shopping_mall_order_seller_segment_id: null,
      shopping_mall_order_line_id: null,
      componentType: "platform_fee",
      description: "Platform fee",
      currency: payout.currency,
      grossAmount: 0,
      feeAmount: payout.feeAmount ?? 0,
      taxAmount: 0,
      netAmount: -1 * (payout.feeAmount ?? 0),
    } satisfies IShoppingMallSellerPayoutItem.ICreate;

    const item1: IShoppingMallSellerPayoutItem =
      await api.functional.shoppingMall.platformAdmin.sellerPayouts.items.create(
        connection,
        {
          sellerPayoutId: payout.id as string & tags.Format<"uuid">,
          body: item1Body,
        },
      );
    typia.assert(item1);

    const item2: IShoppingMallSellerPayoutItem =
      await api.functional.shoppingMall.platformAdmin.sellerPayouts.items.create(
        connection,
        {
          sellerPayoutId: payout.id as string & tags.Format<"uuid">,
          body: item2Body,
        },
      );
    typia.assert(item2);

    return [item1, item2];
  };

  const payout1Items = await createPayoutItems(payout1, order1);
  const payout2Items = await createPayoutItems(payout2, order2);
  typia.assert(payout1Items);
  typia.assert(payout2Items);

  const seller1Uuid = seller1Id as string & tags.Format<"uuid">;
  const seller2Uuid = seller2Id as string & tags.Format<"uuid">;

  // 10-a. Filter by single seller and payoutStatusFilters = ["completed"]
  const requestCompletedForSeller1: IShoppingMallSellerPayoutStatementReport.IRequest =
    {
      dateRange: undefined,
      timeZone: "Asia/Seoul",
      sellerIds: [seller1Uuid],
      payoutStatusFilters: ["completed"],
      currencies: [payout1.currency],
      includeOrderBreakdown: false,
      includeRefundAndChargebackImpact: true,
      page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
      limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
      sort: {
        field: "payoutCreatedAt",
        direction: "desc",
      } satisfies IShoppingMallPayoutStatementSort,
    };

  const pageCompletedForSeller1: IPageIShoppingMallSellerPayoutStatementRow =
    await api.functional.shoppingMall.platformAdmin.reports.seller_payout_statement.index(
      connection,
      { body: requestCompletedForSeller1 },
    );
  typia.assert(pageCompletedForSeller1);

  for (const row of pageCompletedForSeller1.data) {
    TestValidator.equals(
      "payout row seller must be seller1",
      row.seller.id,
      seller1Uuid,
    );
    TestValidator.equals(
      "payout row status must be completed",
      row.payout_status,
      "completed",
    );
    TestValidator.equals(
      "payout row currency matches",
      row.currency,
      payout1.currency,
    );
  }

  // 10-b. dateRange that isolates payout1 period
  const dateRangeIsolatePayout1: IShoppingMallReportDateRange = {
    from: new Date(period1Start.getTime() - 12 * 60 * 60 * 1000).toISOString(),
    to: new Date(period1End.getTime() + 12 * 60 * 60 * 1000).toISOString(),
  } satisfies IShoppingMallReportDateRange;

  const requestIsolatePayout1: IShoppingMallSellerPayoutStatementReport.IRequest =
    {
      dateRange: dateRangeIsolatePayout1,
      timeZone: "Asia/Seoul",
      sellerIds: [seller1Uuid],
      payoutStatusFilters: ["completed"],
      currencies: [payout1.currency],
      includeOrderBreakdown: false,
      includeRefundAndChargebackImpact: true,
      page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
      limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
      sort: {
        field: "payoutCreatedAt",
        direction: "asc",
      } satisfies IShoppingMallPayoutStatementSort,
    };

  const pageIsolatePayout1: IPageIShoppingMallSellerPayoutStatementRow =
    await api.functional.shoppingMall.platformAdmin.reports.seller_payout_statement.index(
      connection,
      { body: requestIsolatePayout1 },
    );
  typia.assert(pageIsolatePayout1);

  for (const row of pageIsolatePayout1.data) {
    TestValidator.predicate(
      "settlement period start within or before range end",
      row.settlement_period_start <= dateRangeIsolatePayout1.to,
    );
    TestValidator.predicate(
      "settlement period end within or after range start",
      row.settlement_period_end >= dateRangeIsolatePayout1.from,
    );
    TestValidator.equals(
      "seller still seller1 in isolated range",
      row.seller.id,
      seller1Uuid,
    );
  }

  // 10-c. Multi-status and multi-seller filter
  const multiStatusFilter: IShoppingMallSellerPayoutStatementReport.IRequest = {
    dateRange: undefined,
    timeZone: "Asia/Seoul",
    sellerIds: [seller1Uuid, seller2Uuid],
    payoutStatusFilters: ["completed", "scheduled"],
    currencies: undefined,
    includeOrderBreakdown: false,
    includeRefundAndChargebackImpact: true,
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 20 as number & tags.Type<"int32"> & tags.Minimum<1>,
    sort: {
      field: "payoutCreatedAt",
      direction: "desc",
    } satisfies IShoppingMallPayoutStatementSort,
  };

  const multiStatusPage: IPageIShoppingMallSellerPayoutStatementRow =
    await api.functional.shoppingMall.platformAdmin.reports.seller_payout_statement.index(
      connection,
      { body: multiStatusFilter },
    );
  typia.assert(multiStatusPage);

  const allowedStatuses: IEShoppingMallSellerPayoutStatus[] = [
    "completed",
    "scheduled",
  ];
  const allowedSellers: (string & tags.Format<"uuid">)[] = [
    seller1Uuid,
    seller2Uuid,
  ];

  for (const row of multiStatusPage.data) {
    TestValidator.predicate(
      "payout_status matches allowed set",
      allowedStatuses.includes(
        row.payout_status as IEShoppingMallSellerPayoutStatus,
      ),
    );
    TestValidator.predicate(
      "seller id matches allowed set",
      allowedSellers.includes(row.seller.id as string & tags.Format<"uuid">),
    );
  }

  // 10-d. Pagination behavior over many rows
  const paginationFilter: IShoppingMallSellerPayoutStatementReport.IRequest = {
    dateRange: undefined,
    timeZone: "Asia/Seoul",
    sellerIds: [seller1Uuid, seller2Uuid],
    payoutStatusFilters: undefined,
    currencies: undefined,
    includeOrderBreakdown: false,
    includeRefundAndChargebackImpact: true,
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    sort: {
      field: "payoutCreatedAt",
      direction: "desc",
    } satisfies IShoppingMallPayoutStatementSort,
  };

  const page1: IPageIShoppingMallSellerPayoutStatementRow =
    await api.functional.shoppingMall.platformAdmin.reports.seller_payout_statement.index(
      connection,
      { body: paginationFilter },
    );
  typia.assert(page1);

  const page2Filter: IShoppingMallSellerPayoutStatementReport.IRequest = {
    ...paginationFilter,
    page: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
  };
  const page2: IPageIShoppingMallSellerPayoutStatementRow =
    await api.functional.shoppingMall.platformAdmin.reports.seller_payout_statement.index(
      connection,
      { body: page2Filter },
    );
  typia.assert(page2);

  TestValidator.equals(
    "limit is respected (1 item per page)",
    page1.pagination.limit,
    1,
  );
  TestValidator.equals("page1 current index", page1.pagination.current, 0);
  TestValidator.equals("page2 current index", page2.pagination.current, 1);

  if (page1.data.length > 0 && page2.data.length > 0) {
    TestValidator.notEquals(
      "page1 and page2 rows should differ",
      page1.data[0].id,
      page2.data[0].id,
    );
  }

  // 11. Structural sanity for settlement linkage (UUIDs only)
  if (pageCompletedForSeller1.data.length > 0) {
    const row = pageCompletedForSeller1.data[0];
    for (const relatedId of row.related_settlement_report_row_ids) {
      typia.assert<string & tags.Format<"uuid">>(relatedId);
    }
  }

  // 12. Unauthorized access rejection using a connection without admin token
  const unauthConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  const unauthRequest: IShoppingMallSellerPayoutStatementReport.IRequest = {
    dateRange: undefined,
    timeZone: "Asia/Seoul",
    sellerIds: [seller1Uuid],
    payoutStatusFilters: ["completed"],
    currencies: undefined,
    includeOrderBreakdown: false,
    includeRefundAndChargebackImpact: false,
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    sort: {
      field: "payoutCreatedAt",
      direction: "desc",
    } satisfies IShoppingMallPayoutStatementSort,
  };

  await TestValidator.error(
    "unauthorized payout statement access should fail",
    async () => {
      await api.functional.shoppingMall.platformAdmin.reports.seller_payout_statement.index(
        unauthConnection,
        { body: unauthRequest },
      );
    },
  );
}
