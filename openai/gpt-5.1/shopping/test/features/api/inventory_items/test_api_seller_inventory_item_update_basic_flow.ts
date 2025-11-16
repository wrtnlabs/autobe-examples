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
 * Validate that an authenticated seller can update mutable fields of their own
 * inventory item.
 *
 * Business workflow:
 *
 * 1. Register a new seller to obtain an authenticated seller context.
 * 2. As that seller, create a product they own.
 * 3. Under that product, create a SKU variant.
 * 4. Create an inventory item for that SKU with initial quantities and flags.
 * 5. Update the inventory item via the seller inventoryItems.update endpoint,
 *    changing on_hand_quantity, low_stock_threshold, and toggling
 *    backorder_enabled/preorder_enabled.
 * 6. Assert that immutable fields (id, product_sku_id, created_at) are preserved
 *    and the mutable fields reflect the update payload.
 */
export async function test_api_seller_inventory_item_update_basic_flow(
  connection: api.IConnection,
) {
  // 1. Register a new seller and obtain authenticated context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12),
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAuthorized);

  // 2. Create a product owned by this seller (no brand association)
  const productCreateBody = {
    shopping_mall_seller_id: sellerAuthorized.seller.id,
    // no shopping_mall_brand_id to avoid admin brand dependency
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 }),
    short_description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 3,
      wordMax: 8,
    }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 3,
      wordMax: 8,
    }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: undefined,
    additional_data: undefined,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert<IShoppingMallProduct>(product);

  // 3. Create a SKU under the created product
  const skuCreateBody = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 8 }),
    listPrice: 10000,
    salePrice: 8000,
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

  // 4. Create an inventory item for the SKU
  const initialOnHand = 50 as number;
  const initialThreshold = 10 as number;

  const inventoryCreateBody = {
    product_sku_id: sku.id,
    on_hand_quantity: initialOnHand as number &
      tags.Type<"int32"> &
      tags.Minimum<0>,
    low_stock_threshold: initialThreshold as number &
      tags.Type<"int32"> &
      tags.Minimum<0>,
    backorder_enabled: false,
    preorder_enabled: false,
  } satisfies IShoppingMallInventoryItem.ICreate;

  const inventory: IShoppingMallInventoryItem =
    await api.functional.shoppingMall.seller.inventoryItems.create(connection, {
      body: inventoryCreateBody,
    });
  typia.assert<IShoppingMallInventoryItem>(inventory);

  // 5. Update the inventory item: change quantities and toggle flags
  const updatedOnHand = 30 as number;
  const updatedThreshold = 5 as number;

  const updateBody = {
    on_hand_quantity: updatedOnHand as number &
      tags.Type<"int32"> &
      tags.Minimum<0>,
    low_stock_threshold: updatedThreshold as number &
      tags.Type<"int32"> &
      tags.Minimum<0>,
    backorder_enabled: !inventory.backorder_enabled,
    preorder_enabled: !inventory.preorder_enabled,
  } satisfies IShoppingMallInventoryItem.IUpdate;

  const updated: IShoppingMallInventoryItem =
    await api.functional.shoppingMall.seller.inventoryItems.update(connection, {
      inventoryItemId: inventory.id,
      body: updateBody,
    });
  typia.assert<IShoppingMallInventoryItem>(updated);

  // 6. Business-level assertions
  // Immutable identity fields must remain same
  TestValidator.equals(
    "inventory id should remain unchanged after update",
    updated.id,
    inventory.id,
  );

  TestValidator.equals(
    "product_sku_id should remain unchanged after update",
    updated.product_sku_id,
    inventory.product_sku_id,
  );

  TestValidator.equals(
    "created_at should remain unchanged after update",
    updated.created_at,
    inventory.created_at,
  );

  // Mutable fields should match the update payload
  TestValidator.equals(
    "on_hand_quantity should match updated value",
    updated.on_hand_quantity,
    updateBody.on_hand_quantity,
  );

  TestValidator.equals(
    "low_stock_threshold should match updated value",
    updated.low_stock_threshold,
    updateBody.low_stock_threshold,
  );

  TestValidator.equals(
    "backorder_enabled should match updated toggle value",
    updated.backorder_enabled,
    updateBody.backorder_enabled,
  );

  TestValidator.equals(
    "preorder_enabled should match updated toggle value",
    updated.preorder_enabled,
    updateBody.preorder_enabled,
  );

  // Additional predicate sanity checks
  await TestValidator.predicate(
    "on_hand_quantity must remain non-negative",
    async () => updated.on_hand_quantity >= 0,
  );

  await TestValidator.predicate(
    "low_stock_threshold must be non-negative when defined",
    async () =>
      updated.low_stock_threshold === null ||
      updated.low_stock_threshold === undefined ||
      updated.low_stock_threshold >= 0,
  );
}
