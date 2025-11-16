import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

export async function test_api_shopping_mall_sku_option_delete_by_admin(
  connection: api.IConnection,
) {
  // 1. Create new admin user and authenticate
  const adminCreateBody = {
    email: RandomGenerator.alphaNumeric(8) + "@example.com",
    name: RandomGenerator.name(),
    password: "SecurePass123!",
    phone_number: null,
    role: "admin",
  } satisfies IShoppingMallAdmin.ICreate;
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(admin);

  // 2. Delete a SKU option by random code
  // Use a random string as code for testing purposes
  const codeToDelete = RandomGenerator.alphaNumeric(12);
  await api.functional.shoppingMall.admin.shoppingMallSkuOptions.erase(
    connection,
    {
      code: codeToDelete,
    },
  );
}
