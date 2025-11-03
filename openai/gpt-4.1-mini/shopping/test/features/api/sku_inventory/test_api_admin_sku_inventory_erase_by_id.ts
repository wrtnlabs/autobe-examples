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

export async function test_api_admin_sku_inventory_erase_by_id(
  connection: api.IConnection,
) {
  // 1. Admin user registration via auth/admin/join
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "securePassword123",
        full_name: RandomGenerator.name(),
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Create product
  const productCreateBody = {
    code: RandomGenerator.alphaNumeric(10).toUpperCase(),
    name: RandomGenerator.name(3),
    description: "Test product description",
    brand: "TestBrandCo",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.admin.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  // 3. Create SKU for product
  const skuCreateBody = {
    sku_code:
      product.code + "-" + RandomGenerator.alphaNumeric(6).toUpperCase(),
    price: typia.random<number & tags.Type<"uint32"> & tags.Minimum<1>>(),
    attributes_json: JSON.stringify({ color: "red", size: "M" }),
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

  // 4. Create SKU inventory record for the SKU
  const skuInventoryCreateBody = {
    shopping_mall_product_sku_id: sku.id,
    quantity: 20,
    stock_status: "in stock",
  } satisfies IShoppingMallSkuInventory.ICreate;

  const skuInventory: IShoppingMallSkuInventory =
    await api.functional.shoppingMall.admin.skuInventories.create(connection, {
      body: skuInventoryCreateBody,
    });
  typia.assert(skuInventory);

  // 5. Delete (erase) the SKU inventory by its id
  await api.functional.shoppingMall.admin.skuInventories.erase(connection, {
    id: skuInventory.id,
  });

  // 6. Confirm deletion by attempting to delete again and expect error
  await TestValidator.error(
    "deleting non-existent SKU inventory should fail",
    async () => {
      await api.functional.shoppingMall.admin.skuInventories.erase(connection, {
        id: skuInventory.id,
      });
    },
  );
}
