import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCartItemSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItemSummary";
import type { IShoppingMallCartOwnerCustomerSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartOwnerCustomerSummary";
import type { IShoppingMallCartOwnerGuestUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartOwnerGuestUserSummary";
import type { IShoppingMallCaseSlaConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCaseSlaConfig";
import type { IShoppingMallChargebackAnalyticsContext } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChargebackAnalyticsContext";
import type { IShoppingMallChargebackAnalyticsSegment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChargebackAnalyticsSegment";
import type { IShoppingMallChargebackAnalyticsSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChargebackAnalyticsSummary";
import type { IShoppingMallCountry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCountry";
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

/**
 * Verify that admin chargeback analytics returns a zeroed summary for a time
 * window with no chargebacks.
 *
 * Business intent:
 *
 * - The platform may have chargebacks in the system, but when an admin requests
 *   analytics for a period that contains no chargebacks, the endpoint must not
 *   fail or return nulls. Instead, it must respond with a fully-typed
 *   IShoppingMallChargebackAnalyticsSummary object whose numeric metrics are
 *   all zeros and whose segments collection is empty.
 *
 * Test steps:
 *
 * 1. Create and authenticate an admin actor using /auth/admin/join.
 * 2. (Optional realism) Create a minimal set of baseline data and a chargeback in
 *    the "current" timeframe:
 *
 *    - Create a payment method via /shoppingMall/admin/paymentMethods.
 *    - Create a shipping method via /shoppingMall/admin/shippingMethods.
 *    - Create a SKU inventory state via /shoppingMall/admin/skuInventoryStates.
 *    - Join as a customer via /auth/customer/join.
 *    - Join/login as a seller via /auth/seller/join.
 *    - As the seller, create a product and a SKU.
 *    - As the customer, create a cart, add the SKU as a cart item, and create an
 *         order using that cart and a simple inline shipping address snapshot.
 *    - As the customer, create a payment for that order using the created payment
 *         method.
 *    - As the admin, create a chargeback for that order payment using
 *         /shoppingMall/admin/payments/{orderPaymentId}/chargebacks.
 * 3. Define an analysis window far in the past (e.g. fromDate and toDate ~ 10-20
 *    years before "now") such that no chargebacks can fall inside this window.
 * 4. Call PATCH /shoppingMall/admin/analytics/chargebacks/summary via
 *    api.functional.shoppingMall.admin.analytics.chargebacks.summary.index with
 *    a body that sets fromDate/toDate to that past window and leaves other
 *    filters undefined.
 * 5. Validate that:
 *
 *    - The response is a valid IShoppingMallChargebackAnalyticsSummary
 *         (typia.assert).
 *    - Context.fromDate and context.toDate match (or at least are consistent with)
 *         the requested window.
 *    - TotalChargebackCount === 0.
 *    - TotalDisputedAmount === 0.
 *    - TotalChargebackAmount === 0.
 *    - NetLossAmount === 0.
 *    - ChargebackRate === 0.
 *    - Segments is an empty array.
 */
export async function test_api_admin_chargeback_analytics_empty_window(
  connection: api.IConnection,
) {
  // 1. Admin join (authentication token will be attached to connection)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.shoppingmall.local/join",
    referrer: "https://admin.shoppingmall.local/",
  } satisfies IShoppingMallAdminJoin.ICreate;
  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. (Optional realism) Create baseline data and a current-time chargeback
  // 2.1 Create a payment method
  const paymentMethodBody = {
    code: `card_${RandomGenerator.alphaNumeric(8)}`,
    display_name: "Credit Card",
    description: "Test card payment method for analytics",
    provider_type: "card_processor",
    allowed_currencies: "USD",
    allowed_countries: null,
    min_amount: null,
    max_amount: null,
    status: "active",
  } satisfies IShoppingMallPaymentMethod.ICreate;
  const paymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(connection, {
      body: paymentMethodBody,
    });
  typia.assert<IShoppingMallPaymentMethod>(paymentMethod);

  // 2.2 Create a shipping method
  const shippingMethodBody = {
    method_code: `standard_${RandomGenerator.alphaNumeric(6)}`,
    display_name: "Standard Shipping",
    service_level_description: "3-5 business days",
  } satisfies IShoppingMallShippingMethod.ICreate;
  const shippingMethod: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: shippingMethodBody,
    });
  typia.assert<IShoppingMallShippingMethod>(shippingMethod);

  // 2.3 Create an inventory state
  const inventoryStateBody = {
    code: `in_stock_${RandomGenerator.alphaNumeric(4)}`,
    name: "In Stock",
    description: "Test inventory state",
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;
  const inventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      { body: inventoryStateBody },
    );
  typia.assert<IShoppingMallSkuInventoryState>(inventoryState);

  // 2.4 Join as customer
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://shoppingmall.local/join",
    referrer: "https://shoppingmall.local/landing",
  } satisfies IShoppingMallCustomerJoin.IRequest;
  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerAuthorized);

  // 2.5 Join/login as seller
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://seller.shoppingmall.local/join",
    referrer: "https://seller.shoppingmall.local/",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;
  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAuthorized);

  // 2.6 Create a product as seller
  const productBody = {
    code: `PROD-${RandomGenerator.alphaNumeric(8)}`,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    summary: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "TestBrand",
    model_name: "ModelX",
    status: "active",
    primary_image_uri: "https://cdn.shoppingmall.local/images/product.png",
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert<IShoppingMallProduct>(product);

  // 2.7 Create a SKU for that product
  const skuBody = {
    code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
    barcode: null,
    status: "active",
    price: 100,
    original_price: null,
    inventory_quantity: 100,
    low_stock_threshold: 5,
    shopping_mall_sku_inventory_state_id: inventoryState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;
  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id,
      body: skuBody,
    });
  typia.assert<IShoppingMallSku>(sku);

  // 2.8 Create a cart as customer
  const cartBody = {
    actor_type: "customer",
    status: "active",
    currency_code: "USD",
  } satisfies IShoppingMallCart.ICreate;
  const cart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: cartBody,
    });
  typia.assert<IShoppingMallCart>(cart);

  // 2.9 Add SKU as cart item
  const cartItemBody = {
    shopping_mall_sku_id: sku.id,
    quantity: 1,
  } satisfies IShoppingMallCartItem.ICreate;
  const cartItem: IShoppingMallCartItem =
    await api.functional.shoppingMall.customer.carts.items.create(connection, {
      cartId: cart.id,
      body: cartItemBody,
    });
  typia.assert<IShoppingMallCartItem>(cartItem);

  // 2.10 Create an order from cart
  const shippingSnapshot: IShoppingMallShippingAddressSnapshot.ICreate = {
    recipient_name: RandomGenerator.name(2),
    phone_number: RandomGenerator.mobile(),
    country_code: "US",
    postal_code: "10001",
    state_or_region: "NY",
    city: "New York",
    address_line1: "350 5th Ave",
    address_line2: null,
  };

  const orderItems: IShoppingMallOrderItem.ICreate[] = [
    {
      shopping_mall_sku_id: sku.id,
      quantity: 1,
    },
  ];

  const orderBody = {
    cart_id: cart.id,
    currency_code: "USD",
    items: orderItems,
    shipping_address_id: null,
    shipping_address_snapshot: shippingSnapshot,
    shipping_method_id: shippingMethod.id,
    payment_method_id: paymentMethod.id,
    buyer_memo: null,
    platform_note: null,
  } satisfies IShoppingMallOrder.ICreate;
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderBody,
    });
  typia.assert<IShoppingMallOrder>(order);

  // 2.11 Create a payment for the order
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
  typia.assert<IShoppingMallOrderPayment>(orderPayment);

  // 2.12 Create a chargeback for that payment
  const chargebackBody = {
    currency_code: orderPayment.currency_code,
    disputed_amount: orderPayment.payable_amount,
    chargeback_amount: orderPayment.payable_amount,
    reason_code: "test_reason",
    status: "open",
    stage: "first_presentment",
    provider_reference: RandomGenerator.alphaNumeric(12),
    metadata: "test chargeback for analytics baseline",
  } satisfies IShoppingMallPaymentChargeback.ICreate;
  const chargeback: IShoppingMallPaymentChargeback =
    await api.functional.shoppingMall.admin.payments.chargebacks.create(
      connection,
      {
        orderPaymentId: orderPayment.id,
        body: chargebackBody,
      },
    );
  typia.assert<IShoppingMallPaymentChargeback>(chargeback);

  // 3. Define a past analysis window that contains no chargebacks
  const now = new Date();
  const twentyYearsMs = 20 * 365 * 24 * 60 * 60 * 1000;
  const pastStart = new Date(now.getTime() - twentyYearsMs);
  const pastEnd = new Date(
    now.getTime() - (twentyYearsMs - 7 * 24 * 60 * 60 * 1000),
  );

  const requestBody: IShoppingMallChargebackAnalyticsSummary.IRequest = {
    fromDate: pastStart.toISOString(),
    toDate: pastEnd.toISOString(),
    statusFilters: undefined,
    groupBy: undefined,
    paymentMethodCodes: undefined,
    sellerIds: undefined,
    cursor: undefined,
  };

  // 4. Call the analytics endpoint for the empty window
  const summary: IShoppingMallChargebackAnalyticsSummary =
    await api.functional.shoppingMall.admin.analytics.chargebacks.summary.index(
      connection,
      { body: requestBody },
    );
  typia.assert<IShoppingMallChargebackAnalyticsSummary>(summary);

  // 5. Validate metrics are all zero and context reflects window
  // Type validation of context
  typia.assert<IShoppingMallChargebackAnalyticsContext>(summary.context);
  TestValidator.equals(
    "context.fromDate matches requested window start",
    summary.context.fromDate,
    requestBody.fromDate,
  );
  TestValidator.equals(
    "context.toDate matches requested window end",
    summary.context.toDate,
    requestBody.toDate,
  );

  TestValidator.equals(
    "totalChargebackCount is zero when no chargebacks in window",
    summary.totalChargebackCount,
    0,
  );
  TestValidator.equals(
    "totalDisputedAmount is zero when no chargebacks in window",
    summary.totalDisputedAmount,
    0,
  );
  TestValidator.equals(
    "totalChargebackAmount is zero when no chargebacks in window",
    summary.totalChargebackAmount,
    0,
  );
  TestValidator.equals(
    "netLossAmount is zero when no chargebacks in window",
    summary.netLossAmount,
    0,
  );
  TestValidator.equals(
    "chargebackRate is zero when no chargebacks in window",
    summary.chargebackRate,
    0,
  );

  TestValidator.equals(
    "segments is empty array when no chargebacks in window",
    summary.segments.length,
    0,
  );
}
