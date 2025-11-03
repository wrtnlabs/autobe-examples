import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductApproval";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSession";
import type { IShoppingMallSkuInventory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuInventory";

export async function test_api_sku_inventory_delete_by_seller(
  connection: api.IConnection,
) {
  // Seller sign up and authentication
  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: "Aa123456!",
        store_name: RandomGenerator.name(2),
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // Create a product by seller
  const productCode: string = `prd-${RandomGenerator.alphaNumeric(8)}`;

  const productCreateBody = {
    code: productCode,
    name: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    brand: RandomGenerator.name(1),
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);
  TestValidator.equals("product code matches", product.code, productCode);

  // Create a SKU for the created product
  const skuCreateBody = {
    sku_code: `sku-${RandomGenerator.alphaNumeric(10)}`,
    price: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    attributes_json: JSON.stringify({ color: "red", size: "M" }),
  } satisfies IShoppingMallProductSku.ICreate;

  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.createSku(
      connection,
      {
        productCode: productCode,
        body: skuCreateBody,
      },
    );
  typia.assert(sku);

  // Create a SKU inventory for the SKU
  const inventoryCreateBody = {
    shopping_mall_product_sku_id: sku.id,
    quantity: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
    stock_status: "in stock",
  } satisfies IShoppingMallSkuInventory.ICreate;

  const skuInventory: IShoppingMallSkuInventory =
    await api.functional.shoppingMall.seller.skuInventories.create(connection, {
      body: inventoryCreateBody,
    });
  typia.assert(skuInventory);

  // Delete SKU inventory record by id
  await api.functional.shoppingMall.seller.skuInventories.erase(connection, {
    id: skuInventory.id,
  });
}
