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
 * Validate creation of an inventory item with low_stock_threshold for a seller
 * SKU.
 *
 * Business goal
 *
 * - Ensure an authenticated seller can create a catalog product and SKU, then
 *   create an inventory item bound to that SKU.
 * - Verify that the low_stock_threshold configured at creation time is persisted
 *   and that core quantities and linkage fields are correct.
 *
 * Covered flow
 *
 * 1. Seller joins the platform (auth.seller.join) and becomes authenticated.
 * 2. Seller creates a product in their catalog
 *    (shoppingMall.seller.products.create).
 * 3. Seller creates a SKU under that product using its business code
 *    (shoppingMall.seller.products.skus.create).
 * 4. Seller creates an inventory item for that SKU with a small on_hand_quantity
 *    and an explicit low_stock_threshold, with backorder_enabled=false and
 *    preorder_enabled=false.
 * 5. The test asserts that:
 *
 *    - The inventory item is structurally valid (typia.assert).
 *    - Product_sku_id matches the SKU id.
 *    - On_hand_quantity matches the requested quantity.
 *    - Low_stock_threshold matches the requested threshold.
 *    - Reserved_quantity is a non-negative number.
 *    - Stock_status is a non-empty string (domain semantics, but we do not rely on
 *         specific literal values as they are not enumerated in the DTO).
 */
export async function test_api_inventory_item_creation_with_low_stock_threshold(
  connection: api.IConnection,
) {
  // 1. Seller joins / becomes authenticated
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

  // 2. Seller creates a product
  const productCode: string = `P-${RandomGenerator.alphaNumeric(10)}`;

  const productBody = {
    shopping_mall_seller_id: seller.seller.id,
    shopping_mall_brand_id: undefined,
    code: productCode,
    name: RandomGenerator.name(3),
    short_description: RandomGenerator.paragraph({ sentences: 5 }),
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
  typia.assert<IShoppingMallProduct>(product);

  TestValidator.equals(
    "product code should match the requested code",
    product.code,
    productCode,
  );

  // 3. Seller creates a SKU for the product
  const skuCode: string = `SKU-${RandomGenerator.alphaNumeric(8)}`;
  const listPrice: number = 10000;
  const salePrice: number = 9000;

  const skuBody = {
    code: skuCode,
    name: RandomGenerator.name(2),
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

  TestValidator.equals(
    "SKU productCode should match the parent product code",
    sku.productCode,
    product.code,
  );

  // 4. Seller creates an inventory item for the SKU
  const onHandQuantity: number & tags.Type<"int32"> & tags.Minimum<0> = 5;
  const lowStockThreshold: number & tags.Type<"int32"> & tags.Minimum<0> = 6;

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
  typia.assert<IShoppingMallInventoryItem>(inventory);

  // 5. Assertions on created inventory item
  TestValidator.equals(
    "inventory.product_sku_id should match SKU id",
    inventory.product_sku_id,
    sku.id,
  );

  TestValidator.equals(
    "inventory.on_hand_quantity should match requested quantity",
    inventory.on_hand_quantity,
    onHandQuantity,
  );

  TestValidator.equals(
    "inventory.low_stock_threshold should match requested threshold",
    inventory.low_stock_threshold,
    lowStockThreshold,
  );

  TestValidator.predicate(
    "reserved_quantity should be a non-negative integer",
    typeof inventory.reserved_quantity === "number" &&
      Number.isInteger(inventory.reserved_quantity) &&
      inventory.reserved_quantity >= 0,
  );

  TestValidator.predicate(
    "stock_status should be a non-empty string",
    typeof inventory.stock_status === "string" &&
      inventory.stock_status.length > 0,
  );
}
