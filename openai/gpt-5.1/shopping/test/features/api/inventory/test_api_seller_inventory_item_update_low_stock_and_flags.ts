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
 * Validate updating a seller inventory item into a low-stock, backorder-enabled
 * configuration.
 *
 * Business flow:
 *
 * 1. Register a seller so that subsequent catalog and inventory APIs operate under
 *    an authenticated seller context.
 * 2. Create a product for that seller using a unique product code; omit brand to
 *    honor the “brand optional or null” requirement.
 * 3. Create a SKU under that product with realistic pricing and active/purchasable
 *    flags.
 * 4. Create an inventory item for the SKU with modest stock (e.g., 10 units),
 *    low_stock_threshold around 5, and both backorder_enabled and
 *    preorder_enabled initially false.
 * 5. Update that inventory item to:
 *
 *    - Reduce on_hand_quantity to sit close to the low_stock_threshold (e.g., 5).
 *    - Lower low_stock_threshold (e.g., 2).
 *    - Enable backorders (backorder_enabled=true) while keeping
 *         preorder_enabled=false.
 * 6. Verify that the returned inventory item reflects the new quantities and
 *    flags, and that stock_status is a non-empty string.
 *
 * Technical constraints:
 *
 * - Use only provided SDK functions and DTO types.
 * - All request bodies must use `satisfies` with the correct DTO type.
 * - Every API call must be awaited, and every non-void response must be validated
 *   with typia.assert.
 * - Do not perform type-error or HTTP-status-code-focused tests; focus on
 *   happy-path business behavior.
 */
export async function test_api_seller_inventory_item_update_low_stock_and_flags(
  connection: api.IConnection,
) {
  // 1. Register a seller (join) to obtain authenticated seller context.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: joinBody,
    });
  typia.assert(sellerAuthorized);

  // 2. Create a product for this seller.
  const productCode = RandomGenerator.alphaNumeric(12);

  const productCreateBody = {
    shopping_mall_seller_id: sellerAuthorized.id,
    shopping_mall_brand_id: undefined,
    code: productCode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    short_description: null,
    description: RandomGenerator.paragraph({ sentences: 5 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: null,
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  TestValidator.equals(
    "product seller id should match authorized seller id",
    product.seller.id,
    sellerAuthorized.id,
  );
  TestValidator.equals(
    "product code should match requested code",
    product.code,
    productCode,
  );

  // 3. Create a SKU under that product.
  const skuCreateBody = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.paragraph({ sentences: 2 }),
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
  typia.assert(sku);

  TestValidator.equals(
    "SKU product code should match parent product code",
    sku.productCode,
    product.code,
  );

  // 4. Create an inventory item for the SKU with modest stock and flags disabled.
  const initialOnHand = 10;
  const initialThreshold = 5;

  const inventoryCreateBody = {
    product_sku_id: sku.id,
    on_hand_quantity: initialOnHand,
    low_stock_threshold: initialThreshold,
    backorder_enabled: false,
    preorder_enabled: false,
  } satisfies IShoppingMallInventoryItem.ICreate;

  const createdInventory: IShoppingMallInventoryItem =
    await api.functional.shoppingMall.seller.inventoryItems.create(connection, {
      body: inventoryCreateBody,
    });
  typia.assert(createdInventory);

  TestValidator.equals(
    "created inventory item should reference the SKU id",
    createdInventory.product_sku_id,
    sku.id,
  );
  TestValidator.equals(
    "created inventory on_hand_quantity should match initial value",
    createdInventory.on_hand_quantity,
    initialOnHand,
  );
  TestValidator.equals(
    "created inventory low_stock_threshold should match initial threshold",
    createdInventory.low_stock_threshold,
    initialThreshold,
  );
  TestValidator.equals(
    "created inventory backorder_enabled should be false",
    createdInventory.backorder_enabled,
    false,
  );
  TestValidator.equals(
    "created inventory preorder_enabled should be false",
    createdInventory.preorder_enabled,
    false,
  );

  // 5. Update the inventory item to low-stock and enable backorders.
  const updatedOnHand = 5;
  const updatedThreshold = 2;

  const inventoryUpdateBody = {
    on_hand_quantity: updatedOnHand,
    low_stock_threshold: updatedThreshold,
    backorder_enabled: true,
    preorder_enabled: false,
  } satisfies IShoppingMallInventoryItem.IUpdate;

  const updatedInventory: IShoppingMallInventoryItem =
    await api.functional.shoppingMall.seller.inventoryItems.update(connection, {
      inventoryItemId: createdInventory.id,
      body: inventoryUpdateBody,
    });
  typia.assert(updatedInventory);

  // 6. Validate updated fields and basic stock_status behavior.
  TestValidator.equals(
    "updated inventory id should remain the same as created inventory id",
    updatedInventory.id,
    createdInventory.id,
  );
  TestValidator.equals(
    "updated inventory on_hand_quantity should match updated value",
    updatedInventory.on_hand_quantity,
    updatedOnHand,
  );
  TestValidator.equals(
    "updated inventory low_stock_threshold should match updated threshold",
    updatedInventory.low_stock_threshold,
    updatedThreshold,
  );
  TestValidator.equals(
    "updated inventory backorder_enabled should be true",
    updatedInventory.backorder_enabled,
    true,
  );
  TestValidator.equals(
    "updated inventory preorder_enabled should remain false",
    updatedInventory.preorder_enabled,
    false,
  );

  TestValidator.predicate(
    "stock_status should be a non-empty string after update",
    updatedInventory.stock_status.length > 0,
  );
}
