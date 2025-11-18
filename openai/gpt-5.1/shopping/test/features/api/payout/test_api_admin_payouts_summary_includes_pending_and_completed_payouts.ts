import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEShoppingMallPayoutAnalyticsGroupBy } from "@ORGANIZATION/PROJECT-api/lib/structures/IEShoppingMallPayoutAnalyticsGroupBy";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallAnalyticsTimeRange } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAnalyticsTimeRange";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCartItemSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItemSummary";
import type { IShoppingMallCartOwnerCustomerSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartOwnerCustomerSummary";
import type { IShoppingMallCartOwnerGuestUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartOwnerGuestUserSummary";
import type { IShoppingMallCaseSlaConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCaseSlaConfig";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCountry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCountry";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddressSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddressSnapshot";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";
import type { IShoppingMallCustomerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerLogin";
import type { IShoppingMallDispute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDispute";
import type { IShoppingMallGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestUser";
import type { IShoppingMallLegalHold } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLegalHold";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderPayment";
import type { IShoppingMallOrderPriceSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderPriceSnapshot";
import type { IShoppingMallOrderShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderShippingAddress";
import type { IShoppingMallOrderStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderStatusHistory";
import type { IShoppingMallPaymentChargeback } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentChargeback";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import type { IShoppingMallPaymentRefund } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentRefund";
import type { IShoppingMallPaymentStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentStatusHistory";
import type { IShoppingMallPayoutAnalytics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayoutAnalytics";
import type { IShoppingMallPayoutAnalyticsPeriodBreakdown } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayoutAnalyticsPeriodBreakdown";
import type { IShoppingMallPayoutAnalyticsSellerBreakdown } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayoutAnalyticsSellerBreakdown";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallRegion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRegion";
import type { IShoppingMallRiskCase } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRiskCase";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerAuthLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthLogin";
import type { IShoppingMallSellerEarning } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerEarning";
import type { IShoppingMallSellerPayoutBatch } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPayoutBatch";
import type { IShoppingMallSellerPayoutItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPayoutItem";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentItem";
import type { IShoppingMallShippingAddressSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingAddressSnapshot";
import type { IShoppingMallShippingMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingMethod";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";
import type { IShoppingMallSkuExternalId } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuExternalId";
import type { IShoppingMallSkuInventoryState } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuInventoryState";

export async function test_api_admin_payouts_summary_includes_pending_and_completed_payouts(
  connection: api.IConnection,
) {
  // 1. Admin, seller, customer setup and authentication
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/" as string & tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(admin);

  const adminLoginBody = {
    email: admin.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/" as string & tags.Format<"uri">,
  } satisfies IShoppingMallAdminLogin.ICreate;
  const adminLoggedIn: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, { body: adminLoginBody });
  typia.assert(adminLoggedIn);

  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://seller.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://seller.example.com/" as string & tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthJoin.IRequest;
  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, { body: sellerJoinBody });
  typia.assert(sellerAuthorized);

  const sellerLoginBody = {
    email: sellerJoinBody.email,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://seller.example.com/" as string & tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthLogin.IRequest;
  const sellerLoggedIn: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoggedIn);

  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://shop.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://shop.example.com/" as string & tags.Format<"uri">,
  } satisfies IShoppingMallCustomerJoin.IRequest;
  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  const customerLoginBody = {
    email: customerJoinBody.email,
    password: customerJoinBody.password,
    ip: null,
    href: "https://shop.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://shop.example.com/" as string & tags.Format<"uri">,
  } satisfies IShoppingMallCustomerLogin.IRequest;
  const customerLoggedIn: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLoggedIn);

  // 2. Baseline admin configuration (country, region, shipping, payment, category, inventory state)
  const countryBody = {
    country_code: "KR",
    name_en: "Korea",
    phone_code: "+82",
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallCountry.ICreate;
  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryBody,
    });
  typia.assert(country);

  const regionBody = {
    code: "SEOUL",
    name_en: "Seoul",
    region_type: "city",
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallRegion.ICreate;
  const region: IShoppingMallRegion =
    await api.functional.shoppingMall.admin.countries.regions.create(
      connection,
      {
        countryCode: country.country_code,
        body: regionBody,
      },
    );
  typia.assert(region);

  const shippingMethodBody = {
    method_code: "STANDARD",
    display_name: "Standard Shipping",
    service_level_description: "Standard ground shipping",
  } satisfies IShoppingMallShippingMethod.ICreate;
  const shippingMethod: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: shippingMethodBody,
    });
  typia.assert(shippingMethod);

  const paymentMethodBody = {
    code: "CARD",
    display_name: "Credit Card",
    description: "Credit card payment",
    provider_type: "card_processor",
    allowed_currencies: "KRW",
    allowed_countries: country.country_code,
    min_amount: 0,
    max_amount: null,
    status: "active",
  } satisfies IShoppingMallPaymentMethod.ICreate;
  const paymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(connection, {
      body: paymentMethodBody,
    });
  typia.assert(paymentMethod);

  const inventoryStateBody = {
    code: "IN_STOCK",
    name: "In Stock",
    description: "Sellable inventory",
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;
  const inventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: inventoryStateBody,
      },
    );
  typia.assert(inventoryState);

  const categoryBody = {
    parent_id: null,
    slug: "electronics",
    name_en: "Electronics",
    description_en: "Electronics category",
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryBody,
    });
  typia.assert(category);

  // 3. Seller product and SKU setup
  const productBody = {
    code: "SKU-001",
    title: "Sample Product",
    summary: "Sample product summary",
    description: "Sample product description",
    brand: "BrandX",
    model_name: "ModelY",
    status: "active",
    primary_image_uri: "https://example.com/image.png" as string &
      tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert(product);

  const productCategoryBody = {
    shopping_mall_category_id: category.id,
    is_primary: true,
  } satisfies IShoppingMallProductCategory.ICreate;
  const productCategory: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: product.id,
        body: productCategoryBody,
      },
    );
  typia.assert(productCategory);

  const skuBody = {
    code: "SKU-001-UNIT",
    barcode: null,
    status: "active",
    price: 10000,
    original_price: 12000,
    inventory_quantity: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 1 as number & tags.Type<"int32"> & tags.Minimum<0>,
    shopping_mall_sku_inventory_state_id: inventoryState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;
  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id as string & tags.Format<"uuid">,
      body: skuBody,
    });
  typia.assert(sku);

  // 4. Customer cart, order, and payment
  const cartBody = {
    actor_type: "customer",
    status: "active",
    currency_code: "KRW",
  } satisfies IShoppingMallCart.ICreate;
  const cart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: cartBody,
    });
  typia.assert(cart);

  const cartItemBody = {
    shopping_mall_sku_id: sku.id,
    quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IShoppingMallCartItem.ICreate;
  const cartItem: IShoppingMallCartItem =
    await api.functional.shoppingMall.customer.carts.items.create(connection, {
      cartId: cart.id as string & tags.Format<"uuid">,
      body: cartItemBody,
    });
  typia.assert(cartItem);

  const shippingSnapshotBody = {
    recipient_name: "Customer",
    phone_number: RandomGenerator.mobile("010"),
    country_code: country.country_code,
    postal_code: "06236",
    state_or_region: region.name_en,
    city: region.name_en,
    address_line1: "123 Test Street",
    address_line2: null,
  } satisfies IShoppingMallShippingAddressSnapshot.ICreate;

  const orderItemCreate: IShoppingMallOrderItem.ICreate = {
    shopping_mall_sku_id: sku.id,
    quantity: 1 as number & tags.Type<"int32">,
  };

  const orderBody = {
    cart_id: cart.id,
    currency_code: "KRW",
    items: [orderItemCreate],
    shipping_address_id: null,
    shipping_address_snapshot: shippingSnapshotBody,
    shipping_method_id: shippingMethod.id,
    payment_method_id: paymentMethod.id,
    buyer_memo: "",
    platform_note: "",
  } satisfies IShoppingMallOrder.ICreate;
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderBody,
    });
  typia.assert(order);

  const orderPaymentBody = {
    payment_method_id: paymentMethod.id,
    currency_code: order.currency_code,
    payable_amount: order.grand_total_amount,
    provider_reference: null,
    provider_status_code: null,
    metadata: null,
  } satisfies IShoppingMallOrderPayment.ICreate;
  const orderPayment: IShoppingMallOrderPayment =
    await api.functional.shoppingMall.customer.orders.payments.create(
      connection,
      {
        orderId: order.id,
        body: orderPaymentBody,
      },
    );
  typia.assert(orderPayment);

  // 5. Switch back to admin context before admin-only operations
  const adminRelogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, { body: adminLoginBody });
  typia.assert(adminRelogin);

  // 5.1 Create earnings
  const now: Date = new Date();
  const payoutPeriodStartDate: Date = now;
  const payoutPeriodEndDate: Date = RandomGenerator.date(
    payoutPeriodStartDate,
    1000 * 60 * 60,
  );
  const payoutPeriodStart: string & tags.Format<"date-time"> =
    payoutPeriodStartDate.toISOString() as string & tags.Format<"date-time">;
  const payoutPeriodEnd: string & tags.Format<"date-time"> =
    payoutPeriodEndDate.toISOString() as string & tags.Format<"date-time">;

  const eligibleAt: string & tags.Format<"date-time"> = payoutPeriodStart;

  const earningAmounts = [10000, 20000, 30000];

  const earnings: IShoppingMallSellerEarning[] = [];
  for (const amount of earningAmounts) {
    const earningBody = {
      shopping_mall_order_id: order.id,
      shopping_mall_order_item_id: order.items[0]?.id ?? null,
      shopping_mall_order_payment_id: orderPayment.id,
      currency_code: order.currency_code satisfies string as string &
        tags.MinLength<1> &
        tags.MaxLength<3>,
      gross_amount: amount,
      seller_discount_amount: 0,
      platform_discount_amount: 0,
      commission_amount: 0,
      other_fee_amount: 0,
      net_earning_amount: amount,
      earning_type: "order_item" as string & tags.MinLength<1>,
      business_status: "eligible" as string & tags.MinLength<1>,
      eligible_at: eligibleAt,
      reversed_at: null,
      metadata: null,
    } satisfies IShoppingMallSellerEarning.ICreate;

    const earning =
      await api.functional.shoppingMall.admin.sellers.earnings.create(
        connection,
        {
          sellerId: sellerAuthorized.id,
          body: earningBody,
        },
      );
    typia.assert(earning);
    earnings.push(earning);
  }

  const completedEarnings = earnings.slice(0, 2);
  const pendingEarnings = [earnings[2]];

  const completedTotalNet = completedEarnings.reduce(
    (sum, e) => sum + e.net_earning_amount,
    0,
  );
  const pendingTotalNet = pendingEarnings.reduce(
    (sum, e) => sum + e.net_earning_amount,
    0,
  );
  const totalNet = earnings.reduce((sum, e) => sum + e.net_earning_amount, 0);

  // 5.2 Create payout batches
  const completedBatchBody = {
    batch_code: "BATCH-COMPLETED",
    payout_period_start: payoutPeriodStart,
    payout_period_end: payoutPeriodEnd,
    currency_code: order.currency_code,
    total_gross_amount: completedTotalNet,
    total_commission_amount: 0,
    total_net_payout_amount: completedTotalNet,
    status: "completed",
    external_reference: null,
    notes: "Completed batch",
  } satisfies IShoppingMallSellerPayoutBatch.ICreate;
  const completedBatch: IShoppingMallSellerPayoutBatch =
    await api.functional.shoppingMall.admin.payoutBatches.create(connection, {
      body: completedBatchBody,
    });
  typia.assert(completedBatch);

  const pendingBatchBody = {
    batch_code: "BATCH-PENDING",
    payout_period_start: payoutPeriodStart,
    payout_period_end: payoutPeriodEnd,
    currency_code: order.currency_code,
    total_gross_amount: pendingTotalNet,
    total_commission_amount: 0,
    total_net_payout_amount: pendingTotalNet,
    status: "processing",
    external_reference: null,
    notes: "Pending batch",
  } satisfies IShoppingMallSellerPayoutBatch.ICreate;
  const pendingBatch: IShoppingMallSellerPayoutBatch =
    await api.functional.shoppingMall.admin.payoutBatches.create(connection, {
      body: pendingBatchBody,
    });
  typia.assert(pendingBatch);

  // 5.3 Payout items for completed earnings
  const payoutItemsCompleted: IShoppingMallSellerPayoutItem[] = [];
  for (const earning of completedEarnings) {
    const itemBody = {
      shopping_mall_seller_earning_id: earning.id,
      currency_code: order.currency_code,
      payout_amount: earning.net_earning_amount,
      status: "paid",
    } satisfies IShoppingMallSellerPayoutItem.ICreate;
    const payoutItem: IShoppingMallSellerPayoutItem =
      await api.functional.shoppingMall.admin.payoutBatches.items.create(
        connection,
        {
          batchCode: completedBatch.batchCode,
          body: itemBody,
        },
      );
    typia.assert(payoutItem);
    payoutItemsCompleted.push(payoutItem);
  }

  // 5.4 Payout items for pending earnings
  const payoutItemsPending: IShoppingMallSellerPayoutItem[] = [];
  for (const earning of pendingEarnings) {
    const itemBody = {
      shopping_mall_seller_earning_id: earning.id,
      currency_code: order.currency_code,
      payout_amount: earning.net_earning_amount,
      status: "pending",
    } satisfies IShoppingMallSellerPayoutItem.ICreate;
    const payoutItem: IShoppingMallSellerPayoutItem =
      await api.functional.shoppingMall.admin.payoutBatches.items.create(
        connection,
        {
          batchCode: pendingBatch.batchCode,
          body: itemBody,
        },
      );
    typia.assert(payoutItem);
    payoutItemsPending.push(payoutItem);
  }

  const totalPaidOutAmount = payoutItemsCompleted.reduce(
    (sum, item) => sum + item.payout_amount,
    0,
  );
  const expectedPendingAmount = totalNet - totalPaidOutAmount;

  // 6. Call analytics summary and validate
  const analyticsFrom: string & tags.Format<"date-time"> = payoutPeriodStart;
  const analyticsTo: string & tags.Format<"date-time"> = payoutPeriodEnd;

  const groupBy: IEShoppingMallPayoutAnalyticsGroupBy[] = [
    "seller",
    "timeBucket",
  ];

  const analyticsRequestBody = {
    from: analyticsFrom,
    to: analyticsTo,
    sellerIds: [sellerAuthorized.id],
    payoutStatuses: ["completed", "processing"],
    groupBy,
    currency: order.currency_code,
    includeUnsettledEarnings: true,
  } satisfies IShoppingMallPayoutAnalytics.IRequest;

  const analyticsSummary: IShoppingMallPayoutAnalytics.ISummary =
    await api.functional.shoppingMall.admin.analytics.payouts.summary.index(
      connection,
      { body: analyticsRequestBody },
    );
  typia.assert<IShoppingMallPayoutAnalytics.ISummary>(analyticsSummary);

  // Top-level validations
  TestValidator.equals(
    "total net earning amount should equal sum of earnings",
    analyticsSummary.totalNetEarningAmount,
    totalNet,
  );
  TestValidator.equals(
    "total paid out amount should equal sum of completed payout items",
    analyticsSummary.totalPaidOutAmount,
    totalPaidOutAmount,
  );
  TestValidator.equals(
    "total pending payout amount should equal net minus paid",
    analyticsSummary.totalPendingPayoutAmount,
    expectedPendingAmount,
  );

  if (
    analyticsSummary.sellerBreakdowns !== undefined &&
    analyticsSummary.sellerBreakdowns !== null &&
    analyticsSummary.sellerBreakdowns.length > 0
  ) {
    const sellerBreakdown = analyticsSummary.sellerBreakdowns.find(
      (b) => b.sellerId === sellerAuthorized.id,
    );

    if (sellerBreakdown !== undefined) {
      TestValidator.equals(
        "seller breakdown net earning amount matches",
        sellerBreakdown.netEarningAmount,
        totalNet,
      );
      TestValidator.equals(
        "seller breakdown paid out amount matches",
        sellerBreakdown.paidOutAmount,
        totalPaidOutAmount,
      );
      TestValidator.equals(
        "seller breakdown pending payout amount matches",
        sellerBreakdown.pendingPayoutAmount,
        expectedPendingAmount,
      );
      TestValidator.equals(
        "seller breakdown currency matches",
        sellerBreakdown.currencyCode,
        order.currency_code,
      );
    }
  }

  if (
    analyticsSummary.periodBreakdowns !== undefined &&
    analyticsSummary.periodBreakdowns !== null &&
    analyticsSummary.periodBreakdowns.length > 0
  ) {
    const aggregatedPeriodNet = analyticsSummary.periodBreakdowns.reduce(
      (sum, b) => sum + b.netEarningAmount,
      0,
    );
    const aggregatedPeriodPaid = analyticsSummary.periodBreakdowns.reduce(
      (sum, b) => sum + b.paidOutAmount,
      0,
    );
    const aggregatedPeriodPending = analyticsSummary.periodBreakdowns.reduce(
      (sum, b) => sum + b.pendingPayoutAmount,
      0,
    );

    TestValidator.equals(
      "period breakdown net earning sums to total",
      aggregatedPeriodNet,
      analyticsSummary.totalNetEarningAmount,
    );
    TestValidator.equals(
      "period breakdown paid out sums to total",
      aggregatedPeriodPaid,
      analyticsSummary.totalPaidOutAmount,
    );
    TestValidator.equals(
      "period breakdown pending sums to total",
      aggregatedPeriodPending,
      analyticsSummary.totalPendingPayoutAmount,
    );
  }
}
