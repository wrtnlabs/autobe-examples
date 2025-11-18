import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShipment";
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

export async function test_api_admin_order_shipments_index_filtering_and_pagination(
  connection: api.IConnection,
) {
  // 1. Admin, seller, customer registration and login helpers
  const baseHref = "https://example.com/join" as const;
  const baseReferrer = "https://example.com/" as const;

  // Admin join & login
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(12);

  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword as string & tags.Format<"password">,
    ip: null,
    href: baseHref,
    referrer: baseReferrer,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminJoin);

  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: baseHref,
    referrer: baseReferrer,
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLogin = await api.functional.auth.admin.login(connection, {
    body: adminLoginBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminLogin);

  // Seller join & login
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphabets(12) as string &
    tags.Format<"password">;

  const sellerJoinBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: baseHref,
    referrer: baseReferrer,
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerJoin = await api.functional.auth.seller.join(connection, {
    body: sellerJoinBody,
  });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerJoin);

  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: baseHref,
    referrer: baseReferrer,
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerLogin = await api.functional.auth.seller.login(connection, {
    body: sellerLoginBody,
  });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerLogin);

  // Customer join & login
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphabets(12) as string &
    tags.Format<"password">;

  const customerJoinBody = {
    email: customerEmail,
    password: customerPassword,
    ip: null,
    href: baseHref,
    referrer: baseReferrer,
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customerJoin = await api.functional.auth.customer.join(connection, {
    body: customerJoinBody,
  });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerJoin);

  const customerLoginBody = {
    email: customerEmail,
    password: customerPassword,
    ip: null,
    href: baseHref,
    referrer: baseReferrer,
  } satisfies IShoppingMallCustomerLogin.IRequest;

  const customerLogin = await api.functional.auth.customer.login(connection, {
    body: customerLoginBody,
  });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerLogin);

  // 2. Admin master data: country, region, sku inventory state, shipping & payment methods
  // Admin is already logged in
  const countryBody = {
    country_code: "US",
    name_en: "United States",
    phone_code: "+1",
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallCountry.ICreate;

  const country = await api.functional.shoppingMall.admin.countries.create(
    connection,
    { body: countryBody },
  );
  typia.assert<IShoppingMallCountry>(country);

  const regionBody = {
    code: "CA",
    name_en: "California",
    region_type: "state",
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallRegion.ICreate;

  const region =
    await api.functional.shoppingMall.admin.countries.regions.create(
      connection,
      {
        countryCode: country.country_code,
        body: regionBody,
      },
    );
  typia.assert<IShoppingMallRegion>(region);

  const skuInventoryStateBody = {
    code: "in_stock",
    name: "In Stock",
    description: "Available for immediate shipment",
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;

  const skuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      { body: skuInventoryStateBody },
    );
  typia.assert<IShoppingMallSkuInventoryState>(skuInventoryState);

  const shippingMethodBody = {
    method_code: "standard",
    display_name: "Standard Shipping",
    service_level_description: "Delivers in 3-5 business days",
  } satisfies IShoppingMallShippingMethod.ICreate;

  const shippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: shippingMethodBody,
    });
  typia.assert<IShoppingMallShippingMethod>(shippingMethod);

  const paymentMethodBody = {
    code: "card",
    display_name: "Credit Card",
    description: "Pay with credit card",
    provider_type: "card_processor",
    allowed_currencies: null,
    allowed_countries: null,
    min_amount: null,
    max_amount: null,
    status: "active",
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const paymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(connection, {
      body: paymentMethodBody,
    });
  typia.assert<IShoppingMallPaymentMethod>(paymentMethod);

  // 3. Seller catalog: product, category, sku
  // Ensure seller is logged in again (SDK switches token on login)
  await api.functional.auth.seller.login(connection, {
    body: sellerLoginBody,
  });

  const productBody = {
    code: RandomGenerator.alphaNumeric(8),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "BrandX",
    model_name: "ModelY",
    status: "active",
    primary_image_uri: "https://example.com/image.png" as string &
      tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    { body: productBody },
  );
  typia.assert<IShoppingMallProduct>(product);

  // Switch back to admin to create category and link product
  await api.functional.auth.admin.login(connection, {
    body: adminLoginBody,
  });

  const categoryBody = {
    parent_id: null,
    slug: RandomGenerator.alphaNumeric(10),
    name_en: "Electronics",
    description_en: "Electronic devices",
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    { body: categoryBody },
  );
  typia.assert<IShoppingMallCategory>(category);

  const productCategoryBody = {
    shopping_mall_category_id: category.id,
    is_primary: true,
  } satisfies IShoppingMallProductCategory.ICreate;

  const productCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: product.id,
        body: productCategoryBody,
      },
    );
  typia.assert<IShoppingMallProductCategory>(productCategory);

  // Seller creates SKU
  await api.functional.auth.seller.login(connection, {
    body: sellerLoginBody,
  });

  const skuBody = {
    code: RandomGenerator.alphaNumeric(8) as string &
      tags.MinLength<1> &
      tags.MaxLength<255>,
    barcode: null,
    status: "active" as string & tags.MinLength<1> & tags.MaxLength<64>,
    price: 100 as number & tags.Minimum<0>,
    original_price: null,
    inventory_quantity: 3 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: null,
    shopping_mall_sku_inventory_state_id: skuInventoryState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;

  const sku = await api.functional.shoppingMall.seller.products.skus.create(
    connection,
    {
      productId: product.id as string & tags.Format<"uuid">,
      body: skuBody,
    },
  );
  typia.assert<IShoppingMallSku>(sku);

  // 4. Customer checkout: cart, cart item, customer address, order, shipping address snapshot
  await api.functional.auth.customer.login(connection, {
    body: customerLoginBody,
  });

  const cartBody = {
    actor_type: "customer",
    status: "active",
    currency_code: "USD",
  } satisfies IShoppingMallCart.ICreate;

  const cart = await api.functional.shoppingMall.customer.carts.create(
    connection,
    { body: cartBody },
  );
  typia.assert<IShoppingMallCart>(cart);

  const cartItemBody = {
    shopping_mall_sku_id: sku.id,
    quantity: 3 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IShoppingMallCartItem.ICreate;

  const cartItem =
    await api.functional.shoppingMall.customer.carts.items.create(connection, {
      cartId: cart.id as string & tags.Format<"uuid">,
      body: cartItemBody,
    });
  typia.assert<IShoppingMallCartItem>(cartItem);

  const customerAddressBody = {
    shopping_mall_country_id: country.id,
    shopping_mall_region_id: region.id,
    recipient_name: RandomGenerator.name(),
    line1: RandomGenerator.paragraph({ sentences: 2 }),
    line2: null,
    city: "San Francisco",
    postal_code: "94105",
    phone_number: RandomGenerator.mobile(),
    is_default: true,
  } satisfies IShoppingMallCustomerAddress.ICreate;

  const customerAddress =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      connection,
      {
        customerId: customerJoin.id,
        body: customerAddressBody,
      },
    );
  typia.assert<IShoppingMallCustomerAddress>(customerAddress);

  const orderItemCreate: IShoppingMallOrderItem.ICreate = {
    shopping_mall_sku_id: sku.id,
    quantity: 3 as number & tags.Type<"int32">,
  };

  const orderBody = {
    cart_id: cart.id,
    currency_code: "USD",
    items: [orderItemCreate],
    shipping_address_id: customerAddress.id,
    shipping_address_snapshot: null,
    shipping_method_id: shippingMethod.id,
    payment_method_id: paymentMethod.id,
    buyer_memo: null,
    platform_note: null,
  } satisfies IShoppingMallOrder.ICreate;

  const order = await api.functional.shoppingMall.customer.orders.create(
    connection,
    { body: orderBody },
  );
  typia.assert<IShoppingMallOrder>(order);

  const orderCode = order.order_code;

  const orderShippingAddressBody = {
    recipient_name: RandomGenerator.name(),
    line1: RandomGenerator.paragraph({ sentences: 2 }),
    line2: null,
    city: "San Francisco",
    postal_code: "94105",
    country_code: country.country_code as string &
      tags.MinLength<2> &
      tags.MaxLength<2>,
    region: "California",
    phone_number: RandomGenerator.mobile(),
  } satisfies IShoppingMallOrderShippingAddress.ICreate;

  const orderShippingAddress =
    await api.functional.shoppingMall.customer.orders.shippingAddress.create(
      connection,
      {
        orderCode,
        body: orderShippingAddressBody,
      },
    );
  typia.assert<IShoppingMallOrderShippingAddress>(orderShippingAddress);

  // 5. Admin creates multiple shipments with varying statuses
  await api.functional.auth.admin.login(connection, {
    body: adminLoginBody,
  });

  // Get the first order item and its SKU id safely
  const firstOrderItem = order.items[0];
  typia.assert<IShoppingMallOrderItem>(firstOrderItem);
  const safeOrderItemId = firstOrderItem.id;
  const safeSkuId = firstOrderItem.sku.id;

  const shipmentBodyA = {
    // orderCode omitted because path already scopes the order
    shippingAddressId: orderShippingAddress.id,
    shippingMethodId: shippingMethod.id,
    shippingStatus: "pending",
    carrierName: null,
    trackingNumber: null,
    expectedShipDate: new Date().toISOString(),
    shipmentItems: [
      {
        shopping_mall_order_item_id: safeOrderItemId,
        shopping_mall_sku_id: safeSkuId,
        quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
      },
    ],
  } satisfies IShoppingMallShipment.ICreate;

  const shipmentA =
    await api.functional.shoppingMall.admin.orders.shipments.create(
      connection,
      {
        orderCode,
        body: shipmentBodyA,
      },
    );
  typia.assert<IShoppingMallShipment>(shipmentA);

  const shipmentBodyB = {
    shippingAddressId: orderShippingAddress.id,
    shippingMethodId: shippingMethod.id,
    shippingStatus: "shipped",
    carrierName: "CarrierX",
    trackingNumber: RandomGenerator.alphaNumeric(12),
    expectedShipDate: new Date().toISOString(),
    shipmentItems: [
      {
        shopping_mall_order_item_id: safeOrderItemId,
        shopping_mall_sku_id: safeSkuId,
        quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
      },
    ],
  } satisfies IShoppingMallShipment.ICreate;

  const shipmentB =
    await api.functional.shoppingMall.admin.orders.shipments.create(
      connection,
      {
        orderCode,
        body: shipmentBodyB,
      },
    );
  typia.assert<IShoppingMallShipment>(shipmentB);

  const shipmentBodyC = {
    shippingAddressId: orderShippingAddress.id,
    shippingMethodId: shippingMethod.id,
    shippingStatus: "delivered",
    carrierName: "CarrierX",
    trackingNumber: RandomGenerator.alphaNumeric(12),
    expectedShipDate: new Date().toISOString(),
    shipmentItems: [
      {
        shopping_mall_order_item_id: safeOrderItemId,
        shopping_mall_sku_id: safeSkuId,
        quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
      },
    ],
  } satisfies IShoppingMallShipment.ICreate;

  const shipmentC =
    await api.functional.shoppingMall.admin.orders.shipments.create(
      connection,
      {
        orderCode,
        body: shipmentBodyC,
      },
    );
  typia.assert<IShoppingMallShipment>(shipmentC);

  // 6. Shipment index tests: filter by statuses and pagination
  const filterBodyAll = {
    page: 1 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
    sort_by: "created_at",
    sort_direction: "asc" as const,
    shipment_code: undefined,
    shipping_statuses: ["shipped", "delivered"],
    carrier_name: undefined,
    tracking_number: undefined,
    created_from: undefined,
    created_to: undefined,
    shipped_from: undefined,
    shipped_to: undefined,
    delivered_from: undefined,
    delivered_to: undefined,
  } satisfies IShoppingMallShipment.IRequest;

  const pageAll =
    await api.functional.shoppingMall.admin.orders.shipments.index(connection, {
      orderCode,
      body: filterBodyAll,
    });
  typia.assert<IPageIShoppingMallShipment.ISummary>(pageAll);

  TestValidator.equals(
    "filtered shipments records should be 2",
    pageAll.pagination.records,
    2 as number & tags.Type<"int32"> & tags.Minimum<0>,
  );
  TestValidator.equals(
    "filtered shipments current page",
    pageAll.pagination.current,
    1 as number & tags.Type<"int32"> & tags.Minimum<0>,
  );
  TestValidator.equals(
    "filtered shipments pagination limit",
    pageAll.pagination.limit,
    10 as number & tags.Type<"int32"> & tags.Minimum<0>,
  );
  TestValidator.equals(
    "filtered shipments total pages",
    pageAll.pagination.pages,
    1 as number & tags.Type<"int32"> & tags.Minimum<0>,
  );

  TestValidator.equals(
    "filtered shipments data length should be 2",
    pageAll.data.length,
    2,
  );

  for (const summary of pageAll.data) {
    TestValidator.predicate(
      "shipment status in shipped or delivered",
      summary.shipping_status === "shipped" ||
        summary.shipping_status === "delivered",
    );
  }

  // Pagination with limit = 1
  const filterBodyPage1 = {
    ...filterBodyAll,
    limit: 1 as number & tags.Type<"int32">,
    page: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallShipment.IRequest;

  const page1 = await api.functional.shoppingMall.admin.orders.shipments.index(
    connection,
    {
      orderCode,
      body: filterBodyPage1,
    },
  );
  typia.assert<IPageIShoppingMallShipment.ISummary>(page1);

  TestValidator.equals(
    "page1 records should still be 2",
    page1.pagination.records,
    pageAll.pagination.records,
  );
  TestValidator.equals(
    "page1 pages should be 2",
    page1.pagination.pages,
    2 as number & tags.Type<"int32"> & tags.Minimum<0>,
  );
  TestValidator.equals("page1 data length should be 1", page1.data.length, 1);

  const filterBodyPage2 = {
    ...filterBodyAll,
    limit: 1 as number & tags.Type<"int32">,
    page: 2 as number & tags.Type<"int32">,
  } satisfies IShoppingMallShipment.IRequest;

  const page2 = await api.functional.shoppingMall.admin.orders.shipments.index(
    connection,
    {
      orderCode,
      body: filterBodyPage2,
    },
  );
  typia.assert<IPageIShoppingMallShipment.ISummary>(page2);

  TestValidator.equals("page2 data length should be 1", page2.data.length, 1);

  const allIds = pageAll.data.map((s) => s.id);
  const pagedIds = [...page1.data, ...page2.data].map((s) => s.id);

  TestValidator.equals(
    "paged shipment ids should match all filtered ids",
    pagedIds.sort(),
    allIds.sort(),
  );

  // Filter only delivered
  const filterBodyDelivered = {
    ...filterBodyAll,
    shipping_statuses: ["delivered"],
  } satisfies IShoppingMallShipment.IRequest;

  const pageDelivered =
    await api.functional.shoppingMall.admin.orders.shipments.index(connection, {
      orderCode,
      body: filterBodyDelivered,
    });
  typia.assert<IPageIShoppingMallShipment.ISummary>(pageDelivered);

  TestValidator.equals(
    "delivered filter records should be 1",
    pageDelivered.pagination.records,
    1 as number & tags.Type<"int32"> & tags.Minimum<0>,
  );
  TestValidator.equals(
    "delivered filter data length should be 1",
    pageDelivered.data.length,
    1,
  );
  TestValidator.equals(
    "single shipment status should be delivered",
    pageDelivered.data[0]?.shipping_status,
    "delivered",
  );
}
