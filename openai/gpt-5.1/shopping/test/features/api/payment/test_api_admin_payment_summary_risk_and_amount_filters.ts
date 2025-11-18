import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallAnalyticsGranularity } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAnalyticsGranularity";
import type { IShoppingMallAnalyticsPaymentByMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAnalyticsPaymentByMethod";
import type { IShoppingMallAnalyticsPaymentBySeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAnalyticsPaymentBySeller";
import type { IShoppingMallAnalyticsPaymentByStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAnalyticsPaymentByStatus";
import type { IShoppingMallAnalyticsPaymentSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAnalyticsPaymentSummary";
import type { IShoppingMallAnalyticsPaymentTimeBucket } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAnalyticsPaymentTimeBucket";
import type { IShoppingMallAnalyticsPaymentTotals } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAnalyticsPaymentTotals";
import type { IShoppingMallAnalyticsTimeRange } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAnalyticsTimeRange";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartItemSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItemSummary";
import type { IShoppingMallCartOwnerCustomerSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartOwnerCustomerSummary";
import type { IShoppingMallCartOwnerGuestUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartOwnerGuestUserSummary";
import type { IShoppingMallCaseSlaConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCaseSlaConfig";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
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
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallRiskCase } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRiskCase";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerAuthLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthLogin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentItem";
import type { IShoppingMallShippingAddressSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingAddressSnapshot";
import type { IShoppingMallShippingMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingMethod";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";
import type { IShoppingMallSkuExternalId } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuExternalId";
import type { IShoppingMallSkuInventoryState } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuInventoryState";

export async function test_api_admin_payment_summary_risk_and_amount_filters(
  connection: api.IConnection,
) {
  // 1. Admin registration and implicit login
  const adminJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: "Passw0rd!" as string & tags.Format<"password">,
    ip: null,
    href: "https://admin.test/join" as string & tags.Format<"uri">,
    referrer: "https://admin.test/" as string & tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;
  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a payment method
  const paymentMethodBody = {
    code: `pm_${RandomGenerator.alphabets(6)}`,
    display_name: "Test Card Method",
    description: "E2E test payment method",
    provider_type: "card_processor",
    allowed_currencies: "USD",
    allowed_countries: null,
    min_amount: 0,
    max_amount: null,
    status: "active",
  } satisfies IShoppingMallPaymentMethod.ICreate;
  const paymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(connection, {
      body: paymentMethodBody,
    });
  typia.assert(paymentMethod);

  // 3. Register a seller
  const sellerJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@seller.test`,
    password: "Passw0rd!" as string & tags.Format<"password">,
    ip: null,
    href: "https://seller.test/join" as string & tags.Format<"uri">,
    referrer: "https://seller.test/" as string & tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthJoin.IRequest;
  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  // 4. Register a customer
  const customerJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@customer.test` as string &
      tags.Format<"email">,
    password: "Passw0rd!" as string & tags.Format<"password">,
    ip: null,
    href: "https://shop.test/join" as string & tags.Format<"uri">,
    referrer: "https://shop.test/" as string & tags.Format<"uri">,
  } satisfies IShoppingMallCustomerJoin.IRequest;
  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  // 5. Create a cart for the customer (even though order creation does not strictly depend on it)
  const cartBody = {
    actor_type: "customer",
    status: "active",
    currency_code: "USD",
  } satisfies IShoppingMallCart.ICreate;
  const cart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: cartBody,
    });
  typia.assert(cart);

  // 6. Switch to seller context by logging in as the seller
  const sellerLoginBody = {
    email: sellerJoinBody.email,
    password: "Passw0rd!",
    ip: null,
    href: "https://seller.test/login" as string & tags.Format<"uri">,
    referrer: "https://seller.test/" as string & tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthLogin.IRequest;
  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLogin);

  // 7. Create a product as the seller
  const productBody = {
    code: `prd_${RandomGenerator.alphabets(6)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "E2E Brand",
    model_name: "Model X",
    status: "active",
    primary_image_uri: "https://images.test/product.jpg" as string &
      tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert(product);

  // 8. Switch back to admin to create an inventory state
  const adminLoginBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.test/login" as string & tags.Format<"uri">,
    referrer: "https://admin.test/" as string & tags.Format<"uri">,
  } satisfies IShoppingMallAdminLogin.ICreate;
  const adminLogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  const inventoryStateBody = {
    code: `state_${RandomGenerator.alphabets(4)}`,
    name: "In Stock",
    description: "E2E inventory state",
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

  // 9. Switch again to seller to create a SKU for the product
  const sellerLoginAgain: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoginAgain);

  const basePrice = 50;
  const skuBody = {
    code: `sku_${RandomGenerator.alphabets(6)}`,
    barcode: null,
    status: "active",
    price: basePrice,
    original_price: basePrice,
    inventory_quantity: 100,
    low_stock_threshold: 5,
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

  // 10. Switch to customer context to create orders and payments
  const customerLoginBody = {
    email: customerJoinBody.email,
    password: customerJoinBody.password,
    ip: null,
    href: "https://shop.test/login" as string & tags.Format<"uri">,
    referrer: "https://shop.test/" as string & tags.Format<"uri">,
  } satisfies IShoppingMallCustomerLogin.IRequest;
  const customerLoginAgain: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLoginAgain);

  const makeShippingSnapshot =
    (): IShoppingMallShippingAddressSnapshot.ICreate => ({
      recipient_name: RandomGenerator.name(2),
      phone_number: RandomGenerator.mobile(),
      country_code: "US",
      postal_code: "12345",
      state_or_region: "CA",
      city: "San Francisco",
      address_line1: "1 Market St",
      address_line2: null,
    });

  const orderSmallBody = {
    cart_id: cart.id,
    currency_code: "USD",
    items: [
      {
        shopping_mall_sku_id: sku.id,
        quantity: 1,
      } satisfies IShoppingMallOrderItem.ICreate,
    ],
    shipping_address_id: null,
    shipping_address_snapshot: makeShippingSnapshot(),
    shipping_method_id: null,
    payment_method_id: paymentMethod.id,
    buyer_memo: "small order",
    platform_note: null,
  } satisfies IShoppingMallOrder.ICreate;
  const orderSmall: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderSmallBody,
    });
  typia.assert(orderSmall);

  const orderLargeBody = {
    cart_id: cart.id,
    currency_code: "USD",
    items: [
      {
        shopping_mall_sku_id: sku.id,
        quantity: 10,
      } satisfies IShoppingMallOrderItem.ICreate,
    ],
    shipping_address_id: null,
    shipping_address_snapshot: makeShippingSnapshot(),
    shipping_method_id: null,
    payment_method_id: paymentMethod.id,
    buyer_memo: "large order",
    platform_note: null,
  } satisfies IShoppingMallOrder.ICreate;
  const orderLarge: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderLargeBody,
    });
  typia.assert(orderLarge);

  // Extract grand totals from orders
  const grandSmall = orderSmall.grand_total_amount;
  const grandLarge = orderLarge.grand_total_amount;

  // 11. Create payments for each order
  const paymentSmallBody = {
    payment_method_id: paymentMethod.id,
    currency_code: orderSmall.currency_code,
    payable_amount: grandSmall,
    provider_reference: null,
    provider_status_code: null,
    metadata: null,
  } satisfies IShoppingMallOrderPayment.ICreate;
  const paymentSmall: IShoppingMallOrderPayment =
    await api.functional.shoppingMall.customer.orders.payments.create(
      connection,
      {
        orderId: orderSmall.id,
        body: paymentSmallBody,
      },
    );
  typia.assert(paymentSmall);

  const paymentLargeBody = {
    payment_method_id: paymentMethod.id,
    currency_code: orderLarge.currency_code,
    payable_amount: grandLarge,
    provider_reference: null,
    provider_status_code: null,
    metadata: null,
  } satisfies IShoppingMallOrderPayment.ICreate;
  const paymentLarge: IShoppingMallOrderPayment =
    await api.functional.shoppingMall.customer.orders.payments.create(
      connection,
      {
        orderId: orderLarge.id,
        body: paymentLargeBody,
      },
    );
  typia.assert(paymentLarge);

  // Sanity: ensure amounts differ and large is greater
  TestValidator.predicate(
    "large order amount must be greater than small order amount",
    grandLarge > grandSmall,
  );

  // 12. Switch back to admin for analytics queries
  const adminLoginAgain: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginAgain);

  // Build time range: from yesterday to tomorrow to safely include test data
  const now = new Date();
  const fromDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const toDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const fromIso = fromDate.toISOString();
  const toIso = toDate.toISOString();

  // 13. First analytics call with minAmount between the two payments
  const midAmount = (grandSmall + grandLarge) / 2;

  const analyticsRequestMin: IShoppingMallAnalyticsPaymentSummary.IRequest = {
    from: fromIso as string & tags.Format<"date-time">,
    to: toIso as string & tags.Format<"date-time">,
    granularity: "day" satisfies IShoppingMallAnalyticsGranularity,
    paymentMethodCodes: [paymentMethod.code],
    sellerIds: undefined,
    minAmount: midAmount,
    maxAmount: undefined,
    includeHighRisk: undefined,
    includeDisputed: undefined,
  };

  const summaryWithMin: IShoppingMallAnalyticsPaymentSummary =
    await api.functional.shoppingMall.admin.analytics.payments.summary.index(
      connection,
      {
        body: analyticsRequestMin,
      },
    );
  typia.assert<IShoppingMallAnalyticsPaymentSummary>(summaryWithMin);

  const totalsWithMin = summaryWithMin.totals;
  const totalAmountWithMin = totalsWithMin.totalProcessedAmount;
  const totalPaymentsWithMin = totalsWithMin.totalPayments;

  TestValidator.predicate(
    "analytics with minAmount should return non-negative total processed amount",
    totalAmountWithMin >= 0,
  );

  // 14. Second analytics call with minAmount = 0
  const analyticsRequestZero: IShoppingMallAnalyticsPaymentSummary.IRequest = {
    from: fromIso as string & tags.Format<"date-time">,
    to: toIso as string & tags.Format<"date-time">,
    granularity: "day" satisfies IShoppingMallAnalyticsGranularity,
    paymentMethodCodes: [paymentMethod.code],
    sellerIds: undefined,
    minAmount: 0,
    maxAmount: undefined,
    includeHighRisk: undefined,
    includeDisputed: undefined,
  };

  const summaryWithZero: IShoppingMallAnalyticsPaymentSummary =
    await api.functional.shoppingMall.admin.analytics.payments.summary.index(
      connection,
      {
        body: analyticsRequestZero,
      },
    );
  typia.assert<IShoppingMallAnalyticsPaymentSummary>(summaryWithZero);

  const totalsWithZero = summaryWithZero.totals;
  const totalAmountWithZero = totalsWithZero.totalProcessedAmount;
  const totalPaymentsWithZero = totalsWithZero.totalPayments;

  TestValidator.predicate(
    "analytics with minAmount=0 should not reduce total processed amount",
    totalAmountWithZero >= totalAmountWithMin,
  );
  TestValidator.predicate(
    "analytics with minAmount=0 should not reduce total payments count",
    totalPaymentsWithZero >= totalPaymentsWithMin,
  );

  // 15. Basic structural checks on timeRange and optional breakdowns
  const timeRange: IShoppingMallAnalyticsTimeRange = summaryWithZero.timeRange;
  typia.assert<IShoppingMallAnalyticsTimeRange>(timeRange);

  const totals: IShoppingMallAnalyticsPaymentTotals = summaryWithZero.totals;
  typia.assert<IShoppingMallAnalyticsPaymentTotals>(totals);

  if (summaryWithZero.byMethod !== undefined) {
    summaryWithZero.byMethod.forEach(
      (m: IShoppingMallAnalyticsPaymentByMethod) => {
        typia.assert<IShoppingMallAnalyticsPaymentByMethod>(m);
        TestValidator.predicate(
          "payment method code in byMethod should match requested method",
          m.paymentMethodCode === paymentMethod.code,
        );
      },
    );
  }

  if (summaryWithZero.byStatus !== undefined) {
    summaryWithZero.byStatus.forEach(
      (s: IShoppingMallAnalyticsPaymentByStatus) => {
        typia.assert<IShoppingMallAnalyticsPaymentByStatus>(s);
      },
    );
  }

  if (summaryWithZero.bySeller !== undefined) {
    summaryWithZero.bySeller.forEach(
      (s: IShoppingMallAnalyticsPaymentBySeller) => {
        typia.assert<IShoppingMallAnalyticsPaymentBySeller>(s);
      },
    );
  }

  if (summaryWithZero.timeSeries !== undefined) {
    summaryWithZero.timeSeries.forEach(
      (b: IShoppingMallAnalyticsPaymentTimeBucket) => {
        typia.assert<IShoppingMallAnalyticsPaymentTimeBucket>(b);
        TestValidator.predicate(
          "time bucket start must be before end",
          new Date(b.bucketStart).getTime() < new Date(b.bucketEnd).getTime(),
        );
      },
    );
  }
}
