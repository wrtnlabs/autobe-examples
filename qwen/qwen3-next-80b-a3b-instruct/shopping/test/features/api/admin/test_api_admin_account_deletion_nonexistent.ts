import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

export async function test_api_admin_account_deletion_nonexistent(
  connection: api.IConnection,
) {
  // Step 1: Create a new admin account for deletion
  const createdAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "SecurePassword123!",
        first_name: RandomGenerator.name(),
        last_name: RandomGenerator.name(),
        role: "full_admin" as const,
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(createdAdmin);

  // Step 2: Delete the created admin account
  await api.functional.shoppingMall.admin.actors.admins.erase(connection, {
    adminId: createdAdmin.id,
  });

  // Step 3: Attempt to delete the same admin account again (should fail with 404)
  // This validates proper handling of non-existent admin account deletion
  await TestValidator.error(
    "deletion of non-existent admin account should return 404",
    async () => {
      await api.functional.shoppingMall.admin.actors.admins.erase(connection, {
        adminId: createdAdmin.id,
      });
    },
  );
}
