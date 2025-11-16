import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBackorderSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBackorderSetting";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallInventoryItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";

export async function test_api_seller_backorder_update_rejects_when_settings_missing(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a seller
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.paragraph({ sentences: 3 }),
    storeName: RandomGenerator.name(),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(seller);

  // 2. Create a product for the seller
  const productCode = RandomGenerator.paragraph({ sentences: 2 });
  const productName = RandomGenerator.paragraph({ sentences: 2 });

  const productCreateBody = {
    shopping_mall_seller_id: seller.id,
    code: productCode,
    name: productName,
    status: "active",
    is_multi_sku: true,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  // 3. Create a SKU under the product
  const skuCreateBody = {
    code: RandomGenerator.paragraph({ sentences: 2 }),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    listPrice: 1000,
    salePrice: 900,
    currency: "USD",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode: product.code,
      body: skuCreateBody,
    });
  typia.assert(sku);

  // 4. Create inventory item for the SKU (without creating any backorder settings)
  const inventoryCreateBody = {
    product_sku_id: sku.id,
    on_hand_quantity: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
    low_stock_threshold: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
    backorder_enabled: false,
    preorder_enabled: false,
  } satisfies IShoppingMallInventoryItem.ICreate;

  const inventory: IShoppingMallInventoryItem =
    await api.functional.shoppingMall.seller.inventoryItems.create(connection, {
      body: inventoryCreateBody,
    });
  typia.assert(inventory);

  TestValidator.equals(
    "inventory should be linked to created SKU",
    inventory.product_sku_id,
    sku.id,
  );

  // 5. Attempt to update backorder settings when there is no existing record
  const backorderUpdateBody = {
    allow_backorder: true,
    max_backorder_quantity: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
    backorder_message: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingMallBackorderSetting.IUpdate;

  await TestValidator.error(
    "seller backorder update without existing settings must fail",
    async () => {
      await api.functional.shoppingMall.seller.inventoryItems.backorderSettings.update(
        connection,
        {
          inventoryItemId: inventory.id,
          body: backorderUpdateBody,
        },
      );
    },
  );
}
