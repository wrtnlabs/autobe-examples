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
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallRefundTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundTransaction";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";
import type { IShoppingMallSellerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerLogin";

export async function test_api_payments_overview_sensitivity_to_time_window(
  connection: api.IConnection,
) {
  // 1. Bootstrap actors: platform admin, seller, customer
  const platformAdminEmail: string = typia.random<
    string & tags.Format<"email">
  >();
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const customerEmail: string = typia.random<string & tags.Format<"email">>();

  const platformAdminJoinBody = {
    email: platformAdminEmail,
    name: RandomGenerator.name(),
    password: "admin-password",
    ip: null,
    href: "https://admin.localhost/join",
    referrer: "https://admin.localhost/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;
  const platformAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  const sellerJoinBody = {
    email: sellerEmail,
    password: "seller-password",
    storeName: RandomGenerator.name(1),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(seller);

  const customerJoinBody = {
    email: customerEmail,
    password: "customer-password",
    name: RandomGenerator.name(),
    ip: null,
    href: "https://shop.localhost/join",
    referrer: "https://shop.localhost/home",
  } satisfies IShoppingMallCustomerAuth.IJoin;
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customer);

  // 2. Platform admin catalog setup: category tree, brand, product, SKU, payment method
  const categoryTreeBody = {
    code: `tree-${RandomGenerator.alphaNumeric(8)}`,
    name: "Main Catalog",
    description: RandomGenerator.paragraph({ sentences: 4 }),
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
    description: RandomGenerator.paragraph({ sentences: 3 }),
    logo_uri: "https://cdn.localhost/logo.png" as string & tags.Format<"uri">,
  } satisfies IShoppingMallBrand.ICreate;
  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert(brand);

  const productBody = {
    shopping_mall_seller_id: seller.seller.id,
    shopping_mall_brand_id: brand.id,
    code: `P-${RandomGenerator.alphaNumeric(8)}` as string & tags.MinLength<1>,
    name: RandomGenerator.paragraph({ sentences: 2 }) as string &
      tags.MinLength<1>,
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: true,
    primary_image_uri: "https://cdn.localhost/product.png" as string &
      tags.Format<"uri">,
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      {
        body: productBody,
      },
    );
  typia.assert(product);

  const skuBody = {
    code: `SKU-${RandomGenerator.alphaNumeric(6)}`,
    name: "Default SKU",
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

  const paymentMethodCode = `pm-${RandomGenerator.alphaNumeric(6)}`;
  const paymentMethodBody = {
    code: paymentMethodCode,
    display_name: "Test Card",
    description: RandomGenerator.paragraph({ sentences: 2 }),
    provider_key: "test-gateway",
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

  // 3. Seller inventory for the SKU
  const inventoryBody = {
    product_sku_id: sku.id,
    on_hand_quantity: 100 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 5 as number & tags.Type<"int32"> & tags.Minimum<0>,
    backorder_enabled: false,
    preorder_enabled: false,
  } satisfies IShoppingMallInventoryItem.ICreate;
  const inventoryItem: IShoppingMallInventoryItem =
    await api.functional.shoppingMall.seller.inventoryItems.create(connection, {
      body: inventoryBody,
    });
  typia.assert(inventoryItem);

  // 4. Customer cart and two orders (week1 vs week2 logical buckets via amounts)
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
      {
        body: cartBody,
      },
    );
  typia.assert(cart);

  // Helper to add an item and create an order at a given price point
  const createOrderWithAmount = async (
    unitPrice: number,
  ): Promise<IShoppingMallOrder> => {
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

    const orderBody = {
      customer_cart_id: cart.id,
      currency_code: cart.currency_code,
      items_subtotal_amount: unitPrice,
      discount_total_amount: 0,
      shipping_total_amount: 0,
      tax_total_amount: 0,
      grand_total_amount: unitPrice,
      shipping_address_id: typia.random<string & tags.Format<"uuid">>(),
      billing_address_id: typia.random<string & tags.Format<"uuid">>(),
      customer_note: undefined,
    } satisfies IShoppingMallOrder.ICreate;
    const order: IShoppingMallOrder =
      await api.functional.shoppingMall.customer.orders.create(connection, {
        body: orderBody,
      });
    typia.assert(order);
    return order;
  };

  // Create multiple orders: fewer in week1, more in week2
  const week1Orders: IShoppingMallOrder[] = [];
  const week2Orders: IShoppingMallOrder[] = [];

  // Two small orders for week1
  week1Orders.push(await createOrderWithAmount(50));
  week1Orders.push(await createOrderWithAmount(75));

  // Four larger orders for week2
  week2Orders.push(await createOrderWithAmount(150));
  week2Orders.push(await createOrderWithAmount(200));
  week2Orders.push(await createOrderWithAmount(250));
  week2Orders.push(await createOrderWithAmount(300));

  // 5. Create payment transactions for each order
  const createPaymentForOrder = async (
    order: IShoppingMallOrder,
    options: {
      status: string;
      authorizedAmount?: number | null;
      capturedAmount?: number | null;
      refundedAmount?: number | null;
      requiresManualReview?: boolean | null;
    },
  ): Promise<IShoppingMallPaymentTransaction> => {
    const providerName: string =
      paymentMethod.provider_key ?? paymentMethod.code;

    const body = {
      orderId: order.id,
      customerId: order.customer.id,
      paymentMethodId: paymentMethod.id,
      paymentIntentKey: null,
      providerName,
      providerTransactionId: null,
      currency: cart.currency_code as string &
        tags.MinLength<3> &
        tags.MaxLength<3>,
      authorizedAmount: options.authorizedAmount ?? order.grand_total_amount,
      capturedAmount: options.capturedAmount ?? order.grand_total_amount,
      paymentStatus: options.status,
      providerStatus: null,
      failureReasonCode: null,
      failureReasonMessage: null,
      requiresManualReview: options.requiresManualReview ?? false,
      metadataJson: null,
    } satisfies IShoppingMallPaymentTransaction.ICreate;
    const tx: IShoppingMallPaymentTransaction =
      await api.functional.shoppingMall.platformAdmin.paymentTransactions.create(
        connection,
        { body },
      );
    typia.assert(tx);
    return tx;
  };

  const week1Payments: IShoppingMallPaymentTransaction[] = [];
  const week2Payments: IShoppingMallPaymentTransaction[] = [];

  // Week1: mix of success and failure, smaller volumes
  week1Payments.push(
    await createPaymentForOrder(week1Orders[0], {
      status: "payment_captured",
      capturedAmount: week1Orders[0].grand_total_amount,
      authorizedAmount: week1Orders[0].grand_total_amount,
      refundedAmount: 0,
    }),
  );
  week1Payments.push(
    await createPaymentForOrder(week1Orders[1], {
      status: "payment_failed",
      capturedAmount: 0,
      authorizedAmount: week1Orders[1].grand_total_amount,
      refundedAmount: 0,
      requiresManualReview: true,
    }),
  );

  // Week2: more volume and more successful captures, plus one pending
  week2Payments.push(
    await createPaymentForOrder(week2Orders[0], {
      status: "payment_captured",
      capturedAmount: week2Orders[0].grand_total_amount,
    }),
  );
  week2Payments.push(
    await createPaymentForOrder(week2Orders[1], {
      status: "payment_captured",
      capturedAmount: week2Orders[1].grand_total_amount,
    }),
  );
  week2Payments.push(
    await createPaymentForOrder(week2Orders[2], {
      status: "payment_captured",
      capturedAmount: week2Orders[2].grand_total_amount,
    }),
  );
  week2Payments.push(
    await createPaymentForOrder(week2Orders[3], {
      status: "payment_pending",
      capturedAmount: 0,
      authorizedAmount: week2Orders[3].grand_total_amount,
    }),
  );

  // 6. Create some refunds, more weight in week2 logically
  const createRefundForPayment = async (
    payment: IShoppingMallPaymentTransaction,
    amount: number,
  ): Promise<IShoppingMallRefundTransaction> => {
    const body = {
      shopping_mall_payment_transaction_id: payment.id,
      shopping_mall_order_id: payment.orderId,
      refund_number: `RF-${RandomGenerator.alphaNumeric(8)}`,
      refund_status: "refund_completed",
      actor_type: "platformAdmin",
      reason_category: "admin_adjustment",
      reason_message: RandomGenerator.paragraph({ sentences: 2 }),
      requested_amount: amount,
      approved_amount: amount,
      refunded_amount: amount,
      currency: payment.currency,
      provider_refund_id: null,
      provider_status: "COMPLETED",
      failure_reason_code: null,
      failure_reason_message: null,
    } satisfies IShoppingMallRefundTransaction.ICreate;
    const refund: IShoppingMallRefundTransaction =
      await api.functional.shoppingMall.refundTransactions.create(connection, {
        body,
      });
    typia.assert(refund);
    return refund;
  };

  // One small refund in week1, two larger refunds in week2
  await createRefundForPayment(week1Payments[0], 10);
  await createRefundForPayment(week2Payments[1], 30);
  await createRefundForPayment(week2Payments[2], 40);

  // 7. Fetch payments overview as platform admin
  const overview: IShoppingMallPaymentsOverview =
    await api.functional.shoppingMall.platformAdmin.dashboard.payments_overview.at(
      connection,
    );
  typia.assert(overview);

  // Basic structural assertions
  TestValidator.predicate(
    "top-level processed amount should be non-negative",
    overview.totalProcessedAmount >= 0,
  );
  TestValidator.predicate(
    "top-level refund amount should be non-negative",
    overview.totalRefundAmount >= 0,
  );

  // 8. Reconcile byDay aggregation with top-level KPIs
  const sumByDayProcessed = overview.byDay.reduce(
    (acc, day) => acc + day.totalProcessedAmount,
    0,
  );
  const sumByDayRefund = overview.byDay.reduce(
    (acc, day) => acc + (day.refundAmount ?? 0),
    0,
  );
  const sumByDaySuccessCount = overview.byDay.reduce(
    (acc, day) => acc + day.successfulTransactionCount,
    0 as number & tags.Type<"int32">,
  );
  const sumByDayFailedCount = overview.byDay.reduce(
    (acc, day) => acc + day.failedTransactionCount,
    0 as number & tags.Type<"int32">,
  );

  TestValidator.equals(
    "sum of byDay processed amounts equals totalProcessedAmount",
    sumByDayProcessed,
    overview.totalProcessedAmount,
  );
  TestValidator.equals(
    "sum of byDay refund amounts equals totalRefundAmount",
    sumByDayRefund,
    overview.totalRefundAmount,
  );
  TestValidator.equals(
    "sum of byDay success counts equals successfulTransactionCount",
    sumByDaySuccessCount,
    overview.successfulTransactionCount,
  );
  TestValidator.equals(
    "sum of byDay failed counts equals failedTransactionCount",
    sumByDayFailedCount,
    overview.failedTransactionCount,
  );

  // 9. Reconcile byStatus totals with top-level KPIs
  const sumByStatusCount = overview.byStatus.reduce(
    (acc, s) => acc + s.transactionCount,
    0 as number & tags.Type<"int32">,
  );
  const sumByStatusAmount = overview.byStatus.reduce(
    (acc, s) => acc + s.totalAmount,
    0,
  );

  const expectedTotalTxCount =
    overview.successfulTransactionCount +
    overview.failedTransactionCount +
    overview.pendingTransactionCount;

  TestValidator.equals(
    "sum of byStatus transactionCount equals total tx count",
    sumByStatusCount,
    expectedTotalTxCount,
  );
  TestValidator.equals(
    "sum of byStatus totalAmount equals totalProcessedAmount",
    sumByStatusAmount,
    overview.totalProcessedAmount,
  );

  // 10. Reconcile byMethod totals with top-level KPIs
  const sumByMethodTransactionCount = overview.byMethod.reduce(
    (acc, m) => acc + m.transactionCount,
    0 as number & tags.Type<"int32">,
  );
  const sumByMethodTotalAmount = overview.byMethod.reduce(
    (acc, m) => acc + m.totalAmount,
    0,
  );
  const sumByMethodRefundAmount = overview.byMethod.reduce(
    (acc, m) => acc + (m.refundAmount ?? 0),
    0,
  );

  TestValidator.equals(
    "sum of byMethod transactionCount equals total tx count",
    sumByMethodTransactionCount,
    expectedTotalTxCount,
  );
  TestValidator.equals(
    "sum of byMethod totalAmount equals totalProcessedAmount",
    sumByMethodTotalAmount,
    overview.totalProcessedAmount,
  );
  TestValidator.equals(
    "sum of byMethod refundAmount equals totalRefundAmount",
    sumByMethodRefundAmount,
    overview.totalRefundAmount,
  );

  // 11. Derive two synthetic windows from byDay and check relative volumes.
  const sortedByDay: IShoppingMallPaymentsOverviewByDay[] = [
    ...overview.byDay,
  ].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  if (sortedByDay.length >= 2) {
    const midIndex = Math.floor(sortedByDay.length / 2);
    const earlyDays = sortedByDay.slice(0, midIndex);
    const lateDays = sortedByDay.slice(midIndex);

    const earlyProcessed = earlyDays.reduce(
      (acc, d) => acc + d.totalProcessedAmount,
      0,
    );
    const lateProcessed = lateDays.reduce(
      (acc, d) => acc + d.totalProcessedAmount,
      0,
    );

    const earlyTxCount = earlyDays.reduce(
      (acc, d) => acc + d.successfulTransactionCount + d.failedTransactionCount,
      0 as number & tags.Type<"int32">,
    );
    const lateTxCount = lateDays.reduce(
      (acc, d) => acc + d.successfulTransactionCount + d.failedTransactionCount,
      0 as number & tags.Type<"int32">,
    );

    TestValidator.predicate(
      "late window should have processed amount >= early window",
      lateProcessed >= earlyProcessed,
    );
    TestValidator.predicate(
      "late window should have transaction count >= early window",
      lateTxCount >= earlyTxCount,
    );
  } else {
    TestValidator.predicate(
      "single-day overview still has non-negative metrics",
      overview.totalProcessedAmount >= 0 &&
        overview.successfulTransactionCount >= 0 &&
        overview.failedTransactionCount >= 0 &&
        overview.pendingTransactionCount >= 0,
    );
  }
}
