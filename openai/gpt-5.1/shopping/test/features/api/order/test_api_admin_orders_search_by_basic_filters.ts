import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrder";
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

/**
 * Admin can search orders by basic filters.
 *
 * Business flow:
 *
 * 1. Bootstrap actors via auth APIs:
 *
 *    - Create an admin (join) and keep its credentials for later admin calls
 *    - Create a seller (join)
 *    - Create a customer (join)
 * 2. As admin, create master data required for orders:
 *
 *    - Country and region for shipping addresses
 *    - One shipping method
 *    - One payment method
 *    - One SKU inventory state (purchasable)
 * 3. As seller, create a product and attach a category, then create a SKU that
 *    uses the inventory state.
 * 4. As customer, create:
 *
 *    - Shipping address referencing country/region
 *    - Cart and cart item referencing the SKU
 *    - Order referencing the cart, shipping address, shipping method and payment
 *         method.
 * 5. As admin, search orders with PATCH /shoppingMall/admin/orders using:
 *
 *    - Page/limit small values (e.g. 0/10)
 *    - OrderCode = created order.order_code
 *    - CustomerKeyword as substring of customer email
 *    - StatusIn containing the order.current_status
 *    - PlacedAtFrom/placedAtTo range that encloses order.placed_at
 * 6. Validate that:
 *
 *    - Response page structure matches IPageIShoppingMallOrder.ISummary
 *    - Data[] includes exactly the created order summary
 *    - The summary fields order_code, currency_code, item_count, grand_total_amount,
 *         placed_at match the created order
 *    - Pagination.records >= 1 and pages computed consistently with limit
 * 7. Call again with a customerKeyword that cannot match, expect empty data[] and
 *    records=0 but 200.
 */
export async function test_api_admin_orders_search_by_basic_filters(
  connection: api.IConnection,
) {
  // 1. Register admin, seller, and customer
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.join.example.com",
    referrer: "https://landing.example.com/admin",
  } satisfies IShoppingMallAdminJoin.ICreate;
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(admin);

  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://seller.join.example.com",
    referrer: "https://landing.example.com/seller",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, { body: sellerJoinBody });
  typia.assert(seller);

  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://customer.join.example.com",
    referrer: "https://landing.example.com/customer",
  } satisfies IShoppingMallCustomerJoin.IRequest;
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customer);

  // 2. As admin, create master data: country, region, shipping method, payment method, inventory state.
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

  const shippingMethodCreateBody = {
    method_code: "standard",
    display_name: "Standard Shipping",
    service_level_description: "Standard delivery",
  } satisfies IShoppingMallShippingMethod.ICreate;
  const shippingMethod: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: shippingMethodCreateBody,
    });
  typia.assert(shippingMethod);

  const paymentMethodCreateBody = {
    code: "card",
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
      body: paymentMethodCreateBody,
    });
  typia.assert(paymentMethod);

  const inventoryStateCreateBody = {
    code: "in_stock",
    name: "In Stock",
    description: "Available for purchase",
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;
  const inventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      { body: inventoryStateCreateBody },
    );
  typia.assert(inventoryState);

  // 3. As seller: login, create product, category + link, SKU.
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerJoinBody.email,
      password: sellerJoinBody.password,
      ip: null,
      href: "https://seller.login.example.com",
      referrer: "https://landing.example.com/seller-login",
    } satisfies IShoppingMallSellerAuthLogin.IRequest,
  });

  const productCreateBody = {
    code: "PROD-001",
    title: RandomGenerator.name(3),
    summary: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "TestBrand",
    model_name: "TB-001",
    status: "active",
    primary_image_uri: null,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  // Category (admin)
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminJoinBody.email,
      password: adminJoinBody.password,
      ip: null,
      href: "https://admin.login.example.com",
      referrer: "https://landing.example.com/admin-login",
    } satisfies IShoppingMallAdminLogin.ICreate,
  });

  const categoryCreateBody = {
    parent_id: null,
    slug: "test-category",
    name_en: "Test Category",
    description_en: "Category for tests",
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryCreateBody,
    });
  typia.assert(category);

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

  // SKU (seller)
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerJoinBody.email,
      password: sellerJoinBody.password,
      ip: null,
      href: "https://seller.login.example.com/sku",
      referrer: "https://landing.example.com/seller-login",
    } satisfies IShoppingMallSellerAuthLogin.IRequest,
  });

  const skuCreateBody = {
    code: "SKU-001",
    barcode: null,
    status: "active",
    price: 10000,
    original_price: 12000,
    inventory_quantity: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 1 as number & tags.Type<"int32"> & tags.Minimum<0>,
    shopping_mall_sku_inventory_state_id: inventoryState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;
  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id as string & tags.Format<"uuid">,
      body: skuCreateBody,
    });
  typia.assert(sku);

  // 4. As customer: login, create address, cart, cart item, then order.
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerJoinBody.email,
      password: customerJoinBody.password,
      ip: null,
      href: "https://customer.login.example.com",
      referrer: "https://landing.example.com/customer-login",
    } satisfies IShoppingMallCustomerLogin.IRequest,
  });

  const addressCreateBody = {
    shopping_mall_country_id: country.id,
    shopping_mall_region_id: region.id,
    recipient_name: "Test Customer",
    line1: "123 Test Street",
    line2: null,
    city: "Seoul",
    postal_code: "06000",
    phone_number: RandomGenerator.mobile(),
    is_default: true,
  } satisfies IShoppingMallCustomerAddress.ICreate;
  const address: IShoppingMallCustomerAddress =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      connection,
      {
        customerId: customer.id,
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

  const cartItemCreateBody = {
    shopping_mall_sku_id: sku.id,
    quantity: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IShoppingMallCartItem.ICreate;
  const cartItem: IShoppingMallCartItem =
    await api.functional.shoppingMall.customer.carts.items.create(connection, {
      cartId: cart.id as string & tags.Format<"uuid">,
      body: cartItemCreateBody,
    });
  typia.assert(cartItem);

  const shippingAddressSnapshotBody = {
    recipient_name: address.recipient_name,
    phone_number: address.phone_number ?? RandomGenerator.mobile(),
    country_code: country.country_code,
    postal_code: address.postal_code,
    state_or_region: region.name_en,
    city: address.city,
    address_line1: address.line1,
    address_line2: address.line2 ?? null,
  } satisfies IShoppingMallShippingAddressSnapshot.ICreate;

  const orderCreateBody = {
    cart_id: cart.id,
    currency_code: cart.currency_code,
    items: [
      {
        shopping_mall_sku_id: sku.id,
        quantity: cartItem.quantity,
      } satisfies IShoppingMallOrderItem.ICreate,
    ],
    shipping_address_id: address.id,
    shipping_address_snapshot: shippingAddressSnapshotBody,
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

  // 5. As admin, search orders by basic filters.
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminJoinBody.email,
      password: adminJoinBody.password,
      ip: null,
      href: "https://admin.login.example.com/search",
      referrer: "https://landing.example.com/admin-login",
    } satisfies IShoppingMallAdminLogin.ICreate,
  });

  const placedAtFrom = order.placed_at;
  const placedAtTo = order.placed_at;

  const customerEmail = customer.email;
  const emailKeyword = customerEmail.split("@")[0];

  const requestBody: IShoppingMallOrder.IRequest = {
    page: 0 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
    orderCode: order.order_code,
    customerKeyword: emailKeyword,
    sellerId: undefined,
    statusIn: [order.current_status],
    minGrandTotalAmount: undefined,
    maxGrandTotalAmount: undefined,
    placedAtFrom,
    placedAtTo,
    includeCancelled: undefined,
    includeFullyRefunded: undefined,
    sortField: "placed_at",
    sortDirection: "desc",
  };

  const page: IPageIShoppingMallOrder.ISummary =
    await api.functional.shoppingMall.admin.orders.index(connection, {
      body: requestBody,
    });
  typia.assert(page);

  const summaries = page.data;
  const found = summaries.find((s) => s.id === order.id);
  TestValidator.predicate(
    "admin search with basic filters should find the created order",
    found !== undefined,
  );

  if (found) {
    TestValidator.equals(
      "order_code must match",
      found.order_code,
      order.order_code,
    );
    TestValidator.equals(
      "currency_code must match",
      found.currency_code,
      order.currency_code,
    );
    TestValidator.equals(
      "item_count must match",
      found.item_count,
      order.item_count,
    );
    TestValidator.equals(
      "grand_total_amount must match",
      found.grand_total_amount,
      order.grand_total_amount,
    );
    TestValidator.equals(
      "placed_at must match",
      found.placed_at,
      order.placed_at,
    );
  }

  TestValidator.predicate(
    "pagination records must be at least 1",
    page.pagination.records >= 1,
  );

  const expectedPages =
    page.pagination.limit === 0
      ? 0
      : Math.ceil(page.pagination.records / page.pagination.limit);
  TestValidator.equals(
    "pagination pages computed correctly",
    page.pagination.pages,
    expectedPages,
  );

  // 7. Negative case: customerKeyword that does not match any customer
  const negativeRequest: IShoppingMallOrder.IRequest = {
    page: 0 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
    orderCode: order.order_code,
    customerKeyword: "nonexistent-keyword-" + RandomGenerator.alphabets(8),
    sellerId: undefined,
    statusIn: [order.current_status],
    minGrandTotalAmount: undefined,
    maxGrandTotalAmount: undefined,
    placedAtFrom,
    placedAtTo,
    includeCancelled: undefined,
    includeFullyRefunded: undefined,
    sortField: "placed_at",
    sortDirection: "desc",
  };

  const negativePage: IPageIShoppingMallOrder.ISummary =
    await api.functional.shoppingMall.admin.orders.index(connection, {
      body: negativeRequest,
    });
  typia.assert(negativePage);

  TestValidator.equals(
    "negative search should return empty data array",
    negativePage.data.length,
    0,
  );
  TestValidator.equals(
    "negative search should have zero records",
    negativePage.pagination.records,
    0,
  );
}
