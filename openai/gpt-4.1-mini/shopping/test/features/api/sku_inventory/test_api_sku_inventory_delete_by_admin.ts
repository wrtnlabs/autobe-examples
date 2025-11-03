import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductApproval";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSkuInventory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuInventory";

export async function test_api_sku_inventory_delete_by_admin(
  connection: api.IConnection,
) {
  // 1. Register and authenticate admin user
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "strongPa$w0rd",
        full_name: RandomGenerator.name(),
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Create a new product
  const productCreateBody = {
    code: `PRD-${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.name(2),
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.admin.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  // 3. Create a SKU for the product
  const skuCreateBody = {
    sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
    price: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
    attributes_json: JSON.stringify({
      color: RandomGenerator.pick(["red", "blue", "green"] as const),
      size: RandomGenerator.pick(["S", "M", "L"] as const),
    }),
  } satisfies IShoppingMallProductSku.ICreate;
  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.admin.products.skus.createSku(
      connection,
      {
        productCode: product.code,
        body: skuCreateBody,
      },
    );
  typia.assert(sku);

  // 4. Create a SKU inventory record
  const skuInventoryCreateBody = {
    shopping_mall_product_sku_id: sku.id,
    quantity: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
    stock_status: RandomGenerator.pick([
      "in stock",
      "out of stock",
      "backordered",
    ] as const),
  } satisfies IShoppingMallSkuInventory.ICreate;
  const skuInventory: IShoppingMallSkuInventory =
    await api.functional.shoppingMall.admin.skuInventories.create(connection, {
      body: skuInventoryCreateBody,
    });
  typia.assert(skuInventory);

  // 5. Delete the SKU inventory record
  await api.functional.shoppingMall.admin.skuInventories.erase(connection, {
    id: skuInventory.id,
  });
}
