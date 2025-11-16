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
 * Verify that preorder settings retrieval mirrors complex time window and
 * quantity cap configuration.
 *
 * Business goal: Ensure that when a seller configures preorder settings on an
 * inventory item (allow_preorder flag, preorder start/end window, maximum
 * preorder quantity, and release date), a subsequent GET of preorder settings
 * for that inventory item returns a model that exactly matches the configured
 * values. This guarantees that UIs and downstream services relying on precise
 * preorder windows and caps see a faithful read model.
 *
 * Steps:
 *
 * 1. Register a seller account via POST /auth/seller/join to obtain an
 *    authenticated seller context.
 * 2. Create a product for that seller via POST /shoppingMall/seller/products and
 *    capture its business-visible product `code`.
 * 3. Under that product, create a SKU via POST
 *    /shoppingMall/seller/products/{productCode}/skus and capture the created
 *    SKU `id`.
 * 4. Create an inventory item for that SKU via POST
 *    /shoppingMall/seller/inventoryItems, capturing the `inventoryItemId` from
 *    the response `id`.
 * 5. Construct a preorder settings payload with non-trivial values:
 *
 *    - Allow_preorder = true
 *    - Preorder_start_at = an ISO date-time in the near future
 *    - Preorder_end_at = a later ISO date-time strictly after start
 *    - Max_preorder_quantity = a positive int32 (e.g., between 10 and 100)
 *    - Release_date = an ISO date-time on or after preorder_end_at
 * 6. Call POST /shoppingMall/inventoryItems/{inventoryItemId}/preorderSettings
 *    with that payload to create/replace preorder settings.
 * 7. Call GET /shoppingMall/inventoryItems/{inventoryItemId}/preorderSettings to
 *    fetch the configured preorder settings.
 * 8. Validate:
 *
 *    - Response type conforms to IShoppingMallPreorderSettings via typia.assert.
 *    - The `inventory_item_id` equals the inventory item id from step 4.
 *    - The flag `allow_preorder` in the response equals the configured value.
 *    - Each of preorder_start_at, preorder_end_at, max_preorder_quantity, and
 *         release_date equals exactly what was configured (string equality for
 *         ISO timestamps, numeric equality for quantity).
 *    - The temporal ordering implied by the response satisfies: preorder_start_at <
 *         preorder_end_at and preorder_end_at <= release_date.
 *
 * The test focuses only on the happy path (no error scenarios) and validates
 * that serialization/deserialization or any internal normalization does not
 * change the configured preorder settings.
 */
export async function test_api_inventory_preorder_settings_get_reflects_time_window_and_quantity_caps(
  connection: api.IConnection,
) {
  // 1. Seller join to obtain authenticated context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    storeName: RandomGenerator.name(),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: joinBody,
    });
  typia.assert(seller);

  // 2. Create a product for this seller
  const productCode = RandomGenerator.alphaNumeric(12);
  const productBody = {
    shopping_mall_seller_id: seller.id,
    shopping_mall_brand_id: null,
    code: productCode,
    name: RandomGenerator.paragraph({ sentences: 3 }),
    short_description: RandomGenerator.paragraph({ sentences: 2 }),
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
  typia.assert(product);

  // 3. Create a SKU for the product
  const skuBody = {
    code: RandomGenerator.alphaNumeric(10),
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
      body: skuBody,
    });
  typia.assert(sku);

  // 4. Create an inventory item for that SKU
  const inventoryBody = {
    product_sku_id: sku.id,
    on_hand_quantity: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: undefined,
    backorder_enabled: false,
    preorder_enabled: true,
  } satisfies IShoppingMallInventoryItem.ICreate;

  const inventoryItem: IShoppingMallInventoryItem =
    await api.functional.shoppingMall.seller.inventoryItems.create(connection, {
      body: inventoryBody,
    });
  typia.assert(inventoryItem);

  // 5. Construct preorder settings payload with non-trivial values
  const now = new Date();
  const startDate = RandomGenerator.date(
    new Date(now.getTime() + 24 * 60 * 60 * 1000),
    24 * 60 * 60 * 1000,
  );
  const endDate = RandomGenerator.date(
    new Date(startDate.getTime() + 24 * 60 * 60 * 1000),
    24 * 60 * 60 * 1000,
  );
  const releaseBase = new Date(endDate.getTime() + 24 * 60 * 60 * 1000);
  const releaseDateObj = RandomGenerator.date(releaseBase, 24 * 60 * 60 * 1000);

  const preorder_start_at = startDate.toISOString();
  const preorder_end_at = endDate.toISOString();
  const release_date = releaseDateObj.toISOString();

  const max_preorder_quantity:
    | (number & tags.Type<"int32"> & tags.Minimum<1>)
    | null
    | undefined = 50 as number & tags.Type<"int32"> & tags.Minimum<1>;

  const preorderBody = {
    allow_preorder: true,
    preorder_start_at,
    preorder_end_at,
    max_preorder_quantity,
    release_date,
  } satisfies IShoppingMallPreorderSettings.ICreate;

  const createdSettings: IShoppingMallPreorderSettings =
    await api.functional.shoppingMall.inventoryItems.preorderSettings.create(
      connection,
      {
        inventoryItemId: inventoryItem.id,
        body: preorderBody,
      },
    );
  typia.assert(createdSettings);

  // Sanity checks between createdSettings and request body
  TestValidator.equals(
    "created settings inventory_item_id should match inventory item id",
    createdSettings.inventory_item_id,
    inventoryItem.id,
  );
  TestValidator.equals(
    "created settings allow_preorder should match",
    createdSettings.allow_preorder,
    preorderBody.allow_preorder,
  );
  TestValidator.equals(
    "created settings preorder_start_at should match",
    createdSettings.preorder_start_at ?? null,
    preorderBody.preorder_start_at ?? null,
  );
  TestValidator.equals(
    "created settings preorder_end_at should match",
    createdSettings.preorder_end_at ?? null,
    preorderBody.preorder_end_at ?? null,
  );
  TestValidator.equals(
    "created settings max_preorder_quantity should match",
    createdSettings.max_preorder_quantity ?? null,
    preorderBody.max_preorder_quantity ?? null,
  );
  TestValidator.equals(
    "created settings release_date should match",
    createdSettings.release_date ?? null,
    preorderBody.release_date ?? null,
  );

  // 7. Retrieve preorder settings via GET
  const fetchedSettings: IShoppingMallPreorderSettings =
    await api.functional.shoppingMall.inventoryItems.preorderSettings.at(
      connection,
      {
        inventoryItemId: inventoryItem.id,
      },
    );
  typia.assert(fetchedSettings);

  // 8. Validate round-trip equality
  TestValidator.equals(
    "fetched settings inventory_item_id should equal inventory item id",
    fetchedSettings.inventory_item_id,
    inventoryItem.id,
  );
  TestValidator.equals(
    "fetched settings allow_preorder flag should match configured",
    fetchedSettings.allow_preorder,
    preorderBody.allow_preorder,
  );
  TestValidator.equals(
    "fetched settings preorder_start_at should mirror configured",
    fetchedSettings.preorder_start_at ?? null,
    preorderBody.preorder_start_at ?? null,
  );
  TestValidator.equals(
    "fetched settings preorder_end_at should mirror configured",
    fetchedSettings.preorder_end_at ?? null,
    preorderBody.preorder_end_at ?? null,
  );
  TestValidator.equals(
    "fetched settings max_preorder_quantity should mirror configured",
    fetchedSettings.max_preorder_quantity ?? null,
    preorderBody.max_preorder_quantity ?? null,
  );
  TestValidator.equals(
    "fetched settings release_date should mirror configured",
    fetchedSettings.release_date ?? null,
    preorderBody.release_date ?? null,
  );

  // Temporal ordering validation: start < end <= release_date
  if (
    fetchedSettings.preorder_start_at !== undefined &&
    fetchedSettings.preorder_start_at !== null &&
    fetchedSettings.preorder_end_at !== undefined &&
    fetchedSettings.preorder_end_at !== null &&
    fetchedSettings.release_date !== undefined &&
    fetchedSettings.release_date !== null
  ) {
    const fetchedStart = new Date(fetchedSettings.preorder_start_at).getTime();
    const fetchedEnd = new Date(fetchedSettings.preorder_end_at).getTime();
    const fetchedRelease = new Date(fetchedSettings.release_date).getTime();

    TestValidator.predicate(
      "preorder_start_at should be strictly before preorder_end_at",
      fetchedStart < fetchedEnd,
    );
    TestValidator.predicate(
      "preorder_end_at should be less than or equal to release_date",
      fetchedEnd <= fetchedRelease,
    );
  }
}
