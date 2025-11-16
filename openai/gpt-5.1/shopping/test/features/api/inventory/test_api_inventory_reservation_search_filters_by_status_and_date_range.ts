import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallInventoryReservation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallInventoryReservation";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";
import type { IShoppingMallCustomerCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCart";
import type { IShoppingMallCustomerCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCartItem";
import type { IShoppingMallInventoryItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryItem";
import type { IShoppingMallInventoryReservation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryReservation";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderLine } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderLine";
import type { IShoppingMallOrderLineThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderLineThumbnail";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductOptionType } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionType";
import type { IShoppingMallProductOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionValue";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";
import type { IShoppingMallSellerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerLogin";

export async function test_api_inventory_reservation_search_filters_by_status_and_date_range(
  connection: api.IConnection,
) {
  // 1. Create platform admin and authenticate
  const platformAdminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: "127.0.0.1",
    href: "https://admin.test/join",
    referrer: "https://admin.test/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;
  const platformAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  // 2. Create seller and authenticate
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(seller);

  // 3. Create brand as platformAdmin
  const brandCreateBody = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    slug: RandomGenerator.alphaNumeric(12),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    logo_uri: "https://cdn.test/logo.png",
  } satisfies IShoppingMallBrand.ICreate;
  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  // 4. Switch to seller login explicitly
  const sellerLoginBody = {
    email: sellerJoinBody.email,
    password: sellerJoinBody.password,
    ip: "127.0.0.1",
    href: "https://seller.test/login",
    referrer: "https://seller.test/",
  } satisfies IShoppingMallSellerLogin.IRequest;
  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLogin);

  // 5. Create product as seller
  const productCode = RandomGenerator.alphaNumeric(10);
  const productCreateBody = {
    shopping_mall_seller_id: sellerLogin.id,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: "https://cdn.test/product.png",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  // 6. Create option type
  const optionTypeCreateBody = {
    name: "Size",
    display_name: "Size",
    display_order: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
  } satisfies IShoppingMallProductOptionType.ICreate;
  const optionType: IShoppingMallProductOptionType =
    await api.functional.shoppingMall.seller.products.optionTypes.create(
      connection,
      {
        productCode,
        body: optionTypeCreateBody,
      },
    );
  typia.assert(optionType);

  // 7. Create option value
  const optionValueCreateBody = {
    value: "M",
    display_name: "Medium",
    display_order: 0 as number & tags.Type<"int32">,
    is_active: true,
  } satisfies IShoppingMallProductOptionValue.ICreate;
  const optionValue: IShoppingMallProductOptionValue =
    await api.functional.shoppingMall.seller.products.optionTypes.values.create(
      connection,
      {
        productCode,
        productOptionTypeId: optionType.id,
        body: optionValueCreateBody,
      },
    );
  typia.assert(optionValue);

  // 8. Create SKU for the product
  const skuCode = RandomGenerator.alphaNumeric(8);
  const skuCreateBody = {
    code: skuCode,
    name: `${product.name} ${optionValue.display_name ?? optionValue.value}`,
    listPrice: 10000,
    salePrice: 9000,
    currency: "KRW",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;
  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode,
      body: skuCreateBody,
    });
  typia.assert(sku);

  // 9. Create inventory item for SKU
  const inventoryCreateBody = {
    product_sku_id: sku.id,
    on_hand_quantity: 100 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 5 as number & tags.Type<"int32"> & tags.Minimum<0>,
    backorder_enabled: false,
    preorder_enabled: false,
  } satisfies IShoppingMallInventoryItem.ICreate;
  const inventoryItem: IShoppingMallInventoryItem =
    await api.functional.shoppingMall.seller.inventoryItems.create(connection, {
      body: inventoryCreateBody,
    });
  typia.assert(inventoryItem);

  // 10. Create customer and authenticate
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://shop.test/join",
    referrer: "https://shop.test/",
  } satisfies IShoppingMallCustomerAuth.IJoin;
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customer);

  const customerLoginBody = {
    email: customerJoinBody.email,
    password: customerJoinBody.password,
    ip: "127.0.0.1",
    href: "https://shop.test/login",
    referrer: "https://shop.test/",
    userAgent: "E2E-Test-Agent",
  } satisfies IShoppingMallCustomerAuth.ILogin;
  const customerLogin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLogin);

  // 11. Create customer cart
  const cartCreateBody = {
    currency_code: "KRW",
    region_code: "KR",
    channel: "web",
    metadata: { test: "inventory-reservation" },
    is_active: true,
    source_guest_token: undefined,
  } satisfies IShoppingMallCustomerCart.ICreate;
  const cart: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.customerCarts.create(
      connection,
      {
        body: cartCreateBody,
      },
    );
  typia.assert(cart);

  // 12. Add SKU to cart
  const cartItemCreateBody = {
    skuId: sku.id,
    quantity: 3 as number & tags.Type<"int32"> & tags.Minimum<1>,
    note: "Reservation test item",
  } satisfies IShoppingMallCustomerCartItem.ICreate;
  const cartItem: IShoppingMallCustomerCartItem =
    await api.functional.shoppingMall.customer.customerCarts.items.create(
      connection,
      {
        customerCartId: cart.id,
        body: cartItemCreateBody,
      },
    );
  typia.assert(cartItem);

  // 13. Create order from cart
  const orderCreateBody = {
    customer_cart_id: cart.id,
    currency_code: cart.currency_code,
    items_subtotal_amount: cart.subtotal_amount,
    discount_total_amount: cart.discount_amount,
    shipping_total_amount: cart.shipping_amount,
    tax_total_amount: cart.tax_amount,
    grand_total_amount: cart.total_amount,
    shipping_address_id: typia.random<string & tags.Format<"uuid">>(),
    billing_address_id: typia.random<string & tags.Format<"uuid">>(),
    customer_note: "Inventory reservation test order",
  } satisfies IShoppingMallOrder.ICreate;
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateBody,
    });
  typia.assert(order);

  // We do not have order line IDs in IShoppingMallOrder, so use a random UUID
  const orderLineId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 14. Switch back to platform admin for reservation management
  const platformAdminLoginBody = {
    email: platformAdminJoinBody.email,
    password: platformAdminJoinBody.password,
    ip: "127.0.0.1",
    href: "https://admin.test/login",
    referrer: "https://admin.test/",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;
  const platformAdminLogin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLogin);

  // 15. Create three reservations A, B (active) and C (expired) for same inventory item
  const now = new Date();
  const nowIso = now.toISOString();
  const futureFar = new Date(
    now.getTime() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const futureNear = new Date(now.getTime() + 60 * 60 * 1000).toISOString();
  const past = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

  const baseReservationCreate = (
    reservation_state: string,
    expires_at: string | null,
  ): IShoppingMallInventoryReservation.ICreate => ({
    inventory_item_id: inventoryItem.id,
    order_id: order.id,
    order_line_id: orderLineId,
    reserved_quantity: 1 as number & tags.Type<"int32">,
    reservation_state,
    expires_at,
    consumed_at: null,
    cancelled_at: null,
  });

  const reservationA: IShoppingMallInventoryReservation =
    await api.functional.shoppingMall.platformAdmin.inventoryItems.reservations.create(
      connection,
      {
        inventoryItemId: inventoryItem.id,
        body: baseReservationCreate("active", futureFar),
      },
    );
  typia.assert(reservationA);

  const reservationB: IShoppingMallInventoryReservation =
    await api.functional.shoppingMall.platformAdmin.inventoryItems.reservations.create(
      connection,
      {
        inventoryItemId: inventoryItem.id,
        body: baseReservationCreate("active", futureNear),
      },
    );
  typia.assert(reservationB);

  const reservationC: IShoppingMallInventoryReservation =
    await api.functional.shoppingMall.platformAdmin.inventoryItems.reservations.create(
      connection,
      {
        inventoryItemId: inventoryItem.id,
        body: baseReservationCreate("expired", past),
      },
    );
  typia.assert(reservationC);

  // Compute createdAt-based ranges from actual reservations A and B
  const createdTimes = [
    reservationA.created_at,
    reservationB.created_at,
  ].sort();
  const createdFrom = createdTimes[0];
  const createdTo = createdTimes[createdTimes.length - 1];

  const expiresFrom = nowIso;
  const expiresTo = futureFar;

  // 16. First PATCH search: status=active, date filters to include A and B but not C
  const activeSearchBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    pageSize: 50 as number & tags.Type<"int32"> & tags.Minimum<1>,
    status: "active",
    orderId: order.id,
    orderLineId: orderLineId,
    createdFrom,
    createdTo,
    expiresFrom,
    expiresTo,
    sortBy: "created_at",
    sortDirection: "asc" as const,
  } satisfies IShoppingMallInventoryReservation.IRequest;

  const activePage: IPageIShoppingMallInventoryReservation.ISummary =
    await api.functional.shoppingMall.platformAdmin.inventoryItems.reservations.index(
      connection,
      {
        inventoryItemId: inventoryItem.id,
        body: activeSearchBody,
      },
    );
  typia.assert(activePage);

  const activeReservations = activePage.data;

  // Assertions: all returned reservations are active and within date ranges
  TestValidator.predicate(
    "only active reservations are returned",
    activeReservations.every((r) => r.reservation_state === "active"),
  );

  TestValidator.predicate(
    "all reservations have created_at within [createdFrom, createdTo]",
    activeReservations.every(
      (r) =>
        activeSearchBody.createdFrom !== undefined &&
        activeSearchBody.createdTo !== undefined &&
        r.created_at >= activeSearchBody.createdFrom &&
        r.created_at <= activeSearchBody.createdTo,
    ),
  );

  TestValidator.predicate(
    "all reservations have expires_at within [expiresFrom, expiresTo]",
    activeReservations.every((r) => {
      if (!r.expires_at) return false;
      return (
        activeSearchBody.expiresFrom !== undefined &&
        activeSearchBody.expiresTo !== undefined &&
        r.expires_at >= activeSearchBody.expiresFrom &&
        r.expires_at <= activeSearchBody.expiresTo
      );
    }),
  );

  const activeIds = activeReservations.map((r) => r.id);
  TestValidator.predicate(
    "Reservation A is included in active search",
    activeIds.includes(reservationA.id),
  );
  TestValidator.predicate(
    "Reservation B is included in active search",
    activeIds.includes(reservationB.id),
  );
  TestValidator.predicate(
    "Reservation C is not included in active search",
    !activeIds.includes(reservationC.id),
  );

  // 17. Second PATCH search: status=expired to find only C
  const expiredSearchBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    pageSize: 50 as number & tags.Type<"int32"> & tags.Minimum<1>,
    status: "expired",
    orderId: order.id,
    orderLineId: orderLineId,
    createdFrom: reservationC.created_at,
    createdTo: reservationC.created_at,
    expiresFrom: past,
    expiresTo: nowIso,
    sortBy: "created_at",
    sortDirection: "asc" as const,
  } satisfies IShoppingMallInventoryReservation.IRequest;

  const expiredPage: IPageIShoppingMallInventoryReservation.ISummary =
    await api.functional.shoppingMall.platformAdmin.inventoryItems.reservations.index(
      connection,
      {
        inventoryItemId: inventoryItem.id,
        body: expiredSearchBody,
      },
    );
  typia.assert(expiredPage);

  const expiredReservations = expiredPage.data;

  TestValidator.predicate(
    "only expired reservations are returned",
    expiredReservations.every((r) => r.reservation_state === "expired"),
  );

  const expiredIds = expiredReservations.map((r) => r.id);
  TestValidator.predicate(
    "Reservation C is included in expired search",
    expiredIds.includes(reservationC.id),
  );
  TestValidator.predicate(
    "Reservation A is not included in expired search",
    !expiredIds.includes(reservationA.id),
  );
  TestValidator.predicate(
    "Reservation B is not included in expired search",
    !expiredIds.includes(reservationB.id),
  );
}
