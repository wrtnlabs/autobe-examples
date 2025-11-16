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
 * Happy-path configuration and retrieval of preorder settings for an inventory
 * item.
 *
 * Business flow (seller oriented):
 *
 * 1. Register a seller account using auth join endpoint so that subsequent seller
 *    APIs are authenticated.
 * 2. Create a catalog product owned by that seller.
 * 3. Create a SKU under the product.
 * 4. Create an inventory item pointing at the SKU.
 * 5. Configure preorder settings for that inventory item with allow_preorder =
 *    true and a concrete preorder window plus max_preorder_quantity and
 *    release_date.
 * 6. Fetch preorder settings again via GET and ensure all configured fields match
 *    and the inventory_item_id matches the inventory item used in the path.
 */
export async function test_api_inventory_preorder_settings_get_happy_path(
  connection: api.IConnection,
) {
  // 1. Register seller so that SDK configures Authorization header
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

  // 2. Create product for this seller
  const productCode: string = RandomGenerator.alphaNumeric(12);

  const productCreateBody = {
    shopping_mall_seller_id: sellerAuthorized.id,
    shopping_mall_brand_id: undefined,
    code: productCode,
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
      body: productCreateBody,
    });
  typia.assert<IShoppingMallProduct>(product);

  // Confirm product code round-trips
  TestValidator.equals(
    "product code should match the requested code",
    product.code,
    productCode,
  );

  // 3. Create SKU under the product
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
    "sku productCode should match parent product.code",
    sku.productCode,
    product.code,
  );

  // 4. Create inventory item linked to the SKU
  const inventoryCreateBody = {
    product_sku_id: sku.id,
    on_hand_quantity: 100 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 10 as
      | (number & tags.Type<"int32"> & tags.Minimum<0>)
      | undefined,
    backorder_enabled: false,
    preorder_enabled: true,
  } satisfies IShoppingMallInventoryItem.ICreate;

  const inventoryItem: IShoppingMallInventoryItem =
    await api.functional.shoppingMall.seller.inventoryItems.create(connection, {
      body: inventoryCreateBody,
    });
  typia.assert<IShoppingMallInventoryItem>(inventoryItem);

  // 5. Configure preorder settings for the inventory item
  const now = new Date();
  const startDate = new Date(now.getTime() + 60 * 60 * 1000); // +1 hour
  const endDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // +24 hours
  const releaseDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // +7 days

  const preorder_start_at: string & tags.Format<"date-time"> =
    startDate.toISOString() as string & tags.Format<"date-time">;
  const preorder_end_at: string & tags.Format<"date-time"> =
    endDate.toISOString() as string & tags.Format<"date-time">;
  const release_date: string & tags.Format<"date-time"> =
    releaseDate.toISOString() as string & tags.Format<"date-time">;

  const max_preorder_quantity: number & tags.Type<"int32"> & tags.Minimum<1> =
    50 as number & tags.Type<"int32"> & tags.Minimum<1>;

  const preorderCreateBody = {
    allow_preorder: true,
    preorder_start_at,
    preorder_end_at,
    max_preorder_quantity,
    release_date,
  } satisfies IShoppingMallPreorderSettings.ICreate;

  const createdPreorder: IShoppingMallPreorderSettings =
    await api.functional.shoppingMall.inventoryItems.preorderSettings.create(
      connection,
      {
        inventoryItemId: inventoryItem.id,
        body: preorderCreateBody,
      },
    );
  typia.assert<IShoppingMallPreorderSettings>(createdPreorder);

  // Basic invariants after creation
  TestValidator.equals(
    "created preorder inventory_item_id should match inventoryItem.id",
    createdPreorder.inventory_item_id,
    inventoryItem.id,
  );
  TestValidator.equals(
    "created preorder allow_preorder flag should match request",
    createdPreorder.allow_preorder,
    preorderCreateBody.allow_preorder,
  );

  // 6. Retrieve preorder settings via GET and compare
  const fetchedPreorder: IShoppingMallPreorderSettings =
    await api.functional.shoppingMall.inventoryItems.preorderSettings.at(
      connection,
      {
        inventoryItemId: inventoryItem.id,
      },
    );
  typia.assert<IShoppingMallPreorderSettings>(fetchedPreorder);

  // Field-by-field equality checks between created and fetched preorder settings
  TestValidator.equals(
    "fetched preorder id should equal created preorder id",
    fetchedPreorder.id,
    createdPreorder.id,
  );
  TestValidator.equals(
    "fetched preorder inventory_item_id should match inventoryItem.id",
    fetchedPreorder.inventory_item_id,
    inventoryItem.id,
  );
  TestValidator.equals(
    "fetched allow_preorder should match configured value",
    fetchedPreorder.allow_preorder,
    preorderCreateBody.allow_preorder,
  );
  TestValidator.equals(
    "fetched preorder_start_at should match configured value",
    fetchedPreorder.preorder_start_at,
    preorderCreateBody.preorder_start_at,
  );
  TestValidator.equals(
    "fetched preorder_end_at should match configured value",
    fetchedPreorder.preorder_end_at,
    preorderCreateBody.preorder_end_at,
  );
  TestValidator.equals(
    "fetched max_preorder_quantity should match configured value",
    fetchedPreorder.max_preorder_quantity,
    preorderCreateBody.max_preorder_quantity,
  );
  TestValidator.equals(
    "fetched release_date should match configured value",
    fetchedPreorder.release_date,
    preorderCreateBody.release_date,
  );
}
