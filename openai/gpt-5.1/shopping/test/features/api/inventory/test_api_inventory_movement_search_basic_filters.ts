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

/**
 * Validate basic filtering of inventory movement history for a given inventory
 * item.
 *
 * This scenario creates a seller, product, SKU, and inventory item, then uses
 * platform admin APIs to create and delete inventory reservations so that
 * movements exist for the item. After movements are generated, it queries PATCH
 * /shoppingMall/inventoryItems/{inventoryItemId}/movements with different
 * filters and asserts that:
 *
 * - All returned movements belong to the target inventory item.
 * - Movement type filters are respected.
 * - Direction filter correctly partitions movements into increases and decreases.
 * - Pagination metadata is reasonable.
 */
export async function test_api_inventory_movement_search_basic_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate seller
  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const sellerJoinBody = {
    email: sellerEmail,
    password: "password-1234",
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAuth);

  // Explicit seller login to ensure headers/token handling is correct
  const sellerLoginBody = {
    email: sellerEmail,
    password: "password-1234",
    ip: null,
    href: "https://example.com/seller/login",
    referrer: "https://example.com/",
  } satisfies IShoppingMallSellerLogin.IRequest;
  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerLogin);

  // 2. Seller creates a product
  const productCode = RandomGenerator.alphaNumeric(12);
  const productBody = {
    shopping_mall_seller_id: sellerAuth.id,
    shopping_mall_brand_id: null,
    code: productCode as string & tags.MinLength<1>,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: false,
    primary_image_uri: null,
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert<IShoppingMallProduct>(product);
  TestValidator.equals(
    "created product code matches request",
    product.code,
    productCode,
  );

  // 3. Seller creates a SKU under the product
  const skuCode = RandomGenerator.alphaNumeric(10);
  const skuBody = {
    code: skuCode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
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
  typia.assert<IShoppingMallProductSku>(sku);
  TestValidator.equals("created sku code matches request", sku.code, skuCode);

  // 4. Seller creates an inventory item for the SKU
  const inventoryCreateBody = {
    product_sku_id: sku.id,
    on_hand_quantity: 100,
    low_stock_threshold: 10,
    backorder_enabled: false,
    preorder_enabled: false,
  } satisfies IShoppingMallInventoryItem.ICreate;

  const inventoryItem: IShoppingMallInventoryItem =
    await api.functional.shoppingMall.seller.inventoryItems.create(connection, {
      body: inventoryCreateBody,
    });
  typia.assert<IShoppingMallInventoryItem>(inventoryItem);

  // 5. Create and authenticate platform admin
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const platformAdminJoinBody = {
    email: adminEmail,
    name: RandomGenerator.name(2),
    password: "password-1234",
    ip: null,
    href: "https://example.com/admin/join",
    referrer: "https://example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdminAuth: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(platformAdminAuth);

  const platformAdminLoginBody = {
    email: adminEmail,
    password: "password-1234",
    ip: null,
    href: "https://example.com/admin/login",
    referrer: "https://example.com/",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const platformAdminLogin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(platformAdminLogin);

  // 6. Platform admin creates two reservations for the inventory item
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 60 * 60 * 1000).toISOString();

  const orderId1: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const orderLineId1: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const reservationCreateBody1 = {
    inventory_item_id: inventoryItem.id,
    order_id: orderId1,
    order_line_id: orderLineId1,
    reserved_quantity: 5,
    reservation_state: "active",
    expires_at: expiresAt,
    consumed_at: null,
    cancelled_at: null,
  } satisfies IShoppingMallInventoryReservation.ICreate;

  const reservation1: IShoppingMallInventoryReservation =
    await api.functional.shoppingMall.platformAdmin.inventoryItems.reservations.create(
      connection,
      {
        inventoryItemId: inventoryItem.id,
        body: reservationCreateBody1,
      },
    );
  typia.assert<IShoppingMallInventoryReservation>(reservation1);

  const orderId2: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const orderLineId2: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const reservationCreateBody2 = {
    inventory_item_id: inventoryItem.id,
    order_id: orderId2,
    order_line_id: orderLineId2,
    reserved_quantity: 3,
    reservation_state: "active",
    expires_at: expiresAt,
    consumed_at: null,
    cancelled_at: null,
  } satisfies IShoppingMallInventoryReservation.ICreate;

  const reservation2: IShoppingMallInventoryReservation =
    await api.functional.shoppingMall.platformAdmin.inventoryItems.reservations.create(
      connection,
      {
        inventoryItemId: inventoryItem.id,
        body: reservationCreateBody2,
      },
    );
  typia.assert<IShoppingMallInventoryReservation>(reservation2);

  // Delete one reservation to generate a release movement
  await api.functional.shoppingMall.platformAdmin.inventoryItems.reservations.erase(
    connection,
    {
      inventoryItemId: inventoryItem.id,
      reservationId: reservation2.id,
    },
  );

  // Short delay window: use fromDate slightly before now to include all movements
  const fromDate = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
  const toDate = new Date(now.getTime() + 5 * 60 * 1000).toISOString();

  // 7. First search: fetch all movements without filters to learn movement types
  const unfilteredPage: IPageIShoppingMallInventoryMovement.ISummary =
    await api.functional.shoppingMall.inventoryItems.movements.index(
      connection,
      {
        inventoryItemId: inventoryItem.id,
        body: {
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 50 as number & tags.Type<"int32"> & tags.Minimum<1>,
          fromDate,
          toDate,
          movementTypes: undefined,
          direction: undefined,
          order_id: undefined,
          order_line_id: undefined,
          reservation_id: undefined,
          sortBy: "created_at",
          sortOrder: "desc",
        } satisfies IShoppingMallInventoryMovement.IRequest,
      },
    );
  typia.assert<IPageIShoppingMallInventoryMovement.ISummary>(unfilteredPage);

  // Expect at least one movement for this inventory item
  TestValidator.predicate(
    "unfiltered movement search returns at least one record for the inventory item",
    unfilteredPage.data.length > 0,
  );

  // Ensure all records are scoped to the inventory item
  for (const movement of unfilteredPage.data) {
    TestValidator.equals(
      "movement inventory_item_id matches created inventory item",
      movement.inventory_item_id,
      inventoryItem.id,
    );
  }

  // Derive a set of movement types present in the unfiltered result
  const movementTypeSet = new Set<string>(
    unfilteredPage.data.map((m) => m.movement_type),
  );
  const movementTypesFilter = Array.from(movementTypeSet);

  // 8. Search with direction = "decrease"
  const decreasePage: IPageIShoppingMallInventoryMovement.ISummary =
    await api.functional.shoppingMall.inventoryItems.movements.index(
      connection,
      {
        inventoryItemId: inventoryItem.id,
        body: {
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
          fromDate,
          toDate,
          movementTypes: movementTypesFilter,
          direction: "decrease",
          order_id: undefined,
          order_line_id: undefined,
          reservation_id: undefined,
          sortBy: "created_at",
          sortOrder: "desc",
        } satisfies IShoppingMallInventoryMovement.IRequest,
      },
    );
  typia.assert<IPageIShoppingMallInventoryMovement.ISummary>(decreasePage);

  // Basic pagination invariants
  TestValidator.predicate(
    "pagination current page index is non-negative",
    decreasePage.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    decreasePage.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    decreasePage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    decreasePage.pagination.pages >= 0,
  );

  // If there are any results, enforce filter invariants
  if (decreasePage.data.length > 0) {
    for (const movement of decreasePage.data) {
      // Scope to the correct inventory item
      TestValidator.equals(
        "decrease page movement inventory_item_id matches",
        movement.inventory_item_id,
        inventoryItem.id,
      );

      // Movement type is in the requested filter set
      TestValidator.predicate(
        "movement_type is in requested movementTypes for decrease page",
        movementTypesFilter.includes(movement.movement_type),
      );

      // Direction = decrease implies at least one negative delta
      TestValidator.predicate(
        "decrease page movement has negative quantity_delta or reserved_delta",
        movement.quantity_delta < 0 || movement.reserved_delta < 0,
      );
    }
  }

  // 9. Search with direction = "increase"
  const increasePage: IPageIShoppingMallInventoryMovement.ISummary =
    await api.functional.shoppingMall.inventoryItems.movements.index(
      connection,
      {
        inventoryItemId: inventoryItem.id,
        body: {
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
          fromDate,
          toDate,
          movementTypes: movementTypesFilter,
          direction: "increase",
          order_id: undefined,
          order_line_id: undefined,
          reservation_id: undefined,
          sortBy: "created_at",
          sortOrder: "desc",
        } satisfies IShoppingMallInventoryMovement.IRequest,
      },
    );
  typia.assert<IPageIShoppingMallInventoryMovement.ISummary>(increasePage);

  if (increasePage.data.length > 0) {
    for (const movement of increasePage.data) {
      // Scope to the correct inventory item
      TestValidator.equals(
        "increase page movement inventory_item_id matches",
        movement.inventory_item_id,
        inventoryItem.id,
      );

      // Movement type is in the requested filter set
      TestValidator.predicate(
        "movement_type is in requested movementTypes for increase page",
        movementTypesFilter.includes(movement.movement_type),
      );

      // Direction = increase implies at least one positive delta
      TestValidator.predicate(
        "increase page movement has positive quantity_delta or reserved_delta",
        movement.quantity_delta > 0 || movement.reserved_delta > 0,
      );
    }
  }
}
