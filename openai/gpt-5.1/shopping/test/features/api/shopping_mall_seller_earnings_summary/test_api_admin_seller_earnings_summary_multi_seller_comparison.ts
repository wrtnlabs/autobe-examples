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
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallRegion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRegion";
import type { IShoppingMallRiskCase } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRiskCase";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerAuthLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthLogin";
import type { IShoppingMallSellerEarning } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerEarning";
import type { IShoppingMallSellerEarningsSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerEarningsSummary";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentItem";
import type { IShoppingMallShippingAddressSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingAddressSnapshot";
import type { IShoppingMallShippingMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingMethod";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";
import type { IShoppingMallSkuExternalId } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuExternalId";
import type { IShoppingMallSkuInventoryState } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuInventoryState";

export async function test_api_admin_seller_earnings_summary_multi_seller_comparison(
  connection: api.IConnection,
) {
  // 1. Admin join and login
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.shoppingmall.test/join",
    referrer: "https://admin.shoppingmall.test/",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.shoppingmall.test/login",
    referrer: "https://admin.shoppingmall.test/",
  } satisfies IShoppingMallAdminLogin.ICreate;
  const adminLoggedIn: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedIn);

  // 2. Global reference data: country, region, category, shipping method, payment method, sku inventory state
  const countryCode = "KR";
  const countryCreateBody = {
    country_code: countryCode,
    name_en: "Korea",
    phone_code: "+82",
    is_active: true,
    sort_order: 1,
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
    sort_order: 1,
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

  const categoryCreateBody = {
    parent_id: null,
    slug: "electronics",
    name_en: "Electronics",
    description_en: "Electronics category",
    status: "active",
    sort_order: 1,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryCreateBody,
    });
  typia.assert(category);

  const shippingMethodCreateBody = {
    method_code: "standard",
    display_name: "Standard Shipping",
    service_level_description: "Standard shipping method",
  } satisfies IShoppingMallShippingMethod.ICreate;
  const shippingMethod: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: shippingMethodCreateBody,
    });
  typia.assert(shippingMethod);

  const paymentMethodCreateBody = {
    code: "card",
    display_name: "Credit Card",
    description: "Credit card payment",
    provider_type: "card_processor",
    allowed_currencies: null,
    allowed_countries: null,
    min_amount: null,
    max_amount: null,
    status: "active",
  } satisfies IShoppingMallPaymentMethod.ICreate;
  const paymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(connection, {
      body: paymentMethodCreateBody,
    });
  typia.assert(paymentMethod);

  const skuInventoryStateCreateBody = {
    code: "in_stock",
    name: "In Stock",
    description: "Stock available",
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;
  const skuInventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: skuInventoryStateCreateBody,
      },
    );
  typia.assert(skuInventoryState);

  // 3. Seller A setup: join, login, product, sku, link category
  const sellerAEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const sellerAPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const sellerAJoinBody = {
    email: sellerAEmail,
    password: sellerAPassword,
    ip: null,
    href: "https://seller.shoppingmall.test/join",
    referrer: "https://seller.shoppingmall.test/",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;
  const sellerA: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerAJoinBody,
    });
  typia.assert(sellerA);

  const sellerALoginBody = {
    email: sellerAEmail,
    password: sellerAPassword,
    ip: null,
    href: "https://seller.shoppingmall.test/login",
    referrer: "https://seller.shoppingmall.test/",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;
  const sellerALoggedIn: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerALoginBody,
    });
  typia.assert(sellerALoggedIn);

  const productACreateBody = {
    code: "PROD-A",
    title: "Seller A Product",
    summary: "Product from seller A",
    description: "Description for seller A product",
    brand: "BrandA",
    model_name: "ModelA",
    status: "active",
    primary_image_uri: null,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;
  const productA: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productACreateBody,
    });
  typia.assert(productA);

  // Category link as admin
  const productCategoryACreateBody = {
    shopping_mall_category_id: category.id,
    is_primary: true,
  } satisfies IShoppingMallProductCategory.ICreate;
  const productACategory: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: productA.id,
        body: productCategoryACreateBody,
      },
    );
  typia.assert(productACategory);

  // Ensure seller A context for SKU create
  const sellerALoggedIn2: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerALoginBody,
    });
  typia.assert(sellerALoggedIn2);

  const skuACreateBody = {
    code: "SKU-A",
    barcode: null,
    status: "active",
    price: 100,
    original_price: 120,
    inventory_quantity: 100,
    low_stock_threshold: 5,
    shopping_mall_sku_inventory_state_id: skuInventoryState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;
  const skuA: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: productA.id,
      body: skuACreateBody,
    });
  typia.assert(skuA);

  // 3. Seller B setup: join, login, product, sku, link category
  const sellerBEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const sellerBPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const sellerBJoinBody = {
    email: sellerBEmail,
    password: sellerBPassword,
    ip: null,
    href: "https://seller.shoppingmall.test/join",
    referrer: "https://seller.shoppingmall.test/",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;
  const sellerB: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerBJoinBody,
    });
  typia.assert(sellerB);

  const sellerBLoginBody = {
    email: sellerBEmail,
    password: sellerBPassword,
    ip: null,
    href: "https://seller.shoppingmall.test/login",
    referrer: "https://seller.shoppingmall.test/",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;
  const sellerBLoggedIn: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerBLoginBody,
    });
  typia.assert(sellerBLoggedIn);

  const productBCreateBody = {
    code: "PROD-B",
    title: "Seller B Product",
    summary: "Product from seller B",
    description: "Description for seller B product",
    brand: "BrandB",
    model_name: "ModelB",
    status: "active",
    primary_image_uri: null,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;
  const productB: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBCreateBody,
    });
  typia.assert(productB);

  const productCategoryBCreateBody = {
    shopping_mall_category_id: category.id,
    is_primary: true,
  } satisfies IShoppingMallProductCategory.ICreate;
  const productBCategory: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: productB.id,
        body: productCategoryBCreateBody,
      },
    );
  typia.assert(productBCategory);

  const sellerBLoggedIn2: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerBLoginBody,
    });
  typia.assert(sellerBLoggedIn2);

  const skuBCreateBody = {
    code: "SKU-B",
    barcode: null,
    status: "active",
    price: 200,
    original_price: 220,
    inventory_quantity: 100,
    low_stock_threshold: 5,
    shopping_mall_sku_inventory_state_id: skuInventoryState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;
  const skuB: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: productB.id,
      body: skuBCreateBody,
    });
  typia.assert(skuB);

  // 4. Customer setup
  const customerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const customerPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const customerJoinBody = {
    email: customerEmail,
    password: customerPassword,
    ip: null,
    href: "https://customer.shoppingmall.test/join",
    referrer: "https://customer.shoppingmall.test/",
  } satisfies IShoppingMallCustomerJoin.IRequest;
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customer);

  const customerLoginBody = {
    email: customerEmail,
    password: customerPassword,
    ip: null,
    href: "https://customer.shoppingmall.test/login",
    referrer: "https://customer.shoppingmall.test/",
  } satisfies IShoppingMallCustomerLogin.IRequest;
  const customerLoggedIn: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLoggedIn);

  const currencyCode = "KRW";

  // Helper to build shipping address snapshot
  const shippingAddressSnapshotCreate = (
    recipient: string,
  ): IShoppingMallShippingAddressSnapshot.ICreate => ({
    recipient_name: recipient,
    phone_number: RandomGenerator.mobile(),
    country_code: country.country_code,
    postal_code: "06000",
    state_or_region: region.name_en,
    city: region.name_en,
    address_line1: "Gangnam-daero 1",
    address_line2: null,
  });

  // 4-A. Order for Seller A
  const cartACreateBody = {
    actor_type: "customer",
    status: "active",
    currency_code: currencyCode,
  } satisfies IShoppingMallCart.ICreate;
  const cartA: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: cartACreateBody,
    });
  typia.assert(cartA);

  const cartItemACreateBody = {
    shopping_mall_sku_id: skuA.id,
    quantity: 1,
  } satisfies IShoppingMallCartItem.ICreate;
  const cartItemA: IShoppingMallCartItem =
    await api.functional.shoppingMall.customer.carts.items.create(connection, {
      cartId: cartA.id,
      body: cartItemACreateBody,
    });
  typia.assert(cartItemA);

  const orderACreateBody = {
    cart_id: cartA.id,
    currency_code: currencyCode,
    items: [
      {
        shopping_mall_sku_id: skuA.id,
        quantity: 1,
      } satisfies IShoppingMallOrderItem.ICreate,
    ],
    shipping_address_id: null,
    shipping_address_snapshot: shippingAddressSnapshotCreate("Buyer A"),
    shipping_method_id: shippingMethod.id,
    payment_method_id: paymentMethod.id,
    buyer_memo: null,
    platform_note: null,
  } satisfies IShoppingMallOrder.ICreate;
  const orderA: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderACreateBody,
    });
  typia.assert(orderA);

  const payableAmountA = 100;
  const orderPaymentACreateBody = {
    payment_method_id: paymentMethod.id,
    currency_code: currencyCode,
    payable_amount: payableAmountA,
    provider_reference: null,
    provider_status_code: null,
    metadata: null,
  } satisfies IShoppingMallOrderPayment.ICreate;
  const orderPaymentA: IShoppingMallOrderPayment =
    await api.functional.shoppingMall.customer.orders.payments.create(
      connection,
      {
        orderId: orderA.id,
        body: orderPaymentACreateBody,
      },
    );
  typia.assert(orderPaymentA);

  const orderItemA: IShoppingMallOrderItem = orderA.items[0];

  // 4-B. Order for Seller B
  const cartBCreateBody = {
    actor_type: "customer",
    status: "active",
    currency_code: currencyCode,
  } satisfies IShoppingMallCart.ICreate;
  const cartB: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: cartBCreateBody,
    });
  typia.assert(cartB);

  const cartItemBCreateBody = {
    shopping_mall_sku_id: skuB.id,
    quantity: 2,
  } satisfies IShoppingMallCartItem.ICreate;
  const cartItemB: IShoppingMallCartItem =
    await api.functional.shoppingMall.customer.carts.items.create(connection, {
      cartId: cartB.id,
      body: cartItemBCreateBody,
    });
  typia.assert(cartItemB);

  const orderBCreateBody = {
    cart_id: cartB.id,
    currency_code: currencyCode,
    items: [
      {
        shopping_mall_sku_id: skuB.id,
        quantity: 2,
      } satisfies IShoppingMallOrderItem.ICreate,
    ],
    shipping_address_id: null,
    shipping_address_snapshot: shippingAddressSnapshotCreate("Buyer B"),
    shipping_method_id: shippingMethod.id,
    payment_method_id: paymentMethod.id,
    buyer_memo: null,
    platform_note: null,
  } satisfies IShoppingMallOrder.ICreate;
  const orderB: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderBCreateBody,
    });
  typia.assert(orderB);

  const payableAmountB = 400;
  const orderPaymentBCreateBody = {
    payment_method_id: paymentMethod.id,
    currency_code: currencyCode,
    payable_amount: payableAmountB,
    provider_reference: null,
    provider_status_code: null,
    metadata: null,
  } satisfies IShoppingMallOrderPayment.ICreate;
  const orderPaymentB: IShoppingMallOrderPayment =
    await api.functional.shoppingMall.customer.orders.payments.create(
      connection,
      {
        orderId: orderB.id,
        body: orderPaymentBCreateBody,
      },
    );
  typia.assert(orderPaymentB);

  const orderItemB: IShoppingMallOrderItem = orderB.items[0];

  // 5. Admin-created seller earnings
  const adminLoggedIn2: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedIn2);

  // Configure deterministic earnings where Seller B > Seller A
  const earningAGross = 100;
  const earningASellerDiscount = 0;
  const earningAPlatformDiscount = 0;
  const earningACommission = 10;
  const earningAOtherFee = 0;
  const earningANet =
    earningAGross -
    earningASellerDiscount -
    earningACommission -
    earningAOtherFee;

  const sellerAEarningCreateBody = {
    shopping_mall_order_id: orderA.id,
    shopping_mall_order_item_id: orderItemA.id,
    shopping_mall_order_payment_id: orderPaymentA.id,
    currency_code: currencyCode,
    gross_amount: earningAGross,
    seller_discount_amount: earningASellerDiscount,
    platform_discount_amount: earningAPlatformDiscount,
    commission_amount: earningACommission,
    other_fee_amount: earningAOtherFee,
    net_earning_amount: earningANet,
    earning_type: "order_item",
    business_status: "eligible",
    eligible_at: null,
    reversed_at: null,
    metadata: null,
  } satisfies IShoppingMallSellerEarning.ICreate;
  const sellerAEarning: IShoppingMallSellerEarning =
    await api.functional.shoppingMall.admin.sellers.earnings.create(
      connection,
      {
        sellerId: sellerA.id,
        body: sellerAEarningCreateBody,
      },
    );
  typia.assert(sellerAEarning);

  const earningBGross = 400;
  const earningBSellerDiscount = 0;
  const earningBPlatformDiscount = 0;
  const earningBCommission = 40;
  const earningBOtherFee = 0;
  const earningBNet =
    earningBGross -
    earningBSellerDiscount -
    earningBCommission -
    earningBOtherFee;

  const sellerBEarningCreateBody = {
    shopping_mall_order_id: orderB.id,
    shopping_mall_order_item_id: orderItemB.id,
    shopping_mall_order_payment_id: orderPaymentB.id,
    currency_code: currencyCode,
    gross_amount: earningBGross,
    seller_discount_amount: earningBSellerDiscount,
    platform_discount_amount: earningBPlatformDiscount,
    commission_amount: earningBCommission,
    other_fee_amount: earningBOtherFee,
    net_earning_amount: earningBNet,
    earning_type: "order_item",
    business_status: "eligible",
    eligible_at: null,
    reversed_at: null,
    metadata: null,
  } satisfies IShoppingMallSellerEarning.ICreate;
  const sellerBEarning: IShoppingMallSellerEarning =
    await api.functional.shoppingMall.admin.sellers.earnings.create(
      connection,
      {
        sellerId: sellerB.id,
        body: sellerBEarningCreateBody,
      },
    );
  typia.assert(sellerBEarning);

  // 6. Call analytics summary endpoint with groupBy "seller" and both sellerIds
  const fromDate = new Date(Date.now() - 1000 * 60 * 60).toISOString();
  const toDate = new Date(Date.now() + 1000 * 60 * 60).toISOString();

  const summaryRequestBody = {
    fromDate,
    toDate,
    businessStatuses: ["eligible"],
    sellerIds: [sellerA.id, sellerB.id],
    groupBy: "seller",
    currencyCode,
    minNetEarningAmount: undefined,
    maxNetEarningAmount: undefined,
    cursor: undefined,
  } satisfies IShoppingMallSellerEarningsSummary.IRequest;

  const summary: IShoppingMallSellerEarningsSummary =
    await api.functional.shoppingMall.admin.analytics.sellerEarnings.summary.index(
      connection,
      {
        body: summaryRequestBody,
      },
    );
  typia.assert(summary);

  // 7. Assertions on top-level summary
  const expectedTotalGross = earningAGross + earningBGross;
  const expectedTotalNet = earningANet + earningBNet;

  TestValidator.equals(
    "total gross earnings equals sum of both sellers",
    summary.totalGrossEarnings,
    expectedTotalGross,
  );

  TestValidator.equals(
    "total net earnings equals sum of both sellers",
    summary.totalNetEarnings,
    expectedTotalNet,
  );

  TestValidator.equals(
    "earnings record count should be 2",
    summary.earningsRecordCount,
    2,
  );

  TestValidator.predicate(
    "order count should be at least 2",
    summary.orderCount >= 2,
  );

  TestValidator.equals(
    "summary currency matches test currency",
    summary.currency,
    currencyCode,
  );

  // bySeller breakdown validations
  const bySeller = summary.bySeller ?? [];
  TestValidator.equals("bySeller should have 2 entries", bySeller.length, 2);

  const findSegment = (sellerId: string) =>
    bySeller.find((seg) => seg.sellerId === sellerId);

  const segmentA = findSegment(sellerA.id);
  const segmentB = findSegment(sellerB.id);

  TestValidator.predicate(
    "segment for seller A should exist",
    segmentA !== undefined,
  );
  TestValidator.predicate(
    "segment for seller B should exist",
    segmentB !== undefined,
  );

  if (!segmentA || !segmentB) return;

  TestValidator.equals(
    "seller A gross earnings match",
    segmentA.totalGrossEarnings,
    earningAGross,
  );
  TestValidator.equals(
    "seller A net earnings match",
    segmentA.totalNetEarnings,
    earningANet,
  );
  TestValidator.equals(
    "seller A earnings record count is 1",
    segmentA.earningsRecordCount,
    1,
  );
  TestValidator.equals("seller A order count is 1", segmentA.orderCount, 1);

  TestValidator.equals(
    "seller B gross earnings match",
    segmentB.totalGrossEarnings,
    earningBGross,
  );
  TestValidator.equals(
    "seller B net earnings match",
    segmentB.totalNetEarnings,
    earningBNet,
  );
  TestValidator.equals(
    "seller B earnings record count is 1",
    segmentB.earningsRecordCount,
    1,
  );
  TestValidator.equals("seller B order count is 1", segmentB.orderCount, 1);

  // Sum of per-seller segments must match top-level totals
  const sumSellerGross =
    segmentA.totalGrossEarnings + segmentB.totalGrossEarnings;
  const sumSellerNet = segmentA.totalNetEarnings + segmentB.totalNetEarnings;

  TestValidator.equals(
    "sum of per-seller gross equals top-level total",
    sumSellerGross,
    summary.totalGrossEarnings,
  );
  TestValidator.equals(
    "sum of per-seller net equals top-level total",
    sumSellerNet,
    summary.totalNetEarnings,
  );

  // Comparison: seller B should have higher net earnings than seller A
  TestValidator.predicate(
    "seller B net earnings should be higher than seller A",
    segmentB.totalNetEarnings > segmentA.totalNetEarnings,
  );

  // Ensure no additional sellers appear
  const sellerIdsInSummary = bySeller.map((s) => s.sellerId);
  TestValidator.equals(
    "sellerIds in summary should exactly match sellerA and sellerB",
    sellerIdsInSummary.sort(),
    [sellerA.id, sellerB.id].sort(),
  );
}
