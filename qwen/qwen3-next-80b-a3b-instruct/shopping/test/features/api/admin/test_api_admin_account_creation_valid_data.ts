import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

export async function test_api_admin_account_creation_valid_data(
  connection: api.IConnection,
) {
  const email = typia.random<string & tags.Format<"email">>();
  const password = "SecurePassword123!";
  const firstName = RandomGenerator.name();
  const lastName = RandomGenerator.name();
  const role: "super_admin" | "full_admin" | "limited_admin" =
    RandomGenerator.pick([
      "super_admin",
      "full_admin",
      "limited_admin",
    ] as const);

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email,
      password,
      first_name: firstName,
      last_name: lastName,
      role,
    } satisfies IShoppingMallAdmin.ICreate,
  });

  typia.assert(admin);

  TestValidator.equals("admin email matches", admin.email, email);
  TestValidator.equals("admin first name matches", admin.first_name, firstName);
  TestValidator.equals("admin last name matches", admin.last_name, lastName);
  TestValidator.equals("admin role matches", admin.role, role);
  TestValidator.equals(
    "admin status is pending_verification",
    admin.status,
    "pending_verification",
  );
}
