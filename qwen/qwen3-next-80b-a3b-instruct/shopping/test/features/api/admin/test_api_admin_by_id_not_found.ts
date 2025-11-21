import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

export async function test_api_admin_by_id_not_found(
  connection: api.IConnection,
) {
  // Step 1: Create a valid admin account to ensure system has admin records
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const createdAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "SecurePass123!",
        first_name: RandomGenerator.name(),
        last_name: RandomGenerator.name(),
        role: "full_admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(createdAdmin);

  // Step 2: Authenticate as the created admin to have proper authorization context
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password_hash: "SecurePass123!",
    } satisfies IShoppingMallAdmin.IRequest,
  });

  // Step 3: Attempt to retrieve a non-existent admin by ID
  // Use a valid UUID format but an ID that doesn't exist in the system
  const nonExistentAdminId: string = typia.random<
    string & tags.Format<"uuid">
  >();

  // Validate that system returns 404 Not Found response for non-existent admin IDs
  await TestValidator.error(
    "should return 404 for non-existent admin ID",
    async () => {
      await api.functional.shoppingMall.admin.actors.admins.at(connection, {
        adminId: nonExistentAdminId,
      });
    },
  );
}
