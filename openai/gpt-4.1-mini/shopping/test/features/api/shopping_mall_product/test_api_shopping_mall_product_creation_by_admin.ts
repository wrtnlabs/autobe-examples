import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";

export async function test_api_shopping_mall_product_creation_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a new admin user and authenticate
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminCreateBody = {
    email: adminEmail,
    name: RandomGenerator.name(),
    password: "StrongP@ssw0rd!",
    phone_number: null,
    role: "admin",
  } satisfies IShoppingMallAdmin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(admin);

  // 2. Create a new shopping mall product using admin privileges
  const productCreateBody = {
    code: RandomGenerator.alphaNumeric(8).toUpperCase(),
    name: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 10 }),
    description: null,
    is_active: true,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.admin.shoppingMallProducts.create(
      connection,
      {
        body: productCreateBody,
      },
    );

  typia.assert(product);

  // Validate that product code and name match creation request
  TestValidator.equals(
    "product code matches creation request",
    product.code,
    productCreateBody.code,
  );
  TestValidator.equals(
    "product name matches creation request",
    product.name,
    productCreateBody.name,
  );
  TestValidator.equals("product is active", product.is_active, true);
}
