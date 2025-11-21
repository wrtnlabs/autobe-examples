import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

export async function test_api_admin_create_weak_password(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as admin using first dependency - this establishes admin context
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = "StrongPassword123!"; // Valid password for initial admin

  const initialAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        first_name: RandomGenerator.name(),
        last_name: RandomGenerator.name(),
        role: "super_admin" as const,
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(initialAdmin);

  // Step 2: Use the authenticated connection to create another admin with weak password (11 characters)
  const weakPassword = "WeakPass123"; // 11 characters - exactly one less than minimum required by security policy

  // Create the new admin account data with weak password
  const newAdminData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: weakPassword,
    first_name: RandomGenerator.name(),
    last_name: RandomGenerator.name(),
    role: "full_admin" as const,
  } satisfies IShoppingMallAdmin.ICreate;

  // Step 3: Verify that the API returns a 400 error for weak password - this is the target validation
  await TestValidator.error(
    "admin creation with weak password (11 chars) should fail with 400 Bad Request",
    async () => {
      await api.functional.shoppingMall.admin.actors.admins.create(connection, {
        body: newAdminData,
      });
    },
  );
}
