import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallInventoryItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";

/**
 * Ensure inventory item detail reflects seller updates.
 *
 * Business goal
 *
 * - Verify that the public inventory detail endpoint GET
 *   /shoppingMall/inventoryItems/{inventoryItemId} always returns the latest
 *   persisted state after a seller updates an inventory item via the seller
 *   inventory update endpoint.
 *
 * High level flow
 *
 * 1. Register a seller (join) so we have an authenticated seller context.
 * 2. Create a product for that seller.
 * 3. Create a SKU for that product.
 * 4. Create an inventory item for that SKU with some initial quantity and
 *    configuration flags.
 * 5. Capture the created inventory item as the baseline state.
 * 6. Update that inventory item with new quantitative values and toggled flags.
 * 7. Read the inventory item detail through the public inventoryItems.at endpoint.
 * 8. Assert that detail matches the updated values and that immutable properties
 *    are unchanged.
 *
 * What we specifically validate
 *
 * - Identity invariants:
 *
 *   - Id from GET equals id from create and from update.
 *   - Product_sku_id from GET equals product_sku_id from create.
 * - Quantitative fields:
 *
 *   - On_hand_quantity in GET equals the new value provided in update.
 *   - Reserved_quantity is left to backend rules; we only assert it is a
 *       non-negative int32 (typia.assert covers this structurally).
 * - Configuration flags:
 *
 *   - Backorder_enabled and preorder_enabled in GET reflect the latest
 *       configuration the seller sent in update.
 *   - When we deliberately omit low_stock_threshold in update, we assert it remains
 *       equal to the original value from create.
 * - Timestamps:
 *
 *   - Created_at remains the same between create and GET.
 *   - Updated_at in the item returned from update is different from the original
 *       created_at/updated_at if business logic updates timestamps.
 *   - Updated_at from GET is equal to or later than the updated_at from the update
 *       response (in practice, usually equal).
 *
 * DTO usage
 *
 * - Seller join: IShoppingMallSellerJoin.IRequest ->
 *   api.functional.auth.seller.join -> IShoppingMallSeller.IAuthorized.
 * - Product create: IShoppingMallProduct.ICreate ->
 *   api.functional.shoppingMall.seller.products.create ->
 *   IShoppingMallProduct.
 * - SKU create: IShoppingMallProductSku.ICreate ->
 *   api.functional.shoppingMall.seller.products.skus.create ->
 *   IShoppingMallProductSku.
 * - Inventory create: IShoppingMallInventoryItem.ICreate ->
 *   api.functional.shoppingMall.seller.inventoryItems.create ->
 *   IShoppingMallInventoryItem.
 * - Inventory update: IShoppingMallInventoryItem.IUpdate ->
 *   api.functional.shoppingMall.seller.inventoryItems.update ->
 *   IShoppingMallInventoryItem.
 * - Inventory detail: api.functional.shoppingMall.inventoryItems.at ->
 *   IShoppingMallInventoryItem.
 */
export async function test_api_inventory_item_detail_reflects_updates(
  connection: api.IConnection,
) {
  // 1. Register a new seller (join) for authenticated seller context.
  const joinBody = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAuthorized);

  // 2. Create a product for that seller.
  const productCode: string = RandomGenerator.alphaNumeric(12);

  const productCreateBody = {
    shopping_mall_seller_id: sellerAuthorized.id,
    shopping_mall_brand_id: undefined,
    code: productCode as string & tags.MinLength<1>,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: true,
    primary_image_uri: undefined,
    additional_data: undefined,
  } satisfies IShoppingMallProduct.ICreate;

  const createdProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert<IShoppingMallProduct>(createdProduct);

  // 3. Create a SKU under that product.
  const skuCode: string = RandomGenerator.alphaNumeric(10);
  const skuCreateBody = {
    code: skuCode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    listPrice: 10000,
    salePrice: 9000,
    currency: "KRW",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const createdSku: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode: createdProduct.code,
      body: skuCreateBody,
    });
  typia.assert<IShoppingMallProductSku>(createdSku);

  // 4. Create an inventory item for that SKU.
  const initialOnHand: number & tags.Type<"int32"> & tags.Minimum<0> =
    50 as number & tags.Type<"int32"> & tags.Minimum<0>;

  const initialLowStock: number & tags.Type<"int32"> & tags.Minimum<0> =
    10 as number & tags.Type<"int32"> & tags.Minimum<0>;

  const inventoryCreateBody = {
    product_sku_id: createdSku.id as string & tags.Format<"uuid">,
    on_hand_quantity: initialOnHand,
    low_stock_threshold: initialLowStock,
    backorder_enabled: false,
    preorder_enabled: false,
  } satisfies IShoppingMallInventoryItem.ICreate;

  const createdInventory: IShoppingMallInventoryItem =
    await api.functional.shoppingMall.seller.inventoryItems.create(connection, {
      body: inventoryCreateBody,
    });
  typia.assert<IShoppingMallInventoryItem>(createdInventory);

  // Basic invariants on create
  TestValidator.equals(
    "created inventory sku linkage matches SKU id",
    createdInventory.product_sku_id,
    createdSku.id,
  );

  // 5. Capture baseline fields.
  const originalId: string & tags.Format<"uuid"> = createdInventory.id;
  const originalSkuId: string & tags.Format<"uuid"> =
    createdInventory.product_sku_id;
  const originalOnHand: number & tags.Type<"int32"> =
    createdInventory.on_hand_quantity;
  const originalLowStock = createdInventory.low_stock_threshold;
  const originalBackorderEnabled: boolean = createdInventory.backorder_enabled;
  const originalPreorderEnabled: boolean = createdInventory.preorder_enabled;
  const originalCreatedAt: string & tags.Format<"date-time"> =
    createdInventory.created_at;
  const originalUpdatedAt: string & tags.Format<"date-time"> =
    createdInventory.updated_at;

  // 6. Update inventory with new values.
  const updatedOnHand: number & tags.Type<"int32"> & tags.Minimum<0> =
    (initialOnHand + 20) as number & tags.Type<"int32"> & tags.Minimum<0>;

  const updatedBackorderEnabled: boolean = !originalBackorderEnabled;
  const updatedPreorderEnabled: boolean = !originalPreorderEnabled;

  const inventoryUpdateBody = {
    on_hand_quantity: updatedOnHand,
    // Omit low_stock_threshold on purpose to ensure it remains unchanged.
    backorder_enabled: updatedBackorderEnabled,
    preorder_enabled: updatedPreorderEnabled,
  } satisfies IShoppingMallInventoryItem.IUpdate;

  const updatedInventory: IShoppingMallInventoryItem =
    await api.functional.shoppingMall.seller.inventoryItems.update(connection, {
      inventoryItemId: originalId,
      body: inventoryUpdateBody,
    });
  typia.assert<IShoppingMallInventoryItem>(updatedInventory);

  // Validate update response invariants.
  TestValidator.equals(
    "updated inventory id remains the same as created",
    updatedInventory.id,
    originalId,
  );
  TestValidator.equals(
    "updated inventory product_sku_id remains the same as created",
    updatedInventory.product_sku_id,
    originalSkuId,
  );
  TestValidator.equals(
    "updated inventory on_hand_quantity matches requested updated value",
    updatedInventory.on_hand_quantity,
    updatedOnHand,
  );
  TestValidator.equals(
    "updated inventory backorder_enabled matches requested flag",
    updatedInventory.backorder_enabled,
    updatedBackorderEnabled,
  );
  TestValidator.equals(
    "updated inventory preorder_enabled matches requested flag",
    updatedInventory.preorder_enabled,
    updatedPreorderEnabled,
  );

  // We expect updated_at to move forward compared to original, but at least
  // to differ, as a basic sanity check.
  TestValidator.notEquals(
    "updated_at after update should differ from original updated_at",
    updatedInventory.updated_at,
    originalUpdatedAt,
  );

  // 7. Read inventory detail from public inventoryItems.at endpoint.
  const fetchedInventory: IShoppingMallInventoryItem =
    await api.functional.shoppingMall.inventoryItems.at(connection, {
      inventoryItemId: originalId,
    });
  typia.assert<IShoppingMallInventoryItem>(fetchedInventory);

  // 8. Validate identity invariants on GET.
  TestValidator.equals(
    "fetched inventory id equals original id",
    fetchedInventory.id,
    originalId,
  );
  TestValidator.equals(
    "fetched inventory product_sku_id equals original sku id",
    fetchedInventory.product_sku_id,
    originalSkuId,
  );

  // Quantitative field should reflect latest value.
  TestValidator.equals(
    "fetched inventory on_hand_quantity equals updated value",
    fetchedInventory.on_hand_quantity,
    updatedOnHand,
  );

  // low_stock_threshold should not have changed because we did not send it in update.
  TestValidator.equals(
    "fetched inventory low_stock_threshold remains original when not updated",
    fetchedInventory.low_stock_threshold,
    originalLowStock,
  );

  // Configuration flags should reflect updates.
  TestValidator.equals(
    "fetched inventory backorder_enabled reflects updated flag",
    fetchedInventory.backorder_enabled,
    updatedBackorderEnabled,
  );
  TestValidator.equals(
    "fetched inventory preorder_enabled reflects updated flag",
    fetchedInventory.preorder_enabled,
    updatedPreorderEnabled,
  );

  // Timestamp behavior: created_at unchanged, updated_at aligned with or after
  // update call.
  TestValidator.equals(
    "fetched inventory created_at equals original created_at",
    fetchedInventory.created_at,
    originalCreatedAt,
  );
  TestValidator.equals(
    "fetched inventory updated_at equals latest updated_at from update response (or at least not original)",
    fetchedInventory.updated_at,
    updatedInventory.updated_at,
  );

  // Finally, ensure stock_status is a non-empty string and consistent between
  // update response and GET response.
  TestValidator.predicate(
    "update response stock_status is non-empty",
    updatedInventory.stock_status.length > 0,
  );
  TestValidator.equals(
    "fetched inventory stock_status equals updated inventory stock_status",
    fetchedInventory.stock_status,
    updatedInventory.stock_status,
  );
}
