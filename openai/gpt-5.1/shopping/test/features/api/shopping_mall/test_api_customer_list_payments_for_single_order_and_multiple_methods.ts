import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderPayment";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
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

/**
 * Verify that a customer can list their logical payments with pagination and
 * filters.
 *
 * Business context:
 *
 * - A customer places two orders using different payment methods.
 * - Each order has a logical payment created against it.
 * - The customer then lists payments scoped to their account and filters by
 *   business status, payment method, and created_at range.
 *
 * Steps:
 *
 * 1. Create and authenticate customer, admin, and seller actors.
 * 2. As admin, create country, region, category, inventory state, shipping method,
 *    and two payment methods.
 * 3. As seller, create a product and SKU, and link product to category.
 * 4. As customer, create an address and a cart, then create two orders that
 *    purchase the same SKU but use different payment methods.
 * 5. Create one logical payment per order with different payable_amounts.
 * 6. Call customer payments.index with filters to:
 *
 *    - Retrieve both payments and validate pagination metadata.
 *    - Filter by businessStatuses to get only payments matching a given status.
 *    - Filter by paymentMethodIds to get only payments using method B.
 *    - Filter by createdFrom/createdTo around a specific payment’s created_at.
 */
export async function test_api_customer_list_payments_for_single_order_and_multiple_methods(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and login a customer
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Passw0rd!" as string & tags.Format<"password">,
    ip: null,
    href: "https://customer.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://customer.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallCustomerJoin.IRequest;
  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  const customerId: string & tags.Format<"uuid"> = customerAuthorized.id;

  // 2. Register and login an admin for master data creation
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Adm1nPass!" as string & tags.Format<"password">,
    ip: null,
    href: "https://admin.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;
  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  const adminLoginBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/login" as string & tags.Format<"uri">,
  } satisfies IShoppingMallAdminLogin.ICreate;
  const adminLoginAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginAuthorized);

  // 3. Register and login a seller for product/SKU creation
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Sell3rPass!" as string & tags.Format<"password">,
    ip: null,
    href: "https://seller.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://seller.example.com/landing" as string &
      tags.Format<"uri">,
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
    href: "https://seller.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://seller.example.com/login" as string & tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthLogin.IRequest;
  const sellerLoginAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoginAuthorized);

  // 4. As admin, create country and region
  const _adminRelogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(_adminRelogin);

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

  // 5. As admin, create category
  const categoryCreateBody = {
    parent_id: null,
    slug: `cat-${RandomGenerator.alphaNumeric(8)}`,
    name_en: "General",
    description_en: null,
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryCreateBody,
    });
  typia.assert(category);

  // 6. As admin, create SKU inventory state
  const skuStateCreateBody = {
    code: `in_stock_${RandomGenerator.alphabets(4)}`,
    name: "In Stock",
    description: null,
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;
  const skuState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: skuStateCreateBody,
      },
    );
  typia.assert(skuState);

  // 7. As admin, create shipping method and two payment methods
  const shippingMethodCreateBody = {
    method_code: `ship-${RandomGenerator.alphaNumeric(6)}`,
    display_name: "Standard Shipping",
    service_level_description: "Standard",
  } satisfies IShoppingMallShippingMethod.ICreate;
  const shippingMethod: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: shippingMethodCreateBody,
    });
  typia.assert(shippingMethod);

  const paymentMethodACreateBody = {
    code: `card-${RandomGenerator.alphaNumeric(4)}`,
    display_name: "Card A",
    description: null,
    provider_type: "card_processor",
    allowed_currencies: null,
    allowed_countries: null,
    min_amount: null,
    max_amount: null,
    status: "active",
  } satisfies IShoppingMallPaymentMethod.ICreate;
  const paymentMethodA: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(connection, {
      body: paymentMethodACreateBody,
    });
  typia.assert(paymentMethodA);

  const paymentMethodBCreateBody = {
    code: `bank-${RandomGenerator.alphaNumeric(4)}`,
    display_name: "Bank B",
    description: null,
    provider_type: "bank_gateway",
    allowed_currencies: null,
    allowed_countries: null,
    min_amount: null,
    max_amount: null,
    status: "active",
  } satisfies IShoppingMallPaymentMethod.ICreate;
  const paymentMethodB: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(connection, {
      body: paymentMethodBCreateBody,
    });
  typia.assert(paymentMethodB);

  // 8. As seller, create product and SKU
  const _sellerRelogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(_sellerRelogin);

  const productCreateBody = {
    code: `prod-${RandomGenerator.alphaNumeric(6)}`,
    title: "Test Product",
    summary: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: null,
    model_name: null,
    status: "active",
    primary_image_uri: null,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  // Link product to category as admin
  const _adminRelogin2: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(_adminRelogin2);

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

  // Back to seller to create SKU
  const _sellerRelogin2: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(_sellerRelogin2);

  const skuCreateBody = {
    code: `sku-${RandomGenerator.alphaNumeric(6)}` as string &
      tags.MinLength<1> &
      tags.MaxLength<255>,
    barcode: null,
    status: "active" as string & tags.MinLength<1> & tags.MaxLength<64>,
    price: 10000,
    original_price: null,
    inventory_quantity: 100 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: null,
    shopping_mall_sku_inventory_state_id: skuState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;
  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id,
      body: skuCreateBody,
    });
  typia.assert(sku);

  // 9. As customer, login and create address and cart, then two orders
  const customerLoginBody = {
    email: customerJoinBody.email,
    password: customerJoinBody.password,
    ip: null,
    href: "https://customer.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://customer.example.com/login" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallCustomerLogin.IRequest;
  const customerLoginAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLoginAuthorized);

  const addressCreateBody = {
    shopping_mall_country_id: country.id,
    shopping_mall_region_id: region.id,
    recipient_name: "John Doe",
    line1: "1 Test Street",
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
        customerId,
        body: addressCreateBody,
      },
    );
  typia.assert(address);

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

  // Helper to create a simple order
  const createOrder = async (
    currency: string,
    shippingMethodId: string & tags.Format<"uuid">,
    paymentMethodId: string & tags.Format<"uuid">,
    buyerMemo: string,
  ): Promise<IShoppingMallOrder> => {
    const orderCreateBody = {
      cart_id: cart.id,
      currency_code: currency,
      items: [
        {
          shopping_mall_sku_id: sku.id,
          quantity: 1 as number & tags.Type<"int32">,
        },
      ],
      shipping_address_id: address.id,
      shipping_address_snapshot: null,
      shipping_method_id: shippingMethodId,
      payment_method_id: paymentMethodId,
      buyer_memo: buyerMemo,
      platform_note: null,
    } satisfies IShoppingMallOrder.ICreate;
    const order: IShoppingMallOrder =
      await api.functional.shoppingMall.customer.orders.create(connection, {
        body: orderCreateBody,
      });
    typia.assert(order);
    return order;
  };

  const order1: IShoppingMallOrder = await createOrder(
    "KRW",
    shippingMethod.id,
    paymentMethodA.id,
    "First order",
  );
  const order2: IShoppingMallOrder = await createOrder(
    "KRW",
    shippingMethod.id,
    paymentMethodB.id,
    "Second order",
  );

  // 10. Create two logical payments for each order
  const payment1CreateBody = {
    payment_method_id: paymentMethodA.id,
    currency_code: order1.currency_code,
    payable_amount: 10000,
    provider_reference: null,
    provider_status_code: null,
    metadata: null,
  } satisfies IShoppingMallOrderPayment.ICreate;
  const payment1: IShoppingMallOrderPayment =
    await api.functional.shoppingMall.customer.orders.payments.create(
      connection,
      {
        orderId: order1.id,
        body: payment1CreateBody,
      },
    );
  typia.assert(payment1);

  const payment2CreateBody = {
    payment_method_id: paymentMethodB.id,
    currency_code: order2.currency_code,
    payable_amount: 20000,
    provider_reference: null,
    provider_status_code: null,
    metadata: null,
  } satisfies IShoppingMallOrderPayment.ICreate;
  const payment2: IShoppingMallOrderPayment =
    await api.functional.shoppingMall.customer.orders.payments.create(
      connection,
      {
        orderId: order2.id,
        body: payment2CreateBody,
      },
    );
  typia.assert(payment2);

  // 11. Call payments.index with broad filter to retrieve both
  const baseRequestBody = {
    page: 1 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
    orderIds: [order1.id, order2.id],
    paymentMethodIds: [paymentMethodA.id, paymentMethodB.id],
    businessStatuses: undefined,
    currencyCodes: undefined,
    minPayableAmount: undefined,
    maxPayableAmount: undefined,
    createdFrom: undefined,
    createdTo: undefined,
    sortBy: "created_at",
    sortDirection: "desc",
  } satisfies IShoppingMallOrderPayment.IRequest;

  const pageAll: IPageIShoppingMallOrderPayment.ISummary =
    await api.functional.shoppingMall.customer.customers.payments.index(
      connection,
      {
        customerId,
        body: baseRequestBody,
      },
    );
  typia.assert(pageAll);

  const paginationAll = pageAll.pagination;
  TestValidator.predicate(
    "pagination.records should be at least 2",
    paginationAll.records >= 2,
  );
  TestValidator.equals(
    "data length should match pagination.records when <= limit",
    pageAll.data.length,
    paginationAll.records,
  );

  for (const summary of pageAll.data) {
    TestValidator.equals(
      "summary.customer.id matches customer",
      summary.customer.id,
      customerId,
    );
    TestValidator.predicate(
      "payment order is one of created orders",
      summary.order.id === order1.id || summary.order.id === order2.id,
    );
  }

  const paymentIds = pageAll.data.map((p) => p.id);
  TestValidator.predicate(
    "payment1 is included in list",
    paymentIds.includes(payment1.id),
  );
  TestValidator.predicate(
    "payment2 is included in list",
    paymentIds.includes(payment2.id),
  );

  const summary1 = pageAll.data.find((p) => p.id === payment1.id);
  const summary2 = pageAll.data.find((p) => p.id === payment2.id);
  TestValidator.predicate("summary1 should be found", !!summary1);
  TestValidator.predicate("summary2 should be found", !!summary2);
  if (summary1 && summary2) {
    TestValidator.equals(
      "summary1 payment_method.id",
      summary1.payment_method.id,
      paymentMethodA.id,
    );
    TestValidator.equals(
      "summary2 payment_method.id",
      summary2.payment_method.id,
      paymentMethodB.id,
    );
    TestValidator.equals(
      "summary1 payable_amount matches",
      summary1.payable_amount,
      payment1.payable_amount,
    );
    TestValidator.equals(
      "summary2 payable_amount matches",
      summary2.payable_amount,
      payment2.payable_amount,
    );
  }

  // 12. Filter by businessStatuses for the first payment
  const statusFilterBody = {
    ...baseRequestBody,
    businessStatuses: [payment1.business_status],
  } satisfies IShoppingMallOrderPayment.IRequest;
  const pageStatus: IPageIShoppingMallOrderPayment.ISummary =
    await api.functional.shoppingMall.customer.customers.payments.index(
      connection,
      {
        customerId,
        body: statusFilterBody,
      },
    );
  typia.assert(pageStatus);

  TestValidator.predicate(
    "status filtered results have same business_status",
    pageStatus.data.every(
      (p) => p.business_status === payment1.business_status,
    ),
  );

  // 13. Filter by paymentMethodIds for method B only
  const methodBFilterBody = {
    ...baseRequestBody,
    paymentMethodIds: [paymentMethodB.id],
  } satisfies IShoppingMallOrderPayment.IRequest;
  const pageMethodB: IPageIShoppingMallOrderPayment.ISummary =
    await api.functional.shoppingMall.customer.customers.payments.index(
      connection,
      {
        customerId,
        body: methodBFilterBody,
      },
    );
  typia.assert(pageMethodB);

  TestValidator.predicate(
    "all summaries use payment method B",
    pageMethodB.data.every((p) => p.payment_method.id === paymentMethodB.id),
  );

  // 14. Filter by createdFrom/createdTo around payment2.created_at
  const createdAt2: string & tags.Format<"date-time"> = payment2.created_at;
  const rangeFilterBody = {
    ...baseRequestBody,
    createdFrom: createdAt2,
    createdTo: createdAt2,
  } satisfies IShoppingMallOrderPayment.IRequest;
  const pageRange: IPageIShoppingMallOrderPayment.ISummary =
    await api.functional.shoppingMall.customer.customers.payments.index(
      connection,
      {
        customerId,
        body: rangeFilterBody,
      },
    );
  typia.assert(pageRange);

  TestValidator.predicate(
    "range results created_at within range",
    pageRange.data.every(
      (p) => p.created_at >= createdAt2 && p.created_at <= createdAt2,
    ),
  );

  TestValidator.predicate(
    "range results include payment2 when any exist",
    pageRange.data.length === 0 ||
      pageRange.data.some((p) => p.id === payment2.id),
  );
}
