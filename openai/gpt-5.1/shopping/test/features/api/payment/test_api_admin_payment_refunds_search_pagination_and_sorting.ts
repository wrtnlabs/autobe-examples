import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPaymentRefund } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPaymentRefund";
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
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentItem";
import type { IShoppingMallShippingAddressSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingAddressSnapshot";
import type { IShoppingMallShippingMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingMethod";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";
import type { IShoppingMallSkuExternalId } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuExternalId";
import type { IShoppingMallSkuInventoryState } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuInventoryState";

export async function test_api_admin_payment_refunds_search_pagination_and_sorting(
  connection: api.IConnection,
) {
  // 1. Register customer
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://customer.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://customer.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallCustomerJoin.IRequest;
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customer);

  // 2. Register seller
  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const sellerPassword: string = RandomGenerator.alphaNumeric(12);
  const sellerJoinBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: "https://seller.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://seller.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthJoin.IRequest;
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(seller);

  // 3. Register admin
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword: string = RandomGenerator.alphaNumeric(16);
  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // Helper to (re)login as specific actor when needed
  const loginAsAdmin = async () => {
    const loginBody = {
      email: adminEmail,
      password: adminPassword,
      ip: null,
      href: "https://admin.example.com/login" as string & tags.Format<"uri">,
      referrer: "https://admin.example.com/dashboard" as string &
        tags.Format<"uri">,
    } satisfies IShoppingMallAdminLogin.ICreate;
    const loggedIn: IShoppingMallAdmin.IAuthorized =
      await api.functional.auth.admin.login(connection, { body: loginBody });
    typia.assert(loggedIn);
  };

  const loginAsSeller = async () => {
    const loginBody = {
      email: sellerEmail,
      password: sellerPassword,
      ip: null,
      href: "https://seller.example.com/login" as string & tags.Format<"uri">,
      referrer: "https://seller.example.com/dashboard" as string &
        tags.Format<"uri">,
    } satisfies IShoppingMallSellerAuthLogin.IRequest;
    const loggedIn: IShoppingMallSeller.IAuthorized =
      await api.functional.auth.seller.login(connection, { body: loginBody });
    typia.assert(loggedIn);
  };

  const loginAsCustomer = async () => {
    const loginBody = {
      email: customerJoinBody.email,
      password: customerJoinBody.password,
      ip: null,
      href: "https://customer.example.com/login" as string & tags.Format<"uri">,
      referrer: "https://customer.example.com/dashboard" as string &
        tags.Format<"uri">,
    } satisfies IShoppingMallCustomerLogin.IRequest;
    const loggedIn: IShoppingMallCustomer.IAuthorized =
      await api.functional.auth.customer.login(connection, { body: loginBody });
    typia.assert(loggedIn);
  };

  // 4. Admin creates country and region
  await loginAsAdmin();

  const countryCreateBody = {
    country_code: RandomGenerator.alphaNumeric(3),
    name_en: "Testland",
    phone_code: "+99",
    is_active: true,
    sort_order: 1,
  } satisfies IShoppingMallCountry.ICreate;
  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryCreateBody,
    });
  typia.assert(country);

  const regionCreateBody = {
    code: "REGION-1",
    name_en: "Test Region 1",
    region_type: "state",
    is_active: true,
    sort_order: 1,
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

  // 5. Admin creates shipping method and payment method
  const shippingMethodBody = {
    method_code: "STD_SHIP",
    display_name: "Standard Shipping",
    service_level_description: "Standard shipping for testing",
  } satisfies IShoppingMallShippingMethod.ICreate;
  const shippingMethod: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: shippingMethodBody,
    });
  typia.assert(shippingMethod);

  const paymentMethodBody = {
    code: "CARD",
    display_name: "Credit Card",
    description: "Test credit card method",
    provider_type: "card_processor",
    allowed_currencies: "USD,KRW",
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

  // 6. Seller creates product
  await loginAsSeller();

  const productBody = {
    code: RandomGenerator.alphaNumeric(8),
    title: RandomGenerator.paragraph({ sentences: 2 }),
    summary: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "BrandX",
    model_name: "ModelY",
    status: "active",
    primary_image_uri: "https://cdn.example.com/product.jpg" as string &
      tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert(product);

  // 7. Admin creates category and links product
  await loginAsAdmin();

  const categoryBody = {
    parent_id: null,
    slug: RandomGenerator.alphaNumeric(10),
    name_en: "Test Category",
    description_en: "Category for refund tests",
    status: "active",
    sort_order: 1,
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

  // 8. Admin creates SKU inventory state
  const skuInventoryStateBody = {
    code: "in_stock",
    name: "In Stock",
    description: "Items available",
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

  // 9. Seller creates SKU under product
  await loginAsSeller();

  const skuBody = {
    code: RandomGenerator.alphaNumeric(8),
    barcode: null,
    status: "active",
    price: 100,
    original_price: 120,
    inventory_quantity: 100,
    low_stock_threshold: 10,
    shopping_mall_sku_inventory_state_id: skuInventoryState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;
  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id,
      body: skuBody,
    });
  typia.assert(sku);

  // 10. Customer creates cart and adds item
  await loginAsCustomer();

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

  const cartItemBody = {
    shopping_mall_sku_id: sku.id,
    quantity: 2,
  } satisfies IShoppingMallCartItem.ICreate;
  const cartItem: IShoppingMallCartItem =
    await api.functional.shoppingMall.customer.carts.items.create(connection, {
      cartId: cart.id,
      body: cartItemBody,
    });
  typia.assert(cartItem);

  // 11. Customer creates shipping address
  const addressBody = {
    shopping_mall_country_id: country.id,
    shopping_mall_region_id: region.id,
    recipient_name: "John Doe",
    line1: "123 Test Street",
    line2: "Unit 1",
    city: "Test City",
    postal_code: "12345",
    phone_number: RandomGenerator.mobile(),
    is_default: true,
  } satisfies IShoppingMallCustomerAddress.ICreate;
  const address: IShoppingMallCustomerAddress =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      connection,
      {
        customerId: customer.id,
        body: addressBody,
      },
    );
  typia.assert(address);

  // 12. Customer creates order
  const orderItemCreate: IShoppingMallOrderItem.ICreate = {
    shopping_mall_sku_id: sku.id,
    quantity: 2,
  };
  const shippingSnapshot: IShoppingMallShippingAddressSnapshot.ICreate = {
    recipient_name: address.recipient_name,
    phone_number: address.phone_number ?? RandomGenerator.mobile(),
    country_code: country.country_code,
    postal_code: address.postal_code,
    state_or_region: region.name_en,
    city: address.city,
    address_line1: address.line1,
    address_line2: address.line2 ?? null,
  };
  const orderBody = {
    cart_id: cart.id,
    currency_code: "USD",
    items: [orderItemCreate],
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

  // 13. Customer creates logical order payment
  const payableAmount = 200;
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

  // 14. Admin creates multiple refunds for the payment
  await loginAsAdmin();

  const refunds: IShoppingMallPaymentRefund[] = [];
  const refundAmounts = [10, 20, 30, 40, 50];

  for (const amount of refundAmounts) {
    const refundCreateBody = {
      currency_code: orderPayment.currency_code,
      requested_amount: amount,
      approved_amount: amount,
      refunded_amount: 0,
      status: "pending",
      reason_code: "test_reason",
      reason_message: `Test refund ${amount}`,
      provider_reference: undefined,
      metadata: undefined,
    } satisfies IShoppingMallPaymentRefund.ICreate;
    const refund: IShoppingMallPaymentRefund =
      await api.functional.shoppingMall.admin.payments.refunds.create(
        connection,
        {
          orderPaymentId: orderPayment.id,
          body: refundCreateBody,
        },
      );
    typia.assert(refund);
    refunds.push(refund);
  }

  // Sort local refunds by created_at desc for expectation
  const sortedByCreatedDesc = [...refunds].sort((a, b) =>
    a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0,
  );

  // 15. Page 1, limit 2, sortBy created_at desc
  const page1RequestBody = {
    status: undefined,
    statusList: undefined,
    minRequestedAmount: undefined,
    maxRequestedAmount: undefined,
    minApprovedAmount: undefined,
    maxApprovedAmount: undefined,
    minRefundedAmount: undefined,
    maxRefundedAmount: undefined,
    reasonCode: undefined,
    createdFrom: undefined,
    createdTo: undefined,
    sortBy: "created_at",
    sortDirection: "desc",
    page: 1,
    limit: 2,
  } satisfies IShoppingMallPaymentRefund.IRequest;

  const page1: IPageIShoppingMallPaymentRefund.ISummary =
    await api.functional.shoppingMall.admin.payments.refunds.index(connection, {
      orderPaymentId: orderPayment.id,
      body: page1RequestBody,
    });
  typia.assert(page1);

  TestValidator.equals("page1 data length is 2", page1.data.length, 2);
  TestValidator.equals("page1 current is 1", page1.pagination.current, 1);
  TestValidator.equals("page1 limit is 2", page1.pagination.limit, 2);

  // Verify ordering by created_at desc for page1
  if (page1.data.length === 2) {
    const first = page1.data[0];
    const second = page1.data[1];
    TestValidator.predicate(
      "page1 created_at desc order",
      first.created_at >= second.created_at,
    );
  }

  const totalRecords = refunds.length;
  TestValidator.equals(
    "pagination.records equals created refunds",
    page1.pagination.records,
    totalRecords,
  );
  const expectedPages = Math.ceil(totalRecords / page1RequestBody.limit);
  TestValidator.equals(
    "pagination.pages equals ceil(records/limit)",
    page1.pagination.pages,
    expectedPages,
  );

  // Verify that IDs in page1 are the top 2 of local sorted list
  const expectedPage1Ids = sortedByCreatedDesc.slice(0, 2).map((r) => r.id);
  const actualPage1Ids = page1.data.map((r) => r.id);
  TestValidator.equals(
    "page1 IDs match top 2 sorted by created_at desc",
    actualPage1Ids,
    expectedPage1Ids,
  );

  // 16. Page 2 with same criteria
  const page2RequestBody = {
    ...page1RequestBody,
    page: 2,
  } satisfies IShoppingMallPaymentRefund.IRequest;
  const page2: IPageIShoppingMallPaymentRefund.ISummary =
    await api.functional.shoppingMall.admin.payments.refunds.index(connection, {
      orderPaymentId: orderPayment.id,
      body: page2RequestBody,
    });
  typia.assert(page2);

  TestValidator.equals("page2 data length is 2", page2.data.length, 2);

  // Verify that page2 IDs are the next two most recent
  const expectedPage2Ids = sortedByCreatedDesc.slice(2, 4).map((r) => r.id);
  const actualPage2Ids = page2.data.map((r) => r.id);
  TestValidator.equals(
    "page2 IDs match next 2 sorted by created_at desc",
    actualPage2Ids,
    expectedPage2Ids,
  );

  // 17. Optional: sort by requested_amount ascending
  const sortedByRequestedAsc = [...refunds].sort(
    (a, b) => a.requested_amount - b.requested_amount,
  );

  const sortByRequestedAscRequestBody = {
    ...page1RequestBody,
    sortBy: "requested_amount",
    sortDirection: "asc",
    page: 1,
  } satisfies IShoppingMallPaymentRefund.IRequest;

  const pageRequestedAsc: IPageIShoppingMallPaymentRefund.ISummary =
    await api.functional.shoppingMall.admin.payments.refunds.index(connection, {
      orderPaymentId: orderPayment.id,
      body: sortByRequestedAscRequestBody,
    });
  typia.assert(pageRequestedAsc);

  TestValidator.equals(
    "sortBy=requested_amount asc data length is 2",
    pageRequestedAsc.data.length,
    2,
  );

  const expectedRequestedAscIds = sortedByRequestedAsc
    .slice(0, sortByRequestedAscRequestBody.limit)
    .map((r) => r.id);
  const actualRequestedAscIds = pageRequestedAsc.data.map((r) => r.id);
  TestValidator.equals(
    "IDs sorted by requested_amount asc for first page",
    actualRequestedAscIds,
    expectedRequestedAscIds,
  );
}
