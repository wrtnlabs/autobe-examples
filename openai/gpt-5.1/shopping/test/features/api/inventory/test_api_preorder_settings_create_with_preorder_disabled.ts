import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallInventoryItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryItem";
import type { IShoppingMallPreorderSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPreorderSettings";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";

/**
 * Ensure that preorder settings can explicitly disable preorder for an
 * inventory item.
 *
 * Business objective:
 *
 * - Validate that a seller can create preorder settings for an inventory item
 *   with `allow_preorder = false`, and that the settings record can exist
 *   purely as a configuration switch without requiring any preorder window,
 *   quantity, or release-date fields.
 *
 * End-to-end flow:
 *
 * 1. Register (join) a new seller account and obtain authenticated context.
 * 2. Create a product owned by that seller.
 * 3. Create a SKU under the product.
 * 4. Create an inventory item for the SKU.
 * 5. Call POST /shoppingMall/inventoryItems/{inventoryItemId}/preorderSettings
 *    with:
 *
 *    - Allow_preorder = false
 *    - Preorder_start_at = null
 *    - Preorder_end_at = null
 *    - Max_preorder_quantity = null
 *    - Release_date = null
 * 6. Assert that the operation succeeds and the returned
 *    IShoppingMallPreorderSettings:
 *
 *    - Has allow_preorder set to false
 *    - Has all optional window/quantity/release fields as null
 *    - Is bound to the correct inventory item.
 */
export async function test_api_preorder_settings_create_with_preorder_disabled(
  connection: api.IConnection,
) {
  // 1. Seller joins and becomes authenticated
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    storeName: RandomGenerator.name(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const seller = await api.functional.auth.seller.join(connection, {
    body: joinBody,
  });
  typia.assert<IShoppingMallSeller.IAuthorized>(seller);

  // 2. Create a product owned by this seller
  const productBody = {
    shopping_mall_seller_id: seller.id,
    shopping_mall_brand_id: null,
    code: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: null,
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    { body: productBody },
  );
  typia.assert<IShoppingMallProduct>(product);

  // 3. Create a SKU under the product
  const listPrice: number = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1>
  >();
  const salePrice: number = listPrice; // simple valid price relation

  const skuBody = {
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
    listPrice,
    salePrice,
    currency: "KRW",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const sku = await api.functional.shoppingMall.seller.products.skus.create(
    connection,
    {
      productCode: product.code,
      body: skuBody,
    },
  );
  typia.assert<IShoppingMallProductSku>(sku);

  // 4. Create an inventory item for the SKU
  const inventoryBody = {
    product_sku_id: sku.id,
    on_hand_quantity: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
    backorder_enabled: false,
    preorder_enabled: false,
  } satisfies IShoppingMallInventoryItem.ICreate;

  const inventoryItem =
    await api.functional.shoppingMall.seller.inventoryItems.create(connection, {
      body: inventoryBody,
    });
  typia.assert<IShoppingMallInventoryItem>(inventoryItem);

  // 5. Create preorder settings with preorder explicitly disabled
  const preorderBody = {
    allow_preorder: false,
    preorder_start_at: null,
    preorder_end_at: null,
    max_preorder_quantity: null,
    release_date: null,
  } satisfies IShoppingMallPreorderSettings.ICreate;

  const settings =
    await api.functional.shoppingMall.inventoryItems.preorderSettings.create(
      connection,
      {
        inventoryItemId: inventoryItem.id,
        body: preorderBody,
      },
    );
  typia.assert<IShoppingMallPreorderSettings>(settings);

  // 6. Business assertions: configuration exists and disables preorder
  TestValidator.predicate(
    "preorder is disabled in settings",
    settings.allow_preorder === false,
  );

  TestValidator.equals(
    "inventory_item_id matches source inventory item",
    settings.inventory_item_id,
    inventoryItem.id,
  );

  TestValidator.equals(
    "preorder_start_at is null when preorder disabled",
    settings.preorder_start_at,
    null,
  );

  TestValidator.equals(
    "preorder_end_at is null when preorder disabled",
    settings.preorder_end_at,
    null,
  );

  TestValidator.equals(
    "max_preorder_quantity is null when preorder disabled",
    settings.max_preorder_quantity,
    null,
  );

  TestValidator.equals(
    "release_date is null when preorder disabled",
    settings.release_date,
    null,
  );
}
