import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallInventoryItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryItem";
import type { IShoppingMallPreorderSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPreorderSetting";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";

/**
 * Validate that PUT preorderSettings acts as an upsert and can create settings
 * when absent.
 *
 * Business context: A seller manages catalog inventory at the per-SKU level,
 * and each inventory item may have an optional preorder configuration stored in
 * shopping_mall_preorder_settings. The PUT
 * /shoppingMall/seller/inventoryItems/{inventoryItemId}/preorderSettings
 * endpoint is designed as an upsert: if the inventory item has no preorder
 * settings yet, PUT should create them, otherwise it should replace the
 * existing configuration.
 *
 * This test verifies the "create when absent" behavior and the replacement
 * semantics on subsequent PUTs.
 *
 * Steps:
 *
 * 1. Join as a new seller to obtain an authenticated seller session.
 * 2. Create a product owned by that seller.
 * 3. Create a SKU for the product.
 * 4. Create an inventory item for that SKU.
 * 5. Call PUT preorderSettings for that inventory item without any prior preorder
 *    settings to ensure it can create them.
 * 6. Call PUT again with changed values to verify replacement semantics.
 */
export async function test_api_preorder_settings_put_create_when_absent(
  connection: api.IConnection,
) {
  // 1. Join as a new seller (auth.seller.join) to obtain authenticated context
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

  // 2. Create a product owned by this seller
  const productCode = RandomGenerator.alphaNumeric(10);
  const productCreateBody = {
    shopping_mall_seller_id: sellerAuthorized.id,
    shopping_mall_brand_id: undefined,
    code: productCode,
    name: RandomGenerator.paragraph({ sentences: 3 }),
    short_description: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
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
  typia.assert(product);
  TestValidator.equals(
    "created product code matches input",
    product.code,
    productCode,
  );
  TestValidator.equals(
    "product seller id matches authorized seller",
    product.seller.id,
    sellerAuthorized.id,
  );

  // 3. Create a SKU for the product
  const skuCreateBody = {
    code: RandomGenerator.alphaNumeric(8),
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
      body: skuCreateBody,
    });
  typia.assert(sku);
  TestValidator.equals(
    "sku productCode matches product.code",
    sku.productCode,
    product.code,
  );

  // 4. Create an inventory item for the SKU
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
  typia.assert(inventoryItem);
  TestValidator.equals(
    "inventory item is linked to the created SKU",
    inventoryItem.product_sku_id,
    sku.id,
  );

  // Helper to build future ISO timestamps
  const now = new Date();
  const oneDayMs = 24 * 60 * 60 * 1000;
  const preorderStart = new Date(now.getTime() + oneDayMs).toISOString();
  const preorderEnd = new Date(now.getTime() + 3 * oneDayMs).toISOString();
  const releaseDate = new Date(now.getTime() + 7 * oneDayMs).toISOString();

  // 5. First PUT: create preorder settings when none exist yet
  const firstUpdateBody = {
    allow_preorder: true,
    preorder_start_at: preorderStart,
    preorder_end_at: preorderEnd,
    max_preorder_quantity: 50,
    release_date: releaseDate,
  } satisfies IShoppingMallPreorderSetting.IUpdate;

  const createdSettings: IShoppingMallPreorderSetting =
    await api.functional.shoppingMall.seller.inventoryItems.preorderSettings.update(
      connection,
      {
        inventoryItemId: inventoryItem.id,
        body: firstUpdateBody,
      },
    );
  typia.assert(createdSettings);

  TestValidator.equals(
    "preorder settings inventory_item_id matches inventory item",
    createdSettings.inventory_item_id,
    inventoryItem.id,
  );
  TestValidator.equals(
    "allow_preorder flag persisted from first PUT",
    createdSettings.allow_preorder,
    firstUpdateBody.allow_preorder,
  );
  TestValidator.equals(
    "preorder_start_at persisted from first PUT",
    createdSettings.preorder_start_at,
    firstUpdateBody.preorder_start_at,
  );
  TestValidator.equals(
    "preorder_end_at persisted from first PUT",
    createdSettings.preorder_end_at,
    firstUpdateBody.preorder_end_at,
  );
  TestValidator.equals(
    "max_preorder_quantity persisted from first PUT",
    createdSettings.max_preorder_quantity,
    firstUpdateBody.max_preorder_quantity,
  );
  TestValidator.equals(
    "release_date persisted from first PUT",
    createdSettings.release_date,
    firstUpdateBody.release_date,
  );

  // 6. Second PUT: overwrite configuration with new values (idempotent replace semantics)
  const preorderStart2 = new Date(now.getTime() + 2 * oneDayMs).toISOString();
  const preorderEnd2 = new Date(now.getTime() + 5 * oneDayMs).toISOString();
  const releaseDate2 = new Date(now.getTime() + 10 * oneDayMs).toISOString();

  const secondUpdateBody = {
    allow_preorder: true,
    preorder_start_at: preorderStart2,
    preorder_end_at: preorderEnd2,
    max_preorder_quantity: 100,
    release_date: releaseDate2,
  } satisfies IShoppingMallPreorderSetting.IUpdate;

  const updatedSettings: IShoppingMallPreorderSetting =
    await api.functional.shoppingMall.seller.inventoryItems.preorderSettings.update(
      connection,
      {
        inventoryItemId: inventoryItem.id,
        body: secondUpdateBody,
      },
    );
  typia.assert(updatedSettings);

  TestValidator.equals(
    "updated settings inventory_item_id still matches inventory item",
    updatedSettings.inventory_item_id,
    inventoryItem.id,
  );
  TestValidator.equals(
    "allow_preorder flag persisted from second PUT",
    updatedSettings.allow_preorder,
    secondUpdateBody.allow_preorder,
  );
  TestValidator.equals(
    "preorder_start_at updated on second PUT",
    updatedSettings.preorder_start_at,
    secondUpdateBody.preorder_start_at,
  );
  TestValidator.equals(
    "preorder_end_at updated on second PUT",
    updatedSettings.preorder_end_at,
    secondUpdateBody.preorder_end_at,
  );
  TestValidator.equals(
    "max_preorder_quantity updated on second PUT",
    updatedSettings.max_preorder_quantity,
    secondUpdateBody.max_preorder_quantity,
  );
  TestValidator.equals(
    "release_date updated on second PUT",
    updatedSettings.release_date,
    secondUpdateBody.release_date,
  );
}
