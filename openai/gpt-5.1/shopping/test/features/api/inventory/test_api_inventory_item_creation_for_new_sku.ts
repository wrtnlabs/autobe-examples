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
 * Validate creation of an inventory item for a newly created SKU under a new
 * product.
 *
 * Business workflow covered by this test:
 *
 * 1. Register a new seller account using POST /auth/seller/join, which also sets
 *    the Authorization header on the shared connection via the SDK.
 * 2. As the authenticated seller, create a new product via POST
 *    /shoppingMall/seller/products using IShoppingMallProduct.ICreate, omitting
 *    the optional shopping_mall_brand_id to satisfy the requirement of creating
 *    a product without a brand. The seller id to associate is taken from the
 *    authenticated seller session.
 * 3. Under that product, create a SKU via POST
 *    /shoppingMall/seller/products/{productCode}/skus using
 *    IShoppingMallProductSku.ICreate, defining base prices and activation
 *    flags.
 * 4. Create an inventory item via POST /shoppingMall/seller/inventoryItems using
 *    IShoppingMallInventoryItem.ICreate, referencing the created SKU.id as
 *    product_sku_id and setting an initial on_hand_quantity,
 *    low_stock_threshold, and the backorder_enabled / preorder_enabled flags.
 * 5. Assert that the returned IShoppingMallInventoryItem is structurally valid
 *    (typia.assert), that id is a UUID string, that product_sku_id matches the
 *    created SKU.id, that reserved_quantity is a non-negative integer, and that
 *    the numeric and boolean fields (on_hand_quantity, low_stock_threshold,
 *    backorder_enabled, preorder_enabled) persist exactly as provided. Also
 *    assert that stock_status is a non-empty string to ensure basic
 *    classification was computed.
 */
export async function test_api_inventory_item_creation_for_new_sku(
  connection: api.IConnection,
) {
  // 1. Register a new seller (join) to obtain authenticated seller context
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
  typia.assert(seller);

  // 2. Create a new product owned by this seller, without brand
  const productCode = RandomGenerator.alphaNumeric(16);
  const productBody = {
    shopping_mall_seller_id: seller.id,
    code: productCode,
    name: RandomGenerator.paragraph({ sentences: 3 }),
    short_description: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: undefined,
    additional_data: undefined,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert(product);

  TestValidator.equals(
    "created product code should match request code",
    product.code,
    productCode,
  );

  // 3. Create a SKU under the product using the product.code
  const skuCode = RandomGenerator.alphaNumeric(10);
  const skuBody = {
    code: skuCode,
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

  TestValidator.equals(
    "created SKU code should match request code",
    sku.code,
    skuCode,
  );
  TestValidator.equals(
    "SKU productCode should match parent product code",
    sku.productCode,
    product.code,
  );

  // 4. Create an inventory item for the SKU
  const onHandQuantity = 10;
  const lowStockThreshold = 3;
  const inventoryBody = {
    product_sku_id: sku.id,
    on_hand_quantity: onHandQuantity,
    low_stock_threshold: lowStockThreshold,
    backorder_enabled: false,
    preorder_enabled: false,
  } satisfies IShoppingMallInventoryItem.ICreate;

  const inventory: IShoppingMallInventoryItem =
    await api.functional.shoppingMall.seller.inventoryItems.create(connection, {
      body: inventoryBody,
    });
  typia.assert(inventory);

  // 5. Business-level validations
  TestValidator.equals(
    "inventory product_sku_id should match SKU id",
    inventory.product_sku_id,
    sku.id,
  );
  TestValidator.equals(
    "inventory on_hand_quantity should persist request value",
    inventory.on_hand_quantity,
    onHandQuantity,
  );
  TestValidator.equals(
    "inventory low_stock_threshold should persist request value",
    inventory.low_stock_threshold,
    lowStockThreshold,
  );
  TestValidator.equals(
    "inventory backorder_enabled should persist request flag",
    inventory.backorder_enabled,
    inventoryBody.backorder_enabled,
  );
  TestValidator.equals(
    "inventory preorder_enabled should persist request flag",
    inventory.preorder_enabled,
    inventoryBody.preorder_enabled,
  );

  TestValidator.predicate(
    "inventory id should be a non-empty string",
    typeof inventory.id === "string" && inventory.id.length > 0,
  );

  // reserved_quantity is defined as int32; ensure it is a non-negative integer
  TestValidator.predicate(
    "reserved_quantity should be a non-negative integer",
    Number.isInteger(inventory.reserved_quantity) &&
      inventory.reserved_quantity >= 0,
  );

  TestValidator.predicate(
    "stock_status should be a non-empty string",
    typeof inventory.stock_status === "string" &&
      inventory.stock_status.length > 0,
  );
}
