import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

export async function test_api_admin_account_self_deletion_prohibited(
  connection: api.IConnection,
) {
  // Create a new admin account via join operation
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "TestPassword123!",
        first_name: RandomGenerator.name(),
        last_name: RandomGenerator.name(),
        role: "full_admin" as const,
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Attempt to delete the same account from which the request originates
  await TestValidator.error(
    "attempted self-deletion should be prohibited with CANNOT_DELETE_ADMIN error",
    async () => {
      await api.functional.shoppingMall.admin.actors.admins.erase(connection, {
        adminId: admin.id,
      });
    },
  );
}
