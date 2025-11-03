import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallUserRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserRole";

export async function test_api_admin_user_role_deletion(
  connection: api.IConnection,
) {
  // 1. Authenticate as an admin user
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "SecureP@ssword123",
        full_name: RandomGenerator.name(),
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Create a user role for testing deletion
  const userRoleCreateBody = {
    user_id: typia.random<string & tags.Format<"uuid">>(),
    role_name: "admin",
  } satisfies IShoppingMallUserRole.ICreate;

  const createdUserRole: IShoppingMallUserRole =
    await api.functional.shoppingMall.admin.userRoles.create(connection, {
      body: userRoleCreateBody,
    });
  typia.assert(createdUserRole);

  // 3. Delete the created user role
  await api.functional.shoppingMall.admin.userRoles.erase(connection, {
    id: createdUserRole.id,
  });

  // 4. Validate that user role cannot be accessed anymore by trying to delete again (should fail)
  await TestValidator.error(
    "deleting a non-existent user role should fail",
    async () => {
      // Attempt to delete again should cause an error
      await api.functional.shoppingMall.admin.userRoles.erase(connection, {
        id: createdUserRole.id,
      });
    },
  );
}
