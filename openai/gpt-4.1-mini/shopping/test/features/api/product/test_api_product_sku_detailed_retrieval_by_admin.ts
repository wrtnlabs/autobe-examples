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

export async function test_api_product_sku_detailed_retrieval_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin registers and authenticates
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoinBody = {
    email: adminEmail,
    password: "strongPassword123!",
    full_name: typia.random<string>(),
  } satisfies IShoppingMallAdmin.IJoin;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Admin creates a product
  const productCreateBody = {
    code: typia.random<string>(),
    name: typia.random<string>(),
    description: typia.random<string>(),
    brand: typia.random<string>(),
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.admin.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  // Prepare SKU to be retrieved - We assume product.shopping_mall_product_skus exists and is non-empty
  await TestValidator.predicate(
    "product has skus",
    Array.isArray(product.shopping_mall_product_skus) &&
      product.shopping_mall_product_skus.length > 0,
  );

  const skuToRetrieve = product.shopping_mall_product_skus![0];
  typia.assert(skuToRetrieve);

  // 3. Admin retrieves detailed SKU information by productCode and skuCode
  const skuDetail: IShoppingMallProductSku =
    await api.functional.shoppingMall.admin.products.skus.at(connection, {
      productCode: product.code,
      skuCode: skuToRetrieve.sku_code,
    });

  // Validate SKU details
  typia.assert(skuDetail);

  // Ensure SKU product ID matches product ID
  TestValidator.equals(
    "sku's product id matches",
    skuDetail.shopping_mall_product_id,
    product.id,
  );
  // SKU codes are the same
  TestValidator.equals(
    "sku codes match",
    skuDetail.sku_code,
    skuToRetrieve.sku_code,
  );
}
