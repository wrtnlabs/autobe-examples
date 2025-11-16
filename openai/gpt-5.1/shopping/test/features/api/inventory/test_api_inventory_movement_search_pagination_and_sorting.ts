import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallInventoryMovement } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallInventoryMovement";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";
import type { IShoppingMallCustomerCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCart";
import type { IShoppingMallCustomerCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCartItem";
import type { IShoppingMallInventoryItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryItem";
import type { IShoppingMallInventoryMovement } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryMovement";
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

export async function test_api_inventory_movement_search_pagination_and_sorting(
  connection: api.IConnection,
) {
  // 1. Seller join & product/SKU/inventory setup
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  const productCode = RandomGenerator.alphaNumeric(12);
  const productCreateBody = {
    shopping_mall_seller_id: sellerAuthorized.id,
    shopping_mall_brand_id: undefined,
    code: productCode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: undefined,
    additional_data: undefined,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  const optionTypeCreateBody = {
    name: "Color",
    display_name: "Color",
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

  const optionValueCreateBody = {
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
        body: optionValueCreateBody,
      },
    );
  typia.assert(optionValue);

  const skuCode = `${productCode}-RED`;
  const skuCreateBody = {
    code: skuCode,
    name: "Red Variant",
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

  const inventoryCreateBody = {
    product_sku_id: sku.id,
    on_hand_quantity: 100 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
    backorder_enabled: false,
    preorder_enabled: false,
  } satisfies IShoppingMallInventoryItem.ICreate;

  const inventoryItem: IShoppingMallInventoryItem =
    await api.functional.shoppingMall.seller.inventoryItems.create(connection, {
      body: inventoryCreateBody,
    });
  typia.assert(inventoryItem);

  // 2. Platform admin join & login (actor for reservations and movements)
  const platformAdminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(2),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://platform-admin.join",
    referrer: "https://platform-admin.referrer",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  const platformAdminLoginBody = {
    email: platformAdminAuthorized.email,
    password: platformAdminJoinBody.password,
    ip: null,
    href: "https://platform-admin.login",
    referrer: "https://platform-admin.login-referrer",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const platformAdminLoggedIn: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoggedIn);

  // 3. Generate many inventory movements using reservations create/delete
  const reservationCount = 20;
  const reservationIds: (string & tags.Format<"uuid">)[] = [];

  for (let i = 0; i < reservationCount; ++i) {
    const reservationCreateBody = {
      inventory_item_id: inventoryItem.id,
      order_id: typia.random<string & tags.Format<"uuid">>(),
      order_line_id: typia.random<string & tags.Format<"uuid">>(),
      reserved_quantity: 1 as number & tags.Type<"int32">,
      reservation_state: "active",
      expires_at: null,
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
    reservationIds.push(reservation.id);
  }

  // delete roughly half of them to generate release-type movements
  for (let i = 0; i < reservationIds.length; ++i) {
    if (i % 2 === 0) {
      await api.functional.shoppingMall.platformAdmin.inventoryItems.reservations.erase(
        connection,
        {
          inventoryItemId: inventoryItem.id,
          reservationId: reservationIds[i],
        },
      );
    }
  }

  // 4. Movements search - page 1, sort by created_at desc
  const pageSize = 10 as number & tags.Type<"int32"> & tags.Minimum<1>;

  const firstPageRequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: pageSize,
    fromDate: undefined,
    toDate: undefined,
    movementTypes: undefined,
    direction: undefined,
    order_id: undefined,
    order_line_id: undefined,
    reservation_id: undefined,
    sortBy: "created_at" as const,
    sortOrder: "desc" as const,
  } satisfies IShoppingMallInventoryMovement.IRequest;

  const firstPage: IPageIShoppingMallInventoryMovement.ISummary =
    await api.functional.shoppingMall.inventoryItems.movements.index(
      connection,
      {
        inventoryItemId: inventoryItem.id,
        body: firstPageRequestBody,
      },
    );
  typia.assert(firstPage);

  const firstPagination = firstPage.pagination;
  const firstData = firstPage.data;

  // basic pagination invariants for first page
  TestValidator.equals(
    "first page current index should be 0 for requested page=1",
    firstPagination.current,
    0,
  );
  TestValidator.equals(
    "first page limit should equal requested limit",
    firstPagination.limit,
    pageSize,
  );
  TestValidator.predicate(
    "records should be non-negative and at least data length",
    firstPagination.records >= 0 && firstPagination.records >= firstData.length,
  );
  if (firstPagination.records === 0) {
    TestValidator.equals(
      "pages should be 0 when no records",
      firstPagination.pages,
      0,
    );
  } else {
    const expectedPages = Math.ceil(
      firstPagination.records /
        (firstPagination.limit === 0 ? 1 : firstPagination.limit),
    );
    TestValidator.equals(
      "pages should be ceiling(records/limit)",
      firstPagination.pages,
      expectedPages,
    );
  }

  TestValidator.predicate(
    "first page size must not exceed limit",
    firstData.length <= firstPagination.limit,
  );

  // verify sort order by occurred_at descending (non-increasing)
  for (let i = 0; i + 1 < firstData.length; ++i) {
    const left = firstData[i];
    const right = firstData[i + 1];
    TestValidator.predicate(
      "occurred_at should be non-increasing on first page",
      left.occurred_at >= right.occurred_at,
    );
  }

  const firstIds = firstData.map((m) => m.id);

  // 5. Movements search - page 2, same sort
  const secondPageRequestBody = {
    ...firstPageRequestBody,
    page: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IShoppingMallInventoryMovement.IRequest;

  const secondPage: IPageIShoppingMallInventoryMovement.ISummary =
    await api.functional.shoppingMall.inventoryItems.movements.index(
      connection,
      {
        inventoryItemId: inventoryItem.id,
        body: secondPageRequestBody,
      },
    );
  typia.assert(secondPage);

  const secondPagination = secondPage.pagination;
  const secondData = secondPage.data;

  if (firstPagination.records > firstPagination.limit) {
    TestValidator.equals(
      "second page current index should be 1 when records>limit",
      secondPagination.current,
      1,
    );
  }
  TestValidator.equals(
    "second page limit should equal requested limit",
    secondPagination.limit,
    pageSize,
  );

  TestValidator.predicate(
    "second page size must not exceed limit",
    secondData.length <= secondPagination.limit,
  );

  for (let i = 0; i + 1 < secondData.length; ++i) {
    const left = secondData[i];
    const right = secondData[i + 1];
    TestValidator.predicate(
      "occurred_at should be non-increasing on second page",
      left.occurred_at >= right.occurred_at,
    );
  }

  const secondIds = secondData.map((m) => m.id);

  if (firstPagination.records > firstPagination.limit) {
    // ensure no overlapping ids between first and second pages
    const intersection = firstIds.filter((id) => secondIds.includes(id));
    TestValidator.equals(
      "movement ids between first and second page should be disjoint when records>limit",
      intersection.length,
      0,
    );

    if (firstData.length > 0 && secondData.length > 0) {
      const lastFirst = firstData[firstData.length - 1];
      const firstSecond = secondData[0];
      TestValidator.predicate(
        "second page first occurred_at must not be greater than first page last occurred_at",
        firstSecond.occurred_at <= lastFirst.occurred_at,
      );
    }
  }

  // 6. Movements search - sortBy movement_type asc
  const typeSortRequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: pageSize,
    fromDate: undefined,
    toDate: undefined,
    movementTypes: undefined,
    direction: undefined,
    order_id: undefined,
    order_line_id: undefined,
    reservation_id: undefined,
    sortBy: "movement_type" as const,
    sortOrder: "asc" as const,
  } satisfies IShoppingMallInventoryMovement.IRequest;

  const typeSortedPage: IPageIShoppingMallInventoryMovement.ISummary =
    await api.functional.shoppingMall.inventoryItems.movements.index(
      connection,
      {
        inventoryItemId: inventoryItem.id,
        body: typeSortRequestBody,
      },
    );
  typia.assert(typeSortedPage);

  const typeSortedData = typeSortedPage.data;

  for (let i = 0; i + 1 < typeSortedData.length; ++i) {
    const left = typeSortedData[i];
    const right = typeSortedData[i + 1];
    TestValidator.predicate(
      "movement_type should be non-decreasing when sorted asc",
      left.movement_type <= right.movement_type,
    );
  }
}
