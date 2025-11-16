import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallCategoryTree } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategoryTree";
import type { IShoppingMallInventoryItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryItem";
import type { IShoppingMallInventoryMovement } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryMovement";
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
 * Happy-path test for deleting an inventory movement as a seller.
 *
 * Business goal
 *
 * - Verify that an authenticated seller can create inventory for a SKU, register
 *   an inventory movement, delete that movement using the seller-scoped erase
 *   API, and still perform additional movements afterwards without breaking the
 *   inventory pipeline.
 *
 * Covered steps
 *
 * 1. Register a seller via /auth/seller/join.
 * 2. As that seller, create a product via /shoppingMall/seller/products.
 * 3. Create a product option type (e.g., Size) and a single option value (e.g.,
 *    M).
 * 4. Create a SKU for the product.
 * 5. Create an inventory item for that SKU with a known on_hand_quantity (100).
 * 6. Create a decreasing inventory movement (quantity 10) for that inventory item.
 * 7. Delete that movement via
 *    /shoppingMall/seller/inventoryItems/{inventoryItemId}/movements/{movementId}.
 * 8. Create another movement afterwards to confirm that the inventory item is
 *    still usable and that the API remains consistent.
 *
 * Assertions
 *
 * - All creation endpoints return well-typed DTOs (validated via typia.assert).
 * - The first movement’s resulting_on_hand_quantity is non-negative and does not
 *   exceed the original on_hand_quantity.
 * - The deletion call completes without throwing (happy-path erase).
 * - A subsequent movement creation still succeeds for the same inventory item and
 *   returns a movement with a non-negative resulting_on_hand_quantity.
 */
export async function test_api_inventory_movement_delete_happy_path_for_seller(
  connection: api.IConnection,
) {
  // 1. Seller joins
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
  typia.assert<IShoppingMallSeller.IAuthorized>(seller);

  // 2. Create product owned by this seller
  const productCode: string = RandomGenerator.alphaNumeric(12);
  const productCreateBody = {
    shopping_mall_seller_id: seller.id,
    shopping_mall_brand_id: undefined,
    code: productCode as string & tags.MinLength<1>,
    name: RandomGenerator.name(3) as string & tags.MinLength<1>,
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: true,
    primary_image_uri: undefined,
    additional_data: undefined,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert<IShoppingMallProduct>(product);

  // 3. Create option type for the product
  const optionTypeCreateBody = {
    name: "Size",
    display_name: "Size",
    display_order: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
  } satisfies IShoppingMallProductOptionType.ICreate;

  const optionType: IShoppingMallProductOptionType =
    await api.functional.shoppingMall.seller.products.optionTypes.create(
      connection,
      {
        productCode: product.code,
        body: optionTypeCreateBody,
      },
    );
  typia.assert<IShoppingMallProductOptionType>(optionType);

  // 4. Create option value under this type
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
        productCode: product.code,
        productOptionTypeId: optionType.id,
        body: optionValueCreateBody,
      },
    );
  typia.assert<IShoppingMallProductOptionValue>(optionValue);

  // 5. Create SKU for the product
  const skuCode: string = `${product.code}-M`;
  const skuCreateBody = {
    code: skuCode,
    name: `${product.name} / ${optionValue.display_name ?? optionValue.value}`,
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
  typia.assert<IShoppingMallProductSku>(sku);

  // 6. Create inventory item for the SKU
  const initialOnHand: number & tags.Type<"int32"> & tags.Minimum<0> =
    100 as number & tags.Type<"int32"> & tags.Minimum<0>;

  const inventoryCreateBody = {
    product_sku_id: sku.id,
    on_hand_quantity: initialOnHand,
    low_stock_threshold: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
    backorder_enabled: false,
    preorder_enabled: false,
  } satisfies IShoppingMallInventoryItem.ICreate;

  const inventoryItem: IShoppingMallInventoryItem =
    await api.functional.shoppingMall.seller.inventoryItems.create(connection, {
      body: inventoryCreateBody,
    });
  typia.assert<IShoppingMallInventoryItem>(inventoryItem);

  TestValidator.predicate(
    "initial on_hand_quantity should match requested and be non-negative",
    inventoryItem.on_hand_quantity >= 0 &&
      inventoryItem.on_hand_quantity === initialOnHand,
  );

  // 7. Create a decreasing inventory movement
  const decreaseQuantity: number & tags.Type<"int32"> & tags.Minimum<1> =
    10 as number & tags.Type<"int32"> & tags.Minimum<1>;

  const movementCreateBody = {
    direction: "decrease",
    quantity: decreaseQuantity,
    movementType: "manual_adjustment",
    reason: "Test decrease movement before delete",
    order_id: null,
    order_line_id: null,
    reservation_id: null,
  } satisfies IShoppingMallInventoryMovement.ICreate;

  const movement: IShoppingMallInventoryMovement =
    await api.functional.shoppingMall.seller.inventoryItems.movements.create(
      connection,
      {
        inventoryItemId: inventoryItem.id,
        body: movementCreateBody,
      },
    );
  typia.assert<IShoppingMallInventoryMovement>(movement);

  TestValidator.predicate(
    "first movement resulting_on_hand_quantity should be non-negative and not exceed initial on-hand",
    movement.resulting_on_hand_quantity >= 0 &&
      movement.resulting_on_hand_quantity <= inventoryItem.on_hand_quantity,
  );

  // 8. Delete the created movement
  await api.functional.shoppingMall.seller.inventoryItems.movements.erase(
    connection,
    {
      inventoryItemId: inventoryItem.id,
      movementId: movement.id,
    },
  );

  // 9. Create another movement after deletion to ensure inventory is still usable
  const secondMovementQuantity: number & tags.Type<"int32"> & tags.Minimum<1> =
    5 as number & tags.Type<"int32"> & tags.Minimum<1>;

  const secondMovementCreateBody = {
    direction: "decrease",
    quantity: secondMovementQuantity,
    movementType: "manual_adjustment",
    reason: "Test decrease movement after delete",
    order_id: null,
    order_line_id: null,
    reservation_id: null,
  } satisfies IShoppingMallInventoryMovement.ICreate;

  const secondMovement: IShoppingMallInventoryMovement =
    await api.functional.shoppingMall.seller.inventoryItems.movements.create(
      connection,
      {
        inventoryItemId: inventoryItem.id,
        body: secondMovementCreateBody,
      },
    );
  typia.assert<IShoppingMallInventoryMovement>(secondMovement);

  TestValidator.predicate(
    "second movement resulting_on_hand_quantity should be non-negative",
    secondMovement.resulting_on_hand_quantity >= 0,
  );
}
