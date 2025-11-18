import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCancellationRequestItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCancellationRequestItem";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCancellationRequestItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequestItem";
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

export async function test_api_cancellation_request_items_listing_after_mixed_item_cancellation(
  connection: api.IConnection,
) {
  // Authenticate admin
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminJoinBody = {
    email: adminEmail,
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

  // Authenticate seller
  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const sellerJoinBody = {
    email: sellerEmail,
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

  // Authenticate customer
  const customerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const customerJoinBody = {
    email: customerEmail,
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://customer.example.com/join",
    referrer: "https://customer.example.com/landing",
  } satisfies IShoppingMallCustomerJoin.IRequest;
  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  // Admin: create country
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

  // Admin: create region under country
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

  // Admin: create shipping method
  const shippingMethodBody = {
    method_code: "STD",
    display_name: "Standard Shipping",
    service_level_description: "Standard shipping",
  } satisfies IShoppingMallShippingMethod.ICreate;
  const shippingMethod: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: shippingMethodBody,
    });
  typia.assert(shippingMethod);

  // Admin: create payment method
  const paymentMethodBody = {
    code: "CARD",
    display_name: "Credit Card",
    description: "Card payment",
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

  // Admin: create inventory state
  const inventoryStateBody = {
    code: "IN_STOCK",
    name: "In Stock",
    description: "Sellable inventory",
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

  // Seller is already logged in from join, create product
  const productBody = {
    code: RandomGenerator.alphaNumeric(8),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: null,
    model_name: null,
    status: "active",
    primary_image_uri: null,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert(product);

  // Admin: categorize product
  const categoryBody = {
    parent_id: null,
    slug: RandomGenerator.alphabets(8),
    name_en: "Clothes",
    description_en: null,
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

  // Seller: create two SKUs under product
  const skuBody1 = {
    code: RandomGenerator.alphaNumeric(6),
    barcode: null,
    status: "active",
    price: 10000,
    original_price: null,
    inventory_quantity: 100 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: null,
    shopping_mall_sku_inventory_state_id: inventoryState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;
  const sku1: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id as string & tags.Format<"uuid">,
      body: skuBody1,
    });
  typia.assert(sku1);

  const skuBody2 = {
    code: RandomGenerator.alphaNumeric(6),
    barcode: null,
    status: "active",
    price: 15000,
    original_price: null,
    inventory_quantity: 100 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: null,
    shopping_mall_sku_inventory_state_id: inventoryState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;
  const sku2: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id as string & tags.Format<"uuid">,
      body: skuBody2,
    });
  typia.assert(sku2);

  // Customer: login explicitly to ensure context
  const customerLoginBody = {
    email: customerEmail,
    password: customerJoinBody.password,
    ip: null,
    href: "https://customer.example.com/login",
    referrer: "https://customer.example.com/landing",
  } satisfies IShoppingMallCustomerLogin.IRequest;
  const customerAfterLogin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerAfterLogin);

  // Customer: create cart
  const cartBody = {
    actor_type: "customer",
    status: "active",
    currency_code: "KRW",
  } satisfies IShoppingMallCart.ICreate;
  const cart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: cartBody,
    });
  typia.assert(cart);

  // Customer: add two SKUs as separate cart items
  const cartItemBody1 = {
    shopping_mall_sku_id: sku1.id,
    quantity: 3 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IShoppingMallCartItem.ICreate;
  const cartItem1: IShoppingMallCartItem =
    await api.functional.shoppingMall.customer.carts.items.create(connection, {
      cartId: cart.id as string & tags.Format<"uuid">,
      body: cartItemBody1,
    });
  typia.assert(cartItem1);

  const cartItemBody2 = {
    shopping_mall_sku_id: sku2.id,
    quantity: 5 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IShoppingMallCartItem.ICreate;
  const cartItem2: IShoppingMallCartItem =
    await api.functional.shoppingMall.customer.carts.items.create(connection, {
      cartId: cart.id as string & tags.Format<"uuid">,
      body: cartItemBody2,
    });
  typia.assert(cartItem2);

  // Customer address to be used in order
  const addressBody = {
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
        customerId: customerAfterLogin.id,
        body: addressBody,
      },
    );
  typia.assert(address);

  // Customer: create order from cart (two order items)
  const orderCreateBody = {
    cart_id: cart.id,
    currency_code: cart.currency_code,
    items: [
      {
        shopping_mall_sku_id: sku1.id,
        quantity: cartItemBody1.quantity,
      },
      {
        shopping_mall_sku_id: sku2.id,
        quantity: cartItemBody2.quantity,
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

  TestValidator.equals("order has two items", order.items.length, 2 as number);

  const orderItem1: IShoppingMallOrderItem = order.items[0];
  const orderItem2: IShoppingMallOrderItem = order.items[1];

  // Customer: open cancellation request (partial_items)
  const cancellationRequestBody = {
    shopping_mall_order_id: order.id,
    request_code: RandomGenerator.alphaNumeric(10),
    status: "pending",
    scope_type: "partial_items",
    reason_code: "customer_change_of_mind",
    reason_description: "Customer wants to cancel some items",
    requested_at: null,
    requested_by_actor_type: "customer",
  } satisfies IShoppingMallCancellationRequest.ICreate;
  const cancellationRequest: IShoppingMallCancellationRequest =
    await api.functional.shoppingMall.customer.cancellationRequests.create(
      connection,
      {
        body: cancellationRequestBody,
      },
    );
  typia.assert(cancellationRequest);

  // Customer: create multiple cancellation request items
  const itemLine1Body = {
    orderItemId: orderItem1.id,
    requestedQuantity: 1 as number & tags.Type<"int32">,
    reasonDescription: "cancel one unit from first item",
  } satisfies IShoppingMallCancellationRequestItem.ICreate;
  const itemLine1: IShoppingMallCancellationRequestItem =
    await api.functional.shoppingMall.customer.cancellationRequests.items.create(
      connection,
      {
        cancellationRequestId: cancellationRequest.id as string &
          tags.Format<"uuid">,
        body: itemLine1Body,
      },
    );
  typia.assert(itemLine1);

  const itemLine2Body = {
    orderItemId: orderItem2.id,
    requestedQuantity: 2 as number & tags.Type<"int32">,
    reasonDescription: "cancel smaller quantity from second item",
  } satisfies IShoppingMallCancellationRequestItem.ICreate;
  const itemLine2: IShoppingMallCancellationRequestItem =
    await api.functional.shoppingMall.customer.cancellationRequests.items.create(
      connection,
      {
        cancellationRequestId: cancellationRequest.id as string &
          tags.Format<"uuid">,
        body: itemLine2Body,
      },
    );
  typia.assert(itemLine2);

  const itemLine3Body = {
    orderItemId: orderItem1.id,
    requestedQuantity: 2 as number & tags.Type<"int32">,
    reasonDescription: "extra cancellation for first item with special reason",
  } satisfies IShoppingMallCancellationRequestItem.ICreate;
  const itemLine3: IShoppingMallCancellationRequestItem =
    await api.functional.shoppingMall.customer.cancellationRequests.items.create(
      connection,
      {
        cancellationRequestId: cancellationRequest.id as string &
          tags.Format<"uuid">,
        body: itemLine3Body,
      },
    );
  typia.assert(itemLine3);

  // Now validate listing via PATCH /shoppingMall/cancellationRequests/{id}/items
  const listAllBody = {
    page: 1 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
    order_item_id: null,
    requested_quantity_min: null,
    requested_quantity_max: null,
    created_from: null,
    created_to: null,
    reason_search: null,
  } satisfies IShoppingMallCancellationRequestItem.IRequest;
  const listAll: IPageIShoppingMallCancellationRequestItem.ISummary =
    await api.functional.shoppingMall.cancellationRequests.items.index(
      connection,
      {
        cancellationRequestId: cancellationRequest.id as string &
          tags.Format<"uuid">,
        body: listAllBody,
      },
    );
  typia.assert(listAll);

  TestValidator.equals("all lines returned", listAll.data.length, 3 as number);
  TestValidator.equals(
    "all lines records",
    listAll.pagination.records,
    3 as number & tags.Type<"int32"> & tags.Minimum<0>,
  );
  TestValidator.equals(
    "all lines pages",
    listAll.pagination.pages,
    1 as number & tags.Type<"int32"> & tags.Minimum<0>,
  );

  for (const summary of listAll.data) {
    TestValidator.equals(
      "summary cancellation id matches",
      summary.cancellationRequest.id,
      cancellationRequest.id,
    );
  }

  // Filter by order_item_id = orderItem1.id
  const filterByOrderItemBody = {
    page: 1 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
    order_item_id: orderItem1.id,
    requested_quantity_min: null,
    requested_quantity_max: null,
    created_from: null,
    created_to: null,
    reason_search: null,
  } satisfies IShoppingMallCancellationRequestItem.IRequest;
  const listOrderItem1: IPageIShoppingMallCancellationRequestItem.ISummary =
    await api.functional.shoppingMall.cancellationRequests.items.index(
      connection,
      {
        cancellationRequestId: cancellationRequest.id as string &
          tags.Format<"uuid">,
        body: filterByOrderItemBody,
      },
    );
  typia.assert(listOrderItem1);

  TestValidator.equals(
    "orderItem1 lines count",
    listOrderItem1.data.length,
    2 as number,
  );
  for (const summary of listOrderItem1.data) {
    TestValidator.equals(
      "orderItem1 filter matches",
      summary.orderItem.id,
      orderItem1.id,
    );
  }

  // Filter by quantity range: requested_quantity_min = 2, max = 2
  const filterByQuantityBody = {
    page: 1 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
    order_item_id: null,
    requested_quantity_min: 2 as number & tags.Type<"int32">,
    requested_quantity_max: 2 as number & tags.Type<"int32">,
    created_from: null,
    created_to: null,
    reason_search: null,
  } satisfies IShoppingMallCancellationRequestItem.IRequest;
  const listQuantity2: IPageIShoppingMallCancellationRequestItem.ISummary =
    await api.functional.shoppingMall.cancellationRequests.items.index(
      connection,
      {
        cancellationRequestId: cancellationRequest.id as string &
          tags.Format<"uuid">,
        body: filterByQuantityBody,
      },
    );
  typia.assert(listQuantity2);

  TestValidator.equals(
    "quantity 2 count",
    listQuantity2.data.length,
    2 as number,
  );
  for (const summary of listQuantity2.data) {
    TestValidator.equals(
      "requested quantity is 2",
      summary.requested_quantity,
      2 as number & tags.Type<"int32">,
    );
  }

  // Filter by reason_search term from itemLine3
  const searchTerm = "special";
  const filterByReasonBody = {
    page: 1 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
    order_item_id: null,
    requested_quantity_min: null,
    requested_quantity_max: null,
    created_from: null,
    created_to: null,
    reason_search: searchTerm,
  } satisfies IShoppingMallCancellationRequestItem.IRequest;
  const listByReason: IPageIShoppingMallCancellationRequestItem.ISummary =
    await api.functional.shoppingMall.cancellationRequests.items.index(
      connection,
      {
        cancellationRequestId: cancellationRequest.id as string &
          tags.Format<"uuid">,
        body: filterByReasonBody,
      },
    );
  typia.assert(listByReason);

  TestValidator.equals(
    "reason search count",
    listByReason.data.length,
    1 as number,
  );
  TestValidator.equals(
    "reason search matches itemLine3",
    listByReason.data[0].id,
    itemLine3.id,
  );

  // Pagination behavior: limit 2
  const page1Body = {
    page: 1 as number & tags.Type<"int32">,
    limit: 2 as number & tags.Type<"int32">,
    order_item_id: null,
    requested_quantity_min: null,
    requested_quantity_max: null,
    created_from: null,
    created_to: null,
    reason_search: null,
  } satisfies IShoppingMallCancellationRequestItem.IRequest;
  const page1: IPageIShoppingMallCancellationRequestItem.ISummary =
    await api.functional.shoppingMall.cancellationRequests.items.index(
      connection,
      {
        cancellationRequestId: cancellationRequest.id as string &
          tags.Format<"uuid">,
        body: page1Body,
      },
    );
  typia.assert(page1);

  const page2Body = {
    page: 2 as number & tags.Type<"int32">,
    limit: 2 as number & tags.Type<"int32">,
    order_item_id: null,
    requested_quantity_min: null,
    requested_quantity_max: null,
    created_from: null,
    created_to: null,
    reason_search: null,
  } satisfies IShoppingMallCancellationRequestItem.IRequest;
  const page2: IPageIShoppingMallCancellationRequestItem.ISummary =
    await api.functional.shoppingMall.cancellationRequests.items.index(
      connection,
      {
        cancellationRequestId: cancellationRequest.id as string &
          tags.Format<"uuid">,
        body: page2Body,
      },
    );
  typia.assert(page2);

  TestValidator.equals(
    "pagination current page1",
    page1.pagination.current,
    1 as number & tags.Type<"int32"> & tags.Minimum<0>,
  );
  TestValidator.equals(
    "pagination current page2",
    page2.pagination.current,
    2 as number & tags.Type<"int32"> & tags.Minimum<0>,
  );
  TestValidator.equals(
    "pagination limit",
    page1.pagination.limit,
    2 as number & tags.Type<"int32"> & tags.Minimum<0>,
  );
  TestValidator.equals(
    "pagination records",
    page1.pagination.records,
    3 as number & tags.Type<"int32"> & tags.Minimum<0>,
  );
  TestValidator.equals(
    "pagination pages",
    page1.pagination.pages,
    2 as number & tags.Type<"int32"> & tags.Minimum<0>,
  );
}
