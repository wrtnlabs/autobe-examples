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

/**
 * Validate not-found behaviors of inventory movement detail reads.
 *
 * Business goal: Ensure that GET
 * /shoppingMall/inventoryItems/{inventoryItemId}/movements/{movementId} never
 * leaks or returns an inventory movement when the parent inventory item does
 * not match, when the movement id does not exist, or when the movement has been
 * deleted via the seller API. All not-found conditions must be surfaced as
 * errors (HttpError in the SDK), so callers cannot mistake them for valid
 * movement data.
 *
 * High-level flow:
 *
 * 1. Seller authentication and catalog setup
 *
 *    - Join a seller account via POST /auth/seller/join.
 *    - Create a product via POST /shoppingMall/seller/products.
 *    - Create at least one option type and option value to make SKU creation
 *         realistic (even though inventory does not depend on the options
 *         themselves).
 *    - Create a SKU under the product via POST
 *         /shoppingMall/seller/products/{productCode}/skus.
 *    - Create an inventory item for that SKU via POST
 *         /shoppingMall/seller/inventoryItems.
 *    - Create a single inventory movement associated with that inventory item via
 *         POST
 *         /shoppingMall/seller/inventoryItems/{inventoryItemId}/movements.
 * 2. Not-found case #1: wrong inventoryItemId + correct movementId
 *
 *    - Generate a random UUID that does not correspond to the existing inventory
 *         item.
 *    - Call GET /shoppingMall/inventoryItems/{randomInventoryItemId}/movements/{movementId}
 *         using api.functional.shoppingMall.inventoryItems.movements.at.
 *    - Wrap the call in TestValidator.error with a descriptive title to assert that
 *         the SDK throws (typically an HttpError for 404), and do NOT inspect
 *         status codes or payload structure.
 * 3. Not-found case #2: correct inventoryItemId + non-existing movementId
 *
 *    - Generate a random UUID for movementId that is different from the created
 *         movement id.
 *    - Call the same GET endpoint with the real inventory item id and the random
 *         movementId and assert, again via TestValidator.error, that an error
 *         is thrown (no response body is returned).
 * 4. Not-found case #3: deleted movement
 *
 *    - Delete the originally created movement via DELETE
 *         /shoppingMall/seller/inventoryItems/{inventoryItemId}/movements/{movementId}
 *         using
 *         api.functional.shoppingMall.seller.inventoryItems.movements.erase.
 *    - Re-call the GET endpoint with the original inventoryItemId and movementId and
 *         assert via TestValidator.error that it now behaves as not found,
 *         i.e., throws instead of returning movement data.
 *
 * Validation strategy:
 *
 * - For all successful setup API calls (join, product create, option type and
 *   value create, SKU create, inventory item create, movement create), assert
 *   the response using typia.assert to guarantee runtime type safety.
 * - For not-found scenarios, rely exclusively on TestValidator.error to confirm
 *   that the GET call fails; do not attempt to validate status codes or error
 *   message content, and do not attempt to inspect any returned body.
 * - Never touch connection.headers directly; allow auth.seller.join to manage
 *   Authorization header automatically.
 */
export async function test_api_inventory_movement_detail_not_found_cases(
  connection: api.IConnection,
) {
  // 1. Seller joins the platform
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: joinBody,
    });
  typia.assert(seller);

  // 2. Create a product owned by this seller
  const productBody = {
    shopping_mall_seller_id: seller.id,
    shopping_mall_brand_id: undefined,
    code: RandomGenerator.alphaNumeric(12),
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
      body: productBody,
    });
  typia.assert(product);

  // 3. Create an option type for the product
  const optionTypeBody = {
    name: "Color",
    display_name: "Color",
    display_order: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
  } satisfies IShoppingMallProductOptionType.ICreate;

  const optionType: IShoppingMallProductOptionType =
    await api.functional.shoppingMall.seller.products.optionTypes.create(
      connection,
      {
        productCode: product.code,
        body: optionTypeBody,
      },
    );
  typia.assert(optionType);

  // 4. Create an option value under the option type
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
        productCode: product.code,
        productOptionTypeId: optionType.id,
        body: optionValueBody,
      },
    );
  typia.assert(optionValue);

  // 5. Create a SKU for the product (inventory is tracked per SKU)
  const skuBody = {
    code: RandomGenerator.alphaNumeric(10),
    name: `${product.name} - ${optionValue.display_name ?? optionValue.value}`,
    listPrice: 10000,
    salePrice: 9000,
    currency: "KRW",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode: product.code,
      body: skuBody,
    });
  typia.assert(sku);

  // 6. Create an inventory item for the SKU
  const inventoryItemBody = {
    product_sku_id: sku.id,
    on_hand_quantity: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 2 as
      | (number & tags.Type<"int32"> & tags.Minimum<0>)
      | undefined,
    backorder_enabled: false,
    preorder_enabled: false,
  } satisfies IShoppingMallInventoryItem.ICreate;

  const inventoryItem: IShoppingMallInventoryItem =
    await api.functional.shoppingMall.seller.inventoryItems.create(connection, {
      body: inventoryItemBody,
    });
  typia.assert(inventoryItem);

  // 7. Create a baseline inventory movement on that item
  const movementCreateBody = {
    direction: "increase",
    quantity: 5 as number & tags.Type<"int32"> & tags.Minimum<1>,
    movementType: "manual_adjustment",
    reason: "Initial stock adjustment for test",
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
  typia.assert(movement);

  // Sanity check: the detail endpoint should succeed with correct IDs
  const loadedMovement: IShoppingMallInventoryMovement =
    await api.functional.shoppingMall.inventoryItems.movements.at(connection, {
      inventoryItemId: inventoryItem.id,
      movementId: movement.id,
    });
  typia.assert(loadedMovement);
  TestValidator.equals(
    "loaded movement matches created movement id",
    loadedMovement.id,
    movement.id,
  );

  // 8. Not-found case #1: wrong inventoryItemId + correct movementId
  const randomInventoryItemId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "movement detail should fail when parent inventoryItemId does not match",
    async () => {
      await api.functional.shoppingMall.inventoryItems.movements.at(
        connection,
        {
          inventoryItemId: randomInventoryItemId,
          movementId: movement.id,
        },
      );
    },
  );

  // 9. Not-found case #2: correct inventoryItemId + non-existing movementId
  const randomMovementId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "movement detail should fail when movementId does not exist",
    async () => {
      await api.functional.shoppingMall.inventoryItems.movements.at(
        connection,
        {
          inventoryItemId: inventoryItem.id,
          movementId: randomMovementId,
        },
      );
    },
  );

  // 10. Not-found case #3: deleted movement must not be readable
  await api.functional.shoppingMall.seller.inventoryItems.movements.erase(
    connection,
    {
      inventoryItemId: inventoryItem.id,
      movementId: movement.id,
    },
  );

  await TestValidator.error(
    "movement detail should fail after movement has been deleted",
    async () => {
      await api.functional.shoppingMall.inventoryItems.movements.at(
        connection,
        {
          inventoryItemId: inventoryItem.id,
          movementId: movement.id,
        },
      );
    },
  );
}
