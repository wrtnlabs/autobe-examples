import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

export async function test_api_admin_account_creation(
  connection: api.IConnection,
) {
  // Generate realistic admin credentials
  const email: string = typia.random<string & tags.Format<"email">>();
  const password: string = RandomGenerator.alphaNumeric(16);
  const first_name: string = RandomGenerator.name();
  const last_name: string = RandomGenerator.name();
  const role: "super_admin" | "full_admin" | "limited_admin" =
    RandomGenerator.pick([
      "super_admin",
      "full_admin",
      "limited_admin",
    ] as const);

  // Step 1: Create the admin account using POST /auth/admin/join
  const authResult: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email,
        password,
        first_name,
        last_name,
        role,
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(authResult);

  // Verify authentication result contains expected fields
  TestValidator.equals("email matches", authResult.email, email);
  TestValidator.equals("first_name matches", authResult.first_name, first_name);
  TestValidator.equals("last_name matches", authResult.last_name, last_name);
  TestValidator.equals("role matches", authResult.role, role);
  TestValidator.equals(
    "status is pending_verification",
    authResult.status,
    "pending_verification",
  );
  TestValidator.predicate(
    "token exists",
    () => authResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    () => authResult.token.refresh.length > 0,
  );

  // Step 2: Create the admin profile using POST /shoppingMall/admin/actors/admins
  const createResult: IShoppingMallAdmin =
    await api.functional.shoppingMall.admin.actors.admins.create(connection, {
      body: {
        email,
        password,
        first_name,
        last_name,
        role,
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(createResult);

  // Verify admin profile was created with correct status
  TestValidator.equals("admin ID is UUID", typeof createResult.id, "string");
  TestValidator.equals("email matches", createResult.email, email);
  TestValidator.equals(
    "first_name matches",
    createResult.first_name,
    first_name,
  );
  TestValidator.equals("last_name matches", createResult.last_name, last_name);
  TestValidator.equals("role matches", createResult.role, role);
  TestValidator.equals(
    "status is pending_verification",
    createResult.status,
    "pending_verification",
  );
  TestValidator.equals("deleted_at is null", createResult.deleted_at, null);
}
