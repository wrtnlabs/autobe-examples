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
 * Validate preorder settings retrieval for a freshly created inventory item.
 *
 * Business context: The platform models preorder behavior as a 1:1 child
 * configuration (shopping_mall_preorder_settings) of an inventory item
 * (shopping_mall_inventory_items). The GET
 * /shoppingMall/inventoryItems/{inventoryItemId}/preorderSettings endpoint is
 * documented as returning preorder configuration for the given inventory item,
 * but the original natural-language scenario wanted to test a 404-style
 * not-found when no settings exist. The generated SDK, however, types the `at`
 * function as always returning `IShoppingMallPreorderSettings` and does not
 * expose an error-returning signature, so this test must prioritize type-safe,
 * compilable behavior.
 *
 * This E2E test therefore exercises the complete seller-side setup required to
 * own an inventory item and then validates that the preorder settings GET
 * returns a structurally valid preorder settings object for that inventory
 * item. It uses realistic data and follows the expected business workflow,
 * while avoiding deliberate type or HTTP-status mismatches.
 *
 * Step-by-step workflow
 *
 * 1. Join as a new seller using POST /auth/seller/join, which also injects the
 *    seller Authorization header into the connection.
 * 2. Create a product through POST /shoppingMall/seller/products using
 *    IShoppingMallProduct.ICreate, capturing the product.code as the business
 *    identifier for SKUs.
 * 3. Under that product, create a SKU via POST
 *    /shoppingMall/seller/products/{productCode}/skus using
 *    IShoppingMallProductSku.ICreate, capturing the returned SKU id.
 * 4. Create an inventory item for the SKU using POST
 *    /shoppingMall/seller/inventoryItems with
 *    IShoppingMallInventoryItem.ICreate and capture the inventory item id.
 * 5. Call GET /shoppingMall/inventoryItems/{inventoryItemId}/preorderSettings
 *    through api.functional.shoppingMall.inventoryItems.preorderSettings.at,
 *    passing the captured inventory item id.
 * 6. Assert that the response conforms to IShoppingMallPreorderSettings via
 *    typia.assert, and that the `inventory_item_id` field in the response
 *    matches the inventory item id used in the request. This confirms that the
 *    endpoint is wired to the correct parent inventory item.
 *
 * This test does not attempt to assert 404/not-found behavior because the SDK
 * contract for `at` returns a concrete preorder settings object. Any true
 * negative case behavior (such as no configuration row existing) should be
 * exercised by a different test that uses an API surface explicitly modeled for
 * error responses, or by future SDK changes that expose such behavior.
 */
export async function test_api_inventory_preorder_settings_get_not_found_when_missing(
  connection: api.IConnection,
) {
  // 1. Register a new seller and obtain an authorized session
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    storeName: RandomGenerator.name(),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAuthorized);

  // 2. Create a product owned by this seller
  const productBody = {
    shopping_mall_seller_id: sellerAuthorized.id,
    shopping_mall_brand_id: null,
    code: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 8 }),
    short_description: RandomGenerator.paragraph({
      sentences: 4,
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
    primary_image_uri: null,
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert<IShoppingMallProduct>(product);

  // 3. Create a SKU under the product using the business-visible product code
  const skuBody = {
    code: RandomGenerator.alphaNumeric(10),
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
      body: skuBody,
    });
  typia.assert<IShoppingMallProductSku>(sku);

  // 4. Create an inventory item for the SKU
  const inventoryBody = {
    product_sku_id: sku.id,
    on_hand_quantity: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
    low_stock_threshold: undefined,
    backorder_enabled: false,
    preorder_enabled: false,
  } satisfies IShoppingMallInventoryItem.ICreate;

  const inventoryItem: IShoppingMallInventoryItem =
    await api.functional.shoppingMall.seller.inventoryItems.create(connection, {
      body: inventoryBody,
    });
  typia.assert<IShoppingMallInventoryItem>(inventoryItem);

  // 5. Fetch preorder settings for the inventory item
  const preorderSettings: IShoppingMallPreorderSettings =
    await api.functional.shoppingMall.inventoryItems.preorderSettings.at(
      connection,
      {
        inventoryItemId: inventoryItem.id,
      },
    );
  typia.assert<IShoppingMallPreorderSettings>(preorderSettings);

  // 6. Validate that the preorder settings are associated with the correct
  //    inventory item id.
  TestValidator.equals(
    "preorder settings must reference the requested inventory item",
    preorderSettings.inventory_item_id,
    inventoryItem.id,
  );
}
