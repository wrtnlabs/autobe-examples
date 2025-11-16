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

export async function test_api_preorder_settings_create_with_window_and_quantity_constraints(
  connection: api.IConnection,
) {
  // 1. Register a new seller to get an authenticated seller session
  const joinBody = {
    email: `seller+${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAuthorized);

  // 2. Create a simple product owned by this seller (no brand association)
  const productCode: string = `PROD-${RandomGenerator.alphaNumeric(10)}`;

  const productCreateBody = {
    shopping_mall_seller_id: sellerAuthorized.id,
    // omit shopping_mall_brand_id to avoid brand assignment
    code: productCode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: "https://example.com/product/primary.jpg",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert<IShoppingMallProduct>(product);

  TestValidator.equals(
    "created product code matches request",
    product.code,
    productCode,
  );
  TestValidator.equals(
    "created product seller id matches authorized seller",
    product.seller.id,
    sellerAuthorized.id,
  );

  // 3. Create a SKU under this product
  const skuCode: string = `SKU-${RandomGenerator.alphaNumeric(8)}`;

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
    "SKU code should match requested code",
    sku.code,
    skuCode,
  );
  TestValidator.equals(
    "SKU product code should match parent product",
    sku.productCode,
    product.code,
  );

  // 4. Create an inventory item for this SKU
  const onHandQuantity: number & tags.Type<"int32"> & tags.Minimum<0> = 50;
  const lowStockThreshold: number & tags.Type<"int32"> & tags.Minimum<0> = 5;

  const inventoryCreateBody = {
    product_sku_id: sku.id,
    on_hand_quantity: onHandQuantity,
    low_stock_threshold: lowStockThreshold,
    backorder_enabled: false,
    preorder_enabled: true,
  } satisfies IShoppingMallInventoryItem.ICreate;

  const inventoryItem: IShoppingMallInventoryItem =
    await api.functional.shoppingMall.seller.inventoryItems.create(connection, {
      body: inventoryCreateBody,
    });
  typia.assert<IShoppingMallInventoryItem>(inventoryItem);

  TestValidator.equals(
    "inventory item SKU link matches created SKU",
    inventoryItem.product_sku_id,
    sku.id,
  );
  TestValidator.equals(
    "inventory on_hand_quantity matches request",
    inventoryItem.on_hand_quantity,
    onHandQuantity,
  );

  // 5. Build coherent preorder window and quantity caps
  const now = new Date();
  const oneDayMs = 24 * 60 * 60 * 1000;
  const preorderStart = new Date(now.getTime() + oneDayMs);
  const preorderEnd = new Date(preorderStart.getTime() + 14 * oneDayMs);
  const releaseDate = new Date(preorderEnd.getTime() + 7 * oneDayMs);

  const preorder_start_at = preorderStart.toISOString();
  const preorder_end_at = preorderEnd.toISOString();
  const release_date = releaseDate.toISOString();

  const maxPreorderQuantity: number & tags.Type<"int32"> & tags.Minimum<1> = 20;

  const preorderCreateBody = {
    allow_preorder: true,
    preorder_start_at,
    preorder_end_at,
    max_preorder_quantity: maxPreorderQuantity,
    release_date,
  } satisfies IShoppingMallPreorderSettings.ICreate;

  // 6. Call preorderSettings.create for the inventory item
  const preorderSettings: IShoppingMallPreorderSettings =
    await api.functional.shoppingMall.inventoryItems.preorderSettings.create(
      connection,
      {
        inventoryItemId: inventoryItem.id,
        body: preorderCreateBody,
      },
    );
  typia.assert<IShoppingMallPreorderSettings>(preorderSettings);

  // Business level validations
  TestValidator.equals(
    "preorder settings inventory_item_id matches inventory item",
    preorderSettings.inventory_item_id,
    inventoryItem.id,
  );
  TestValidator.equals(
    "allow_preorder flag is true",
    preorderSettings.allow_preorder,
    true,
  );
  TestValidator.equals(
    "preorder_start_at matches requested start",
    preorderSettings.preorder_start_at,
    preorder_start_at,
  );
  TestValidator.equals(
    "preorder_end_at matches requested end",
    preorderSettings.preorder_end_at,
    preorder_end_at,
  );
  TestValidator.equals(
    "max_preorder_quantity matches requested cap",
    preorderSettings.max_preorder_quantity,
    maxPreorderQuantity,
  );
  TestValidator.equals(
    "release_date matches requested release date",
    preorderSettings.release_date,
    release_date,
  );

  // 7. Optional second POST to verify overwrite behavior
  const preorderStart2 = new Date(now.getTime() + 2 * oneDayMs);
  const preorderEnd2 = new Date(preorderStart2.getTime() + 10 * oneDayMs);
  const releaseDate2 = new Date(preorderEnd2.getTime() + 5 * oneDayMs);

  const preorder_start_at_2 = preorderStart2.toISOString();
  const preorder_end_at_2 = preorderEnd2.toISOString();
  const release_date_2 = releaseDate2.toISOString();
  const maxPreorderQuantity2: number & tags.Type<"int32"> & tags.Minimum<1> =
    30;

  const preorderUpdateBody = {
    allow_preorder: true,
    preorder_start_at: preorder_start_at_2,
    preorder_end_at: preorder_end_at_2,
    max_preorder_quantity: maxPreorderQuantity2,
    release_date: release_date_2,
  } satisfies IShoppingMallPreorderSettings.ICreate;

  const preorderSettings2: IShoppingMallPreorderSettings =
    await api.functional.shoppingMall.inventoryItems.preorderSettings.create(
      connection,
      {
        inventoryItemId: inventoryItem.id,
        body: preorderUpdateBody,
      },
    );
  typia.assert<IShoppingMallPreorderSettings>(preorderSettings2);

  // Ensure overwrite semantics: settings should reflect new values and differ from first response
  TestValidator.notEquals(
    "second preorder settings snapshot differs from the first",
    preorderSettings2,
    preorderSettings,
  );
  TestValidator.equals(
    "updated preorder_start_at matches second request",
    preorderSettings2.preorder_start_at,
    preorder_start_at_2,
  );
  TestValidator.equals(
    "updated preorder_end_at matches second request",
    preorderSettings2.preorder_end_at,
    preorder_end_at_2,
  );
  TestValidator.equals(
    "updated max_preorder_quantity matches second request",
    preorderSettings2.max_preorder_quantity,
    maxPreorderQuantity2,
  );
  TestValidator.equals(
    "updated release_date matches second request",
    preorderSettings2.release_date,
    release_date_2,
  );
}
