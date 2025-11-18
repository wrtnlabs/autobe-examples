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

export async function test_api_admin_orders_pagination_and_sorting(
  connection: api.IConnection,
) {
  // 1. Admin, seller, customer registrations
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16) as string &
      tags.Format<"password">,
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallAdminJoin.ICreate;
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(admin);

  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16) as string &
      tags.Format<"password">,
    ip: null,
    href: "https://seller.example.com/join",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, { body: sellerJoinBody });
  typia.assert(seller);

  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16) as string &
      tags.Format<"password">,
    ip: null,
    href: "https://shop.example.com/join",
    referrer: "https://shop.example.com/",
  } satisfies IShoppingMallCustomerJoin.IRequest;
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customer);

  // 2. Admin-side master data (country, region, shipping, payment, sku state, category)
  const adminLoginBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallAdminLogin.ICreate;
  const adminLoggedIn: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, { body: adminLoginBody });
  typia.assert(adminLoggedIn);

  const countryBody = {
    country_code: "KR",
    name_en: "Korea",
    phone_code: "+82",
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallCountry.ICreate;
  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryBody,
    });
  typia.assert(country);

  const regionBody = {
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
        body: regionBody,
      },
    );
  typia.assert(region);

  const shippingMethodBody = {
    method_code: "standard",
    display_name: "Standard Shipping",
    service_level_description: "Standard 2-3 days",
  } satisfies IShoppingMallShippingMethod.ICreate;
  const shippingMethod: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: shippingMethodBody,
    });
  typia.assert(shippingMethod);

  const paymentMethodBody = {
    code: "card",
    display_name: "Credit Card",
    description: "Standard credit card payment",
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

  const skuStateBody = {
    code: "in_stock",
    name: "In Stock",
    description: "Available for purchase",
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;
  const skuState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      { body: skuStateBody },
    );
  typia.assert(skuState);

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

  // 3. Seller product + SKU
  const sellerLoginBody = {
    email: sellerJoinBody.email,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;
  const sellerLoggedIn: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoggedIn);

  const productBody = {
    code: "PROD-ORDER-PAGINATION",
    title: "Pagination Test Product",
    summary: "Product used to test order pagination",
    description: RandomGenerator.content({ paragraphs: 1 }),
    brand: "TestBrand",
    model_name: "Model-1",
    status: "active",
    primary_image_uri: "https://cdn.example.com/product.png" as string &
      tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert(product);

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

  const skuPrice = 1000;
  const skuBody = {
    code: "SKU-ORDER-PAGINATION",
    barcode: null,
    status: "active",
    price: skuPrice,
    original_price: skuPrice,
    inventory_quantity: 1000 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
    shopping_mall_sku_inventory_state_id: skuState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;
  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id as string & tags.Format<"uuid">,
      body: skuBody,
    });
  typia.assert(sku);

  // 4. Customer address
  const customerLoginBody = {
    email: customerJoinBody.email,
    password: customerJoinBody.password,
    ip: null,
    href: "https://shop.example.com/login",
    referrer: "https://shop.example.com/",
  } satisfies IShoppingMallCustomerLogin.IRequest;
  const customerLoggedIn: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLoggedIn);

  const addressBody = {
    shopping_mall_country_id: country.id,
    shopping_mall_region_id: region.id,
    recipient_name: RandomGenerator.name(2),
    line1: "Test street 123",
    line2: null,
    city: "Seoul",
    postal_code: "06236",
    phone_number: RandomGenerator.mobile(),
    is_default: true,
  } satisfies IShoppingMallCustomerAddress.ICreate;
  const address: IShoppingMallCustomerAddress =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      connection,
      {
        customerId: customerLoggedIn.id,
        body: addressBody,
      },
    );
  typia.assert(address);

  // 5. Create many orders
  const orders: IShoppingMallOrder[] = [];
  const orderCount = 25;
  for (let i = 0; i < orderCount; i++) {
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

    const quantity = 1 + (i % 5);
    const cartItemBody = {
      shopping_mall_sku_id: sku.id,
      quantity: quantity as number & tags.Type<"int32"> & tags.Minimum<1>,
    } satisfies IShoppingMallCartItem.ICreate;
    const cartItem: IShoppingMallCartItem =
      await api.functional.shoppingMall.customer.carts.items.create(
        connection,
        {
          cartId: cart.id as string & tags.Format<"uuid">,
          body: cartItemBody,
        },
      );
    typia.assert(cartItem);

    const shippingSnapshot = {
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
      currency_code: "KRW",
      items: [
        {
          shopping_mall_sku_id: sku.id,
          quantity: quantity as number & tags.Type<"int32">,
        } satisfies IShoppingMallOrderItem.ICreate,
      ],
      shipping_address_id: address.id,
      shipping_address_snapshot: shippingSnapshot,
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
    orders.push(order);
  }

  // 6. Admin search for pagination + sorting
  const adminLoginAgain: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, { body: adminLoginBody });
  typia.assert(adminLoginAgain);

  const page = 0 as number & tags.Type<"int32">;
  const limit = 10 as number & tags.Type<"int32">;

  const baseSearch = {
    page,
    limit,
    orderCode: undefined,
    customerKeyword: undefined,
    sellerId: undefined,
    statusIn: undefined,
    minGrandTotalAmount: undefined,
    maxGrandTotalAmount: undefined,
    placedAtFrom: undefined,
    placedAtTo: undefined,
    includeCancelled: undefined,
    includeFullyRefunded: undefined,
  } satisfies IShoppingMallOrder.IRequest;

  const searchPlacedDescPage0: IPageIShoppingMallOrder.ISummary =
    await api.functional.shoppingMall.admin.orders.index(connection, {
      body: {
        ...baseSearch,
        page: 0 as number & tags.Type<"int32">,
        sortField: "placed_at",
        sortDirection: "desc",
      },
    });
  typia.assert(searchPlacedDescPage0);

  const searchPlacedDescPage1: IPageIShoppingMallOrder.ISummary =
    await api.functional.shoppingMall.admin.orders.index(connection, {
      body: {
        ...baseSearch,
        page: 1 as number & tags.Type<"int32">,
        sortField: "placed_at",
        sortDirection: "desc",
      },
    });
  typia.assert(searchPlacedDescPage1);

  const collectedPlacedDesc = [
    ...searchPlacedDescPage0.data,
    ...searchPlacedDescPage1.data,
  ];

  const pagination0 = searchPlacedDescPage0.pagination;
  const pagination1 = searchPlacedDescPage1.pagination;

  TestValidator.equals(
    "pagination.records should equal created orders",
    pagination0.records,
    orderCount,
  );
  TestValidator.equals(
    "pagination.pages calculation",
    pagination0.pages,
    Math.ceil(orderCount / pagination0.limit),
  );
  TestValidator.equals(
    "pagination metadata consistent across pages",
    pagination0.records,
    pagination1.records,
  );

  const seenIds = new Set<string>();
  for (const summary of collectedPlacedDesc) {
    const beforeSize = seenIds.size;
    seenIds.add(summary.id);
    TestValidator.predicate(
      "no duplicate order ids across first two pages (placed desc)",
      seenIds.size === beforeSize + 1,
    );
  }

  for (let i = 1; i < searchPlacedDescPage0.data.length; i++) {
    const prev = searchPlacedDescPage0.data[i - 1];
    const curr = searchPlacedDescPage0.data[i];
    TestValidator.predicate(
      "placed_at desc within page 0",
      prev.placed_at >= curr.placed_at,
    );
  }
  for (let i = 1; i < searchPlacedDescPage1.data.length; i++) {
    const prev = searchPlacedDescPage1.data[i - 1];
    const curr = searchPlacedDescPage1.data[i];
    TestValidator.predicate(
      "placed_at desc within page 1",
      prev.placed_at >= curr.placed_at,
    );
  }

  const searchAmountAscPage0: IPageIShoppingMallOrder.ISummary =
    await api.functional.shoppingMall.admin.orders.index(connection, {
      body: {
        ...baseSearch,
        page: 0 as number & tags.Type<"int32">,
        sortField: "grand_total_amount",
        sortDirection: "asc",
      },
    });
  typia.assert(searchAmountAscPage0);

  const searchAmountDescPage0: IPageIShoppingMallOrder.ISummary =
    await api.functional.shoppingMall.admin.orders.index(connection, {
      body: {
        ...baseSearch,
        page: 0 as number & tags.Type<"int32">,
        sortField: "grand_total_amount",
        sortDirection: "desc",
      },
    });
  typia.assert(searchAmountDescPage0);

  for (let i = 1; i < searchAmountAscPage0.data.length; i++) {
    const prev = searchAmountAscPage0.data[i - 1];
    const curr = searchAmountAscPage0.data[i];
    TestValidator.predicate(
      "grand_total_amount asc within page 0",
      prev.grand_total_amount <= curr.grand_total_amount,
    );
  }
  for (let i = 1; i < searchAmountDescPage0.data.length; i++) {
    const prev = searchAmountDescPage0.data[i - 1];
    const curr = searchAmountDescPage0.data[i];
    TestValidator.predicate(
      "grand_total_amount desc within page 0",
      prev.grand_total_amount >= curr.grand_total_amount,
    );
  }

  if (
    searchAmountAscPage0.data.length > 0 &&
    searchAmountDescPage0.data.length > 0
  ) {
    const ascFirst = searchAmountAscPage0.data[0].id;
    const descFirst = searchAmountDescPage0.data[0].id;
    TestValidator.predicate(
      "sorting by amount asc vs desc should change order",
      ascFirst !== descFirst,
    );
  }

  const outOfRangePage = pagination0.pages + 1;
  const outOfRangeResult: IPageIShoppingMallOrder.ISummary =
    await api.functional.shoppingMall.admin.orders.index(connection, {
      body: {
        ...baseSearch,
        page: outOfRangePage as number & tags.Type<"int32">,
        sortField: "placed_at",
        sortDirection: "desc",
      },
    });
  typia.assert(outOfRangeResult);

  TestValidator.equals(
    "out of range page should have empty data",
    outOfRangeResult.data.length,
    0,
  );
  TestValidator.equals(
    "out of range pagination.records consistent",
    outOfRangeResult.pagination.records,
    pagination0.records,
  );
  TestValidator.equals(
    "out of range pagination.pages consistent",
    outOfRangeResult.pagination.pages,
    pagination0.pages,
  );
}
