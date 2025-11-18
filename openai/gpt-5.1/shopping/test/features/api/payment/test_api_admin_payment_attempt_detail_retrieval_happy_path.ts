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
import type { IShoppingMallOrderPaymentAttempt } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderPaymentAttempt";
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

export async function test_api_admin_payment_attempt_detail_retrieval_happy_path(
  connection: api.IConnection,
) {
  // 1. Admin joins
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPass123!" as string & tags.Format<"password">,
    ip: null,
    href: "https://admin-join.example.com" as string & tags.Format<"uri">,
    referrer: "https://landing.example.com" as string & tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;
  const adminJoined: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminJoined);

  const adminEmail = adminJoined.email;
  const adminPassword = adminJoinBody.password;

  // 1-2. Admin login to ensure token refresh path also works
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin-login.example.com" as string & tags.Format<"uri">,
    referrer: "https://landing.example.com/login" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallAdminLogin.ICreate;
  const adminLoggedIn: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedIn);

  // 2. Master data setup by admin: country
  const countryCreateBody = {
    country_code: "KR",
    name_en: "Korea, Republic of",
    phone_code: "+82",
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallCountry.ICreate;
  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryCreateBody,
    });
  typia.assert(country);

  // region under the country
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

  // shipping method
  const shippingMethodCreateBody = {
    method_code: "STANDARD",
    display_name: "Standard Shipping",
    service_level_description: "Standard ground shipping",
  } satisfies IShoppingMallShippingMethod.ICreate;
  const shippingMethod: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: shippingMethodCreateBody,
    });
  typia.assert(shippingMethod);

  // payment method
  const paymentMethodCreateBody = {
    code: "CARD",
    display_name: "Credit Card",
    description: "Generic credit card processor",
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

  // category
  const categoryCreateBody = {
    parent_id: null,
    slug: `electronics-${RandomGenerator.alphaNumeric(6)}`,
    name_en: "Electronics",
    description_en: "Electronics root category",
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: false,
  } satisfies IShoppingMallCategory.ICreate;
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryCreateBody,
    });
  typia.assert(category);

  // SKU inventory state
  const skuInventoryStateCreateBody = {
    code: "in_stock",
    name: "In Stock",
    description: "Sellable inventory",
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

  // 3. Seller joins and logs in
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SellerPass123!" as string & tags.Format<"password">,
    ip: null,
    href: "https://seller-join.example.com" as string & tags.Format<"uri">,
    referrer: "https://landing.example.com/seller" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthJoin.IRequest;
  const sellerJoined: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, { body: sellerJoinBody });
  typia.assert(sellerJoined);

  const sellerEmail = sellerJoined.email;
  const sellerPassword = sellerJoinBody.password;

  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: "https://seller-login.example.com" as string & tags.Format<"uri">,
    referrer: "https://landing.example.com/seller/login" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthLogin.IRequest;
  const sellerLoggedIn: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoggedIn);

  // seller creates product
  const productCreateBody = {
    code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
    title: "Test Phone",
    summary: "Test smartphone",
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "AutoBE",
    model_name: "X1",
    status: "active",
    primary_image_uri:
      "https://cdn.example.com/images/test-phone.jpg" as string &
        tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  // link product to category (admin)
  const adminLoggedInAgain: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedInAgain);

  const productCategoryCreateBody = {
    shopping_mall_category_id: category.id,
    is_primary: true,
  } satisfies IShoppingMallProductCategory.ICreate;
  const productCategory: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: product.id,
        body: productCategoryCreateBody,
      },
    );
  typia.assert(productCategory);

  // seller login again just to ensure context for SKU
  const sellerLoggedInAgain: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoggedInAgain);

  // create SKU under product
  const skuCreateBody = {
    code: `TEST-SKU-${RandomGenerator.alphaNumeric(6)}`,
    barcode: null,
    status: "active",
    price: 100000,
    original_price: 120000,
    inventory_quantity: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 1 as number & tags.Type<"int32"> & tags.Minimum<0>,
    shopping_mall_sku_inventory_state_id: skuInventoryState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;
  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id as string & tags.Format<"uuid">,
      body: skuCreateBody,
    });
  typia.assert(sku);

  // 4. Customer joins and logs in
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "CustomerPass123!" as string & tags.Format<"password">,
    ip: null,
    href: "https://customer-join.example.com" as string & tags.Format<"uri">,
    referrer: "https://landing.example.com/customer" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallCustomerJoin.IRequest;
  const customerJoined: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerJoined);

  const customerEmail = customerJoined.email;
  const customerPassword = customerJoinBody.password;

  const customerLoginBody = {
    email: customerEmail,
    password: customerPassword,
    ip: null,
    href: "https://customer-login.example.com" as string & tags.Format<"uri">,
    referrer: "https://landing.example.com/customer/login" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallCustomerLogin.IRequest;
  const customerLoggedIn: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLoggedIn);

  // customer creates cart
  const cartCreateBody = {
    actor_type: "customer",
    status: "active",
    currency_code: "KRW",
  } satisfies IShoppingMallCart.ICreate;
  const cart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: cartCreateBody,
    });
  typia.assert(cart);

  // customer adds cart item
  const cartItemCreateBody = {
    shopping_mall_sku_id: sku.id,
    quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IShoppingMallCartItem.ICreate;
  const cartItem: IShoppingMallCartItem =
    await api.functional.shoppingMall.customer.carts.items.create(connection, {
      cartId: cart.id as string & tags.Format<"uuid">,
      body: cartItemCreateBody,
    });
  typia.assert(cartItem);

  // customer creates shipping address
  const addressCreateBody = {
    shopping_mall_country_id: country.id,
    shopping_mall_region_id: region.id,
    recipient_name: RandomGenerator.name(2),
    line1: "123 Test Street",
    line2: null,
    city: "Seoul",
    postal_code: "12345",
    phone_number: RandomGenerator.mobile(),
    is_default: true,
  } satisfies IShoppingMallCustomerAddress.ICreate;
  const address: IShoppingMallCustomerAddress =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      connection,
      {
        customerId: customerJoined.id,
        body: addressCreateBody,
      },
    );
  typia.assert(address);

  // customer creates order from cart
  const orderCreateBody = {
    cart_id: cart.id,
    currency_code: "KRW",
    items: [
      {
        shopping_mall_sku_id: sku.id,
        quantity: 1 as number & tags.Type<"int32">,
      },
    ] satisfies IShoppingMallOrderItem.ICreate[],
    shipping_address_id: address.id,
    shipping_address_snapshot: null,
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

  // create logical payment for order
  const logicalPaymentCreateBody = {
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
        body: logicalPaymentCreateBody,
      },
    );
  typia.assert(orderPayment);

  // 5. Admin logs back in and creates payment attempt
  const adminLoggedInForAttempt: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedInForAttempt);

  const attemptAmount = orderPayment.payable_amount;
  const attemptProviderReference = `PAYTRY-${RandomGenerator.alphaNumeric(10)}`;

  const attemptCreateBody = {
    amount: attemptAmount,
    provider_reference: attemptProviderReference,
    failure_code: undefined,
    failure_message: undefined,
    raw_response: undefined,
  } satisfies IShoppingMallOrderPaymentAttempt.ICreate;
  const createdAttempt: IShoppingMallOrderPaymentAttempt =
    await api.functional.shoppingMall.admin.payments.attempts.create(
      connection,
      {
        orderPaymentId: orderPayment.id as string & tags.Format<"uuid">,
        body: attemptCreateBody,
      },
    );
  typia.assert(createdAttempt);

  TestValidator.equals(
    "created attempt belongs to logical payment",
    createdAttempt.shopping_mall_order_payment_id,
    orderPayment.id,
  );

  TestValidator.equals(
    "created attempt payment method matches order payment",
    createdAttempt.shopping_mall_payment_method_id,
    orderPayment.shopping_mall_payment_method_id,
  );

  TestValidator.equals(
    "created attempt amount matches requested amount",
    createdAttempt.amount,
    attemptAmount,
  );

  TestValidator.equals(
    "created attempt provider_reference matches",
    createdAttempt.provider_reference,
    attemptProviderReference,
  );

  TestValidator.equals(
    "first attempt sequence is 1",
    createdAttempt.attempt_sequence,
    1,
  );

  // 6. Admin calls GET attempts.at for sequence 1
  const fetchedAttempt1: IShoppingMallOrderPaymentAttempt =
    await api.functional.shoppingMall.admin.payments.attempts.at(connection, {
      orderPaymentId: orderPayment.id as string & tags.Format<"uuid">,
      attemptSequence: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    });
  typia.assert(fetchedAttempt1);

  // 7. Validate fetched attempt matches created attempt
  TestValidator.equals(
    "fetched attempt matches created id",
    fetchedAttempt1.id,
    createdAttempt.id,
  );
  TestValidator.equals(
    "fetched attempt belongs to same payment",
    fetchedAttempt1.shopping_mall_order_payment_id,
    createdAttempt.shopping_mall_order_payment_id,
  );
  TestValidator.equals(
    "fetched attempt payment method id matches",
    fetchedAttempt1.shopping_mall_payment_method_id,
    createdAttempt.shopping_mall_payment_method_id,
  );
  TestValidator.equals(
    "fetched attempt amount matches",
    fetchedAttempt1.amount,
    createdAttempt.amount,
  );
  TestValidator.equals(
    "fetched attempt status matches",
    fetchedAttempt1.status,
    createdAttempt.status,
  );
  TestValidator.equals(
    "fetched attempt provider reference matches",
    fetchedAttempt1.provider_reference,
    createdAttempt.provider_reference,
  );
  TestValidator.equals(
    "fetched attempt failure_code matches",
    fetchedAttempt1.failure_code ?? null,
    createdAttempt.failure_code ?? null,
  );
  TestValidator.equals(
    "fetched attempt failure_message matches",
    fetchedAttempt1.failure_message ?? null,
    createdAttempt.failure_message ?? null,
  );
  TestValidator.equals(
    "fetched attempt raw_response matches",
    fetchedAttempt1.raw_response ?? null,
    createdAttempt.raw_response ?? null,
  );
  TestValidator.equals(
    "fetched attempt sequence remains 1",
    fetchedAttempt1.attempt_sequence,
    createdAttempt.attempt_sequence,
  );

  // validate nested orderPayment summary consistency, if present
  if (fetchedAttempt1.orderPayment) {
    TestValidator.equals(
      "nested orderPayment id matches logical payment",
      fetchedAttempt1.orderPayment.id,
      orderPayment.id,
    );
    TestValidator.equals(
      "nested orderPayment payable_amount matches",
      fetchedAttempt1.orderPayment.payable_amount,
      orderPayment.payable_amount,
    );
    TestValidator.equals(
      "nested orderPayment currency matches",
      fetchedAttempt1.orderPayment.currency_code,
      orderPayment.currency_code,
    );
  }

  if (fetchedAttempt1.paymentMethod) {
    TestValidator.equals(
      "nested paymentMethod id matches created payment method",
      fetchedAttempt1.paymentMethod.id,
      paymentMethod.id,
    );
    TestValidator.equals(
      "nested paymentMethod code matches",
      fetchedAttempt1.paymentMethod.code,
      paymentMethod.code,
    );
  }

  // 9. Call GET again to confirm idempotent read
  const fetchedAttempt2: IShoppingMallOrderPaymentAttempt =
    await api.functional.shoppingMall.admin.payments.attempts.at(connection, {
      orderPaymentId: orderPayment.id as string & tags.Format<"uuid">,
      attemptSequence: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    });
  typia.assert(fetchedAttempt2);

  TestValidator.equals(
    "second fetch returns same attempt id",
    fetchedAttempt2.id,
    fetchedAttempt1.id,
  );
  TestValidator.equals(
    "second fetch attempt amount is stable",
    fetchedAttempt2.amount,
    fetchedAttempt1.amount,
  );
  TestValidator.equals(
    "second fetch status is stable",
    fetchedAttempt2.status,
    fetchedAttempt1.status,
  );
}
