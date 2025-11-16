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

export async function test_api_inventory_reservation_search_by_platform_admin_with_active_reservations(
  connection: api.IConnection,
) {
  // 1. Register platform admin (also authenticates via Authorization header side effect)
  const platformAdminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  // 2. Register seller (becomes current authenticated actor)
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    storeName: RandomGenerator.name(1),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(seller);

  // 3. Switch back to platform admin explicitly and create brand
  const platformAdminLoginBody = {
    email: platformAdminJoinBody.email,
    password: platformAdminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const platformAdminLogin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLogin);

  const brandCreateBody = {
    name: RandomGenerator.name(1),
    slug: RandomGenerator.alphaNumeric(8),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    logo_uri: "https://cdn.example.com/logo.png",
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  // 4. Switch to seller again to create product
  const sellerLoginBody = {
    email: sellerJoinBody.email,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/",
  } satisfies IShoppingMallSellerLogin.IRequest;

  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLogin);

  const productCode: string = RandomGenerator.alphaNumeric(12);

  const productCreateBody = {
    shopping_mall_seller_id: sellerLogin.id,
    shopping_mall_brand_id: brand.id,
    code: productCode as string & tags.MinLength<1>,
    name: RandomGenerator.name(2) as string & tags.MinLength<1>,
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: true,
    primary_image_uri: "https://cdn.example.com/product.png",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  // 5. Create product option type
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

  // 6. Create one option value under that type
  const optionValueCreateBody = {
    value: "L",
    display_name: "Large",
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

  // 7. Create SKU under the product
  const skuCreateBody = {
    code: RandomGenerator.alphaNumeric(10),
    name: `${product.name} - ${optionValue.display_name ?? optionValue.value}`,
    listPrice: 50000,
    salePrice: 45000,
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

  // 8. Create inventory item for that SKU
  const inventoryCreateBody = {
    product_sku_id: sku.id,
    on_hand_quantity: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 1 as number & tags.Type<"int32"> & tags.Minimum<0>,
    backorder_enabled: false,
    preorder_enabled: false,
  } satisfies IShoppingMallInventoryItem.ICreate;

  const inventoryItem: IShoppingMallInventoryItem =
    await api.functional.shoppingMall.seller.inventoryItems.create(connection, {
      body: inventoryCreateBody,
    });
  typia.assert(inventoryItem);

  // 9. Register customer
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    ip: null,
    href: "https://shop.example.com/join",
    referrer: "https://shop.example.com/",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customer);

  // 10. Create customer cart
  const cartCreateBody = {
    currency_code: "KRW",
    region_code: "KR-Seoul",
    channel: "web",
    metadata: undefined,
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

  // 11. Add cart item for SKU
  const reservedQuantity = 2 as number & tags.Type<"int32"> & tags.Minimum<1>;

  const cartItemCreateBody = {
    skuId: sku.id,
    quantity: reservedQuantity,
    note: "test reservation",
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

  // 12. Create order from that cart
  const itemsSubtotal = 90000;
  const discountTotal = 0;
  const shippingTotal = 3000;
  const taxTotal = 0;
  const grandTotal = itemsSubtotal - discountTotal + shippingTotal + taxTotal;

  const shippingAddressId = typia.random<string & tags.Format<"uuid">>();
  const billingAddressId = typia.random<string & tags.Format<"uuid">>();

  const orderCreateBody = {
    customer_cart_id: cart.id,
    currency_code: cart.currency_code,
    items_subtotal_amount: itemsSubtotal,
    discount_total_amount: discountTotal,
    shipping_total_amount: shippingTotal,
    tax_total_amount: taxTotal,
    grand_total_amount: grandTotal,
    shipping_address_id: shippingAddressId,
    billing_address_id: billingAddressId,
    customer_note: "Please handle with care.",
  } satisfies IShoppingMallOrder.ICreate;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateBody,
    });
  typia.assert(order);

  // 13. Ensure platform admin context again (login)
  const platformAdminRelogin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminRelogin);

  // 14. Create inventory reservation for that inventory item & order
  const reservationState = "active";
  const now = new Date();
  const expiresDate = RandomGenerator.date(now, 1000 * 60 * 60 * 24); // within 1 day
  const expiresAt = expiresDate.toISOString();

  const reservationCreateBody = {
    inventory_item_id: inventoryItem.id,
    order_id: order.id,
    order_line_id: order.id,
    reserved_quantity: reservedQuantity,
    reservation_state: reservationState,
    expires_at: expiresAt,
    consumed_at: null,
    cancelled_at: null,
  } satisfies IShoppingMallInventoryReservation.ICreate;

  const reservation: IShoppingMallInventoryReservation =
    await api.functional.shoppingMall.platformAdmin.inventoryItems.reservations.create(
      connection,
      {
        inventoryItemId: inventoryItem.id,
        body: reservationCreateBody,
      },
    );
  typia.assert(reservation);

  // 15. Search reservations for that inventory item with filters
  const expiresFrom = new Date(now.getTime() - 1000 * 60 * 5).toISOString();

  const requestFilter = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    pageSize: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    status: reservationState,
    orderId: order.id,
    orderLineId: undefined,
    createdFrom: undefined,
    createdTo: undefined,
    expiresFrom,
    expiresTo: undefined,
    sortBy: "created_at",
    sortDirection: "desc" as const,
  } satisfies IShoppingMallInventoryReservation.IRequest;

  const page: IPageIShoppingMallInventoryReservation.ISummary =
    await api.functional.shoppingMall.platformAdmin.inventoryItems.reservations.index(
      connection,
      {
        inventoryItemId: inventoryItem.id,
        body: requestFilter,
      },
    );
  typia.assert(page);

  const pagination: IPage.IPagination = page.pagination;
  typia.assert(pagination);

  TestValidator.predicate(
    "pagination records should be at least 1",
    pagination.records >= 1,
  );
  TestValidator.predicate(
    "pagination pages should be at least 1",
    pagination.pages >= 1,
  );
  TestValidator.predicate(
    "data length should be at least 1",
    page.data.length >= 1,
  );

  // Find matching reservation summary
  const matched = page.data.find((summary) => summary.id === reservation.id);
  TestValidator.predicate(
    "at least one reservation summary should match created reservation id",
    matched !== undefined,
  );

  if (matched !== undefined) {
    TestValidator.equals(
      "matched summary reserved_quantity equals created reserved_quantity",
      matched.reserved_quantity,
      reservation.reserved_quantity,
    );
    TestValidator.equals(
      "matched summary reservation_state equals created reservation_state",
      matched.reservation_state,
      reservation.reservation_state,
    );
    TestValidator.equals(
      "matched summary inventory_item_id equals inventoryItem.id",
      matched.inventory_item_id,
      inventoryItem.id,
    );

    TestValidator.predicate(
      "matched summary has expires_at defined",
      matched.expires_at !== undefined,
    );

    if (matched.expires_at !== undefined) {
      const expiresAtMs = Date.parse(matched.expires_at);
      const expiresFromMs = Date.parse(expiresFrom);
      TestValidator.predicate(
        "matched summary expires_at should be on or after expiresFrom",
        !Number.isNaN(expiresAtMs) &&
          !Number.isNaN(expiresFromMs) &&
          expiresAtMs >= expiresFromMs,
      );
    }

    if (matched.order !== undefined) {
      TestValidator.equals(
        "matched summary order.id equals filter order.id",
        matched.order.id,
        order.id,
      );
    }
  }

  // Ensure all summaries are scoped correctly to inventoryItem and order filter
  for (const summary of page.data) {
    TestValidator.equals(
      "every summary inventory_item_id equals inventoryItem.id",
      summary.inventory_item_id,
      inventoryItem.id,
    );

    if (summary.order !== undefined) {
      TestValidator.equals(
        "every summary order.id equals filter order.id",
        summary.order.id,
        order.id,
      );
    }
  }
}
