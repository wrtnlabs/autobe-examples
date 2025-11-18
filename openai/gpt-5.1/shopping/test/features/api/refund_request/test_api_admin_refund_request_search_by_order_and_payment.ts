import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRefundRequest";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartItemSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItemSummary";
import type { IShoppingMallCartOwnerCustomerSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartOwnerCustomerSummary";
import type { IShoppingMallCartOwnerGuestUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartOwnerGuestUserSummary";
import type { IShoppingMallCaseSlaConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCaseSlaConfig";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
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
import type { IShoppingMallRefundRequestReason } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequestReason";
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

export async function test_api_admin_refund_request_search_by_order_and_payment(
  connection: api.IConnection,
) {
  // 1. Admin joins and logs in
  const adminEmail = `${RandomGenerator.alphabets(8)}@admin.test.com`;
  const adminPassword = "Adm1n!234" as string & tags.Format<"password">;

  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.test.com/join",
    referrer: "https://admin.test.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminJoin);

  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.test.com/login",
    referrer: "https://admin.test.com/landing",
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLogin = await api.functional.auth.admin.login(connection, {
    body: adminLoginBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminLogin);

  // 2. Admin config: country, region, shipping, payment, category
  const countryCode = RandomGenerator.alphabets(2).toUpperCase();
  const countryCreateBody = {
    country_code: countryCode,
    name_en: `Country ${countryCode}`,
    phone_code: "+82",
    is_active: true,
    sort_order: 1,
  } satisfies IShoppingMallCountry.ICreate;

  const country = await api.functional.shoppingMall.admin.countries.create(
    connection,
    { body: countryCreateBody },
  );
  typia.assert<IShoppingMallCountry>(country);

  const regionCreateBody = {
    code: "SEOUL",
    name_en: "Seoul",
    region_type: "city",
    is_active: true,
    sort_order: 1,
  } satisfies IShoppingMallRegion.ICreate;

  const region =
    await api.functional.shoppingMall.admin.countries.regions.create(
      connection,
      {
        countryCode,
        body: regionCreateBody,
      },
    );
  typia.assert<IShoppingMallRegion>(region);

  const shippingMethodCode = `ship_${RandomGenerator.alphabets(6)}`;
  const shippingMethodCreateBody = {
    method_code: shippingMethodCode,
    display_name: "Standard Shipping",
    service_level_description: "Standard delivery",
  } satisfies IShoppingMallShippingMethod.ICreate;

  const shippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: shippingMethodCreateBody,
    });
  typia.assert<IShoppingMallShippingMethod>(shippingMethod);

  const paymentMethodCode = `pay_${RandomGenerator.alphabets(6)}`;
  const paymentMethodCreateBody = {
    code: paymentMethodCode,
    display_name: "Test Card",
    description: "Test payment method",
    provider_type: "card_processor",
    allowed_currencies: "USD,KRW",
    allowed_countries: countryCode,
    min_amount: 0,
    max_amount: null,
    status: "active",
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const paymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(connection, {
      body: paymentMethodCreateBody,
    });
  typia.assert<IShoppingMallPaymentMethod>(paymentMethod);

  const categoryCreateBody = {
    parent_id: null,
    slug: `cat-${RandomGenerator.alphabets(6)}`,
    name_en: "General",
    description_en: "General category",
    status: "active",
    sort_order: 1,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    { body: categoryCreateBody },
  );
  typia.assert<IShoppingMallCategory>(category);

  // 3. Seller onboarding and catalog setup
  const sellerEmail = `${RandomGenerator.alphabets(8)}@seller.test.com`;
  const sellerPassword = "Sell3r!234" as string & tags.Format<"password">;

  const sellerJoinBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: "https://seller.test.com/join",
    referrer: "https://seller.test.com/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerJoin = await api.functional.auth.seller.join(connection, {
    body: sellerJoinBody,
  });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerJoin);

  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: "https://seller.test.com/login",
    referrer: "https://seller.test.com/landing",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerLogin = await api.functional.auth.seller.login(connection, {
    body: sellerLoginBody,
  });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerLogin);

  const productCreateBody = {
    code: `prod-${RandomGenerator.alphabets(6)}`,
    title: "Refund Search Test Product",
    summary: "Product used for testing refund request search",
    description: RandomGenerator.content({ paragraphs: 1 }),
    brand: "TestBrand",
    model_name: "TST-001",
    status: "active",
    primary_image_uri: null,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    { body: productCreateBody },
  );
  typia.assert<IShoppingMallProduct>(product);

  // Back to admin to link product to category
  const adminLoginAgain = await api.functional.auth.admin.login(connection, {
    body: adminLoginBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminLoginAgain);

  const productCategoryCreateBody = {
    shopping_mall_category_id: category.id,
    is_primary: true,
  } satisfies IShoppingMallProductCategory.ICreate;

  const productCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: product.id,
        body: productCategoryCreateBody,
      },
    );
  typia.assert<IShoppingMallProductCategory>(productCategory);

  const skuInventoryStateCreateBody = {
    code: `inv_${RandomGenerator.alphabets(5)}`,
    name: "In Stock",
    description: "Available for purchase",
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;

  const skuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      { body: skuInventoryStateCreateBody },
    );
  typia.assert<IShoppingMallSkuInventoryState>(skuInventoryState);

  // Switch back to seller to create SKU
  const sellerLoginAgain = await api.functional.auth.seller.login(connection, {
    body: sellerLoginBody,
  });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerLoginAgain);

  const skuCreateBody = {
    code: `sku-${RandomGenerator.alphabets(6)}`,
    barcode: null,
    status: "active",
    price: 100,
    original_price: null,
    inventory_quantity: 10,
    low_stock_threshold: null,
    shopping_mall_sku_inventory_state_id: skuInventoryState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;

  const sku = await api.functional.shoppingMall.seller.products.skus.create(
    connection,
    {
      productId: product.id,
      body: skuCreateBody,
    },
  );
  typia.assert<IShoppingMallSku>(sku);

  // 4. Customer onboarding and checkout
  const customerEmail = `${RandomGenerator.alphabets(8)}@customer.test.com`;
  const customerPassword = "Cust0m!234" as string & tags.Format<"password">;

  const customerJoinBody = {
    email: customerEmail,
    password: customerPassword,
    ip: null,
    href: "https://customer.test.com/join",
    referrer: "https://customer.test.com/landing",
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customerJoin = await api.functional.auth.customer.join(connection, {
    body: customerJoinBody,
  });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerJoin);

  const customerLoginBody = {
    email: customerEmail,
    password: customerPassword,
    ip: null,
    href: "https://customer.test.com/login",
    referrer: "https://customer.test.com/landing",
  } satisfies IShoppingMallCustomerLogin.IRequest;

  const customerLogin = await api.functional.auth.customer.login(connection, {
    body: customerLoginBody,
  });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerLogin);

  const cartCreateBody = {
    actor_type: "customer",
    status: "active",
    currency_code: "USD",
  } satisfies IShoppingMallCart.ICreate;

  const cart = await api.functional.shoppingMall.customer.carts.create(
    connection,
    { body: cartCreateBody },
  );
  typia.assert<IShoppingMallCart>(cart);

  const addressCreateBody = {
    shopping_mall_country_id: country.id,
    shopping_mall_region_id: region.id,
    recipient_name: "Test Customer",
    line1: "123 Test Street",
    line2: null,
    city: "Seoul",
    postal_code: "12345",
    phone_number: RandomGenerator.mobile(),
    is_default: true,
  } satisfies IShoppingMallCustomerAddress.ICreate;

  const customerAddress =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      connection,
      {
        customerId: customerJoin.id,
        body: addressCreateBody,
      },
    );
  typia.assert<IShoppingMallCustomerAddress>(customerAddress);

  const orderItems: IShoppingMallOrderItem.ICreate[] = [
    {
      shopping_mall_sku_id: sku.id,
      quantity: 1,
    },
  ];

  const shippingAddressSnapshot: IShoppingMallShippingAddressSnapshot.ICreate | null =
    null;

  const orderCreateBody = {
    cart_id: cart.id,
    currency_code: "USD",
    items: orderItems,
    shipping_address_id: customerAddress.id,
    shipping_address_snapshot: shippingAddressSnapshot,
    shipping_method_id: shippingMethod.id,
    payment_method_id: paymentMethod.id,
    buyer_memo: "Please handle with care",
    platform_note: "Refund search test order",
  } satisfies IShoppingMallOrder.ICreate;

  const order = await api.functional.shoppingMall.customer.orders.create(
    connection,
    { body: orderCreateBody },
  );
  typia.assert<IShoppingMallOrder>(order);

  // 5. Order payment creation
  const paymentCreateBody = {
    payment_method_id: paymentMethod.id,
    currency_code: order.currency_code,
    payable_amount: order.grand_total_amount,
    provider_reference: null,
    provider_status_code: null,
    metadata: null,
  } satisfies IShoppingMallOrderPayment.ICreate;

  const orderPayment =
    await api.functional.shoppingMall.customer.orders.payments.create(
      connection,
      {
        orderId: order.id,
        body: paymentCreateBody,
      },
    );
  typia.assert<IShoppingMallOrderPayment>(orderPayment);

  // 6. Refund request creation by admin
  const adminLoginForRefund = await api.functional.auth.admin.login(
    connection,
    { body: adminLoginBody },
  );
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminLoginForRefund);

  const refundRequestedAmount = orderPayment.payable_amount;

  const refundCreateBody = {
    shopping_mall_order_id: order.id,
    shopping_mall_order_payment_id: orderPayment.id,
    shopping_mall_customer_id: customerJoin.id,
    shopping_mall_seller_id: null,
    shopping_mall_admin_id: null,
    shopping_mall_refund_request_reason_id: null,
    shopping_mall_cancellation_request_id: null,
    shopping_mall_case_sla_config_id: null,
    requested_total_amount: refundRequestedAmount,
    currency_code: order.currency_code,
    reason_description: RandomGenerator.paragraph({ sentences: 5 }),
    requested_by_actor_type: "customer",
    requires_return: true,
  } satisfies IShoppingMallRefundRequest.ICreate;

  const refundRequest =
    await api.functional.shoppingMall.admin.refundRequests.create(connection, {
      body: refundCreateBody,
    });
  typia.assert<IShoppingMallRefundRequest>(refundRequest);

  // 7. Search refund requests by order and payment
  const reasonQuery = refundRequest.reason_description
    ? RandomGenerator.substring(refundRequest.reason_description)
    : undefined;

  const searchBody = {
    page: 1,
    limit: 10,
    orderBy: "requested_at",
    orderDirection: "desc",
    status: undefined,
    orderId: order.id,
    orderPaymentId: orderPayment.id,
    requestedByActorType: "customer",
    currencyCode: order.currency_code,
    reasonDescriptionQuery: reasonQuery,
    requestedFrom: null,
    requestedTo: null,
    decidedFrom: null,
    decidedTo: null,
  } satisfies IShoppingMallRefundRequest.IRequest;

  const pageResult =
    await api.functional.shoppingMall.admin.refundRequests.index(connection, {
      body: searchBody,
    });
  typia.assert<IPageIShoppingMallRefundRequest.ISummary>(pageResult);

  const pagination: IPage.IPagination = pageResult.pagination;
  TestValidator.equals(
    "pagination current page should be 1",
    pagination.current,
    1 as number & tags.Type<"int32"> & tags.Minimum<0>,
  );
  TestValidator.equals(
    "pagination limit should be 10",
    pagination.limit,
    10 as number & tags.Type<"int32"> & tags.Minimum<0>,
  );

  const data = pageResult.data;
  TestValidator.predicate(
    "at least one refund summary should be returned",
    data.length >= 1,
  );

  const matched = data.find((summary) => {
    const orderMatch = summary.order.id === order.id;
    const paymentMatch = summary.orderPayment
      ? summary.orderPayment.id === orderPayment.id
      : true;
    const actorMatch = summary.requested_by_actor_type === "customer";
    return orderMatch && paymentMatch && actorMatch;
  });

  TestValidator.predicate(
    "matched refund summary should exist",
    matched !== undefined,
  );

  if (matched !== undefined) {
    TestValidator.equals(
      "matched requested_total_amount equals created refund amount",
      matched.requested_total_amount,
      refundRequestedAmount,
    );
    TestValidator.equals(
      "matched currency_code equals order currency",
      matched.currency_code,
      order.currency_code,
    );
    TestValidator.equals(
      "matched requested_by_actor_type is customer",
      matched.requested_by_actor_type,
      "customer",
    );
    TestValidator.equals(
      "matched requires_return is true",
      matched.requires_return,
      true,
    );
    TestValidator.equals(
      "matched order id equals filter orderId",
      matched.order.id,
      order.id,
    );
    if (matched.orderPayment !== null && matched.orderPayment !== undefined) {
      TestValidator.equals(
        "matched orderPayment id equals filter orderPaymentId",
        matched.orderPayment.id,
        orderPayment.id,
      );
    }
  }

  // Ensure all results respect the filter by order and payment where applicable
  for (const summary of data) {
    TestValidator.equals(
      "every summary order id equals filter orderId",
      summary.order.id,
      order.id,
    );
    if (summary.orderPayment !== null && summary.orderPayment !== undefined) {
      TestValidator.equals(
        "every summary orderPayment id equals filter orderPaymentId when present",
        summary.orderPayment.id,
        orderPayment.id,
      );
    }
  }

  // 9. Negative search: use a random paymentId to ensure no results
  const negativeSearchBody = {
    page: 1,
    limit: 10,
    orderBy: "requested_at",
    orderDirection: "desc",
    status: undefined,
    orderId: order.id,
    orderPaymentId: typia.random<string & tags.Format<"uuid">>(),
    requestedByActorType: "customer",
    currencyCode: order.currency_code,
    reasonDescriptionQuery: undefined,
    requestedFrom: null,
    requestedTo: null,
    decidedFrom: null,
    decidedTo: null,
  } satisfies IShoppingMallRefundRequest.IRequest;

  const negativePage =
    await api.functional.shoppingMall.admin.refundRequests.index(connection, {
      body: negativeSearchBody,
    });
  typia.assert<IPageIShoppingMallRefundRequest.ISummary>(negativePage);

  TestValidator.equals(
    "negative search should return zero results",
    negativePage.data.length,
    0,
  );
}
