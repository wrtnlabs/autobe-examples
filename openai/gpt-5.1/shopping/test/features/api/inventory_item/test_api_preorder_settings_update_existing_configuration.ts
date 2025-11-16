import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallInventoryItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryItem";
import type { IShoppingMallPreorderSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPreorderSetting";
import type { IShoppingMallPreorderSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPreorderSettings";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";

/**
 * Validate updating existing preorder settings for a seller inventory item.
 *
 * Business flow:
 *
 * 1. Register a new seller (join) and obtain authenticated context.
 * 2. Create a product for that seller.
 * 3. Create a SKU under the product.
 * 4. Create an inventory item for the SKU.
 * 5. Create initial preorder settings for the inventory item.
 * 6. Update preorder settings via the seller PUT endpoint, changing window,
 *    quantity, and release date.
 * 7. Assert the PUT response reflects updated configuration and still references
 *    the same inventory item.
 * 8. Perform a negative test updating a non-existent inventory item id and assert
 *    it fails.
 */
export async function test_api_preorder_settings_update_existing_configuration(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register/join seller
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    storeName: RandomGenerator.name(),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: joinBody,
    });
  typia.assert(seller);

  // 2. Create product for this seller
  const productCode = `PRD-${RandomGenerator.alphaNumeric(8)}`;
  const productBody = {
    shopping_mall_seller_id: seller.id,
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

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert(product);

  // 3. Create SKU under product
  const skuCode = `SKU-${RandomGenerator.alphaNumeric(8)}`;
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
      productCode: product.code,
      body: skuBody,
    });
  typia.assert(sku);

  // 4. Create inventory item for SKU
  const inventoryBody = {
    product_sku_id: sku.id,
    on_hand_quantity: 100 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
    backorder_enabled: false,
    preorder_enabled: true,
  } satisfies IShoppingMallInventoryItem.ICreate;

  const inventoryItem: IShoppingMallInventoryItem =
    await api.functional.shoppingMall.seller.inventoryItems.create(connection, {
      body: inventoryBody,
    });
  typia.assert(inventoryItem);

  // 5. Initial preorder settings via platform-level endpoint
  const now = new Date();
  const twoWeeksLater = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  const oneMonthLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const initialPreorderBody = {
    allow_preorder: true,
    preorder_start_at: now.toISOString(),
    preorder_end_at: twoWeeksLater.toISOString(),
    max_preorder_quantity: 100 as number & tags.Type<"int32"> & tags.Minimum<1>,
    release_date: oneMonthLater.toISOString(),
  } satisfies IShoppingMallPreorderSettings.ICreate;

  const initialSettings: IShoppingMallPreorderSettings =
    await api.functional.shoppingMall.inventoryItems.preorderSettings.create(
      connection,
      {
        inventoryItemId: inventoryItem.id,
        body: initialPreorderBody,
      },
    );
  typia.assert(initialSettings);

  TestValidator.equals(
    "initial settings should target correct inventory item",
    initialSettings.inventory_item_id,
    inventoryItem.id,
  );

  // 6. Update preorder settings via seller endpoint (shorter window, lower quantity, new release date)
  const updatedStart = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  const updatedEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const updatedRelease = new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000);

  const updateBody = {
    allow_preorder: true,
    preorder_start_at: updatedStart.toISOString(),
    preorder_end_at: updatedEnd.toISOString(),
    max_preorder_quantity: 50 as number & tags.Type<"int32">,
    release_date: updatedRelease.toISOString(),
  } satisfies IShoppingMallPreorderSetting.IUpdate;

  const updated: IShoppingMallPreorderSetting =
    await api.functional.shoppingMall.seller.inventoryItems.preorderSettings.update(
      connection,
      {
        inventoryItemId: inventoryItem.id,
        body: updateBody,
      },
    );
  typia.assert(updated);

  // 7. Assert updated fields and linkage
  TestValidator.equals(
    "updated settings should still reference same inventory item",
    updated.inventory_item_id,
    inventoryItem.id,
  );

  TestValidator.equals(
    "allow_preorder should be updated value",
    updated.allow_preorder,
    updateBody.allow_preorder,
  );

  TestValidator.equals(
    "preorder_start_at should match updated value",
    updated.preorder_start_at,
    updateBody.preorder_start_at,
  );

  TestValidator.equals(
    "preorder_end_at should match updated value",
    updated.preorder_end_at,
    updateBody.preorder_end_at,
  );

  TestValidator.equals(
    "max_preorder_quantity should match updated value",
    updated.max_preorder_quantity,
    updateBody.max_preorder_quantity,
  );

  TestValidator.equals(
    "release_date should match updated value",
    updated.release_date,
    updateBody.release_date,
  );

  // 8. Negative test: updating non-existent inventory item should fail
  const nonExistingInventoryId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "updating non-existent inventory item should fail",
    async () => {
      await api.functional.shoppingMall.seller.inventoryItems.preorderSettings.update(
        connection,
        {
          inventoryItemId: nonExistingInventoryId,
          body: updateBody,
        },
      );
    },
  );
}
