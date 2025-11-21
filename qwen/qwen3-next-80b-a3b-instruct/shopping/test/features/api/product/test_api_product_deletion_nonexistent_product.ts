import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

export async function test_api_product_deletion_nonexistent_product(
  connection: api.IConnection,
) {
  // Authenticate as admin to perform deletion
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "securePassword123",
        first_name: RandomGenerator.name(),
        last_name: RandomGenerator.name(),
        role: "super_admin" as const,
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Generate a valid but non-existent product UUID
  const nonExistentProductId: string = typia.random<
    string & tags.Format<"uuid">
  >();

  // Attempt to delete the non-existent product
  await TestValidator.error(
    "deletion of non-existent product should return 404 Not Found",
    async () => {
      await api.functional.shoppingMall.admin.products.erase(connection, {
        productId: nonExistentProductId,
      });
    },
  );
}
