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

export async function test_api_product_creation_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin registration
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    full_name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.IJoin;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(admin);

  // 2. Create product as admin
  const productCreateBody = {
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.admin.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  // 3. Validate product properties equal to input
  TestValidator.equals(
    "product code matches",
    product.code,
    productCreateBody.code,
  );
  TestValidator.equals(
    "product name matches",
    product.name,
    productCreateBody.name,
  );
}
