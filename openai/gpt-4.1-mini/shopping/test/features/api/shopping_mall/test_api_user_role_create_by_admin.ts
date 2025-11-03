import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallUserRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserRole";

export async function test_api_user_role_create_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Admin joins (authenticates) to obtain authorized admin user with token
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: `admin${typia.random<string & tags.Format<"email">>().replace(/@.*/, "@example.com")}`,
        password: "Passw0rd!",
        full_name: "Admin User",
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(admin);

  // Step 2: Create user role
  // Generate a random UUID as user_id
  const userId = typia.random<string & tags.Format<"uuid">>();
  const roleName = RandomGenerator.pick([
    "admin",
    "seller",
    "customer",
  ] as const);

  const userRole: IShoppingMallUserRole =
    await api.functional.shoppingMall.admin.userRoles.create(connection, {
      body: {
        user_id: userId,
        role_name: roleName,
      } satisfies IShoppingMallUserRole.ICreate,
    });
  typia.assert(userRole);

  // Verification
  TestValidator.equals("user role user_id", userRole.user_id, userId);
  TestValidator.equals("user role role_name", userRole.role_name, roleName);
  TestValidator.predicate(
    "user role id is UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      userRole.id,
    ),
  );
}
