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
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
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
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallRegion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRegion";
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

export async function test_api_admin_chargeback_analytics_with_filters_and_segments(
  connection: api.IConnection,
) {
  // 1. Admin joins and logs in
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Admin123!" as string & tags.Format<"password">,
    ip: typia.random<string & tags.Format<"ipv4">>(),
    href: "https://admin.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com" as string & tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  const adminLoginBody = {
    email: admin.email,
    password: adminJoinBody.password,
    ip: adminJoinBody.ip,
    href: "https://admin.example.com/login" as string & tags.Format<"uri">,
    referrer: adminJoinBody.referrer,
  } satisfies IShoppingMallAdminLogin.ICreate;
  const adminLoggedIn: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedIn);

  // 2. Customer joins and logs in
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Customer123!" as string & tags.Format<"password">,
    ip: typia.random<string & tags.Format<"ipv4">>(),
    href: "https://shop.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://shop.example.com" as string & tags.Format<"uri">,
  } satisfies IShoppingMallCustomerJoin.IRequest;
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customer);

  const customerLoginBody = {
    email: customer.email,
    password: customerJoinBody.password,
    ip: customerJoinBody.ip ?? null,
    href: "https://shop.example.com/login" as string & tags.Format<"uri">,
    referrer: customerJoinBody.referrer,
  } satisfies IShoppingMallCustomerLogin.IRequest;
  const customerLoggedIn: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLoggedIn);

  // 3. Seller joins and logs in
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Seller123!" as string & tags.Format<"password">,
    ip: typia.random<string & tags.Format<"ipv4">>(),
    href: "https://seller.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://seller.example.com" as string & tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthJoin.IRequest;
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(seller);

  const sellerLoginBody = {
    email: seller.email,
    password: sellerJoinBody.password,
    ip: sellerJoinBody.ip ?? null,
    href: "https://seller.example.com/login" as string & tags.Format<"uri">,
    referrer: sellerJoinBody.referrer,
  } satisfies IShoppingMallSellerAuthLogin.IRequest;
  const sellerLoggedIn: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoggedIn);

  // 4. As admin, create country and region
  const countryCode = "US";
  const countryCreateBody = {
    country_code: countryCode,
    name_en: "United States",
    phone_code: "+1",
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallCountry.ICreate;
  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryCreateBody,
    });
  typia.assert(country);

  const regionCreateBody = {
    code: "CA",
    name_en: "California",
    region_type: "state",
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallRegion.ICreate;
  const region: IShoppingMallRegion =
    await api.functional.shoppingMall.admin.countries.regions.create(
      connection,
      {
        countryCode,
        body: regionCreateBody,
      },
    );
  typia.assert(region);

  // 5. As admin, create shipping and payment methods
  const shippingMethodCode = "standard";
  const shippingMethodCreateBody = {
    method_code: shippingMethodCode,
    display_name: "Standard Shipping",
    service_level_description: "Standard ground shipping",
  } satisfies IShoppingMallShippingMethod.ICreate;
  const shippingMethod: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: shippingMethodCreateBody,
    });
  typia.assert(shippingMethod);

  const paymentMethodCode = "card";
  const paymentMethodCreateBody = {
    code: paymentMethodCode,
    display_name: "Credit Card",
    description: "Generic card processor",
    provider_type: "card_processor",
    allowed_currencies: "USD",
    allowed_countries: countryCode,
    min_amount: 0,
    max_amount: null,
    status: "active",
  } satisfies IShoppingMallPaymentMethod.ICreate;
  const paymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(connection, {
      body: paymentMethodCreateBody,
    });
  typia.assert(paymentMethod);

  // 6. As seller, create product and SKU inventory state + SKU
  const productCreateBody = {
    code: RandomGenerator.alphaNumeric(8),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "TestBrand",
    model_name: "ModelX",
    status: "active",
    primary_image_uri: "https://cdn.example.com/product.jpg" as string &
      tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  const inventoryStateCreateBody = {
    code: "in_stock",
    name: "In Stock",
    description: "Inventory available for sale",
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;
  const inventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: inventoryStateCreateBody,
      },
    );
  typia.assert(inventoryState);

  const skuCreateBody = {
    code: RandomGenerator.alphaNumeric(8),
    barcode: RandomGenerator.alphaNumeric(12),
    status: "active" as string & tags.MinLength<1> & tags.MaxLength<64>,
    price: 100,
    original_price: 120,
    inventory_quantity: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 1 as number & tags.Type<"int32"> & tags.Minimum<0>,
    shopping_mall_sku_inventory_state_id: inventoryState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;
  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id,
      body: skuCreateBody,
    });
  typia.assert(sku);

  // 7. As customer, create cart and add item
  const cartCreateBody = {
    actor_type: "customer",
    status: "active",
    currency_code: "USD",
  } satisfies IShoppingMallCart.ICreate;
  const cart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: cartCreateBody,
    });
  typia.assert(cart);

  const cartItemCreateBody = {
    shopping_mall_sku_id: sku.id,
    quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IShoppingMallCartItem.ICreate;
  const cartItem: IShoppingMallCartItem =
    await api.functional.shoppingMall.customer.carts.items.create(connection, {
      cartId: cart.id,
      body: cartItemCreateBody,
    });
  typia.assert(cartItem);

  // 8. As customer, create order
  const shippingAddressSnapshotCreateBody = {
    recipient_name: "John Doe",
    phone_number: RandomGenerator.mobile(),
    country_code: countryCode,
    postal_code: "94016",
    state_or_region: region.code,
    city: "San Francisco",
    address_line1: "123 Market St",
    address_line2: null,
  } satisfies IShoppingMallShippingAddressSnapshot.ICreate;

  const orderItemCreateBody = {
    shopping_mall_sku_id: sku.id,
    quantity: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallOrderItem.ICreate;

  const orderCreateBody = {
    cart_id: cart.id,
    currency_code: "USD",
    items: [orderItemCreateBody],
    shipping_address_id: null,
    shipping_address_snapshot: shippingAddressSnapshotCreateBody,
    shipping_method_id: shippingMethod.id,
    payment_method_id: paymentMethod.id,
    buyer_memo: null,
    platform_note: null,
  } satisfies IShoppingMallOrder.ICreate;
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateBody,
    });
  typia.assert(order);

  // 9. As customer, create logical payment for the order
  const payableAmount = 100;
  const orderPaymentCreateBody = {
    payment_method_id: paymentMethod.id,
    currency_code: order.currency_code,
    payable_amount: payableAmount,
    provider_reference: null,
    provider_status_code: null,
    metadata: null,
  } satisfies IShoppingMallOrderPayment.ICreate;
  const orderPayment: IShoppingMallOrderPayment =
    await api.functional.shoppingMall.customer.orders.payments.create(
      connection,
      {
        orderId: order.id,
        body: orderPaymentCreateBody,
      },
    );
  typia.assert(orderPayment);

  // 10. As admin, create two chargebacks with different statuses
  const disputedOpen = 40;
  const chargebackOpenCreateBody = {
    currency_code: orderPayment.currency_code,
    disputed_amount: disputedOpen,
    chargeback_amount: disputedOpen,
    reason_code: "FRAUD",
    status: "open",
    stage: "first_presentment",
    provider_reference: RandomGenerator.alphaNumeric(16),
    metadata: "{}",
  } satisfies IShoppingMallPaymentChargeback.ICreate;
  const openChargeback: IShoppingMallPaymentChargeback =
    await api.functional.shoppingMall.admin.payments.chargebacks.create(
      connection,
      {
        orderPaymentId: orderPayment.id,
        body: chargebackOpenCreateBody,
      },
    );
  typia.assert(openChargeback);

  const disputedWon = 60;
  const chargebackWonCreateBody = {
    currency_code: orderPayment.currency_code,
    disputed_amount: disputedWon,
    chargeback_amount: disputedWon,
    reason_code: "OTHER",
    status: "won",
    stage: "pre_arbitration",
    provider_reference: RandomGenerator.alphaNumeric(16),
    metadata: "{}",
  } satisfies IShoppingMallPaymentChargeback.ICreate;
  const wonChargeback: IShoppingMallPaymentChargeback =
    await api.functional.shoppingMall.admin.payments.chargebacks.create(
      connection,
      {
        orderPaymentId: orderPayment.id,
        body: chargebackWonCreateBody,
      },
    );
  typia.assert(wonChargeback);

  // 11. Call analytics endpoint: filter only "open" and group by payment_method
  const now = new Date();
  const fromDate = new Date(
    now.getTime() - 1000 * 60 * 60 * 24 * 365 * 10,
  ).toISOString();
  const toDate = new Date(
    now.getTime() + 1000 * 60 * 60 * 24 * 365 * 10,
  ).toISOString();

  const analyticsRequestOpenOnly = {
    fromDate,
    toDate,
    statusFilters: ["open"],
    groupBy: "payment_method",
    paymentMethodCodes: [paymentMethod.code],
    sellerIds: [product.shopping_mall_seller_id],
    cursor: undefined,
  } satisfies IShoppingMallChargebackAnalyticsSummary.IRequest;

  const summaryOpenOnly: IShoppingMallChargebackAnalyticsSummary =
    await api.functional.shoppingMall.admin.analytics.chargebacks.summary.index(
      connection,
      {
        body: analyticsRequestOpenOnly,
      },
    );
  typia.assert(summaryOpenOnly);

  // 12. Validate context echo and basic metrics for open-only filter
  const contextOpenOnly: IShoppingMallChargebackAnalyticsContext =
    summaryOpenOnly.context;
  TestValidator.equals(
    "context statusFilters should echo [open]",
    contextOpenOnly.statusFilters,
    ["open"],
  );
  TestValidator.equals(
    "context groupBy should echo payment_method",
    contextOpenOnly.groupBy,
    "payment_method",
  );

  // At least one chargeback should be counted (the open one)
  TestValidator.predicate(
    "totalChargebackCount should be >= 1 for open-only",
    summaryOpenOnly.totalChargebackCount >= 1,
  );

  // Totals should be at least the amounts of the open chargeback
  TestValidator.predicate(
    "totalDisputedAmount should be >= disputedOpen",
    summaryOpenOnly.totalDisputedAmount >= disputedOpen,
  );
  TestValidator.predicate(
    "totalChargebackAmount should be >= disputedOpen",
    summaryOpenOnly.totalChargebackAmount >= disputedOpen,
  );
  TestValidator.predicate(
    "netLossAmount should be >= 0",
    summaryOpenOnly.netLossAmount >= 0,
  );
  TestValidator.predicate(
    "chargebackRate should be >= 0",
    summaryOpenOnly.chargebackRate >= 0,
  );

  // segments should be non-empty
  TestValidator.predicate(
    "segments should be non-empty for open-only",
    summaryOpenOnly.segments.length >= 1,
  );

  // Try to locate the segment for the created payment method (by key or label)
  const maybeSegmentForMethod:
    | IShoppingMallChargebackAnalyticsSegment
    | undefined = summaryOpenOnly.segments.find(
    (seg) =>
      seg.key === paymentMethod.code ||
      seg.label === paymentMethod.display_name,
  );

  if (maybeSegmentForMethod !== undefined) {
    const seg = maybeSegmentForMethod;
    TestValidator.predicate(
      "segment chargebackCount >= 1",
      seg.chargebackCount >= 1,
    );
    TestValidator.predicate(
      "segment disputedAmount >= disputedOpen",
      seg.disputedAmount >= disputedOpen,
    );
    TestValidator.predicate(
      "segment chargebackAmount >= disputedOpen",
      seg.chargebackAmount >= disputedOpen,
    );
    TestValidator.predicate(
      "segment netLossAmount >= 0",
      seg.netLossAmount >= 0,
    );
    TestValidator.predicate(
      "segment chargebackRate >= 0",
      seg.chargebackRate >= 0,
    );
  }

  // 13. Call analytics endpoint again with broader filter including both statuses
  const analyticsRequestAllStatuses = {
    fromDate,
    toDate,
    statusFilters: ["open", "won"],
    groupBy: "payment_method",
    paymentMethodCodes: [paymentMethod.code],
    sellerIds: [product.shopping_mall_seller_id],
    cursor: undefined,
  } satisfies IShoppingMallChargebackAnalyticsSummary.IRequest;

  const summaryAll: IShoppingMallChargebackAnalyticsSummary =
    await api.functional.shoppingMall.admin.analytics.chargebacks.summary.index(
      connection,
      {
        body: analyticsRequestAllStatuses,
      },
    );
  typia.assert(summaryAll);

  const contextAll: IShoppingMallChargebackAnalyticsContext =
    summaryAll.context;
  TestValidator.equals(
    "context statusFilters should echo [open, won]",
    contextAll.statusFilters,
    ["open", "won"],
  );
  TestValidator.equals(
    "context groupBy should still be payment_method",
    contextAll.groupBy,
    "payment_method",
  );

  // With broader statuses, total count and totals should be at least as large as open-only
  TestValidator.predicate(
    "totalChargebackCount with [open, won] >= open-only",
    summaryAll.totalChargebackCount >= summaryOpenOnly.totalChargebackCount,
  );
  TestValidator.predicate(
    "totalDisputedAmount with [open, won] >= open-only",
    summaryAll.totalDisputedAmount >= summaryOpenOnly.totalDisputedAmount,
  );
  TestValidator.predicate(
    "totalChargebackAmount with [open, won] >= open-only",
    summaryAll.totalChargebackAmount >= summaryOpenOnly.totalChargebackAmount,
  );

  // segments also should be non-empty in broader filter
  TestValidator.predicate(
    "segments should be non-empty for all-status summary",
    summaryAll.segments.length >= 1,
  );
}
