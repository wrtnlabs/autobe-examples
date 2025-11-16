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
 * Validate that inventory items can be created with backorder and preorder
 * flags enabled.
 *
 * Business flow (seller-side inventory provisioning):
 *
 * 1. Register a seller account to obtain an authenticated seller session.
 * 2. Create a catalog product owned by that seller.
 * 3. Create an active, purchasable SKU under the product.
 * 4. Create an inventory item for the SKU with backorder_enabled and
 *    preorder_enabled set to true.
 * 5. Assert that the created inventory item reflects those flags and consistent
 *    core fields.
 */
export async function test_api_inventory_item_creation_with_backorder_and_preorder_flags(
  connection: api.IConnection,
) {
  // 1. Register a seller to establish authenticated seller context
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

  // 2. Create a product for this seller
  const productCode = RandomGenerator.alphaNumeric(12);

  const productCreateBody = {
    shopping_mall_seller_id: seller.id,
    shopping_mall_brand_id: undefined,
    code: productCode,
    name: RandomGenerator.name(3),
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active", // non-empty status string
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
    "created product code should match requested code",
    product.code,
    productCode,
  );

  // 3. Create an active, purchasable SKU for the product
  const skuCreateBody = {
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(2),
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
    "SKU should be created under the expected product code",
    sku.productCode,
    product.code,
  );

  // 4. Create an inventory item with backorder and preorder enabled
  const initialOnHand = 50;

  const inventoryCreateBody = {
    product_sku_id: sku.id,
    on_hand_quantity: initialOnHand,
    low_stock_threshold: 10,
    backorder_enabled: true,
    preorder_enabled: true,
  } satisfies IShoppingMallInventoryItem.ICreate;

  const inventoryItem: IShoppingMallInventoryItem =
    await api.functional.shoppingMall.seller.inventoryItems.create(connection, {
      body: inventoryCreateBody,
    });
  typia.assert<IShoppingMallInventoryItem>(inventoryItem);

  // 5. Validate core invariants and flag behavior
  TestValidator.equals(
    "inventory item should reference the expected SKU id",
    inventoryItem.product_sku_id,
    sku.id,
  );

  TestValidator.equals(
    "on_hand_quantity should match the requested initial quantity",
    inventoryItem.on_hand_quantity,
    initialOnHand,
  );

  TestValidator.equals(
    "reserved_quantity should be initialized to zero for new inventory items",
    inventoryItem.reserved_quantity,
    0,
  );

  TestValidator.predicate(
    "stock_status should be a non-empty string",
    inventoryItem.stock_status.length > 0,
  );

  TestValidator.equals(
    "backorder_enabled flag should be true on created inventory item",
    inventoryItem.backorder_enabled,
    true,
  );

  TestValidator.equals(
    "preorder_enabled flag should be true on created inventory item",
    inventoryItem.preorder_enabled,
    true,
  );
}
