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
 * Validate that preorder settings can be created for an existing inventory item
 * and that the configuration in the response reflects the input payload.
 *
 * Business flow:
 *
 * 1. Seller joins the platform and becomes authenticated.
 * 2. Seller creates a product without brand association.
 * 3. Seller creates a SKU under that product.
 * 4. Seller creates an inventory item for the SKU, enabling preorder at the
 *    inventory level.
 * 5. Seller configures preorder settings for the inventory item with a future time
 *    window and quantity cap using POST
 *    /shoppingMall/inventoryItems/{inventoryItemId}/preorderSettings.
 * 6. Test asserts that the preorder settings response mirrors the request and is
 *    tied to the correct inventory item.
 */
export async function test_api_preorder_settings_create_for_existing_inventory_item(
  connection: api.IConnection,
) {
  // 1. Seller joins the platform and becomes authenticated.
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
  typia.assert<IShoppingMallSeller.IAuthorized>(seller);

  // 2. Seller creates a product without brand association.
  const productCode: string = RandomGenerator.alphaNumeric(12);
  const productBody = {
    shopping_mall_seller_id: seller.id,
    shopping_mall_brand_id: null,
    code: productCode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: null,
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert<IShoppingMallProduct>(product);

  // 3. Seller creates a SKU under that product.
  const skuCode: string = RandomGenerator.alphaNumeric(10);
  const listPrice = 10000;
  const salePrice = 9000;
  const skuBody = {
    code: skuCode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    listPrice,
    salePrice,
    currency: "KRW",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode: product.code,
      body: skuBody,
    });
  typia.assert<IShoppingMallProductSku>(sku);

  // 4. Seller creates an inventory item for the SKU, enabling preorder.
  const inventoryBody = {
    product_sku_id: sku.id,
    on_hand_quantity: 50,
    low_stock_threshold: 5,
    backorder_enabled: false,
    preorder_enabled: true,
  } satisfies IShoppingMallInventoryItem.ICreate;

  const inventoryItem: IShoppingMallInventoryItem =
    await api.functional.shoppingMall.seller.inventoryItems.create(connection, {
      body: inventoryBody,
    });
  typia.assert<IShoppingMallInventoryItem>(inventoryItem);

  // 5. Configure preorder settings for the inventory item.
  const now = new Date();
  const startDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // +1 day
  const endDate = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000); // +3 days
  const releaseDate = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000); // +5 days

  const preorderBody = {
    allow_preorder: true,
    preorder_start_at: startDate.toISOString(),
    preorder_end_at: endDate.toISOString(),
    max_preorder_quantity: 30,
    release_date: releaseDate.toISOString(),
  } satisfies IShoppingMallPreorderSettings.ICreate;

  const preorderSettings: IShoppingMallPreorderSettings =
    await api.functional.shoppingMall.inventoryItems.preorderSettings.create(
      connection,
      {
        inventoryItemId: inventoryItem.id,
        body: preorderBody,
      },
    );
  typia.assert<IShoppingMallPreorderSettings>(preorderSettings);

  // 6. Validate that the response mirrors the request and links to the inventory item.
  TestValidator.equals(
    "preorder allow flag should match request",
    preorderSettings.allow_preorder,
    preorderBody.allow_preorder,
  );

  TestValidator.equals(
    "preorder start datetime should match request",
    preorderSettings.preorder_start_at,
    preorderBody.preorder_start_at,
  );

  TestValidator.equals(
    "preorder end datetime should match request",
    preorderSettings.preorder_end_at,
    preorderBody.preorder_end_at,
  );

  TestValidator.equals(
    "max preorder quantity should match request",
    preorderSettings.max_preorder_quantity,
    preorderBody.max_preorder_quantity,
  );

  TestValidator.equals(
    "release date should match request",
    preorderSettings.release_date,
    preorderBody.release_date,
  );

  TestValidator.equals(
    "preorder settings must belong to created inventory item",
    preorderSettings.inventory_item_id,
    inventoryItem.id,
  );
}
