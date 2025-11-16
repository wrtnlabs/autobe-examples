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
 * Verify that a seller can disable preorder for an inventory item while keeping
 * the preorder configuration record, by calling the seller-facing PUT endpoint
 * and clearing all preorder window and quantity fields.
 *
 * Business workflow:
 *
 * 1. Register a new seller account (POST /auth/seller/join) to obtain an
 *    authenticated seller context.
 * 2. Create a product for that seller (POST /shoppingMall/seller/products).
 * 3. Create a SKU under the product (POST
 *    /shoppingMall/seller/products/{productCode}/skus).
 * 4. Create an inventory item for the SKU with preorder_enabled=true (POST
 *    /shoppingMall/seller/inventoryItems).
 * 5. Create preorder settings for the inventory item with allow_preorder=true and
 *    non-null window/quantity fields (POST
 *    /shoppingMall/inventoryItems/{inventoryItemId}/preorderSettings).
 * 6. Disable preorder via PUT
 *    /shoppingMall/seller/inventoryItems/{inventoryItemId}/preorderSettings by
 *    sending allow_preorder=false and explicitly nulling window/quantity
 *    fields.
 * 7. Validate that the response reflects allow_preorder=false and that all
 *    optional configuration fields are null, and that inventory_item_id matches
 *    the created inventory item.
 */
export async function test_api_preorder_settings_put_disable_preorder_for_item(
  connection: api.IConnection,
) {
  // 1. Join as seller and establish authenticated context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12),
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(seller);

  // 2. Create product for this seller
  const productCode: string = RandomGenerator.alphaNumeric(12);
  const productCreateBody = {
    shopping_mall_seller_id: seller.id,
    shopping_mall_brand_id: undefined,
    code: productCode as string & tags.MinLength<1>,
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 10 }),
    short_description: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 3,
      wordMax: 10,
    }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 3,
      wordMax: 10,
    }),
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

  TestValidator.equals(
    "created product code should match request",
    product.code,
    productCode,
  );

  // 3. Create SKU under this product
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

  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode: product.code,
      body: skuCreateBody,
    });
  typia.assert<IShoppingMallProductSku>(sku);

  TestValidator.equals(
    "created sku code should match request",
    sku.code,
    skuCode,
  );
  TestValidator.equals(
    "sku productCode should match parent product code",
    sku.productCode,
    product.code,
  );

  // 4. Create inventory item for this SKU with preorder_enabled=true
  const inventoryCreateBody = {
    product_sku_id: sku.id,
    on_hand_quantity: 100 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
    backorder_enabled: false,
    preorder_enabled: true,
  } satisfies IShoppingMallInventoryItem.ICreate;

  const inventoryItem: IShoppingMallInventoryItem =
    await api.functional.shoppingMall.seller.inventoryItems.create(connection, {
      body: inventoryCreateBody,
    });
  typia.assert<IShoppingMallInventoryItem>(inventoryItem);

  TestValidator.predicate(
    "inventory item should have preorder_enabled true after creation",
    inventoryItem.preorder_enabled === true,
  );

  // 5. Create initial preorder settings for the inventory item
  const now = new Date();
  const startDate: string & tags.Format<"date-time"> = RandomGenerator.date(
    now,
    1000 * 60 * 60 * 24,
  ).toISOString();
  const endDate: string & tags.Format<"date-time"> = RandomGenerator.date(
    now,
    1000 * 60 * 60 * 24 * 2,
  ).toISOString();
  const releaseDate: string & tags.Format<"date-time"> = RandomGenerator.date(
    now,
    1000 * 60 * 60 * 24 * 3,
  ).toISOString();

  const preorderCreateBody = {
    allow_preorder: true,
    preorder_start_at: startDate,
    preorder_end_at: endDate,
    max_preorder_quantity: 50 as number & tags.Type<"int32"> & tags.Minimum<1>,
    release_date: releaseDate,
  } satisfies IShoppingMallPreorderSettings.ICreate;

  const preorderSettings: IShoppingMallPreorderSettings =
    await api.functional.shoppingMall.inventoryItems.preorderSettings.create(
      connection,
      {
        inventoryItemId: inventoryItem.id,
        body: preorderCreateBody,
      },
    );
  typia.assert<IShoppingMallPreorderSettings>(preorderSettings);

  TestValidator.equals(
    "preorder settings should belong to created inventory item",
    preorderSettings.inventory_item_id,
    inventoryItem.id,
  );
  TestValidator.predicate(
    "preorder settings allow_preorder should be true initially",
    preorderSettings.allow_preorder === true,
  );

  // 6. Disable preorder via seller PUT endpoint with null fields
  const disableBody = {
    allow_preorder: false,
    preorder_start_at: null,
    preorder_end_at: null,
    max_preorder_quantity: null,
    release_date: null,
  } satisfies IShoppingMallPreorderSetting.IUpdate;

  const updated: IShoppingMallPreorderSetting =
    await api.functional.shoppingMall.seller.inventoryItems.preorderSettings.update(
      connection,
      {
        inventoryItemId: inventoryItem.id,
        body: disableBody,
      },
    );
  typia.assert<IShoppingMallPreorderSetting>(updated);

  // 7. Assertions: preorder disabled and optional fields cleared
  TestValidator.equals(
    "updated settings should belong to same inventory item",
    updated.inventory_item_id,
    inventoryItem.id,
  );
  TestValidator.predicate(
    "allow_preorder should be false after update",
    updated.allow_preorder === false,
  );
  TestValidator.equals(
    "preorder_start_at should be null after disabling preorder",
    updated.preorder_start_at,
    null,
  );
  TestValidator.equals(
    "preorder_end_at should be null after disabling preorder",
    updated.preorder_end_at,
    null,
  );
  TestValidator.equals(
    "max_preorder_quantity should be null after disabling preorder",
    updated.max_preorder_quantity,
    null,
  );
  TestValidator.equals(
    "release_date should be null after disabling preorder",
    updated.release_date,
    null,
  );
}
