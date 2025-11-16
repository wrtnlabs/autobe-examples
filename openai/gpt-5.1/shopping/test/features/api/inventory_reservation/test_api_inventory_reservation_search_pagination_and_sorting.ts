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

/**
 * Validate pagination and sorting of inventory reservations search for a single
 * inventory item.
 *
 * Business workflow:
 *
 * 1. Platform admin, seller, and customer accounts are created and authenticated
 *    through their respective auth.join endpoints.
 * 2. As seller, create catalog context: brand, product, option type, option value,
 *    SKU.
 * 3. As seller, create an inventory item for the SKU.
 * 4. As customer, create a cart, add the SKU as an item, and create an order from
 *    the cart.
 * 5. As platform admin, create many reservations (e.g., 25) for the inventory item
 *    associated to the same order and order line, each with slightly different
 *    expires_at timestamps.
 * 6. Query reservations via the platformAdmin inventoryItems.reservations.index
 *    endpoint twice for page=1 and page=2 using pageSize=10 and
 *    sortBy="created_at" with sortDirection="desc".
 * 7. Optionally query again with sortDirection="asc" for page=1.
 *
 * Assertions:
 *
 * - Page 1 with descending sort has the latest reservations (by created_at)
 *   first, and its data[] is ordered by created_at non-increasing (descending,
 *   allowing equality).
 * - Page 2 has no overlapping reservation IDs with page 1 and represents the next
 *   chunk of the ordered sequence.
 * - Pagination metadata matches expectations: limit==pageSize, records==total
 *   created reservations, pages==ceil(total/limit).
 * - Ascending sort on page 1 has the earliest created_at first and is ordered by
 *   created_at non-decreasing (ascending, allowing equality).
 */
export async function test_api_inventory_reservation_search_pagination_and_sorting(
  connection: api.IConnection,
) {
  // 1. Create and authenticate platform admin
  const platformAdminEmail = typia.random<string & tags.Format<"email">>();
  const platformAdminJoinBody = {
    email: platformAdminEmail,
    name: RandomGenerator.name(),
    password: "P@ssw0rd!",
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;
  const platformAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  // 2. Create and authenticate seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerJoinBody = {
    email: sellerEmail,
    password: "P@ssw0rd!",
    storeName: RandomGenerator.name(1),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;
  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  // 3. Create and authenticate customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerJoinBody = {
    email: customerEmail,
    password: "P@ssw0rd!",
    name: RandomGenerator.name(1),
    ip: null,
    href: "https://shop.example.com/join",
    referrer: "https://shop.example.com/",
  } satisfies IShoppingMallCustomerAuth.IJoin;
  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  // 4. As seller, create a brand
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: "P@ssw0rd!",
      ip: null,
      href: "https://seller.example.com/login",
      referrer: "https://seller.example.com/",
    } satisfies IShoppingMallSellerLogin.IRequest,
  });

  const brandBody = {
    name: RandomGenerator.name(1),
    slug: RandomGenerator.alphaNumeric(12),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    logo_uri: "https://cdn.example.com/brand/logo.png",
  } satisfies IShoppingMallBrand.ICreate;
  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert(brand);

  // 5. As seller, create product
  const productCode = RandomGenerator.alphaNumeric(12);
  const productBody = {
    shopping_mall_seller_id: sellerAuthorized.id,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: RandomGenerator.paragraph({ sentences: 3 }),
    short_description: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: "https://cdn.example.com/product/primary.jpg",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert(product);

  // 6. Create option type and value
  const optionTypeBody = {
    name: "Color",
    display_name: "Color",
    display_order: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
  } satisfies IShoppingMallProductOptionType.ICreate;
  const optionType: IShoppingMallProductOptionType =
    await api.functional.shoppingMall.seller.products.optionTypes.create(
      connection,
      {
        productCode,
        body: optionTypeBody,
      },
    );
  typia.assert(optionType);

  const optionValueBody = {
    value: "red",
    display_name: "Red",
    display_order: 0 as number & tags.Type<"int32">,
    is_active: true,
  } satisfies IShoppingMallProductOptionValue.ICreate;
  const optionValue: IShoppingMallProductOptionValue =
    await api.functional.shoppingMall.seller.products.optionTypes.values.create(
      connection,
      {
        productCode,
        productOptionTypeId: optionType.id,
        body: optionValueBody,
      },
    );
  typia.assert(optionValue);

  // 7. Create SKU
  const skuCode = RandomGenerator.alphaNumeric(10);
  const skuBody = {
    code: skuCode,
    name: `${product.name} - Red`,
    listPrice: 10000,
    salePrice: 9000,
    currency: "KRW",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;
  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode,
      body: skuBody,
    });
  typia.assert(sku);

  // 8. Create inventory item for SKU
  const inventoryItemBody = {
    product_sku_id: sku.id,
    on_hand_quantity: 100 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 5 as number & tags.Type<"int32"> & tags.Minimum<0>,
    backorder_enabled: false,
    preorder_enabled: false,
  } satisfies IShoppingMallInventoryItem.ICreate;
  const inventoryItem: IShoppingMallInventoryItem =
    await api.functional.shoppingMall.seller.inventoryItems.create(connection, {
      body: inventoryItemBody,
    });
  typia.assert(inventoryItem);

  // 9. As customer, create cart and add item
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail,
      password: "P@ssw0rd!",
      ip: null,
      href: "https://shop.example.com/login",
      referrer: "https://shop.example.com/",
      userAgent: "jest-e2e-client",
    } satisfies IShoppingMallCustomerAuth.ILogin,
  });

  const cartBody = {
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
        body: cartBody,
      },
    );
  typia.assert(cart);

  const cartItemBody = {
    skuId: sku.id,
    quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    note: "reservation test line",
  } satisfies IShoppingMallCustomerCartItem.ICreate;
  const cartItem: IShoppingMallCustomerCartItem =
    await api.functional.shoppingMall.customer.customerCarts.items.create(
      connection,
      {
        customerCartId: cart.id,
        body: cartItemBody,
      },
    );
  typia.assert(cartItem);

  // 10. Create order from cart (use synthetic monetary/address values to satisfy schema)
  const orderBody = {
    customer_cart_id: cart.id,
    currency_code: cart.currency_code,
    items_subtotal_amount: 9000,
    discount_total_amount: 0,
    shipping_total_amount: 0,
    tax_total_amount: 0,
    grand_total_amount: 9000,
    shipping_address_id: typia.random<string & tags.Format<"uuid">>(),
    billing_address_id: typia.random<string & tags.Format<"uuid">>(),
    customer_note: "reservation test order",
  } satisfies IShoppingMallOrder.ICreate;
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderBody,
    });
  typia.assert(order);

  // The detailed order response type does not expose order lines directly,
  // so use a synthetic order_line_id just to satisfy the reservation ICreate
  const orderLineId = typia.random<string & tags.Format<"uuid">>();

  // 11. As platform admin, create many reservations for this inventory item
  await api.functional.auth.platformAdmin.login(connection, {
    body: {
      email: platformAdminEmail,
      password: "P@ssw0rd!",
      ip: null,
      href: "https://admin.example.com/login",
      referrer: "https://admin.example.com/",
    } satisfies IShoppingMallPlatformAdminLogin.IRequest,
  });

  const totalReservations = 25 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const createdReservations: IShoppingMallInventoryReservation[] = [];
  const now = new Date();

  for (let i = 0; i < totalReservations; i++) {
    const expiresOffsetMs = (i + 1) * 60_000;
    const expiresAt = new Date(now.getTime() + expiresOffsetMs).toISOString();

    const reservationBody = {
      inventory_item_id: inventoryItem.id,
      order_id: order.id,
      order_line_id: orderLineId,
      reserved_quantity: 1 as number & tags.Type<"int32">,
      reservation_state: "active",
      expires_at: expiresAt,
      consumed_at: null,
      cancelled_at: null,
    } satisfies IShoppingMallInventoryReservation.ICreate;

    const reservation: IShoppingMallInventoryReservation =
      await api.functional.shoppingMall.platformAdmin.inventoryItems.reservations.create(
        connection,
        {
          inventoryItemId: inventoryItem.id,
          body: reservationBody,
        },
      );
    typia.assert(reservation);
    createdReservations.push(reservation);
  }

  // 12. Query reservations page 1 and 2 with descending sort by created_at
  const pageSize = 10 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const requestDescPage1 = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    pageSize,
    status: undefined,
    orderId: order.id,
    orderLineId: orderLineId,
    createdFrom: undefined,
    createdTo: undefined,
    expiresFrom: undefined,
    expiresTo: undefined,
    sortBy: "created_at",
    sortDirection: "desc" as const,
  } satisfies IShoppingMallInventoryReservation.IRequest;

  const resultDescPage1: IPageIShoppingMallInventoryReservation.ISummary =
    await api.functional.shoppingMall.platformAdmin.inventoryItems.reservations.index(
      connection,
      {
        inventoryItemId: inventoryItem.id,
        body: requestDescPage1,
      },
    );
  typia.assert(resultDescPage1);

  const requestDescPage2 = {
    page: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
    pageSize,
    status: undefined,
    orderId: order.id,
    orderLineId: orderLineId,
    createdFrom: undefined,
    createdTo: undefined,
    expiresFrom: undefined,
    expiresTo: undefined,
    sortBy: "created_at",
    sortDirection: "desc" as const,
  } satisfies IShoppingMallInventoryReservation.IRequest;

  const resultDescPage2: IPageIShoppingMallInventoryReservation.ISummary =
    await api.functional.shoppingMall.platformAdmin.inventoryItems.reservations.index(
      connection,
      {
        inventoryItemId: inventoryItem.id,
        body: requestDescPage2,
      },
    );
  typia.assert(resultDescPage2);

  // Verify pagination metadata
  const expectedPages = Math.ceil(createdReservations.length / pageSize);
  TestValidator.equals(
    "page 1 pagination limit equals pageSize",
    resultDescPage1.pagination.limit,
    pageSize,
  );
  TestValidator.equals(
    "page 1 pagination records equals total created reservations",
    resultDescPage1.pagination.records,
    createdReservations.length,
  );
  TestValidator.equals(
    "page 1 pagination pages equals ceil(total/limit)",
    resultDescPage1.pagination.pages,
    expectedPages,
  );

  // current is zero-based page index in IPage.IPagination
  TestValidator.equals(
    "page 1 current index should be 0",
    resultDescPage1.pagination.current,
    0,
  );
  TestValidator.equals(
    "page 2 current index should be 1",
    resultDescPage2.pagination.current,
    1,
  );

  // Verify page 1, page 2 sizes and that IDs do not overlap
  const page1Ids = resultDescPage1.data.map((r) => r.id);
  const page2Ids = resultDescPage2.data.map((r) => r.id);

  TestValidator.equals(
    "page 1 should contain at most pageSize items",
    resultDescPage1.data.length,
    Math.min(pageSize, createdReservations.length),
  );
  TestValidator.equals(
    "page 2 should contain at most pageSize items",
    resultDescPage2.data.length,
    Math.min(pageSize, Math.max(createdReservations.length - pageSize, 0)),
  );

  const overlappingIds = page1Ids.filter((id) => page2Ids.includes(id));
  TestValidator.equals(
    "page 1 and page 2 should have disjoint IDs",
    overlappingIds.length,
    0,
  );

  // Verify descending created_at ordering (non-increasing) for page 1 and page 2
  const isNonIncreasing = (
    list: IShoppingMallInventoryReservation.ISummary[],
  ): boolean => {
    for (let i = 1; i < list.length; i++) {
      if (list[i - 1].created_at < list[i].created_at) return false;
    }
    return true;
  };

  TestValidator.predicate(
    "page 1 data is ordered by created_at desc (non-increasing)",
    () => isNonIncreasing(resultDescPage1.data),
  );
  TestValidator.predicate(
    "page 2 data is ordered by created_at desc (non-increasing)",
    () => isNonIncreasing(resultDescPage2.data),
  );

  // Combine page 1 and 2 result IDs and ensure they are subset of createdReservations IDs
  const combinedIds = [...page1Ids, ...page2Ids];
  const createdIds = createdReservations.map((r) => r.id);

  const unknownIds = combinedIds.filter((id) => !createdIds.includes(id));
  TestValidator.equals(
    "combined page IDs should all be from created reservations",
    unknownIds.length,
    0,
  );

  // 13. Ascending sort on page 1
  const requestAscPage1 = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    pageSize,
    status: undefined,
    orderId: order.id,
    orderLineId: orderLineId,
    createdFrom: undefined,
    createdTo: undefined,
    expiresFrom: undefined,
    expiresTo: undefined,
    sortBy: "created_at",
    sortDirection: "asc" as const,
  } satisfies IShoppingMallInventoryReservation.IRequest;

  const resultAscPage1: IPageIShoppingMallInventoryReservation.ISummary =
    await api.functional.shoppingMall.platformAdmin.inventoryItems.reservations.index(
      connection,
      {
        inventoryItemId: inventoryItem.id,
        body: requestAscPage1,
      },
    );
  typia.assert(resultAscPage1);

  const isNonDecreasing = (
    list: IShoppingMallInventoryReservation.ISummary[],
  ): boolean => {
    for (let i = 1; i < list.length; i++) {
      if (list[i - 1].created_at > list[i].created_at) return false;
    }
    return true;
  };

  TestValidator.predicate(
    "page 1 data is ordered by created_at asc (non-decreasing)",
    () => isNonDecreasing(resultAscPage1.data),
  );

  // Compare earliest element from asc page 1 and latest element from desc page 1
  if (resultAscPage1.data.length > 0 && resultDescPage1.data.length > 0) {
    const ascFirst = resultAscPage1.data[0];
    const descFirst = resultDescPage1.data[0];
    TestValidator.predicate(
      "earliest created_at from asc page 1 should be <= latest created_at from desc page 1",
      () => ascFirst.created_at <= descFirst.created_at,
    );
  }
}
