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

/**
 * Validate that the admin payout analytics summary correctly aggregates a
 * simple single-seller, single-batch, single-item payout scenario.
 *
 * Business flow:
 *
 * 1. Admin join & login.
 * 2. Seller join & login.
 * 3. Customer join & login.
 * 4. Admin config: country, region, shipping method, payment method, category.
 * 5. Seller config: product, SKU inventory state, SKU.
 * 6. Customer flow: cart -> cart item -> order (with shipping address snapshot) ->
 *    order payment.
 * 7. Admin flow: create seller earning tied to order (and order item/payment).
 * 8. Admin flow: create payout batch and payout item covering that earning.
 * 9. Admin analytics: call payouts summary with filters targeting this seller &
 *    period.
 * 10. Assert top-level totals and seller breakdown match the earning and payout
 *     item.
 */
export async function test_api_admin_payouts_summary_basic_batch_aggregation(
  connection: api.IConnection,
): Promise<void> {
  // ---- 1. Admin join & login ----
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoinBody = {
    email: adminEmail,
    password: "AdminPassword123!" as string & tags.Format<"password">,
    ip: null,
    href: "https://admin.local/join" as string & tags.Format<"uri">,
    referrer: "https://admin.local/" as string & tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;
  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(adminAuthorized);

  const adminLoginBody = {
    email: adminEmail,
    password: "AdminPassword123!" as string & tags.Format<"password">,
    ip: null,
    href: "https://admin.local/login" as string & tags.Format<"uri">,
    referrer: "https://admin.local/" as string & tags.Format<"uri">,
  } satisfies IShoppingMallAdminLogin.ICreate;
  const adminLogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, { body: adminLoginBody });
  typia.assert(adminLogin);

  // ---- 2. Seller join & login ----
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerJoinBody = {
    email: sellerEmail,
    password: "SellerPassword123!" as string & tags.Format<"password">,
    ip: null,
    href: "https://seller.local/join" as string & tags.Format<"uri">,
    referrer: "https://seller.local/" as string & tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthJoin.IRequest;
  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, { body: sellerJoinBody });
  typia.assert(sellerAuthorized);

  const sellerLoginBody = {
    email: sellerEmail,
    password: "SellerPassword123!",
    ip: null,
    href: "https://seller.local/login" as string & tags.Format<"uri">,
    referrer: "https://seller.local/" as string & tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthLogin.IRequest;
  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLogin);

  // ---- 3. Customer join & login ----
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerJoinBody = {
    email: customerEmail,
    password: "CustomerPassword123!" as string & tags.Format<"password">,
    ip: null,
    href: "https://shop.local/join" as string & tags.Format<"uri">,
    referrer: "https://shop.local/" as string & tags.Format<"uri">,
  } satisfies IShoppingMallCustomerJoin.IRequest;
  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  const customerLoginBody = {
    email: customerEmail,
    password: "CustomerPassword123!",
    ip: null,
    href: "https://shop.local/login" as string & tags.Format<"uri">,
    referrer: "https://shop.local/" as string & tags.Format<"uri">,
  } satisfies IShoppingMallCustomerLogin.IRequest;
  const customerLogin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLogin);

  // ---- 4. Admin config: country, region, shipping method, payment method, category ----
  const countryCreateBody = {
    country_code: "KR",
    name_en: "Korea",
    phone_code: "+82",
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallCountry.ICreate;
  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryCreateBody,
    });
  typia.assert(country);

  const regionCreateBody = {
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
        body: regionCreateBody,
      },
    );
  typia.assert(region);

  const shippingMethodBody = {
    method_code: "STANDARD",
    display_name: "Standard Shipping",
    service_level_description: "Standard delivery",
  } satisfies IShoppingMallShippingMethod.ICreate;
  const shippingMethod: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: shippingMethodBody,
    });
  typia.assert(shippingMethod);

  const paymentMethodBody = {
    code: "CARD",
    display_name: "Credit Card",
    description: "Card payment",
    provider_type: "card_processor",
    allowed_currencies: null,
    allowed_countries: null,
    min_amount: null,
    max_amount: null,
    status: "active",
  } satisfies IShoppingMallPaymentMethod.ICreate;
  const paymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(connection, {
      body: paymentMethodBody,
    });
  typia.assert(paymentMethod);

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

  // ---- 5. Seller config: product, sku inventory state, sku ----
  const productBody = {
    code: "PROD-001",
    title: "Test Product",
    summary: "Test product summary",
    description: "Test product description",
    brand: null,
    model_name: null,
    status: "active",
    primary_image_uri: null,
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

  const skuInventoryStateBody = {
    code: "IN_STOCK",
    name: "In Stock",
    description: "Available for purchase",
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;
  const skuInventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      { body: skuInventoryStateBody },
    );
  typia.assert(skuInventoryState);

  const skuPrice = 1000;
  const skuBody = {
    code: "SKU-001" as string & tags.MinLength<1> & tags.MaxLength<255>,
    barcode: null,
    status: "active" as string & tags.MinLength<1> & tags.MaxLength<64>,
    price: skuPrice as number & tags.Minimum<0>,
    original_price: null,
    inventory_quantity: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: null,
    shopping_mall_sku_inventory_state_id: skuInventoryState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;
  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id as string & tags.Format<"uuid">,
      body: skuBody,
    });
  typia.assert(sku);

  // ---- 6. Customer flow: cart, cart item, order, payment ----
  const cartBody = {
    actor_type: "customer",
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

  const shippingAddressSnapshotBody = {
    recipient_name: "Customer",
    phone_number: RandomGenerator.mobile(),
    country_code: country.country_code,
    postal_code: "06236",
    state_or_region: region.code,
    city: region.country.name_en,
    address_line1: "Gangnam-daero 1",
    address_line2: null,
  } satisfies IShoppingMallShippingAddressSnapshot.ICreate;

  const orderBody = {
    cart_id: cart.id,
    currency_code: "KRW",
    items: [
      {
        shopping_mall_sku_id: sku.id,
        quantity: 1 as number & tags.Type<"int32">,
      },
    ] satisfies IShoppingMallOrderItem.ICreate[],
    shipping_address_id: null,
    shipping_address_snapshot: shippingAddressSnapshotBody,
    shipping_method_id: shippingMethod.id,
    payment_method_id: paymentMethod.id,
    buyer_memo: null,
    platform_note: null,
  } satisfies IShoppingMallOrder.ICreate;
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderBody,
    });
  typia.assert(order);

  const orderPaymentBody = {
    payment_method_id: paymentMethod.id,
    currency_code: order.currency_code,
    payable_amount: skuPrice,
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

  // ---- 7. Admin: create seller earning ----
  const earningGross = skuPrice;
  const sellerEarningBody = {
    shopping_mall_order_id: order.id,
    shopping_mall_order_item_id: order.items[0]?.id ?? null,
    shopping_mall_order_payment_id: orderPayment.id,
    currency_code: order.currency_code as string &
      tags.MinLength<1> &
      tags.MaxLength<3>,
    gross_amount: earningGross,
    seller_discount_amount: 0,
    platform_discount_amount: 0,
    commission_amount: 100,
    other_fee_amount: 0,
    net_earning_amount: earningGross - 100,
    earning_type: "order_item" as string & tags.MinLength<1>,
    business_status: "eligible" as string & tags.MinLength<1>,
    eligible_at: new Date().toISOString() as string & tags.Format<"date-time">,
    reversed_at: null,
    metadata: null,
  } satisfies IShoppingMallSellerEarning.ICreate;
  const sellerEarning: IShoppingMallSellerEarning =
    await api.functional.shoppingMall.admin.sellers.earnings.create(
      connection,
      {
        sellerId: sellerAuthorized.id,
        body: sellerEarningBody,
      },
    );
  typia.assert(sellerEarning);

  // ---- 8. Admin: create payout batch and payout item ----
  const now = new Date();
  const periodStart = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
  const periodEnd = new Date(now.getTime() + 60 * 60 * 1000).toISOString();

  const payoutBatchBody = {
    batch_code: `BATCH-${RandomGenerator.alphaNumeric(8)}`,
    payout_period_start: periodStart as string & tags.Format<"date-time">,
    payout_period_end: periodEnd as string & tags.Format<"date-time">,
    currency_code: order.currency_code,
    total_gross_amount: sellerEarning.gross_amount,
    total_commission_amount: sellerEarning.commission_amount,
    total_net_payout_amount: sellerEarning.net_earning_amount,
    status: "processing",
    external_reference: null,
    notes: null,
  } satisfies IShoppingMallSellerPayoutBatch.ICreate;
  const payoutBatch: IShoppingMallSellerPayoutBatch =
    await api.functional.shoppingMall.admin.payoutBatches.create(connection, {
      body: payoutBatchBody,
    });
  typia.assert(payoutBatch);

  const payoutItemBody = {
    shopping_mall_seller_earning_id: sellerEarning.id,
    currency_code: order.currency_code,
    payout_amount: sellerEarning.net_earning_amount,
    status: "paid",
  } satisfies IShoppingMallSellerPayoutItem.ICreate;
  const payoutItem: IShoppingMallSellerPayoutItem =
    await api.functional.shoppingMall.admin.payoutBatches.items.create(
      connection,
      {
        batchCode: payoutBatch.batchCode,
        body: payoutItemBody,
      },
    );
  typia.assert(payoutItem);

  // ---- 9. Admin analytics: call payouts summary ----
  const analyticsRequestBody = {
    from: payoutBatch.payoutPeriodStart,
    to: payoutBatch.payoutPeriodEnd,
    sellerIds: [sellerAuthorized.id],
    payoutStatuses: [payoutBatch.status],
    groupBy: ["seller"] as IEShoppingMallPayoutAnalyticsGroupBy[],
    currency: order.currency_code,
    includeUnsettledEarnings: false,
  } satisfies IShoppingMallPayoutAnalytics.IRequest;

  const summary: IShoppingMallPayoutAnalytics.ISummary =
    await api.functional.shoppingMall.admin.analytics.payouts.summary.index(
      connection,
      { body: analyticsRequestBody },
    );
  typia.assert(summary);

  // ---- 10. Assertions ----
  TestValidator.equals(
    "total gross amount equals earning gross",
    summary.totalGrossAmount,
    sellerEarning.gross_amount,
  );
  TestValidator.equals(
    "total net earning amount equals earning net",
    summary.totalNetEarningAmount,
    sellerEarning.net_earning_amount,
  );
  TestValidator.equals(
    "total paid out amount equals payout amount",
    summary.totalPaidOutAmount,
    payoutItem.payout_amount,
  );
  TestValidator.equals(
    "total pending payout amount is zero in fully paid scenario",
    summary.totalPendingPayoutAmount,
    0,
  );

  if (summary.timeRange !== undefined) {
    const range: IShoppingMallAnalyticsTimeRange = summary.timeRange;
    typia.assert(range);
    TestValidator.predicate(
      "time range from is before or equal payout period start",
      range.from <= payoutBatch.payoutPeriodStart,
    );
    TestValidator.predicate(
      "time range to is after or equal payout period end",
      range.to >= payoutBatch.payoutPeriodEnd,
    );
  }

  if (summary.sellerBreakdowns !== undefined) {
    const breakdowns: IShoppingMallPayoutAnalyticsSellerBreakdown[] =
      summary.sellerBreakdowns;
    TestValidator.predicate(
      "one seller breakdown present",
      breakdowns.length === 1,
    );
    const breakdown = breakdowns[0]!;
    typia.assert(breakdown);
    TestValidator.equals(
      "breakdown seller id matches seller",
      breakdown.sellerId,
      sellerAuthorized.id,
    );
    TestValidator.equals(
      "breakdown gross equals total gross",
      breakdown.grossAmount,
      summary.totalGrossAmount,
    );
    TestValidator.equals(
      "breakdown net earning equals total net earning",
      breakdown.netEarningAmount,
      summary.totalNetEarningAmount,
    );
    TestValidator.equals(
      "breakdown paid out equals total paid out",
      breakdown.paidOutAmount,
      summary.totalPaidOutAmount,
    );
    TestValidator.equals(
      "breakdown pending payout equals total pending",
      breakdown.pendingPayoutAmount,
      summary.totalPendingPayoutAmount,
    );
  }
}
