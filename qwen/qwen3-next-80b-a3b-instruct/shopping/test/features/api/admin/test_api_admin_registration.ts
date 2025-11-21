import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

export async function test_api_admin_registration(connection: api.IConnection) {
  // Generate realistic admin registration data
  const adminData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    first_name: RandomGenerator.name(),
    last_name: RandomGenerator.name(),
    role: RandomGenerator.pick([
      "super_admin",
      "full_admin",
      "limited_admin",
    ] as const),
  } satisfies IShoppingMallAdmin.ICreate;

  // Execute the admin registration API call
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminData,
    });

  // Validate the returned admin structure with full type safety
  typia.assert(admin);

  // Perform business logic assertions on the response data
  TestValidator.equals("email matches request", admin.email, adminData.email);
  TestValidator.equals(
    "first name matches request",
    admin.first_name,
    adminData.first_name,
  );
  TestValidator.equals(
    "last name matches request",
    admin.last_name,
    adminData.last_name,
  );
  TestValidator.equals("role matches request", admin.role, adminData.role);
  TestValidator.predicate(
    "status is pending_verification",
    admin.status === "pending_verification",
  );
}
