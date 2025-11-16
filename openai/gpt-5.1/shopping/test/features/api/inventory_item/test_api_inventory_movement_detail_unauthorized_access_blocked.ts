import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallInventoryItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryItem";
import type { IShoppingMallInventoryMovement } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryMovement";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductOptionType } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionType";
import type { IShoppingMallProductOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionValue";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";

export async function test_api_inventory_movement_detail_unauthorized_access_blocked(
  connection: api.IConnection,
) {
  // 1. Primary seller joins the platform and becomes authenticated as a seller actor.
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const primarySeller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(primarySeller);

  // 2. Create a product owned by the primary seller.
  const productCode = RandomGenerator.alphaNumeric(12);
  const productCreateBody = {
    shopping_mall_seller_id: primarySeller.id,
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

  // 3. Create a single option type for the product (e.g., Size).
  const optionTypeCreateBody = {
    name: "Size",
    display_name: "Size",
    display_order: 0,
  } satisfies IShoppingMallProductOptionType.ICreate;

  const optionType: IShoppingMallProductOptionType =
    await api.functional.shoppingMall.seller.products.optionTypes.create(
      connection,
      {
        productCode: product.code,
        body: optionTypeCreateBody,
      },
    );
  typia.assert(optionType);

  // 4. Create a single option value under that option type (e.g., "M").
  const optionValueCreateBody = {
    value: "M",
    display_name: "Medium",
    display_order: 0,
    is_active: true,
  } satisfies IShoppingMallProductOptionValue.ICreate;

  const optionValue: IShoppingMallProductOptionValue =
    await api.functional.shoppingMall.seller.products.optionTypes.values.create(
      connection,
      {
        productCode: product.code,
        productOptionTypeId: optionType.id,
        body: optionValueCreateBody,
      },
    );
  typia.assert(optionValue);

  // 5. Create a SKU under the product.
  const skuCode = RandomGenerator.alphaNumeric(10);
  const skuCreateBody = {
    code: skuCode,
    name: `${product.name} / ${optionValue.value}`,
    listPrice: 10000,
    salePrice: 9000,
    currency: "KRW",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode: product.code,
      body: skuCreateBody,
    });
  typia.assert(sku);

  // 6. Create an inventory item for that SKU as the primary seller.
  const inventoryCreateBody = {
    product_sku_id: sku.id,
    on_hand_quantity: 10,
    low_stock_threshold: 2,
    backorder_enabled: false,
    preorder_enabled: false,
  } satisfies IShoppingMallInventoryItem.ICreate;

  const inventoryItem: IShoppingMallInventoryItem =
    await api.functional.shoppingMall.seller.inventoryItems.create(connection, {
      body: inventoryCreateBody,
    });
  typia.assert(inventoryItem);

  // 7. Create a simple inbound inventory movement (restock) for that item.
  const movementCreateBody = {
    direction: "increase",
    quantity: 5,
    movementType: "manual_adjustment",
    reason: "initial stock adjustment",
    order_id: undefined,
    order_line_id: undefined,
    reservation_id: undefined,
  } satisfies IShoppingMallInventoryMovement.ICreate;

  const createdMovement: IShoppingMallInventoryMovement =
    await api.functional.shoppingMall.seller.inventoryItems.movements.create(
      connection,
      {
        inventoryItemId: inventoryItem.id,
        body: movementCreateBody,
      },
    );
  typia.assert(createdMovement);

  // Happy-path: the owning seller can fetch the movement detail via the
  // non-seller-scoped inventory movement detail endpoint.
  const movementDetailAsOwner: IShoppingMallInventoryMovement =
    await api.functional.shoppingMall.inventoryItems.movements.at(connection, {
      inventoryItemId: inventoryItem.id,
      movementId: createdMovement.id,
    });
  typia.assert(movementDetailAsOwner);

  TestValidator.equals(
    "owner can read its own inventory movement detail",
    movementDetailAsOwner.id,
    createdMovement.id,
  );
  TestValidator.equals(
    "owner detail is scoped to the same inventory item",
    movementDetailAsOwner.inventory_item_id,
    inventoryItem.id,
  );

  // 8. Simulated connection that exercises the same detail endpoint without
  // relying on real network authorization.
  const simulatedConnection: api.IConnection = {
    host: connection.host,
    headers: {},
    simulate: true,
  };

  const simulatedMovementDetail: IShoppingMallInventoryMovement =
    await api.functional.shoppingMall.inventoryItems.movements.at(
      simulatedConnection,
      {
        inventoryItemId: inventoryItem.id,
        movementId: createdMovement.id,
      },
    );
  typia.assert(simulatedMovementDetail);

  TestValidator.equals(
    "simulated detail call returns a movement scoped to the same inventory item",
    simulatedMovementDetail.inventory_item_id,
    inventoryItem.id,
  );

  // 9. Join a second seller; ensure this does not affect the identity of the
  // already-created movement.
  const secondSellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const secondSeller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: secondSellerJoinBody,
    });
  typia.assert(secondSeller);

  TestValidator.predicate(
    "second seller join does not change existing movement identity",
    createdMovement.id === movementDetailAsOwner.id,
  );
}
