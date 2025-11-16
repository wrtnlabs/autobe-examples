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
 * Validate that a seller can switch an inventory item to preorder mode while
 * keeping quantities consistent and backorder flags unchanged.
 *
 * Business flow:
 *
 * 1. Join as a seller to obtain authenticated context.
 * 2. Create a base product owned by that seller.
 * 3. Create a SKU under the product with normal pricing configuration.
 * 4. Create an inventory item for the SKU with on_hand_quantity = 0,
 *    low_stock_threshold = 0, backorder_enabled = false, preorder_enabled =
 *    false.
 * 5. Update the inventory item to enable preorder, keep on_hand_quantity at 0, and
 *    adjust low_stock_threshold to a small non-zero value.
 * 6. Assert that preorder is enabled, on_hand_quantity remains 0, and
 *    backorder_enabled is unchanged in the updated inventory snapshot.
 * 7. Additionally, verify that unauthenticated callers cannot update the inventory
 *    item, by attempting an update with a connection that has no Authorization
 *    header and expecting an error.
 */
export async function test_api_seller_inventory_item_update_preorder_flow(
  connection: api.IConnection,
) {
  // 1. Join as seller (authentication)
  const joinRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: joinRequest,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(seller);

  // 2. Create a product for this seller
  const productCode: string = RandomGenerator.alphaNumeric(16);
  const productCreateBody = {
    shopping_mall_seller_id: seller.id,
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
  TestValidator.equals(
    "product code should match requested code",
    product.code,
    productCode,
  );

  // 3. Create a SKU for this product
  const skuCode: string = RandomGenerator.alphaNumeric(12);
  const listPrice = 10000;
  const salePrice = 9500;
  const skuCreateBody = {
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
      body: skuCreateBody,
    });
  typia.assert<IShoppingMallProductSku>(sku);
  TestValidator.equals(
    "sku code should match requested code",
    sku.code,
    skuCode,
  );

  // 4. Create initial inventory item with zero stock and preorder disabled
  const inventoryCreateBody = {
    product_sku_id: sku.id,
    on_hand_quantity: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
    backorder_enabled: false,
    preorder_enabled: false,
  } satisfies IShoppingMallInventoryItem.ICreate;

  const inventoryItem: IShoppingMallInventoryItem =
    await api.functional.shoppingMall.seller.inventoryItems.create(connection, {
      body: inventoryCreateBody,
    });
  typia.assert<IShoppingMallInventoryItem>(inventoryItem);

  TestValidator.equals(
    "initial on_hand_quantity should be 0",
    inventoryItem.on_hand_quantity,
    0,
  );
  TestValidator.equals(
    "initial low_stock_threshold should be 0",
    inventoryItem.low_stock_threshold ?? 0,
    0,
  );
  TestValidator.equals(
    "initial backorder_enabled should be false",
    inventoryItem.backorder_enabled,
    false,
  );
  TestValidator.equals(
    "initial preorder_enabled should be false",
    inventoryItem.preorder_enabled,
    false,
  );

  const originalBackorderFlag: boolean = inventoryItem.backorder_enabled;

  // 5. Update inventory item to enable preorder, keep on_hand_quantity = 0,
  //    and adjust low_stock_threshold to small non-zero value.
  const newLowStockThreshold = 5 as number &
    tags.Type<"int32"> &
    tags.Minimum<0>;

  const updateBody = {
    on_hand_quantity: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: newLowStockThreshold,
    preorder_enabled: true,
  } satisfies IShoppingMallInventoryItem.IUpdate;

  const updated: IShoppingMallInventoryItem =
    await api.functional.shoppingMall.seller.inventoryItems.update(connection, {
      inventoryItemId: inventoryItem.id,
      body: updateBody,
    });
  typia.assert<IShoppingMallInventoryItem>(updated);

  // 6. Validate updated inventory state
  TestValidator.equals(
    "updated on_hand_quantity should remain 0",
    updated.on_hand_quantity,
    0,
  );
  TestValidator.equals(
    "updated low_stock_threshold should match new value",
    updated.low_stock_threshold ?? 0,
    newLowStockThreshold,
  );
  TestValidator.equals(
    "preorder should be enabled after update",
    updated.preorder_enabled,
    true,
  );
  TestValidator.equals(
    "backorder_enabled should remain unchanged",
    updated.backorder_enabled,
    originalBackorderFlag,
  );

  // 7. Negative scenario: unauthenticated connection must not update inventory
  const unauthenticated: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "unauthenticated inventory update should fail",
    async () => {
      await api.functional.shoppingMall.seller.inventoryItems.update(
        unauthenticated,
        {
          inventoryItemId: inventoryItem.id,
          body: {
            preorder_enabled: true,
          } satisfies IShoppingMallInventoryItem.IUpdate,
        },
      );
    },
  );
}
