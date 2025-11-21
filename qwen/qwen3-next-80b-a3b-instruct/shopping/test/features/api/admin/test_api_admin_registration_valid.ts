import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

export async function test_api_admin_registration_valid(
  connection: api.IConnection,
) {
  const adminData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePassword123!",
    first_name: RandomGenerator.name(),
    last_name: RandomGenerator.name(),
    role: RandomGenerator.pick([
      "super_admin",
      "full_admin",
      "limited_admin",
    ] as const),
  } satisfies IShoppingMallAdmin.ICreate;

  const registeredAdmin = await api.functional.auth.admin.join(connection, {
    body: adminData,
  });

  typia.assert<IShoppingMallAdmin.IAuthorized>(registeredAdmin);

  TestValidator.equals(
    "new admin status should be pending_verification",
    registeredAdmin.status,
    "pending_verification",
  );
  TestValidator.equals(
    "email should match input",
    registeredAdmin.email,
    adminData.email,
  );
  TestValidator.equals(
    "first_name should match input",
    registeredAdmin.first_name,
    adminData.first_name,
  );
  TestValidator.equals(
    "last_name should match input",
    registeredAdmin.last_name,
    adminData.last_name,
  );
  TestValidator.equals(
    "role should match input",
    registeredAdmin.role,
    adminData.role,
  );
}
