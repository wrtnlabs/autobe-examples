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

export async function test_api_admin_payouts_summary_multiple_batches_and_currencies(
  connection: api.IConnection,
) {
  // 1. Create and authenticate admin
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  const adminLoginBody = {
    email: admin.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLoggedIn: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedIn);

  // 2. Create two sellers (A and B)
  const sellerAJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://seller.example.com/join",
    referrer: "https://seller.example.com/",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerAJoinBody,
    });
  typia.assert(sellerAAuth);

  const sellerBJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://seller.example.com/join",
    referrer: "https://seller.example.com/",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerBAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerBJoinBody,
    });
  typia.assert(sellerBAuth);

  // 3. As admin, configure country, region, sku inventory state, shipping and payment methods, category
  // Switch back to admin auth
  const adminReLogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminReLogin);

  const countryBody = {
    country_code: "US",
    name_en: "United States",
    phone_code: "+1",
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallCountry.ICreate;

  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryBody,
    });
  typia.assert(country);

  const regionBody = {
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
        countryCode: country.country_code,
        body: regionBody,
      },
    );
  typia.assert(region);

  const skuInventoryStateBody = {
    code: "in_stock",
    name: "In Stock",
    description: "Available for purchase",
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;

  const skuInventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: skuInventoryStateBody,
      },
    );
  typia.assert(skuInventoryState);

  const shippingMethodBody = {
    method_code: "standard",
    display_name: "Standard Shipping",
    service_level_description: "3-5 business days",
  } satisfies IShoppingMallShippingMethod.ICreate;

  const shippingMethod: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: shippingMethodBody,
    });
  typia.assert(shippingMethod);

  const paymentMethodBody = {
    code: "card",
    display_name: "Credit Card",
    description: "Standard card payment",
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
    slug: "general",
    name_en: "General",
    description_en: "General products",
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryBody,
    });
  typia.assert(category);

  // 4. Seller A: create product and SKU
  const sellerALoginBody = {
    email: sellerAJoinBody.email,
    password: sellerAJoinBody.password,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerALogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerALoginBody,
    });
  typia.assert(sellerALogin);

  const productABody = {
    code: "PROD-A",
    title: "Product A",
    summary: "Seller A product",
    description: "Description for product A",
    brand: "BrandA",
    model_name: "ModelA",
    status: "active",
    primary_image_uri: null,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const productA: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productABody,
    });
  typia.assert(productA);

  // Attach category to product A
  const productACategoryBody = {
    shopping_mall_category_id: category.id,
    is_primary: true,
  } satisfies IShoppingMallProductCategory.ICreate;

  const productACategory: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: productA.id,
        body: productACategoryBody,
      },
    );
  typia.assert(productACategory);

  const skuABody = {
    code: "SKU-A",
    barcode: null,
    status: "active",
    price: 100,
    original_price: 120,
    inventory_quantity: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 1 as number & tags.Type<"int32"> & tags.Minimum<0>,
    shopping_mall_sku_inventory_state_id: skuInventoryState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;

  const skuA: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: productA.id as string & tags.Format<"uuid">,
      body: skuABody,
    });
  typia.assert(skuA);

  // 5. Seller B: create product and SKU
  const sellerBLoginBody = {
    email: sellerBJoinBody.email,
    password: sellerBJoinBody.password,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerBLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerBLoginBody,
    });
  typia.assert(sellerBLogin);

  const productBBody = {
    code: "PROD-B",
    title: "Product B",
    summary: "Seller B product",
    description: "Description for product B",
    brand: "BrandB",
    model_name: "ModelB",
    status: "active",
    primary_image_uri: null,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const productB: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBBody,
    });
  typia.assert(productB);

  const productBCategoryBody = {
    shopping_mall_category_id: category.id,
    is_primary: true,
  } satisfies IShoppingMallProductCategory.ICreate;

  const productBCategory: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: productB.id,
        body: productBCategoryBody,
      },
    );
  typia.assert(productBCategory);

  const skuBBody = {
    code: "SKU-B",
    barcode: null,
    status: "active",
    price: 200,
    original_price: 220,
    inventory_quantity: 5 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 1 as number & tags.Type<"int32"> & tags.Minimum<0>,
    shopping_mall_sku_inventory_state_id: skuInventoryState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;

  const skuB: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: productB.id as string & tags.Format<"uuid">,
      body: skuBBody,
    });
  typia.assert(skuB);

  // 6. Customer registration and login
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://shop.example.com/join",
    referrer: "https://shop.example.com/",
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customerAuth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuth);

  const customerLoginBody = {
    email: customerJoinBody.email,
    password: customerJoinBody.password,
    ip: null,
    href: "https://shop.example.com/login",
    referrer: "https://shop.example.com/",
  } satisfies IShoppingMallCustomerLogin.IRequest;

  const customerLogin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLogin);

  // 7. Create cart and add two items (skuA and skuB)
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

  const cartItemABody = {
    shopping_mall_sku_id: skuA.id,
    quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IShoppingMallCartItem.ICreate;

  const cartItemA: IShoppingMallCartItem =
    await api.functional.shoppingMall.customer.carts.items.create(connection, {
      cartId: cart.id,
      body: cartItemABody,
    });
  typia.assert(cartItemA);

  const cartItemBBody = {
    shopping_mall_sku_id: skuB.id,
    quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IShoppingMallCartItem.ICreate;

  const cartItemB: IShoppingMallCartItem =
    await api.functional.shoppingMall.customer.carts.items.create(connection, {
      cartId: cart.id,
      body: cartItemBBody,
    });
  typia.assert(cartItemB);

  // 8. Create order from cart
  const shippingSnapshot: IShoppingMallShippingAddressSnapshot.ICreate = {
    recipient_name: "John Doe",
    phone_number: RandomGenerator.mobile(),
    country_code: country.country_code,
    postal_code: "94016",
    state_or_region: region.name_en,
    city: "SampleCity",
    address_line1: "123 Main St",
    address_line2: null,
  } satisfies IShoppingMallShippingAddressSnapshot.ICreate;

  const orderItems: IShoppingMallOrderItem.ICreate[] = [
    {
      shopping_mall_sku_id: skuA.id,
      quantity: 1 as number & tags.Type<"int32">,
    },
    {
      shopping_mall_sku_id: skuB.id,
      quantity: 1 as number & tags.Type<"int32">,
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
  typia.assert(order);

  // 9. Create order payment
  const payableAmount = 300;
  const orderPaymentBody = {
    payment_method_id: paymentMethod.id,
    currency_code: "USD",
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
        body: orderPaymentBody,
      },
    );
  typia.assert(orderPayment);

  // 10. As admin, create earnings for seller A (USD) and seller B (EUR)
  const adminLoginAgain: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginAgain);

  const earningAGross = 150;
  const earningACommission = 30;
  const earningANet = earningAGross - earningACommission;

  const earningABody = {
    shopping_mall_order_id: order.id,
    shopping_mall_order_item_id: order.items[0]?.id ?? null,
    shopping_mall_order_payment_id: orderPayment.id,
    currency_code: "USD" as string & tags.MinLength<1> & tags.MaxLength<3>,
    gross_amount: earningAGross,
    seller_discount_amount: 0,
    platform_discount_amount: 0,
    commission_amount: earningACommission,
    other_fee_amount: 0,
    net_earning_amount: earningANet,
    earning_type: "order_item",
    business_status: "eligible",
    eligible_at: new Date().toISOString(),
    reversed_at: null,
    metadata: null,
  } satisfies IShoppingMallSellerEarning.ICreate;

  const earningA: IShoppingMallSellerEarning =
    await api.functional.shoppingMall.admin.sellers.earnings.create(
      connection,
      {
        sellerId: sellerALogin.id,
        body: earningABody,
      },
    );
  typia.assert(earningA);

  const earningBGross = 200;
  const earningBCommission = 40;
  const earningBNet = earningBGross - earningBCommission;

  const earningBBody = {
    shopping_mall_order_id: order.id,
    shopping_mall_order_item_id: order.items[1]?.id ?? null,
    shopping_mall_order_payment_id: orderPayment.id,
    currency_code: "EUR" as string & tags.MinLength<1> & tags.MaxLength<3>,
    gross_amount: earningBGross,
    seller_discount_amount: 0,
    platform_discount_amount: 0,
    commission_amount: earningBCommission,
    other_fee_amount: 0,
    net_earning_amount: earningBNet,
    earning_type: "order_item",
    business_status: "eligible",
    eligible_at: new Date().toISOString(),
    reversed_at: null,
    metadata: null,
  } satisfies IShoppingMallSellerEarning.ICreate;

  const earningB: IShoppingMallSellerEarning =
    await api.functional.shoppingMall.admin.sellers.earnings.create(
      connection,
      {
        sellerId: sellerBLogin.id,
        body: earningBBody,
      },
    );
  typia.assert(earningB);

  // 11. Create payout batches for USD and EUR earnings
  const now = new Date();
  const fromDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const toDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const payoutBatchABody = {
    batch_code: `BATCH-USD-${RandomGenerator.alphaNumeric(8)}`,
    payout_period_start: fromDate.toISOString(),
    payout_period_end: toDate.toISOString(),
    currency_code: "USD",
    total_gross_amount: earningAGross,
    total_commission_amount: earningACommission,
    total_net_payout_amount: earningANet,
    status: "processing",
    external_reference: null,
    notes: "USD batch for seller A",
  } satisfies IShoppingMallSellerPayoutBatch.ICreate;

  const payoutBatchA: IShoppingMallSellerPayoutBatch =
    await api.functional.shoppingMall.admin.payoutBatches.create(connection, {
      body: payoutBatchABody,
    });
  typia.assert(payoutBatchA);

  const payoutBatchBBody = {
    batch_code: `BATCH-EUR-${RandomGenerator.alphaNumeric(8)}`,
    payout_period_start: fromDate.toISOString(),
    payout_period_end: toDate.toISOString(),
    currency_code: "EUR",
    total_gross_amount: earningBGross,
    total_commission_amount: earningBCommission,
    total_net_payout_amount: earningBNet,
    status: "processing",
    external_reference: null,
    notes: "EUR batch for seller B",
  } satisfies IShoppingMallSellerPayoutBatch.ICreate;

  const payoutBatchB: IShoppingMallSellerPayoutBatch =
    await api.functional.shoppingMall.admin.payoutBatches.create(connection, {
      body: payoutBatchBBody,
    });
  typia.assert(payoutBatchB);

  // 12. Create payout items linking earnings to batches
  const payoutItemABody = {
    shopping_mall_seller_earning_id: earningA.id,
    currency_code: "USD",
    payout_amount: earningANet,
    status: "included",
  } satisfies IShoppingMallSellerPayoutItem.ICreate;

  const payoutItemA: IShoppingMallSellerPayoutItem =
    await api.functional.shoppingMall.admin.payoutBatches.items.create(
      connection,
      {
        batchCode: payoutBatchA.batchCode,
        body: payoutItemABody,
      },
    );
  typia.assert(payoutItemA);

  const payoutItemBBody = {
    shopping_mall_seller_earning_id: earningB.id,
    currency_code: "EUR",
    payout_amount: earningBNet,
    status: "included",
  } satisfies IShoppingMallSellerPayoutItem.ICreate;

  const payoutItemB: IShoppingMallSellerPayoutItem =
    await api.functional.shoppingMall.admin.payoutBatches.items.create(
      connection,
      {
        batchCode: payoutBatchB.batchCode,
        body: payoutItemBBody,
      },
    );
  typia.assert(payoutItemB);

  // 13. Call payout analytics summary with groupBy seller and currency
  const requestBody: IShoppingMallPayoutAnalytics.IRequest = {
    from: fromDate.toISOString(),
    to: toDate.toISOString(),
    sellerIds: [sellerALogin.id, sellerBLogin.id],
    payoutStatuses: undefined,
    groupBy: [
      "seller",
      "currency",
    ] satisfies IEShoppingMallPayoutAnalyticsGroupBy[],
    currency: undefined,
    includeUnsettledEarnings: true,
  } satisfies IShoppingMallPayoutAnalytics.IRequest;

  const summary: IShoppingMallPayoutAnalytics.ISummary =
    await api.functional.shoppingMall.admin.analytics.payouts.summary.index(
      connection,
      {
        body: requestBody,
      },
    );
  typia.assert(summary);

  const expectedTotalNetEarning = earningANet + earningBNet;
  const expectedTotalPaidOut = earningANet + earningBNet;

  TestValidator.equals(
    "total net earning equals sum of both earnings",
    summary.totalNetEarningAmount,
    expectedTotalNetEarning,
  );
  TestValidator.equals(
    "total paid out equals sum of both payout items",
    summary.totalPaidOutAmount,
    expectedTotalPaidOut,
  );

  const sellerBreakdowns = summary.sellerBreakdowns ?? [];

  const breakdownA = sellerBreakdowns.find(
    (b) => b.sellerId === sellerALogin.id && b.currencyCode === "USD",
  );
  const breakdownB = sellerBreakdowns.find(
    (b) => b.sellerId === sellerBLogin.id && b.currencyCode === "EUR",
  );

  TestValidator.predicate(
    "seller A breakdown exists for USD",
    breakdownA !== undefined,
  );
  TestValidator.predicate(
    "seller B breakdown exists for EUR",
    breakdownB !== undefined,
  );

  if (breakdownA !== undefined) {
    TestValidator.equals(
      "seller A net earning matches",
      breakdownA.netEarningAmount,
      earningANet,
    );
    TestValidator.equals(
      "seller A paid out matches",
      breakdownA.paidOutAmount,
      earningANet,
    );
  }

  if (breakdownB !== undefined) {
    TestValidator.equals(
      "seller B net earning matches",
      breakdownB.netEarningAmount,
      earningBNet,
    );
    TestValidator.equals(
      "seller B paid out matches",
      breakdownB.paidOutAmount,
      earningBNet,
    );
  }

  // 14. Narrower analytics: only seller A in USD
  const narrowRequestBody: IShoppingMallPayoutAnalytics.IRequest = {
    from: fromDate.toISOString(),
    to: toDate.toISOString(),
    sellerIds: [sellerALogin.id],
    payoutStatuses: undefined,
    groupBy: [
      "seller",
      "currency",
    ] satisfies IEShoppingMallPayoutAnalyticsGroupBy[],
    currency: "USD",
    includeUnsettledEarnings: true,
  } satisfies IShoppingMallPayoutAnalytics.IRequest;

  const narrowSummary: IShoppingMallPayoutAnalytics.ISummary =
    await api.functional.shoppingMall.admin.analytics.payouts.summary.index(
      connection,
      {
        body: narrowRequestBody,
      },
    );
  typia.assert(narrowSummary);

  TestValidator.equals(
    "narrow total net earning equals seller A net",
    narrowSummary.totalNetEarningAmount,
    earningANet,
  );
  TestValidator.equals(
    "narrow total paid out equals seller A payout",
    narrowSummary.totalPaidOutAmount,
    earningANet,
  );

  const narrowBreakdowns = narrowSummary.sellerBreakdowns ?? [];
  const narrowBreakdownA = narrowBreakdowns.find(
    (b) => b.sellerId === sellerALogin.id && b.currencyCode === "USD",
  );

  TestValidator.predicate(
    "narrow seller A breakdown exists",
    narrowBreakdownA !== undefined,
  );

  if (narrowBreakdownA !== undefined) {
    TestValidator.equals(
      "narrow seller A net earning matches",
      narrowBreakdownA.netEarningAmount,
      earningANet,
    );
    TestValidator.equals(
      "narrow seller A paid out matches",
      narrowBreakdownA.paidOutAmount,
      earningANet,
    );
  }
}
