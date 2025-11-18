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
import type { IShoppingMallSellerEarning } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerEarning";
import type { IShoppingMallSellerPayoutBatch } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPayoutBatch";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentItem";
import type { IShoppingMallShippingAddressSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingAddressSnapshot";
import type { IShoppingMallShippingMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingMethod";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";
import type { IShoppingMallSkuExternalId } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuExternalId";
import type { IShoppingMallSkuInventoryState } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuInventoryState";

/**
 * Validate creation of multiple seller payout batches for distinct earning
 * periods.
 *
 * Business flow implemented (rewritten to fit available APIs and DTOs):
 *
 * 1. Admin joins and logs in to obtain an admin session.
 * 2. Admin creates base configuration:
 *
 *    - A country and region to support shipping addresses.
 *    - One shipping method configuration.
 *    - One payment method configuration.
 *    - One SKU inventory state that is purchasable.
 * 3. Seller joins and logs in, then:
 *
 *    - Creates a product.
 *    - Logs out is not needed explicitly because SDK reuses connection; we later
 *         re-login as admin and customer.
 * 4. Admin associates the product to a category:
 *
 *    - Creates a category.
 *    - Links the product to the category.
 * 5. Seller creates a SKU tied to the inventory state and an initial inventory
 *    quantity.
 * 6. Customer joins and logs in, then:
 *
 *    - Creates one address under their customerId using the previously created
 *         country/region.
 * 7. Customer places two separate orders (conceptual Period 1 and Period 2): For
 *    each period:
 *
 *    - Creates a cart.
 *    - Adds one cart item pointing at the seller SKU.
 *    - Creates an order from the cart, using the known currency and referencing the
 *         shipping address and methods.
 *    - Creates a payment for the order using the admin-defined payment method.
 * 8. Admin logs back in and records two seller earning records for the same
 *    seller:
 *
 *    - First earning is tied to the Period 1 order/payment.
 *    - Second earning is tied to the Period 2 order/payment. The earnings share the
 *         same currency but have different gross/net values to make aggregation
 *         clear.
 * 9. Admin creates two payout batches via POST /shoppingMall/admin/payoutBatches:
 *
 *    - Batch 1 uses a payout_period_start/end that conceptually covers only the
 *         first earning and has totals equal to that earning’s amounts.
 *    - Batch 2 uses a later payout_period_start/end that conceptually covers only
 *         the second earning and has totals equal to that earning’s amounts.
 * 10. The test validates through in-memory earnings that:
 *
 *     - Both batches are successfully created and typia.assert passes.
 *     - BatchCode values are not equal (distinct batches).
 *     - PayoutPeriodStart and payoutPeriodEnd of batch 1 precede those of batch 2, so
 *           they do not overlap.
 *     - CurrencyCode is identical across earnings and both payout batches.
 *     - Each payout batch’s totalGrossAmount, totalCommissionAmount, and
 *           totalNetPayoutAmount exactly match the associated earning’s
 *           gross_amount, commission_amount, and net_earning_amount.
 *
 * Because there is no payout-batch listing or search API, the test does not
 * perform server-side queries by period; instead, it validates correctness by
 * comparing each created batch with the exact earning values used in its
 * request body.
 */
export async function test_api_admin_create_multiple_payout_batches_for_different_periods(
  connection: api.IConnection,
) {
  // 1. Admin joins to establish an admin actor and token
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  const commonCurrency = "USD";

  // 2. Admin creates base geography (country + region)
  const countryCreateBody = {
    country_code: "US",
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
        countryCode: country.country_code,
        body: regionCreateBody,
      },
    );
  typia.assert(region);

  // 2-2. Admin creates shipping and payment methods
  const shippingMethodBody = {
    method_code: "standard",
    display_name: "Standard Shipping",
    service_level_description: "Standard ground shipping",
  } satisfies IShoppingMallShippingMethod.ICreate;

  const shippingMethod: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: shippingMethodBody,
    });
  typia.assert(shippingMethod);

  const paymentMethodBody = {
    code: "card",
    display_name: "Credit Card",
    description: "Generic credit card payment",
    provider_type: "card_processor",
    allowed_currencies: commonCurrency,
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

  // 2-3. Admin creates a purchasable inventory state for SKUs
  const inventoryStateBody = {
    code: "in_stock",
    name: "In Stock",
    description: "Available for purchase",
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

  // 3. Seller joins & login
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://seller.example.com/join",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  const sellerLoginBody = {
    email: sellerJoinBody.email,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerAfterLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerAfterLogin);

  // 3-1. Seller creates a product
  const productBody = {
    code: RandomGenerator.alphaNumeric(8),
    title: RandomGenerator.paragraph({ sentences: 2 }),
    summary: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "BrandX",
    model_name: "Model-1",
    status: "active",
    primary_image_uri: "https://cdn.example.com/images/product.jpg" as string &
      tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert(product);

  // 4. Admin logs in again to create a category and link product
  const adminLoginBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/dashboard",
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminAfterLogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminAfterLogin);

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

  // 5. Seller creates a SKU under the product
  const skuCode = RandomGenerator.alphaNumeric(8);
  const skuCreateBody = {
    code: skuCode as string & tags.MinLength<1> & tags.MaxLength<255>,
    barcode: null,
    status: "active" as string & tags.MinLength<1> & tags.MaxLength<64>,
    price: 100,
    original_price: 120,
    inventory_quantity: 100 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 5 as number & tags.Type<"int32"> & tags.Minimum<0>,
    shopping_mall_sku_inventory_state_id: inventoryState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;

  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: typia.assert<string & tags.Format<"uuid">>(product.id),
      body: skuCreateBody,
    });
  typia.assert(sku);

  // 6. Customer joins & login
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://shop.example.com/join",
    referrer: "https://shop.example.com/landing",
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
    href: "https://shop.example.com/login",
    referrer: "https://shop.example.com/landing",
  } satisfies IShoppingMallCustomerLogin.IRequest;

  const customerAfterLogin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerAfterLogin);

  // 6-1. Customer creates a shipping address
  const addressBody = {
    shopping_mall_country_id: country.id,
    shopping_mall_region_id: region.id,
    recipient_name: RandomGenerator.name(2),
    line1: "123 Market St",
    line2: null,
    city: "San Francisco",
    postal_code: "94103",
    phone_number: RandomGenerator.mobile(),
    is_default: true,
  } satisfies IShoppingMallCustomerAddress.ICreate;

  const customerAddress: IShoppingMallCustomerAddress =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      connection,
      {
        customerId: customerAfterLogin.id,
        body: addressBody,
      },
    );
  typia.assert(customerAddress);

  // Helper to build order create body for a given cart id, order item & address
  const buildOrderCreateBody = (
    cartId: string & tags.Format<"uuid">,
    orderItemCreate: IShoppingMallOrderItem.ICreate,
    addressSnapshot: IShoppingMallShippingAddressSnapshot.ICreate,
  ): IShoppingMallOrder.ICreate => {
    const body: IShoppingMallOrder.ICreate = {
      cart_id: cartId,
      currency_code: commonCurrency,
      items: [orderItemCreate],
      shipping_address_id: null,
      shipping_address_snapshot: addressSnapshot,
      shipping_method_id: shippingMethod.id,
      payment_method_id: paymentMethod.id,
      buyer_memo: null,
      platform_note: null,
    };
    return body;
  };

  const addressSnapshot: IShoppingMallShippingAddressSnapshot.ICreate = {
    recipient_name: customerAddress.recipient_name,
    phone_number: customerAddress.phone_number ?? RandomGenerator.mobile(),
    country_code: country.country_code,
    postal_code: customerAddress.postal_code,
    state_or_region: region.name_en,
    city: customerAddress.city,
    address_line1: customerAddress.line1,
    address_line2: customerAddress.line2 ?? null,
  };

  // 7. Period 1 order workflow
  const cart1Body = {
    actor_type: "customer",
    status: "active",
    currency_code: commonCurrency,
  } satisfies IShoppingMallCart.ICreate;

  const cart1: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: cart1Body,
    });
  typia.assert(cart1);

  const cartItem1Body = {
    shopping_mall_sku_id: sku.id,
    quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IShoppingMallCartItem.ICreate;

  const cartItem1: IShoppingMallCartItem =
    await api.functional.shoppingMall.customer.carts.items.create(connection, {
      cartId: typia.assert<string & tags.Format<"uuid">>(cart1.id),
      body: cartItem1Body,
    });
  typia.assert(cartItem1);

  const orderItem1Create: IShoppingMallOrderItem.ICreate = {
    shopping_mall_sku_id: sku.id,
    quantity: 1 as number & tags.Type<"int32">,
  };

  const order1CreateBody = buildOrderCreateBody(
    typia.assert<string & tags.Format<"uuid">>(cart1.id),
    orderItem1Create,
    addressSnapshot,
  );

  const order1: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: order1CreateBody,
    });
  typia.assert(order1);

  const payment1Body = {
    payment_method_id: paymentMethod.id,
    currency_code: commonCurrency,
    payable_amount: 100,
    provider_reference: null,
    provider_status_code: null,
    metadata: null,
  } satisfies IShoppingMallOrderPayment.ICreate;

  const payment1: IShoppingMallOrderPayment =
    await api.functional.shoppingMall.customer.orders.payments.create(
      connection,
      {
        orderId: order1.id,
        body: payment1Body,
      },
    );
  typia.assert(payment1);

  // 7-2. Period 2 order workflow
  const cart2Body = {
    actor_type: "customer",
    status: "active",
    currency_code: commonCurrency,
  } satisfies IShoppingMallCart.ICreate;

  const cart2: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: cart2Body,
    });
  typia.assert(cart2);

  const cartItem2Body = {
    shopping_mall_sku_id: sku.id,
    quantity: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IShoppingMallCartItem.ICreate;

  const cartItem2: IShoppingMallCartItem =
    await api.functional.shoppingMall.customer.carts.items.create(connection, {
      cartId: typia.assert<string & tags.Format<"uuid">>(cart2.id),
      body: cartItem2Body,
    });
  typia.assert(cartItem2);

  const orderItem2Create: IShoppingMallOrderItem.ICreate = {
    shopping_mall_sku_id: sku.id,
    quantity: 2 as number & tags.Type<"int32">,
  };

  const order2CreateBody = buildOrderCreateBody(
    typia.assert<string & tags.Format<"uuid">>(cart2.id),
    orderItem2Create,
    addressSnapshot,
  );

  const order2: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: order2CreateBody,
    });
  typia.assert(order2);

  const payment2Body = {
    payment_method_id: paymentMethod.id,
    currency_code: commonCurrency,
    payable_amount: 200,
    provider_reference: null,
    provider_status_code: null,
    metadata: null,
  } satisfies IShoppingMallOrderPayment.ICreate;

  const payment2: IShoppingMallOrderPayment =
    await api.functional.shoppingMall.customer.orders.payments.create(
      connection,
      {
        orderId: order2.id,
        body: payment2Body,
      },
    );
  typia.assert(payment2);

  // 8. Admin logs back in to record seller earnings for each period
  const adminAfterLogin2: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminAfterLogin2);

  const earning1Gross = 100;
  const earning1Commission = 10;
  const earning1Net = earning1Gross - earning1Commission;

  const earning1Body = {
    shopping_mall_order_id: order1.id,
    shopping_mall_order_item_id: order1.items[0]?.id ?? null,
    shopping_mall_order_payment_id: payment1.id,
    currency_code: commonCurrency as string &
      tags.MinLength<1> &
      tags.MaxLength<3>,
    gross_amount: earning1Gross,
    seller_discount_amount: 0,
    platform_discount_amount: 0,
    commission_amount: earning1Commission,
    other_fee_amount: 0,
    net_earning_amount: earning1Net,
    earning_type: "order_item" as string & tags.MinLength<1>,
    business_status: "eligible" as string & tags.MinLength<1>,
    eligible_at: new Date("2025-01-01T10:00:00.000Z").toISOString() as string &
      tags.Format<"date-time">,
    reversed_at: null,
    metadata: null,
  } satisfies IShoppingMallSellerEarning.ICreate;

  const earning1: IShoppingMallSellerEarning =
    await api.functional.shoppingMall.admin.sellers.earnings.create(
      connection,
      {
        sellerId: sellerAfterLogin.id,
        body: earning1Body,
      },
    );
  typia.assert(earning1);

  const earning2Gross = 300;
  const earning2Commission = 30;
  const earning2Net = earning2Gross - earning2Commission;

  const earning2Body = {
    shopping_mall_order_id: order2.id,
    shopping_mall_order_item_id: order2.items[0]?.id ?? null,
    shopping_mall_order_payment_id: payment2.id,
    currency_code: commonCurrency as string &
      tags.MinLength<1> &
      tags.MaxLength<3>,
    gross_amount: earning2Gross,
    seller_discount_amount: 0,
    platform_discount_amount: 0,
    commission_amount: earning2Commission,
    other_fee_amount: 0,
    net_earning_amount: earning2Net,
    earning_type: "order_item" as string & tags.MinLength<1>,
    business_status: "eligible" as string & tags.MinLength<1>,
    eligible_at: new Date("2025-02-01T10:00:00.000Z").toISOString() as string &
      tags.Format<"date-time">,
    reversed_at: null,
    metadata: null,
  } satisfies IShoppingMallSellerEarning.ICreate;

  const earning2: IShoppingMallSellerEarning =
    await api.functional.shoppingMall.admin.sellers.earnings.create(
      connection,
      {
        sellerId: sellerAfterLogin.id,
        body: earning2Body,
      },
    );
  typia.assert(earning2);

  // 9. Admin creates two payout batches for distinct periods
  const period1Start = new Date(
    "2025-01-01T00:00:00.000Z",
  ).toISOString() as string & tags.Format<"date-time">;
  const period1End = new Date(
    "2025-01-31T23:59:59.000Z",
  ).toISOString() as string & tags.Format<"date-time">;

  const batch1Body = {
    batch_code: `PB-202501-${RandomGenerator.alphaNumeric(4)}`,
    payout_period_start: period1Start,
    payout_period_end: period1End,
    currency_code: commonCurrency,
    total_gross_amount:
      earning1.net_earning_amount + earning1.commission_amount,
    total_commission_amount: earning1.commission_amount,
    total_net_payout_amount: earning1.net_earning_amount,
    status: "draft",
    external_reference: null,
    notes: "Period 1 payout batch",
  } satisfies IShoppingMallSellerPayoutBatch.ICreate;

  const batch1: IShoppingMallSellerPayoutBatch =
    await api.functional.shoppingMall.admin.payoutBatches.create(connection, {
      body: batch1Body,
    });
  typia.assert(batch1);

  const period2Start = new Date(
    "2025-02-01T00:00:00.000Z",
  ).toISOString() as string & tags.Format<"date-time">;
  const period2End = new Date(
    "2025-02-28T23:59:59.000Z",
  ).toISOString() as string & tags.Format<"date-time">;

  const batch2Body = {
    batch_code: `PB-202502-${RandomGenerator.alphaNumeric(4)}`,
    payout_period_start: period2Start,
    payout_period_end: period2End,
    currency_code: commonCurrency,
    total_gross_amount:
      earning2.net_earning_amount + earning2.commission_amount,
    total_commission_amount: earning2.commission_amount,
    total_net_payout_amount: earning2.net_earning_amount,
    status: "draft",
    external_reference: null,
    notes: "Period 2 payout batch",
  } satisfies IShoppingMallSellerPayoutBatch.ICreate;

  const batch2: IShoppingMallSellerPayoutBatch =
    await api.functional.shoppingMall.admin.payoutBatches.create(connection, {
      body: batch2Body,
    });
  typia.assert(batch2);

  // 10. Validations
  TestValidator.notEquals(
    "payout batches must have distinct batchCode",
    batch1.batchCode,
    batch2.batchCode,
  );

  TestValidator.predicate(
    "period 1 must end before period 2 starts",
    new Date(batch1.payoutPeriodEnd).getTime() <
      new Date(batch2.payoutPeriodStart).getTime(),
  );

  TestValidator.equals(
    "batch1 currency matches common currency",
    batch1.currencyCode,
    commonCurrency,
  );
  TestValidator.equals(
    "batch2 currency matches common currency",
    batch2.currencyCode,
    commonCurrency,
  );

  // Validate batch amounts reflect single-earning aggregations
  TestValidator.equals(
    "batch1 total gross equals earning1 gross",
    batch1.totalGrossAmount,
    earning1.gross_amount,
  );
  TestValidator.equals(
    "batch1 total commission equals earning1 commission",
    batch1.totalCommissionAmount,
    earning1.commission_amount,
  );
  TestValidator.equals(
    "batch1 total net payout equals earning1 net earning",
    batch1.totalNetPayoutAmount,
    earning1.net_earning_amount,
  );

  TestValidator.equals(
    "batch2 total gross equals earning2 gross",
    batch2.totalGrossAmount,
    earning2.gross_amount,
  );
  TestValidator.equals(
    "batch2 total commission equals earning2 commission",
    batch2.totalCommissionAmount,
    earning2.commission_amount,
  );
  TestValidator.equals(
    "batch2 total net payout equals earning2 net earning",
    batch2.totalNetPayoutAmount,
    earning2.net_earning_amount,
  );
}
